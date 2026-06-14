-- v4: devlog, оценки проекта, коллекции, скриншоты
-- Выполняется при PRAGMA user_version < 4

-- ===================== devlog =====================
CREATE TABLE IF NOT EXISTS devlog (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entry_date  TEXT NOT NULL DEFAULT (date('now')),
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_devlog_project ON devlog(project_id);

-- ===================== оценки проекта =====================
-- по одной строке на проект; обновляется через upsert.
CREATE TABLE IF NOT EXISTS project_scores (
    project_id   INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    ui           INTEGER NOT NULL DEFAULT 0,   -- 0-10
    code         INTEGER NOT NULL DEFAULT 0,   -- 0-10
    idea         INTEGER NOT NULL DEFAULT 0,   -- 0-10
    readiness    INTEGER NOT NULL DEFAULT 0,   -- 0-100 (%)
    note         TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- история изменений оценок
CREATE TABLE IF NOT EXISTS project_score_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ui          INTEGER NOT NULL,
    code        INTEGER NOT NULL,
    idea        INTEGER NOT NULL,
    readiness   INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_score_hist_project ON project_score_history(project_id);

-- ===================== коллекции =====================
CREATE TABLE IF NOT EXISTS collections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT 'folder',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_id  INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (collection_id, project_id)
);

-- ===================== скриншоты проекта =====================
CREATE TABLE IF NOT EXISTS screenshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path        TEXT NOT NULL,            -- путь к файлу/URL
    caption     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_screenshots_project ON screenshots(project_id);

-- projects: ручная метрика коммитов (для статы, если нет GitHub)
ALTER TABLE projects ADD COLUMN commit_count INTEGER NOT NULL DEFAULT 0;
