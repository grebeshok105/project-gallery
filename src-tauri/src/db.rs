use crate::models::*;
use anyhow::Result;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

/// Состояние приложения с соединением к SQLite.
pub struct Db(pub Mutex<Connection>);

const MIGRATION_V1: &str = include_str!("../migrations/0001_init.sql");
const MIGRATION_V2: &str = include_str!("../migrations/0002_v2.sql");
const MIGRATION_V3: &str = include_str!("../migrations/0003_v3.sql");

pub fn open(app_dir: PathBuf) -> Result<Connection> {
    std::fs::create_dir_all(&app_dir)?;
    let path = app_dir.join("gallery.db");
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    // Идемпотентные миграции по PRAGMA user_version.
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    conn.execute_batch(MIGRATION_V1)?; // CREATE IF NOT EXISTS / INSERT OR IGNORE — безопасно
    if version < 2 {
        conn.execute_batch(MIGRATION_V2)?;
        conn.execute_batch("PRAGMA user_version = 2;")?;
    }
    if version < 3 {
        conn.execute_batch(MIGRATION_V3)?;
        conn.execute_batch("PRAGMA user_version = 3;")?;
    }
    Ok(conn)
}

// ───────────────────────── helpers ─────────────────────────

fn tags_for(conn: &Connection, project_id: i64) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT t.name FROM tags t
         JOIN project_tags pt ON pt.tag_id = t.id
         WHERE pt.project_id = ?1 ORDER BY t.name",
    )?;
    let rows = stmt.query_map([project_id], |r| r.get::<_, String>(0))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

fn set_tags(conn: &Connection, project_id: i64, tags: &[String]) -> Result<()> {
    conn.execute("DELETE FROM project_tags WHERE project_id = ?1", [project_id])?;
    for raw in tags {
        let name = raw.trim().to_lowercase();
        if name.is_empty() {
            continue;
        }
        conn.execute("INSERT OR IGNORE INTO tags(name) VALUES (?1)", params![name])?;
        let tag_id: i64 =
            conn.query_row("SELECT id FROM tags WHERE name = ?1", params![name], |r| r.get(0))?;
        conn.execute(
            "INSERT OR IGNORE INTO project_tags(project_id, tag_id) VALUES (?1, ?2)",
            params![project_id, tag_id],
        )?;
    }
    Ok(())
}

fn row_to_project(conn: &Connection, r: &rusqlite::Row) -> rusqlite::Result<Project> {
    let id: i64 = r.get("id")?;
    Ok(Project {
        id,
        title: r.get("title")?,
        description: r.get("description")?,
        summary: r.get("summary").unwrap_or_default(),
        status: r.get("status")?,
        kind: r.get("kind")?,
        cover: r.get("cover")?,
        repo_url: r.get("repo_url")?,
        homepage_url: r.get("homepage_url")?,
        language: r.get("language")?,
        stars: r.get("stars")?,
        activity_score: r.get("activity_score").unwrap_or(0),
        open_prs: r.get("open_prs").unwrap_or(0),
        last_commit_at: r.get("last_commit_at")?,
        last_commit_msg: r.get("last_commit_msg")?,
        favorite: r.get::<_, i64>("favorite")? != 0,
        source: r.get("source")?,
        github_id: r.get("github_id")?,
        pushed_at: r.get("pushed_at")?,
        gh_created_at: r.get("gh_created_at")?,
        created_at: r.get("created_at")?,
        updated_at: r.get("updated_at")?,
        tags: tags_for(conn, id).unwrap_or_default(),
    })
}

// ───────────────────────── projects ─────────────────────────

pub fn list_projects(conn: &Connection, f: &ProjectFilter) -> Result<Vec<Project>> {
    let mut sql = String::from("SELECT * FROM projects WHERE 1=1");
    if let Some(s) = &f.status {
        if !s.is_empty() {
            sql.push_str(&format!(" AND status = '{}'", s.replace('\'', "''")));
        }
    }
    if let Some(k) = &f.kind {
        if !k.is_empty() {
            sql.push_str(&format!(" AND kind = '{}'", k.replace('\'', "''")));
        }
    }
    if let Some(true) = f.favorite_only {
        sql.push_str(" AND favorite = 1");
    }
    if let Some(true) = f.archived_only {
        sql.push_str(" AND status = 'archived'");
    } else if let None = f.include_archived {
        // по умолчанию архивированные не показываем
        sql.push_str(" AND status != 'archived'");
    }
    if let Some(q) = &f.search {
        if !q.is_empty() {
            let q = q.replace('\'', "''");
            sql.push_str(&format!(
                " AND (title LIKE '%{q}%' OR description LIKE '%{q}%' OR language LIKE '%{q}%')"
            ));
        }
    }
    let order = match f.sort.as_deref() {
        Some("created") => "created_at DESC",
        Some("title") => "title COLLATE NOCASE ASC",
        Some("stars") => "stars DESC",
        Some("activity") => "activity_score DESC",
        _ => "updated_at DESC",
    };
    sql.push_str(&format!(" ORDER BY favorite DESC, {order}"));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| row_to_project(conn, r))?;
    let mut out: Vec<Project> = rows.filter_map(|r| r.ok()).collect();

    // Фильтр по тегу делаем после, чтобы не усложнять SQL.
    if let Some(tag) = &f.tag {
        if !tag.is_empty() {
            let t = tag.to_lowercase();
            out.retain(|p| p.tags.iter().any(|x| x == &t));
        }
    }
    Ok(out)
}

