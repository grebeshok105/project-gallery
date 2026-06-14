-- Project Gallery — начальная схема
-- Выполняется один раз при первом запуске (см. db.rs)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'idea',      -- idea | active | paused | done | archived
    kind          TEXT NOT NULL DEFAULT 'pet',       -- pet | work | study | other
    cover         TEXT,                              -- путь/URL обложки (необязательно)
    repo_url      TEXT,
    homepage_url  TEXT,
    language      TEXT,                              -- основной язык (из GitHub или вручную)
    stars         INTEGER NOT NULL DEFAULT 0,
    favorite      INTEGER NOT NULL DEFAULT 0,        -- 0/1
    source        TEXT NOT NULL DEFAULT 'manual',    -- manual | github
    github_id     INTEGER UNIQUE,                    -- id репозитория для дедупликации
    pushed_at     TEXT,                              -- последний коммит (ISO)
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS project_tags (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tag_id)
);

-- Каталог достижений (определения)
CREATE TABLE IF NOT EXISTS achievements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT UNIQUE,                        -- для авто-ачивок; NULL для кастомных
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    icon         TEXT NOT NULL DEFAULT 'trophy',     -- имя иконки lucide
    kind         TEXT NOT NULL DEFAULT 'auto',       -- auto | custom
    metric       TEXT,                               -- projects_total | projects_done | languages | stars_total | favorites | github_imported
    target       INTEGER NOT NULL DEFAULT 1,         -- порог для разблокировки
    unlocked     INTEGER NOT NULL DEFAULT 0,         -- 0/1
    progress     INTEGER NOT NULL DEFAULT 0,         -- кэш текущего значения метрики
    unlocked_at  TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ключ-значение для настроек (нечувствительных). Секреты идут в Credential Manager.
CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_kind ON projects(kind);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);

-- Базовый набор авто-достижений
INSERT OR IGNORE INTO achievements (code, title, description, icon, kind, metric, target) VALUES
    ('first_project',   'Первый шаг',        'Добавь свой первый проект',                  'sparkles',  'auto', 'projects_total', 1),
    ('collector_5',     'Коллекционер',      'Собери 5 проектов в галерее',                'layers',    'auto', 'projects_total', 5),
    ('collector_15',    'Архивариус',        'Собери 15 проектов',                         'library',   'auto', 'projects_total', 15),
    ('finisher_1',      'Доведено до конца', 'Заверши свой первый проект',                 'check-circle','auto','projects_done', 1),
    ('finisher_5',      'Серийный финишёр',  'Заверши 5 проектов',                         'trophy',    'auto', 'projects_done', 5),
    ('polyglot_3',      'Полиглот',          'Используй 3 разных языка в проектах',        'code',      'auto', 'languages', 3),
    ('polyglot_6',      'Гиперполиглот',     'Используй 6 разных языков',                  'binary',    'auto', 'languages', 6),
    ('stargazer_50',    'Звездочёт',         'Набери 50 звёзд суммарно на GitHub',        'star',      'auto', 'stars_total', 50),
    ('curator',         'Куратор',           'Отметь 3 проекта избранными',               'heart',     'auto', 'favorites', 3),
    ('importer',        'Импортёр',          'Импортируй проекты из GitHub',              'github',    'auto', 'github_imported', 1);
