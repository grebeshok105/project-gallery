use crate::models::*;
use anyhow::Result;
use rusqlite::{params, Connection};

/// Считает агрегированную статистику по проектам и достижениям.
pub fn compute_stats(conn: &Connection) -> Result<Stats> {
    let projects_total: i64 =
        conn.query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0))?;
    let projects_done: i64 =
        conn.query_row("SELECT COUNT(*) FROM projects WHERE status='done'", [], |r| r.get(0))?;
    let languages: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT lower(language)) FROM projects WHERE language IS NOT NULL AND language<>''",
        [],
        |r| r.get(0),
    )?;
    let stars_total: i64 =
        conn.query_row("SELECT COALESCE(SUM(stars),0) FROM projects", [], |r| r.get(0))?;
    let favorites: i64 =
        conn.query_row("SELECT COUNT(*) FROM projects WHERE favorite=1", [], |r| r.get(0))?;
    let github_imported: i64 =
        conn.query_row("SELECT COUNT(*) FROM projects WHERE source='github'", [], |r| r.get(0))?;
    let achievements_unlocked: i64 =
        conn.query_row("SELECT COUNT(*) FROM achievements WHERE unlocked=1", [], |r| r.get(0))?;
    let achievements_total: i64 =
        conn.query_row("SELECT COUNT(*) FROM achievements", [], |r| r.get(0))?;

    Ok(Stats {
        projects_total,
        projects_done,
        languages,
        stars_total,
        favorites,
        github_imported,
        achievements_unlocked,
        achievements_total,
    })
}

fn metric_value(stats: &Stats, metric: &str) -> i64 {
    match metric {
        "projects_total" => stats.projects_total,
        "projects_done" => stats.projects_done,
        "languages" => stats.languages,
        "stars_total" => stats.stars_total,
        "favorites" => stats.favorites,
        "github_imported" => stats.github_imported,
        _ => 0,
    }
}

/// Пересчитывает прогресс авто-достижений и возвращает список тех,
/// что разблокировались именно сейчас (для всплывающих уведомлений).
pub fn recompute(conn: &Connection) -> Result<Vec<Achievement>> {
    let stats = compute_stats(conn)?;

    let defs: Vec<(i64, Option<String>, i64, bool)> = {
        let mut stmt = conn.prepare(
            "SELECT id, metric, target, unlocked FROM achievements WHERE kind='auto'",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, i64>(3)? != 0,
            ))
        })?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut newly = Vec::new();
    for (id, metric, target, was_unlocked) in defs {
        let value = metric.as_deref().map(|m| metric_value(&stats, m)).unwrap_or(0);
        let unlocked = value >= target;
        if unlocked && !was_unlocked {
            conn.execute(
                "UPDATE achievements SET progress=?1, unlocked=1, unlocked_at=datetime('now') WHERE id=?2",
                params![value, id],
            )?;
            newly.push(get_achievement(conn, id)?);
        } else {
            conn.execute(
                "UPDATE achievements SET progress=?1 WHERE id=?2",
                params![value, id],
            )?;
        }
    }
    Ok(newly)
}

pub fn get_achievement(conn: &Connection, id: i64) -> Result<Achievement> {
    let a = conn.query_row(
        "SELECT id, code, title, description, icon, kind, metric, target, unlocked, progress, unlocked_at
         FROM achievements WHERE id=?1",
        [id],
        |r| {
            Ok(Achievement {
                id: r.get(0)?,
                code: r.get(1)?,
                title: r.get(2)?,
                description: r.get(3)?,
                icon: r.get(4)?,
                kind: r.get(5)?,
                metric: r.get(6)?,
                target: r.get(7)?,
                unlocked: r.get::<_, i64>(8)? != 0,
                progress: r.get(9)?,
                unlocked_at: r.get(10)?,
            })
        },
    )?;
    Ok(a)
}

pub fn list_achievements(conn: &Connection) -> Result<Vec<Achievement>> {
    recompute(conn)?;
    let mut stmt = conn.prepare(
        "SELECT id, code, title, description, icon, kind, metric, target, unlocked, progress, unlocked_at
         FROM achievements ORDER BY unlocked DESC, kind ASC, target ASC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Achievement {
            id: r.get(0)?,
            code: r.get(1)?,
            title: r.get(2)?,
            description: r.get(3)?,
            icon: r.get(4)?,
            kind: r.get(5)?,
            metric: r.get(6)?,
            target: r.get(7)?,
            unlocked: r.get::<_, i64>(8)? != 0,
            progress: r.get(9)?,
            unlocked_at: r.get(10)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// Кастомная цель пользователя — простая ачивка, которую он отмечает вручную.
pub fn create_custom(conn: &Connection, input: &CustomAchievementInput) -> Result<i64> {
    conn.execute(
        "INSERT INTO achievements (title, description, icon, kind, target)
         VALUES (?1, ?2, ?3, 'custom', 1)",
        params![input.title, input.description, input.icon],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn toggle_custom(conn: &Connection, id: i64) -> Result<()> {
    conn.execute(
        "UPDATE achievements
         SET unlocked = 1 - unlocked,
             progress = 1 - unlocked,
             unlocked_at = CASE WHEN unlocked=0 THEN datetime('now') ELSE NULL END
         WHERE id=?1 AND kind='custom'",
        [id],
    )?;
    Ok(())
}

pub fn delete_custom(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM achievements WHERE id=?1 AND kind='custom'", [id])?;
    Ok(())
}