pub fn get_project(conn: &Connection, id: i64) -> Result<Project> {
    let p = conn.query_row("SELECT * FROM projects WHERE id = ?1", [id], |r| {
        row_to_project(conn, r)
    })?;
    Ok(p)
}

pub fn create_project(conn: &Connection, input: &ProjectInput) -> Result<i64> {
    conn.execute(
        "INSERT INTO projects (title, description, summary, status, kind, cover, repo_url, homepage_url, language, favorite, source)
         VALUES (?1,?2,'',?3,?4,?5,?6,?7,?8,?9,'manual')",
        params![
            input.title, input.description, input.status, input.kind, input.cover,
            input.repo_url, input.homepage_url, input.language, input.favorite as i64
        ],
    )?;
    let id = conn.last_insert_rowid();
    set_tags(conn, id, &input.tags)?;
    Ok(id)
}

pub fn update_project(conn: &Connection, id: i64, input: &ProjectInput) -> Result<()> {
    conn.execute(
        "UPDATE projects SET title=?1, description=?2, status=?3, kind=?4, cover=?5,
            repo_url=?6, homepage_url=?7, language=?8, favorite=?9, updated_at=datetime('now')
         WHERE id=?10",
        params![
            input.title, input.description, input.status, input.kind, input.cover,
            input.repo_url, input.homepage_url, input.language, input.favorite as i64, id
        ],
    )?;
    set_tags(conn, id, &input.tags)?;
    Ok(())
}

pub fn delete_project(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}

pub fn toggle_favorite(conn: &Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE projects SET favorite = 1 - favorite, updated_at=datetime('now') WHERE id = ?1",
        [id],
    )?;
    Ok(())
}

pub fn all_tags(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT name FROM tags ORDER BY name")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ───────────────────────── settings ─────────────────────────

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let v = conn
        .query_row("SELECT value FROM settings WHERE key=?1", [key], |r| {
            r.get::<_, String>(0)
        })
        .ok();
    Ok(v)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )?;
    Ok(())
}

// ──────────────────────── точечные правки (для агента) ───────────────────

pub fn set_description(conn: &Connection, id: i64, description: &str) -> Result<()> {
    conn.execute(
        "UPDATE projects SET description=?1, updated_at=datetime('now') WHERE id=?2",
        params![description, id],
    )?;
    Ok(())
}

pub fn set_summary(conn: &Connection, id: i64, summary: &str) -> Result<()> {
    conn.execute(
        "UPDATE projects SET summary=?1, updated_at=datetime('now') WHERE id=?2",
        params![summary, id],
    )?;
    Ok(())
}

pub fn set_status(conn: &Connection, id: i64, status: &str) -> Result<()> {
    conn.execute(
        "UPDATE projects SET status=?1, updated_at=datetime('now') WHERE id=?2",
        params![status, id],
    )?;
    Ok(())
}

pub fn set_activity(
    conn: &Connection,
    id: i64,
    score: i64,
    open_prs: i64,
    last_commit_at: Option<&str>,
    last_commit_msg: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE projects SET activity_score=?1, open_prs=?2, last_commit_at=?3, last_commit_msg=?4, updated_at=datetime('now') WHERE id=?5",
        params![score, open_prs, last_commit_at, last_commit_msg, id],
    )?;
    Ok(())
}

/// Добавляет теги к проекту без удаления существующих.
pub fn add_tags(conn: &Connection, id: i64, tags: &[String]) -> Result<()> {
    for raw in tags {
        let name = raw.trim().to_lowercase();
        if name.is_empty() {
            continue;
        }
        conn.execute("INSERT OR IGNORE INTO tags(name) VALUES (?1)", params![name])?;
        let tag_id: i64 =
            conn.query_row("SELECT id FROM tags WHERE name = ?1", params![name], |r| r.get(0))?;
        conn.execute(
            "INSERT OR IGNORE INTO project_tags(project_id, tag_id) VALUES (?1, ?2)",
            params![id, tag_id],
        )?;
    }
    conn.execute(
        "UPDATE projects SET updated_at=datetime('now') WHERE id=?1",
        [id],
    )?;
    Ok(())
}

