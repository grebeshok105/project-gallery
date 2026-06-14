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

/// Приводит имя к виду, допустимому для OpenAI function name (^[a-zA-Z0-9_-]+$).
fn sanitize_name(s: &str) -> String {
    let out: String = s
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect();
    if out.is_empty() {
        "mcp".to_string()
    } else {
        out
    }
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

#[tauri::command]
pub fn bulk_delete_achievements(state: State<Db>, ids: Vec<i64>) -> R<usize> {
    let conn = state.0.lock().map_err(e)?;
    let count = ids.len();
    for id in ids {
        let _ = achievements::delete_custom(&conn, id);
    }
    Ok(count)
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
        // Пропускаем репо из чёрного списка.
        if db::is_blacklisted(&conn, Some(r.github_id), &r.repo_url).unwrap_or(false) {
            continue;
        }
        let status = if r.archived { "archived" } else { "active" };
        // upsert по github_id: обновляем «живые» поля, не трогая ручные правки статуса/тегов сильно
        let changed = conn
            .execute(
                "INSERT INTO projects
                    (title, description, status, kind, repo_url, homepage_url, language, stars, source, github_id, pushed_at, gh_created_at)
                 VALUES (?1,?2,?3,'pet',?4,?5,?6,?7,'github',?8,?9,?10)
                 ON CONFLICT(github_id) DO UPDATE SET
                    description=excluded.description,
                    homepage_url=excluded.homepage_url,
                    language=excluded.language,
                    stars=excluded.stars,
                    pushed_at=excluded.pushed_at,
                    gh_created_at=excluded.gh_created_at,
                    updated_at=datetime('now')",
                rusqlite::params![
                    r.title, r.description, status, r.repo_url, r.homepage_url,
                    r.language, r.stars, r.github_id, r.pushed_at, r.gh_created_at
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

#[tauri::command]
pub async fn refresh_repo_activity(state: State<'_, Db>, project_id: i64) -> R<RepoActivity> {
    // Читаем проект и токен до асинхронного вызова.
    let (repo_url, stars, status) = {
        let conn = state.0.lock().map_err(e)?;
        let p = db::get_project(&conn, project_id).map_err(e)?;
        (p.repo_url.clone(), p.stars, p.status.clone())
    };
    let token = secrets::get_secret(secrets::GITHUB_TOKEN).ok().flatten();

    let url = repo_url.ok_or_else(|| "У проекта нет ссылки на репозиторий.".to_string())?;
    let (owner, repo) = github::parse_owner_repo(&url)
        .ok_or_else(|| "Не GitHub-репозиторий — активность недоступна.".to_string())?;

    let raw = github::fetch_repo_activity(&owner, &repo, token.as_deref())
        .await
        .map_err(e)?;
    let score = github::score_activity(raw.last_commit_at.as_deref(), raw.open_prs, stars, &status);

    let activity = RepoActivity {
        activity_score: score,
        open_prs: raw.open_prs,
        last_commit_at: raw.last_commit_at,
        last_commit_msg: raw.last_commit_msg,
    };
    {
        let conn = state.0.lock().map_err(e)?;
        db::set_activity(
            &conn,
            project_id,
            activity.activity_score,
            activity.open_prs,
            activity.last_commit_at.as_deref(),
            activity.last_commit_msg.as_deref(),
        )
        .map_err(e)?;
    }
    Ok(activity)
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
    chat_id: Option<i64>,
) -> R<AgentReply> {
    let cfg = {
        let conn = state.0.lock().map_err(e)?;
        llm_config(&conn)
    };

    // Собираем summary проектов и включённые MCP-серверы (под одной блокировкой).
    let (summaries, mcp_servers) = {
        let conn = state.0.lock().map_err(e)?;
        let filter = ProjectFilter {
            include_archived: Some(true),
            ..Default::default()
        };
        let projects = db::list_projects(&conn, &filter).unwrap_or_default();
        let summaries: Vec<String> = projects
            .iter()
            .filter(|p| !p.summary.trim().is_empty())
            .map(|p| format!("#{} {} — {}", p.id, p.title, p.summary))
            .collect();
        let enabled: Vec<McpServer> = db::list_mcp_servers(&conn)
            .unwrap_or_default()
            .into_iter()
            .filter(|s| s.enabled)
            .collect();
        (summaries, enabled)
    };

    // Подтягиваем MCP-инструменты с включённых серверов (async, вне блокировки БД).
    let mut mcp_tool_defs: Vec<serde_json::Value> = Vec::new();
    let mut mcp_map: std::collections::HashMap<String, (String, Option<String>, String)> =
        std::collections::HashMap::new();
    for srv in &mcp_servers {
        if let Ok(mcp_tools) = crate::mcp::list_tools(&srv.url, srv.api_key.as_deref()).await {
            let prefix = sanitize_name(&srv.name);
            for t in mcp_tools {
                let full = format!("{}__{}", prefix, t.name);
                mcp_tool_defs.push(serde_json::json!({
                    "type": "function",
                    "function": {"name": full, "description": t.description, "parameters": t.parameters}
                }));
                mcp_map.insert(full, (srv.url.clone(), srv.api_key.clone(), t.name.clone()));
            }
        }
    }

    // Системный промпт + summary проектов.
    let mut system_content = crate::agent::SYSTEM_PROMPT.to_string();
    if !summaries.is_empty() {
        system_content.push_str("\n\nКраткие сводки проектов (id, название, summary):\n");
        system_content.push_str(&summaries.join("\n"));
    }
    if !mcp_map.is_empty() {
        system_content.push_str("\n\nДоступны внешние MCP-инструменты (имена с префиксом сервера). Используй их для справки по коду/докам, когда полезно.");
    }

    // Строим начальный список сообщений: system + история от клиента.
    let mut msgs: Vec<serde_json::Value> = Vec::new();
    msgs.push(serde_json::json!({"role": "system", "content": system_content}));
    for m in &messages {
        if m.role == "system" {
            continue;
        }
        msgs.push(serde_json::json!({"role": m.role, "content": m.content}));
    }
    let last_user = messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.clone());

    // Объединяем нативные тулзы с MCP.
    let mut tools_vec = crate::agent::tools().as_array().cloned().unwrap_or_default();
    tools_vec.extend(mcp_tool_defs);
    let tools = serde_json::Value::Array(tools_vec);

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
                msgs.push(serde_json::json!({
                    "role": "assistant",
                    "content": choice.get("content").cloned().unwrap_or(serde_json::Value::Null),
                    "tool_calls": calls,
                }));
                // Обрабатываем каждый вызов: MCP — async без блокировки, локальные — под блокировкой.
                for call in &calls {
                    let id = call.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let func = call.get("function").cloned().unwrap_or_default();
                    let name = func.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let args_raw = func.get("arguments").and_then(|v| v.as_str()).unwrap_or("{}");
                    let args: serde_json::Value =
                        serde_json::from_str(args_raw).unwrap_or(serde_json::json!({}));

                    let (result_text, action) = if let Some((url, api_key, tool_name)) =
                        mcp_map.get(&name)
                    {
                        match crate::mcp::call_tool(url, api_key.as_deref(), tool_name, args).await {
                            Ok(text) => (text, Some(format!("MCP: {tool_name}"))),
                            Err(err) => (format!("Ошибка MCP-инструмента: {err}"), None),
                        }
                    } else {
                        let conn = state.0.lock().map_err(e)?;
                        match crate::agent::dispatch(&conn, &name, &args) {
                            Ok(o) => (o.result, o.action),
                            Err(err) => (format!("Ошибка инструмента: {err}"), None),
                        }
                    };
                    if let Some(a) = action {
                        actions.push(a);
                    }
                    msgs.push(serde_json::json!({
                        "role": "tool",
                        "tool_call_id": id,
                        "content": result_text,
                    }));
                }
            }
            _ => {
                let reply = choice
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if let Some(cid) = chat_id {
                    if let Ok(conn) = state.0.lock() {
                        if let Some(u) = &last_user {
                            let _ = db::add_chat_message(&conn, cid, "user", u, &[]);
                        }
                        let _ = db::add_chat_message(&conn, cid, "assistant", &reply, &actions);
                    }
                }
                return Ok(AgentReply { reply, actions });
            }
        }
    }

    if let Some(cid) = chat_id {
        if let Ok(conn) = state.0.lock() {
            if let Some(u) = &last_user {
                let _ = db::add_chat_message(&conn, cid, "user", u, &[]);
            }
            let _ = db::add_chat_message(&conn, cid, "assistant", "Достигнут лимит шагов агента, проверь галерею.", &actions);
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

// ──────────────────────── chat history ───────────────────

#[tauri::command]
pub fn list_chats(state: State<Db>) -> R<Vec<ChatSession>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_chats(&conn).map_err(e)
}

#[tauri::command]
pub fn create_chat(state: State<Db>, title: Option<String>) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    db::create_chat(&conn, &title.unwrap_or_else(|| "Новый чат".into())).map_err(e)
}

#[tauri::command]
pub fn rename_chat(state: State<Db>, id: i64, title: String) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::rename_chat(&conn, id, &title).map_err(e)
}

