//! Агентный слой: описание инструментов (OpenAI-совместимый формат для Fireworks)
//! и диспетчер, исполняющий вызовы инструментов против SQLite.

use crate::{achievements, db, models::ProjectFilter};
use anyhow::Result;
use rusqlite::Connection;
use serde_json::{json, Value};

pub const SYSTEM_PROMPT: &str = "Ты — встроенный агент-помощник в личной десктоп-галерее проектов пользователя (Rust + Tauri). \
Ты можешь читать проекты и достижения и изменять их через инструменты. \
Действуй проактивно: если просят навести порядок, придумать достижения, написать описания — делай это через инструменты, а не проси пользователя. \
Описания проектов делай КОРОТКИМИ: 1-2 предложения, по-русски, без воды, без эмодзи, без тире (—). \
Перед изменениями не нужно спрашивать подтверждение — пользователь сам управляет своей галереей. \
После выполнения кратко отчитайся, что сделал. Отвечай по-русски.";

/// Полный список инструментов в формате OpenAI tools.
pub fn tools() -> Value {
    json!([
        tool("list_projects", "Список проектов пользователя. Можно отфильтровать по статусу.", json!({
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["idea","active","paused","done","archived"], "description": "Необязательный фильтр по статусу"}
            }
        })),
        tool("get_project", "Получить полную карточку одного проекта по id.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}},
            "required": ["id"]
        })),
        tool("set_project_description", "Задать короткое описание проекта (1-2 предложения).", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "description": {"type": "string"}},
            "required": ["id","description"]
        })),
        tool("set_project_status", "Изменить статус проекта.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "status": {"type": "string", "enum": ["idea","active","paused","done","archived"]}},
            "required": ["id","status"]
        })),
        tool("add_project_tags", "Добавить теги к проекту (не удаляя существующие).", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "tags": {"type": "array", "items": {"type": "string"}}},
            "required": ["id","tags"]
        })),
        tool("list_achievements", "Список всех достижений (авто и кастомных) с прогрессом.", json!({"type":"object","properties":{}})),
        tool("create_achievement", "Создать новую кастомную цель-достижение.", json!({
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "icon": {"type": "string", "description": "имя иконки: trophy, target, star, heart, rocket, flame, zap, crown, medal, award, sparkles, code"}
            },
            "required": ["title"]
        })),
        tool("update_achievement", "Изменить кастомное достижение (название/описание/иконку).", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "title": {"type": "string"}, "description": {"type": "string"}, "icon": {"type": "string"}},
            "required": ["id"]
        })),
        tool("toggle_achievement", "Отметить кастомную цель выполненной или снять отметку.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}},
            "required": ["id"]
        })),
        tool("delete_achievement", "Удалить кастомное достижение.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}},
            "required": ["id"]
        }))
    ])
}

fn tool(name: &str, description: &str, parameters: Value) -> Value {
    json!({
        "type": "function",
        "function": {"name": name, "description": description, "parameters": parameters}
    })
}

/// Результат исполнения инструмента: текст для модели + опциональная метка действия для UI.
pub struct ToolOutcome {
    pub result: String,
    pub action: Option<String>,
}

fn ok(result: String, action: Option<String>) -> ToolOutcome {
    ToolOutcome { result, action }
}

fn i64_arg(args: &Value, key: &str) -> Result<i64> {
    args.get(key)
        .and_then(|v| v.as_i64())
        .ok_or_else(|| anyhow::anyhow!("нет обязательного числового поля '{key}'"))
}

fn str_arg(args: &Value, key: &str) -> Result<String> {
    args.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| anyhow::anyhow!("нет обязательного строкового поля '{key}'"))
}

/// Исполняет один вызов инструмента. Возвращает текст для модели и метку действия.
pub fn dispatch(conn: &Connection, name: &str, args: &Value) -> Result<ToolOutcome> {
    match name {
        "list_projects" => {
            let mut f = ProjectFilter::default();
            f.status = args.get("status").and_then(|v| v.as_str()).map(String::from);
            let projects = db::list_projects(conn, &f)?;
            let compact: Vec<Value> = projects
                .iter()
                .map(|p| {
                    json!({
                        "id": p.id, "title": p.title, "status": p.status,
                        "language": p.language, "tags": p.tags,
                        "has_description": !p.description.trim().is_empty()
                    })
                })
                .collect();
            ok(serde_json::to_string(&compact)?, None)
        }
        "get_project" => {
            let id = i64_arg(args, "id")?;
            let p = db::get_project(conn, id)?;
            ok(serde_json::to_string(&p)?, None)
        }
        "set_project_description" => {
            let id = i64_arg(args, "id")?;
            let desc = str_arg(args, "description")?;
            db::set_description(conn, id, &desc)?;
            let p = db::get_project(conn, id)?;
            ok(
                "Описание обновлено.".into(),
                Some(format!("Описание проекта «{}» обновлено", p.title)),
            )
        }
        "set_project_status" => {
            let id = i64_arg(args, "id")?;
            let status = str_arg(args, "status")?;
            db::set_status(conn, id, &status)?;
            achievements::recompute(conn)?;
            let p = db::get_project(conn, id)?;
            ok(
                "Статус обновлён.".into(),
                Some(format!("Статус «{}» → {}", p.title, status)),
            )
        }
        "add_project_tags" => {
            let id = i64_arg(args, "id")?;
            let tags: Vec<String> = args
                .get("tags")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default();
            db::add_tags(conn, id, &tags)?;
            let p = db::get_project(conn, id)?;
            ok(
                "Теги добавлены.".into(),
                Some(format!("Теги для «{}»: +{}", p.title, tags.join(", "))),
            )
        }
        "list_achievements" => {
            let list = achievements::list_achievements(conn)?;
            ok(serde_json::to_string(&list)?, None)
        }
        "create_achievement" => {
            let title = str_arg(args, "title")?;
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let icon = args
                .get("icon")
                .and_then(|v| v.as_str())
                .unwrap_or("target")
                .to_string();
            let input = crate::models::CustomAchievementInput {
                title: title.clone(),
                description,
                icon,
            };
            let id = achievements::create_custom(conn, &input)?;
            ok(
                format!("Создано достижение id={id}."),
                Some(format!("Добавлена цель «{title}»")),
            )
        }
        "update_achievement" => {
            let id = i64_arg(args, "id")?;
            let title = args.get("title").and_then(|v| v.as_str());
            let description = args.get("description").and_then(|v| v.as_str());
            let icon = args.get("icon").and_then(|v| v.as_str());
            achievements::update_custom(conn, id, title, description, icon)?;
            ok(
                "Достижение обновлено.".into(),
                Some(format!("Цель id={id} обновлена")),
            )
        }
        "toggle_achievement" => {
            let id = i64_arg(args, "id")?;
            achievements::toggle_custom(conn, id)?;
            ok(
                "Отметка переключена.".into(),
                Some(format!("Цель id={id}: отметка переключена")),
            )
        }
        "delete_achievement" => {
            let id = i64_arg(args, "id")?;
            achievements::delete_custom(conn, id)?;
            ok(
                "Достижение удалено.".into(),
                Some(format!("Цель id={id} удалена")),
            )
        }
        other => ok(format!("Неизвестный инструмент: {other}"), None),
    }
}
