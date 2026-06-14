//! Агентный слой: описание инструментов (OpenAI-совместимый формат для Fireworks)
//! и диспетчер, исполняющий вызовы инструментов против SQLite.
//!
//! Поддерживает встроенные тулзы + remote MCP-инструменты (префикс server__tool).

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
/// MCP-тулзы подмешиваются отдельно через `mcp_tools_as_openai()`.
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
        tool("set_project_summary", "Задать AI-краткую сводку проекта (summary) — сжатое описание для системного промпта.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "summary": {"type": "string"}},
            "required": ["id","summary"]
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
        tool("set_project_language", "Задать язык/стек проекта.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}, "language": {"type": "string"}},
            "required": ["id","language"]
        })),
        tool("create_project", "Создать новый проект вручную.", json!({
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string", "enum": ["idea","active","paused","done","archived"]},
                "kind": {"type": "string", "enum": ["pet","work","study","other"]},
                "language": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["title"]
        })),
        tool("archive_project", "Архивировать проект (status=archived) или вернуть из архива.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}},
            "required": ["id"]
        })),
        tool("delete_project", "Безвозвратно удалить проект по id.", json!({
            "type": "object",
            "properties": {"id": {"type": "integer"}},
            "required": ["id"]
        })),
        tool("list_achievements", "Список всех достижений (авто и кастомных) с прогрессом.", json!({"type":"object","properties":{}})),
        tool("create_achievement", "Создать новую кастомную цель-достижение.", json!({
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "icon": {"type": "string", "description": "имя иконки: trophy, target, star, heart, rocket, flame, zap, crown, medal, award, sparkles, code"},
                "kind": {"type": "string", "enum": ["manual","metric","milestone"], "description": "тип: manual (ручная галка), metric (авто по метрике), milestone (веха)"},
                "metric": {"type": "string", "description": "метрика для metric/milestone: projects_total, projects_done, languages, stars_total, favorites, github_imported"},
                "target": {"type": "integer", "description": "целевое значение для metric/milestone"}
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
        })),
        tool("bulk_delete_achievements", "Удалить несколько достижений за раз по списку id.", json!({
            "type": "object",
            "properties": {"ids": {"type": "array", "items": {"type": "integer"}}},
            "required": ["ids"]
        })),
        tool("refresh_repo_activity", "Обновить оценку активности репозитория: последние коммиты, PR, оценка 1-10.", json!({
            "type": "object",
            "properties": {"project_id": {"type": "integer"}},
            "required": ["project_id"]
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

fn ok(result: String, action: Option<String>) -> Result<ToolOutcome> {
    Ok(ToolOutcome { result, action })
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
        "set_project_summary" => {
            let id = i64_arg(args, "id")?;
            let summary = str_arg(args, "summary")?;
            db::set_summary(conn, id, &summary)?;
            let p = db::get_project(conn, id)?;
            ok(
                "Сводка обновлена.".into(),
                Some(format!("Сводка проекта «{}» обновлена", p.title)),
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
        "set_project_language" => {
            let id = i64_arg(args, "id")?;
            let language = str_arg(args, "language")?;
            db::set_language(conn, id, &language)?;
            let p = db::get_project(conn, id)?;
            ok(
                "Язык обновлён.".into(),
                Some(format!("Язык «{}» → {}", p.title, language)),
            )
        }
        "create_project" => {
            let title = str_arg(args, "title")?;
            let description = args.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let status = args.get("status").and_then(|v| v.as_str()).unwrap_or("idea").to_string();
            let kind = args.get("kind").and_then(|v| v.as_str()).unwrap_or("pet").to_string();
            let language = args.get("language").and_then(|v| v.as_str()).map(String::from);
            let tags: Vec<String> = args
                .get("tags")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let input = crate::models::ProjectInput {
                title: title.clone(),
                description,
                status,
                kind,
                cover: None,
                repo_url: None,
                homepage_url: None,
                language,
                favorite: false,
                tags,
            };
            let id = db::create_project(conn, &input)?;
            achievements::recompute(conn)?;
            ok(
                format!("Проект создан, id={id}."),
                Some(format!("Создан проект «{title}»")),
            )
        }
        "archive_project" => {
            let id = i64_arg(args, "id")?;
            let p = db::get_project(conn, id)?;
            let new_status = if p.status == "archived" { "active" } else { "archived" };
            db::set_status(conn, id, new_status)?;
            ok(
                format!("Проект {} архивирован.", p.title),
                Some(format!("Проект «{}» → {new_status}", p.title)),
            )
        }
        "delete_project" => {
            let id = i64_arg(args, "id")?;
            let p = db::get_project(conn, id)?;
            db::delete_project(conn, id)?;
            achievements::recompute(conn)?;
            ok(
                format!("Проект «{}» удалён.", p.title),
                Some(format!("Удалён проект «{}»", p.title)),
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
            let kind = args
                .get("kind")
                .and_then(|v| v.as_str())
                .unwrap_or("manual")
                .to_string();
            let metric = args.get("metric").and_then(|v| v.as_str()).map(String::from);
            let target: i64 = args.get("target").and_then(|v| v.as_i64()).unwrap_or(1);
            let input = crate::models::CustomAchievementInput {
                title: title.clone(),
                description,
                icon,
                kind,
                metric,
                target: Some(target),
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
        "bulk_delete_achievements" => {
            let ids: Vec<i64> = args
                .get("ids")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter_map(|x| x.as_i64()).collect())
                .unwrap_or_default();
            let count = ids.len();
            for id in ids {
                let _ = achievements::delete_custom(conn, id);
            }
            ok(
                format!("Удалено достижений: {count}."),
                Some(format!("Удалено достижений: {count}")),
            )
        }
        "refresh_repo_activity" => {
            let project_id = i64_arg(args, "project_id")?;
            ok(
                format!("Активность для проекта {project_id} обновлена (заглушка — полная реализация в github.rs)."),
                Some("Активность обновлена".into()),
            )
        }
        other => ok(format!("Неизвестный инструмент: {other}"), None),
    }
}
