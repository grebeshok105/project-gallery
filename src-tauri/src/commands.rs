use crate::achievements;
use crate::db::{self, Db};
use crate::github;
use crate::llm::{self, ChatMessage, LlmConfig};
use crate::models::*;
use crate::secrets;
use tauri::State;

type R<T> = Result<T, String>;

fn e<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

// ───────────────────────── projects ─────────────────────────

#[tauri::command]
pub fn list_projects(state: State<Db>, filter: ProjectFilter) -> R<Vec<Project>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_projects(&conn, &filter).map_err(e)
}

#[tauri::command]
pub fn get_project(state: State<Db>, id: i64) -> R<Project> {
    let conn = state.0.lock().map_err(e)?;
    db::get_project(&conn, id).map_err(e)
}

#[tauri::command]
pub fn create_project(state: State<Db>, input: ProjectInput) -> R<Project> {
    let conn = state.0.lock().map_err(e)?;
    let id = db::create_project(&conn, &input).map_err(e)?;
    achievements::recompute(&conn).map_err(e)?;
    db::get_project(&conn, id).map_err(e)
}

#[tauri::command]
pub fn update_project(state: State<Db>, id: i64, input: ProjectInput) -> R<Project> {
    let conn = state.0.lock().map_err(e)?;
    db::update_project(&conn, id, &input).map_err(e)?;
    achievements::recompute(&conn).map_err(e)?;
    db::get_project(&conn, id).map_err(e)
}

#[tauri::command]
pub fn delete_project(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::delete_project(&conn, id).map_err(e)?;
    achievements::recompute(&conn).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn toggle_favorite(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::toggle_favorite(&conn, id).map_err(e)?;
    achievements::recompute(&conn).map_err(e)?;
    Ok(())
}

#[tauri::command]
pub fn list_tags(state: State<Db>) -> R<Vec<String>> {
    let conn = state.0.lock().map_err(e)?;
    db::all_tags(&conn).map_err(e)
}

#[tauri::command]
pub fn get_stats(state: State<Db>) -> R<Stats> {
    let conn = state.0.lock().map_err(e)?;
    achievements::compute_stats(&conn).map_err(e)
}

// ───────────────────────── achievements ─────────────────────────

#[tauri::command]
pub fn list_achievements(state: State<Db>) -> R<Vec<Achievement>> {
    let conn = state.0.lock().map_err(e)?;
    achievements::list_achievements(&conn).map_err(e)
}

/// Возвращает достижения, разблокированные с прошлой проверки (для тостов).
#[tauri::command]
pub fn check_new_achievements(state: State<Db>) -> R<Vec<Achievement>> {
    let conn = state.0.lock().map_err(e)?;
    achievements::recompute(&conn).map_err(e)
}

#[tauri::command]
pub fn create_custom_achievement(state: State<Db>, input: CustomAchievementInput) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    achievements::create_custom(&conn, &input).map_err(e)
}

#[tauri::command]
pub fn toggle_custom_achievement(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    achievements::toggle_custom(&conn, id).map_err(e)
}

#[tauri::command]
pub fn delete_custom_achievement(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    achievements::delete_custom(&conn, id).map_err(e)
}

// ───────────────────────── settings & secrets ─────────────────────────

#[tauri::command]
pub fn get_setting(state: State<Db>, key: String) -> R<Option<String>> {
    let conn = state.0.lock().map_err(e)?;
    db::get_setting(&conn, &key).map_err(e)
}

#[tauri::command]
pub fn set_setting(state: State<Db>, key: String, value: String) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::set_setting(&conn, &key, &value).map_err(e)
}

/// Возвращает все нечувствительные настройки + флаги наличия секретов.
#[tauri::command]
pub fn get_config(state: State<Db>) -> R<serde_json::Value> {
    let conn = state.0.lock().map_err(e)?;
    let get = |k: &str| db::get_setting(&conn, k).unwrap_or(None);
    Ok(serde_json::json!({
        "github_username": get("github_username").unwrap_or_default(),
        "github_include_forks": get("github_include_forks").unwrap_or_else(|| "false".into()),
        "llm_base_url": get("llm_base_url").unwrap_or_else(|| "https://api.fireworks.ai/inference/v1".into()),
        "llm_model": get("llm_model").unwrap_or_else(|| "accounts/fireworks/models/minimax-m3".into()),
        "has_github_token": secrets::has_secret(secrets::GITHUB_TOKEN),
        "has_llm_key": secrets::has_secret(secrets::LLM_API_KEY),
    }))
}

#[tauri::command]
pub fn set_secret(key: String, value: String) -> R<()> {
    let real = match key.as_str() {
        "github_token" => secrets::GITHUB_TOKEN,
        "llm_api_key" => secrets::LLM_API_KEY,
        _ => return Err("Неизвестный ключ секрета".into()),
    };
    secrets::set_secret(real, &value).map_err(e)
}

// ───────────────────────── github import ─────────────────────────

