//! Импорт репозиториев пользователя с GitHub.
//! Токен необязателен (публичные репо доступны без него), но с токеном
//! поднимается лимит запросов и видны приватные репозитории.

use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct GhRepo {
    id: i64,
    name: String,
    full_name: String,
    description: Option<String>,
    html_url: String,
    homepage: Option<String>,
    language: Option<String>,
    stargazers_count: i64,
    fork: bool,
    archived: bool,
    pushed_at: Option<String>,
    #[serde(default)]
    topics: Vec<String>,
}

/// Нормализованный репозиторий, готовый к мапингу в Project.
#[derive(Debug, Clone)]
pub struct ImportedRepo {
    pub github_id: i64,
    pub title: String,
    pub description: String,
    pub repo_url: String,
    pub homepage_url: Option<String>,
    pub language: Option<String>,
    pub stars: i64,
    pub archived: bool,
    pub pushed_at: Option<String>,
    pub topics: Vec<String>,
}

pub async fn fetch_user_repos(
    username: &str,
    token: Option<&str>,
    include_forks: bool,
) -> anyhow::Result<Vec<ImportedRepo>> {
    let client = reqwest::Client::builder()
        .user_agent("project-gallery")
        .build()?;

    let mut out = Vec::new();
    let mut page = 1u32;
    loop {
        let url = format!(
            "https://api.github.com/users/{username}/repos?per_page=100&page={page}&sort=pushed"
        );
        let mut req = client
            .get(&url)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28");
        if let Some(t) = token {
            if !t.is_empty() {
                req = req.header("Authorization", format!("Bearer {t}"));
            }
        }
        let resp = req.send().await?;
        if !resp.status().is_success() {
            let code = resp.status();
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("GitHub API {code}: {body}");
        }
        let repos: Vec<GhRepo> = resp.json().await?;
        if repos.is_empty() {
            break;
        }
        let count = repos.len();
        for r in repos {
            if r.fork && !include_forks {
                continue;
            }
            out.push(ImportedRepo {
                github_id: r.id,
                title: r.name,
                description: r.description.unwrap_or_default(),
                repo_url: r.html_url,
                homepage_url: r.homepage.filter(|s| !s.is_empty()),
                language: r.language,
                stars: r.stargazers_count,
                archived: r.archived,
                pushed_at: r.pushed_at,
                topics: r.topics,
            });
            let _ = r.full_name;
        }
        if count < 100 {
            break;
        }
        page += 1;
        if page > 10 {
            break; // предохранитель
        }
    }
    Ok(out)
}
