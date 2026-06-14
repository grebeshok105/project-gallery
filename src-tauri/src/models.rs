use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: String,
    pub kind: String,
    pub cover: Option<String>,
    pub repo_url: Option<String>,
    pub homepage_url: Option<String>,
    pub language: Option<String>,
    pub stars: i64,
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
    pub sort: Option<String>, // updated | created | title | stars
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Achievement {
    pub id: i64,
    pub code: Option<String>,
    pub title: String,
    pub description: String,
    pub icon: String,
    pub kind: String,
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
}

fn default_icon() -> String {
    "target".to_string()
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