#[tauri::command]
pub async fn import_github(state: State<'_, Db>, username: String) -> R<usize> {
    // Читаем настройки и токен до асинхронного вызова, освобождая мьютекс.
    let include_forks = {
        let conn = state.0.lock().map_err(e)?;
        db::get_setting(&conn, "github_include_forks")
            .ok()
            .flatten()
            .map(|v| v == "true")
            .unwrap_or(false)
    };
    let token = secrets::get_secret(secrets::GITHUB_TOKEN).ok().flatten();

    let repos = github::fetch_user_repos(&username, token.as_deref(), include_forks)
        .await
        .map_err(e)?;

    let conn = state.0.lock().map_err(e)?;
    let mut imported = 0usize;
    for r in &repos {
        let status = if r.archived { "archived" } else { "active" };
        // upsert по github_id: обновляем «живые» поля, не трогая ручные правки статуса/тегов сильно
        let changed = conn
            .execute(
                "INSERT INTO projects
                    (title, description, status, kind, repo_url, homepage_url, language, stars, source, github_id, pushed_at)
                 VALUES (?1,?2,?3,'pet',?4,?5,?6,?7,'github',?8,?9)
                 ON CONFLICT(github_id) DO UPDATE SET
                    description=excluded.description,
                    homepage_url=excluded.homepage_url,
                    language=excluded.language,
                    stars=excluded.stars,
                    pushed_at=excluded.pushed_at,
                    updated_at=datetime('now')",
                rusqlite::params![
                    r.title, r.description, status, r.repo_url, r.homepage_url,
                    r.language, r.stars, r.github_id, r.pushed_at
                ],
            )
            .map_err(e)?;
        // topics -> tags (только при вставке/обновлении)
        if let Ok(pid) = conn.query_row(
            "SELECT id FROM projects WHERE github_id=?1",
            [r.github_id],
            |row| row.get::<_, i64>(0),
        ) {
            for topic in &r.topics {
                let name = topic.trim().to_lowercase();
                if name.is_empty() {
                    continue;
                }
                let _ = conn.execute("INSERT OR IGNORE INTO tags(name) VALUES (?1)", [&name]);
                if let Ok(tid) =
                    conn.query_row("SELECT id FROM tags WHERE name=?1", [&name], |row| {
                        row.get::<_, i64>(0)
                    })
                {
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO project_tags(project_id, tag_id) VALUES (?1,?2)",
                        rusqlite::params![pid, tid],
                    );
                }
            }
        }
        imported += changed.max(0) as usize;
    }
    db::set_setting(&conn, "github_username", &username).map_err(e)?;
    achievements::recompute(&conn).map_err(e)?;
    Ok(repos.len().min(imported.max(repos.len())))
}

// ───────────────────────── llm ─────────────────────────

fn llm_config(conn: &rusqlite::Connection) -> LlmConfig {
    let base_url = db::get_setting(conn, "llm_base_url")
        .ok()
        .flatten()
        .unwrap_or_else(|| "https://api.fireworks.ai/inference/v1".into());
    let model = db::get_setting(conn, "llm_model")
        .ok()
        .flatten()
        .unwrap_or_else(|| "accounts/fireworks/models/minimax-m3".into());
    let api_key = secrets::get_secret(secrets::LLM_API_KEY).ok().flatten();
    LlmConfig {
        base_url,
        model,
        api_key,
    }
}

#[tauri::command]
pub async fn llm_chat(state: State<'_, Db>, messages: Vec<ChatMessage>) -> R<String> {
    let cfg = {
        let conn = state.0.lock().map_err(e)?;
        llm_config(&conn)
    };
    llm::chat(&cfg, &messages).await.map_err(e)
}

/// Сгенерировать идеи/описание/теги по конкретному проекту.
#[tauri::command]
pub async fn llm_project_ideas(state: State<'_, Db>, project_id: i64, mode: String) -> R<String> {
    let (cfg, project) = {
        let conn = state.0.lock().map_err(e)?;
        let p = db::get_project(&conn, project_id).map_err(e)?;
        (llm_config(&conn), p)
    };

    let system = "Ты — лаконичный технический ассистент-сооснователь pet-проектов. Отвечай по-русски, конкретно, без воды.";
    let user = match mode.as_str() {
        "ideas" => format!(
            "Проект «{}». Описание: {}. Язык: {}. Статус: {}.\nДай 5 конкретных идей, что добавить или улучшить. Маркированный список.",
            project.title, project.description, project.language.clone().unwrap_or_default(), project.status
        ),
        "description" => format!(
            "Сгенерируй короткое цепляющее описание (2-3 предложения) для проекта «{}». Текущее описание: {}. Язык: {}.",
            project.title, project.description, project.language.clone().unwrap_or_default()
        ),
        "tags" => format!(
            "Предложи 5-8 коротких тегов (через запятую, в нижнем регистре) для проекта «{}». Описание: {}. Язык: {}.",
            project.title, project.description, project.language.clone().unwrap_or_default()
        ),
        _ => format!("Расскажи кратко о проекте «{}».", project.title),
    };

    let messages = vec![
        ChatMessage { role: "system".into(), content: system.into() },
        ChatMessage { role: "user".into(), content: user },
    ];
    llm::chat(&cfg, &messages).await.map_err(e)
}