#[tauri::command]
pub fn delete_chat(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::delete_chat(&conn, id).map_err(e)
}

#[tauri::command]
pub fn list_chat_messages(state: State<Db>, chat_id: i64) -> R<Vec<StoredChatMessage>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_chat_messages(&conn, chat_id).map_err(e)
}

// ──────────────────────── discover ───────────────────

fn hits_to_repohits(conn: &rusqlite::Connection, hits: Vec<crate::github::SearchHit>) -> Vec<RepoHit> {
    hits.into_iter()
        .map(|h| {
            let already_saved: bool = conn
                .query_row(
                    "SELECT COUNT(*) FROM projects WHERE repo_url = ?1",
                    [&h.html_url],
                    |r| r.get::<_, i64>(0),
                )
                .map(|c| c > 0)
                .unwrap_or(false);
            RepoHit {
                full_name: h.full_name,
                description: h.description,
                html_url: h.html_url,
                language: h.language,
                stars: h.stars,
                forks: h.forks,
                topics: h.topics,
                pushed_at: h.pushed_at,
                gh_created_at: h.gh_created_at,
                already_saved,
            }
        })
        .collect()
}

/// Поиск репозиториев на GitHub по произвольному запросу.
#[tauri::command]
pub async fn search_github(state: State<'_, Db>, query: String) -> R<Vec<RepoHit>> {
    let token = secrets::get_secret(secrets::GITHUB_TOKEN).ok().flatten();
    let hits = github::search_repos(&query, token.as_deref(), 30).await.map_err(e)?;
    let conn = state.0.lock().map_err(e)?;
    Ok(hits_to_repohits(&conn, hits))
}

