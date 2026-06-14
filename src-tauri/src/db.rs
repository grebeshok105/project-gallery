use crate::models::*;
use anyhow::Result;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

/// Состояние приложения с соединением к SQLite.
pub struct Db(pub Mutex<Connection>);

const MIGRATION: &str = include_str!("../migrations/0001_init.sql");

pub fn open(app_dir: PathBuf) -> Result<Connection> {
    std::fs::create_dir_all(&app_dir)?;
    let path = app_dir.join("gallery.db");
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    conn.execute_batch(MIGRATION)?;
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
        status: r.get("status")?,
        kind: r.get("kind")?,
        cover: r.get("cover")?,
        repo_url: r.get("repo_url")?,
        homepage_url: r.get("homepage_url")?,
        language: r.get("language")?,
        stars: r.get("stars")?,
        favorite: r.get::<_, i64>("favorite")? != 0,
        source: r.get("source")?,
        github_id: r.get("github_id")?,
        pushed_at: r.get("pushed_at")?,
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
        "INSERT INTO projects (title, description, status, kind, cover, repo_url, homepage_url, language, favorite, source)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'manual')",
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
