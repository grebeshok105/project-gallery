use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub summary: String,
    pub status: String,
    pub kind: String,
    pub cover: Option<String>,
    pub repo_url: Option<String>,
    pub homepage_url: Option<String>,
    pub language: Option<String>,
    pub stars: i64,
    #[serde(default)]
    pub activity_score: i64,
    #[serde(default)]
    pub open_prs: i64,
    pub last_commit_at: Option<String>,
    pub last_commit_msg: Option<String>,
    #[serde(default)]
    pub commit_count: i64,
    pub favorite: bool,
    pub source: String,
    pub github_id: Option<i64>,
    pub pushed_at: Option<String>,
    pub gh_created_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatSession {
    pub id: i64,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredChatMessage {
    pub id: i64,
    pub role: String,
    pub content: String,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoHit {
    pub full_name: String,
    pub description: String,
    pub html_url: String,
    pub language: Option<String>,
    pub stars: i64,
    pub forks: i64,
    pub topics: Vec<String>,
    pub pushed_at: Option<String>,
    pub gh_created_at: Option<String>,
    pub already_saved: bool,
}

/// Полезная нагрузка для создания/обновления проекта вручную.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_kind")]
    pub kind: String,
    pub cover: Option<String>,
    pub repo_url: Option<String>,
    pub homepage_url: Option<String>,
    pub language: Option<String>,
    #[serde(default)]
    pub favorite: bool,
    #[serde(default)]
    pub tags: Vec<String>,
}

fn default_status() -> String {
    "idea".to_string()
}
fn default_kind() -> String {
    "pet".to_string()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProjectFilter {
    pub search: Option<String>,
    pub status: Option<String>,
    pub kind: Option<String>,
    pub tag: Option<String>,
    pub favorite_only: Option<bool>,
    pub archived_only: Option<bool>,
    pub include_archived: Option<bool>,
    pub sort: Option<String>, // updated | created | title | stars | activity
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub id: i64,
    pub code: Option<String>,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub kind: String, // auto | custom | manual | metric | milestone
    pub metric: Option<String>,
    pub target: i64,
    pub unlocked: bool,
    pub progress: i64,
    pub unlocked_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAchievementInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_icon")]
    pub icon: String,
    /// Тип кастомного достижения: manual (ручная галка), metric (авто по метрике), milestone (веха)
    #[serde(default = "default_ach_kind")]
    pub kind: String,
    /// Метрика для metric/milestone
    pub metric: Option<String>,
    /// Целевое значение для metric/milestone
    pub target: Option<i64>,
}

fn default_icon() -> String {
    "target".to_string()
}
fn default_ach_kind() -> String {
    "manual".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub projects_total: i64,
    pub projects_done: i64,
    pub languages: i64,
    pub stars_total: i64,
    pub favorites: i64,
    pub github_imported: i64,
    pub achievements_unlocked: i64,
    pub achievements_total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlacklistEntry {
    pub id: i64,
    pub github_id: Option<i64>,
    pub repo_url: String,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: i64,
    pub name: String,
    pub url: String,
    pub enabled: bool,
    pub api_key: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerInput {
    pub name: String,
    pub url: String,
    pub api_key: Option<String>,
}

/// PR / активность репозитория
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoActivity {
    pub activity_score: i64,
    pub open_prs: i64,
    pub last_commit_at: Option<String>,
    pub last_commit_msg: Option<String>,
}

// ===================== v4: devlog / scores / collections / screenshots =====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevlogEntry {
    pub id: i64,
    pub project_id: i64,
    pub entry_date: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectScore {
    pub project_id: i64,
    pub ui: i64,
    pub code: i64,
    pub idea: i64,
    pub readiness: i64,
    pub note: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreHistoryPoint {
    pub ui: i64,
    pub code: i64,
    pub idea: i64,
    pub readiness: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectScoreInput {
    pub ui: i64,
    pub code: i64,
    pub idea: i64,
    pub readiness: i64,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub icon: String,
    pub created_at: String,
    #[serde(default)]
    pub project_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Screenshot {
    pub id: i64,
    pub project_id: i64,
    pub path: String,
    pub caption: String,
    pub created_at: String,
}