/// Находит похожие репозитории на заданный проект (по языку и тегам).
#[tauri::command]
pub async fn find_similar(state: State<'_, Db>, project_id: i64) -> R<Vec<RepoHit>> {
    let (query, own_url) = {
        let conn = state.0.lock().map_err(e)?;
        let p = db::get_project(&conn, project_id).map_err(e)?;
        let mut parts: Vec<String> = Vec::new();
        for t in p.tags.iter().take(3) {
            parts.push(format!("topic:{t}"));
        }
        if let Some(lang) = &p.language {
            if !lang.is_empty() {
                parts.push(format!("language:{lang}"));
            }
        }
        if parts.is_empty() {
            parts.push(p.title.clone());
        }
        parts.push("stars:>10".into());
        (parts.join(" "), p.repo_url.clone())
    };
    let token = secrets::get_secret(secrets::GITHUB_TOKEN).ok().flatten();
    let hits = github::search_repos(&query, token.as_deref(), 24).await.map_err(e)?;
    let conn = state.0.lock().map_err(e)?;
    let mut out = hits_to_repohits(&conn, hits);
    if let Some(u) = own_url {
        out.retain(|h| h.html_url != u);
    }
    Ok(out)
}

// ──────────────────────── blacklist ───────────────────

#[tauri::command]
pub fn list_blacklist(state: State<Db>) -> R<Vec<BlacklistEntry>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_blacklist(&conn).map_err(e)
}

#[tauri::command]
pub fn add_to_blacklist(state: State<Db>, github_id: Option<i64>, repo_url: String) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::add_to_blacklist(&conn, github_id, &repo_url).map_err(e)
}

#[tauri::command]
pub fn remove_from_blacklist(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::remove_from_blacklist(&conn, id).map_err(e)
}

