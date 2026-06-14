-- v3: PR/активность, blacklist, mcp_servers, summary, типы достижений
-- Выполняется при PRAGMA user_version < 3

-- ===================== projects =====================
ALTER TABLE projects ADD COLUMN summary TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN activity_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN open_prs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN last_commit_at TEXT;
ALTER TABLE projects ADD COLUMN last_commit_msg TEXT;

-- ===================== blacklist =====================
CREATE TABLE IF NOT EXISTS blacklist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id  INTEGER UNIQUE,
    repo_url   TEXT NOT NULL,
    added_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== mcp_servers =====================
CREATE TABLE IF NOT EXISTS mcp_servers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    url        TEXT NOT NULL UNIQUE,
    enabled    INTEGER NOT NULL DEFAULT 1,
    api_key    TEXT,                              -- опциональный ключ (Context7)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===================== типы достижений =====================
-- Добавляем kind-колонке поддержку 'manual' и 'milestone'
-- (auto и custom уже есть; manual = кастом с ручной галкой, milestone = по метрике)
-- Переименовывать колонку не нужно — просто расширяем допустимые значения
-- (проверка делается на уровне Rust)

-- Индекс для быстрой фильтрации чёрного списка
CREATE INDEX IF NOT EXISTS idx_blacklist_github_id ON blacklist(github_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_repo_url ON blacklist(repo_url);

-- ===================== сид MCP-серверов =====================
-- DeepWiki — публичный индекс GitHub-репо, без ключа.
INSERT OR IGNORE INTO mcp_servers (name, url, enabled) VALUES
    ('DeepWiki', 'https://mcp.deepwiki.com/mcp', 1);