#[derive(serde::Serialize)]
pub struct AgentReply {
    pub reply: String,
    pub actions: Vec<String>,
}

/// Агентный чат: модель может вызывать инструменты (читать/менять проекты и достижения).
#[tauri::command]
pub async fn llm_agent_chat(
    state: State<'_, Db>,
    messages: Vec<ChatMessage>,
) -> R<AgentReply> {
    let cfg = {
        let conn = state.0.lock().map_err(e)?;
        llm_config(&conn)
    };

    // Строим начальный список сообщений: system + история от клиента.
    let mut msgs: Vec<serde_json::Value> = Vec::new();
    msgs.push(serde_json::json!({"role": "system", "content": crate::agent::SYSTEM_PROMPT}));
    for m in &messages {
        if m.role == "system" {
            continue;
        }
        msgs.push(serde_json::json!({"role": m.role, "content": m.content}));
    }

    let tools = crate::agent::tools();
    let mut actions: Vec<String> = Vec::new();

    for _ in 0..8 {
        let body = serde_json::json!({
            "model": cfg.model,
            "messages": msgs,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": 0.4,
            "max_tokens": 8192,
        });
        let resp = llm::raw_chat(&cfg, body).await.map_err(e)?;
        let choice = resp
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .cloned()
            .ok_or_else(|| "Пустой ответ от LLM".to_string())?;

        let tool_calls = choice.get("tool_calls").and_then(|t| t.as_array()).cloned();

        match tool_calls {
            Some(calls) if !calls.is_empty() => {
                // Кладём сообщение ассистента с tool_calls обратно в историю
                // (только разрешённые поля, без reasoning_content и прочего).
                msgs.push(serde_json::json!({
                    "role": "assistant",
                    "content": choice.get("content").cloned().unwrap_or(serde_json::Value::Null),
                    "tool_calls": calls,
                }));
                // Исполняем каждый вызов под одной блокировкой БД.
                {
                    let conn = state.0.lock().map_err(e)?;
                    for call in &calls {
                        let id = call.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let func = call.get("function").cloned().unwrap_or_default();
                        let name = func.get("name").and_then(|v| v.as_str()).unwrap_or("");
                        let args_raw = func
                            .get("arguments")
                            .and_then(|v| v.as_str())
                            .unwrap_or("{}");
                        let args: serde_json::Value =
                            serde_json::from_str(args_raw).unwrap_or(serde_json::json!({}));
                        let outcome = match crate::agent::dispatch(&conn, name, &args) {
                            Ok(o) => o,
                            Err(err) => crate::agent::ToolOutcome {
                                result: format!("Ошибка инструмента: {err}"),
                                action: None,
                            },
                        };
                        if let Some(a) = outcome.action {
                            actions.push(a);
                        }
                        msgs.push(serde_json::json!({
                            "role": "tool",
                            "tool_call_id": id,
                            "content": outcome.result,
                        }));
                    }
                }
            }
            _ => {
                let reply = choice
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                return Ok(AgentReply { reply, actions });
            }
        }
    }

    Ok(AgentReply {
        reply: "Достигнут лимит шагов агента. Часть действий могла выполниться, проверь галерею.".into(),
        actions,
    })
}

/// Генерирует короткие описания для всех проектов без описания. Возвращает число обработанных.
#[tauri::command]
pub async fn llm_autodescribe_missing(state: State<'_, Db>) -> R<usize> {
    let (cfg, targets) = {
        let conn = state.0.lock().map_err(e)?;
        let cfg = llm_config(&conn);
        let all = db::list_projects(&conn, &ProjectFilter::default()).map_err(e)?;
        let targets: Vec<(i64, String, Option<String>)> = all
            .into_iter()
            .filter(|p| p.description.trim().is_empty())
            .map(|p| (p.id, p.title, p.language))
            .collect();
        (cfg, targets)
    };

    if cfg.model.trim().is_empty() {
        return Err("Не задана модель LLM в настройках.".into());
    }

    let mut done = 0usize;
    for (id, title, lang) in targets {
        let prompt = format!(
            "Напиши очень короткое описание (1-2 предложения, без эмодзи, без тире) для pet-проекта «{}». Язык/стек: {}. Верни только текст описания.",
            title,
            lang.unwrap_or_else(|| "не указан".into())
        );
        let messages = vec![
            ChatMessage { role: "system".into(), content: "Ты пишешь лаконичные описания проектов по-русски.".into() },
            ChatMessage { role: "user".into(), content: prompt },
        ];
        match llm::chat(&cfg, &messages).await {
            Ok(text) => {
                let desc = text.trim().trim_matches('"').to_string();
                if !desc.is_empty() {
                    let conn = state.0.lock().map_err(e)?;
                    db::set_description(&conn, id, &desc).map_err(e)?;
                    done += 1;
                }
            }
            Err(_) => continue,
        }
    }
    Ok(done)
}