// ──────────────────────── mcp servers ───────────────────

#[tauri::command]
pub fn list_mcp_servers(state: State<Db>) -> R<Vec<McpServer>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_mcp_servers(&conn).map_err(e)
}

#[tauri::command]
pub fn add_mcp_server(state: State<Db>, input: McpServerInput) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    db::add_mcp_server(&conn, &input.name, &input.url, input.api_key.as_deref()).map_err(e)
}

#[tauri::command]
pub fn remove_mcp_server(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::remove_mcp_server(&conn, id).map_err(e)
}

#[tauri::command]
pub fn toggle_mcp_server(state: State<Db>, id: i64) -> R<bool> {
    let conn = state.0.lock().map_err(e)?;
    db::toggle_mcp_server(&conn, id).map_err(e)
}

#[tauri::command]
pub async fn mcp_list_tools(state: State<'_, Db>, server_id: i64) -> R<Vec<crate::mcp::McpTool>> {
    let (url, api_key) = {
        let conn = state.0.lock().map_err(e)?;
        let servers = db::list_mcp_servers(&conn).map_err(e)?;
        servers.into_iter().find(|s| s.id == server_id)
            .map(|s| (s.url, s.api_key))
            .ok_or_else(|| "MCP-сервер не найден".to_string())?
    };
    crate::mcp::list_tools(&url, api_key.as_deref()).await.map_err(e)
}

// ──────────────────────── v4: devlog ───────────────────

#[tauri::command]
pub fn list_devlog(state: State<Db>, project_id: i64) -> R<Vec<DevlogEntry>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_devlog(&conn, project_id).map_err(e)
}

#[tauri::command]
pub fn add_devlog(state: State<Db>, project_id: i64, entry_date: Option<String>, body: String) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    db::add_devlog(&conn, project_id, entry_date.as_deref(), &body).map_err(e)
}

#[tauri::command]
pub fn delete_devlog(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::delete_devlog(&conn, id).map_err(e)
}

// ──────────────────────── v4: scores ───────────────────

#[tauri::command]
pub fn get_score(state: State<Db>, project_id: i64) -> R<Option<ProjectScore>> {
    let conn = state.0.lock().map_err(e)?;
    db::get_score(&conn, project_id).map_err(e)
}

#[tauri::command]
pub fn set_score(state: State<Db>, project_id: i64, input: ProjectScoreInput) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::set_score(&conn, project_id, &input).map_err(e)
}

#[tauri::command]
pub fn score_history(state: State<Db>, project_id: i64) -> R<Vec<ScoreHistoryPoint>> {
    let conn = state.0.lock().map_err(e)?;
    db::score_history(&conn, project_id).map_err(e)
}

// ──────────────────────── v4: collections ───────────────────

#[tauri::command]
pub fn list_collections(state: State<Db>) -> R<Vec<Collection>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_collections(&conn).map_err(e)
}

#[tauri::command]
pub fn create_collection(state: State<Db>, name: String, icon: Option<String>) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    db::create_collection(&conn, &name, &icon.unwrap_or_else(|| "folder".into())).map_err(e)
}

#[tauri::command]
pub fn delete_collection(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::delete_collection(&conn, id).map_err(e)
}

#[tauri::command]
pub fn set_collection_item(state: State<Db>, collection_id: i64, project_id: i64, add: bool) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::set_collection_item(&conn, collection_id, project_id, add).map_err(e)
}

// ──────────────────────── v4: screenshots ───────────────────

#[tauri::command]
pub fn list_screenshots(state: State<Db>, project_id: i64) -> R<Vec<Screenshot>> {
    let conn = state.0.lock().map_err(e)?;
    db::list_screenshots(&conn, project_id).map_err(e)
}

#[tauri::command]
pub fn add_screenshot(state: State<Db>, project_id: i64, path: String, caption: Option<String>) -> R<i64> {
    let conn = state.0.lock().map_err(e)?;
    db::add_screenshot(&conn, project_id, &path, &caption.unwrap_or_default()).map_err(e)
}

#[tauri::command]
pub fn delete_screenshot(state: State<Db>, id: i64) -> R<()> {
    let conn = state.0.lock().map_err(e)?;
    db::delete_screenshot(&conn, id).map_err(e)
}