pub fn set_language(conn: &Connection, id: i64, language: &str) -> Result<()> {
    conn.execute(
        "UPDATE projects SET language=?1, updated_at=datetime('now') WHERE id=?2",
        params![language, id],
    )?;
    Ok(())
}

// ──────────────────────── blacklist ───────────────────

pub fn add_to_blacklist(conn: &Connection, github_id: Option<i64>, repo_url: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO blacklist(github_id, repo_url) VALUES (?1, ?2)",
        params![github_id, repo_url],
    )?;
    Ok(())
}

pub fn remove_from_blacklist(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM blacklist WHERE id=?1", [id])?;
    Ok(())
}

pub fn list_blacklist(conn: &Connection) -> Result<Vec<BlacklistEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, github_id, repo_url, added_at FROM blacklist ORDER BY added_at DESC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(BlacklistEntry {
            id: r.get(0)?,
            github_id: r.get(1)?,
            repo_url: r.get(2)?,
            added_at: r.get(3)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn is_blacklisted(conn: &Connection, github_id: Option<i64>, repo_url: &str) -> Result<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM blacklist WHERE (github_id IS NOT NULL AND github_id = ?1) OR repo_url = ?2",
        params![github_id, repo_url],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

// ──────────────────────── mcp_servers ───────────────────

pub fn list_mcp_servers(conn: &Connection) -> Result<Vec<McpServer>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, enabled, api_key, created_at FROM mcp_servers ORDER BY name",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(McpServer {
            id: r.get(0)?,
            name: r.get(1)?,
            url: r.get(2)?,
            enabled: r.get::<_, i64>(3)? != 0,
            api_key: r.get(4)?,
            created_at: r.get(5)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn add_mcp_server(conn: &Connection, name: &str, url: &str, api_key: Option<&str>) -> Result<i64> {
    conn.execute(
        "INSERT INTO mcp_servers(name, url, api_key) VALUES (?1, ?2, ?3)",
        params![name, url, api_key],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn remove_mcp_server(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM mcp_servers WHERE id=?1", [id])?;
    Ok(())
}

pub fn toggle_mcp_server(conn: &Connection, id: i64) -> Result<bool> {
    conn.execute(
        "UPDATE mcp_servers SET enabled = 1 - enabled WHERE id=?1",
        [id],
    )?;
    let enabled: i64 = conn.query_row(
        "SELECT enabled FROM mcp_servers WHERE id=?1",
        [id],
        |r| r.get(0),
    )?;
    Ok(enabled != 0)
}

// ──────────────────────── chat history ───────────────────

pub fn list_chats(conn: &Connection) -> Result<Vec<ChatSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(ChatSession {
            id: r.get(0)?,
            title: r.get(1)?,
            created_at: r.get(2)?,
            updated_at: r.get(3)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn create_chat(conn: &Connection, title: &str) -> Result<i64> {
    conn.execute("INSERT INTO chat_sessions(title) VALUES (?1)", params![title])?;
    Ok(conn.last_insert_rowid())
}

pub fn rename_chat(conn: &Connection, id: i64, title: &str) -> Result<()> {
    conn.execute(
        "UPDATE chat_sessions SET title=?1, updated_at=datetime('now') WHERE id=?2",
        params![title, id],
    )?;
    Ok(())
}

pub fn delete_chat(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM chat_sessions WHERE id=?1", [id])?;
    Ok(())
}

pub fn list_chat_messages(conn: &Connection, chat_id: i64) -> Result<Vec<StoredChatMessage>> {
    let mut stmt = conn.prepare(
        "SELECT id, role, content, actions FROM chat_messages WHERE chat_id=?1 ORDER BY id",
    )?;
    let rows = stmt.query_map([chat_id], |r| {
        let actions_raw: Option<String> = r.get(3)?;
        let actions: Vec<String> = actions_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Ok(StoredChatMessage {
            id: r.get(0)?,
            role: r.get(1)?,
            content: r.get(2)?,
            actions,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn add_chat_message(
    conn: &Connection,
    chat_id: i64,
    role: &str,
    content: &str,
    actions: &[String],
) -> Result<()> {
    let actions_json = serde_json::to_string(actions).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO chat_messages(chat_id, role, content, actions) VALUES (?1,?2,?3,?4)",
        params![chat_id, role, content, actions_json],
    )?;
    conn.execute(
        "UPDATE chat_sessions SET updated_at=datetime('now') WHERE id=?1",
        [chat_id],
    )?;
    Ok(())
}
