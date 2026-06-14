//! Импорт и поиск репозиториев GitHub.
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
    #[serde(default)]
    forks_count: i64,
    fork: bool,
    archived: bool,
    pushed_at: Option<String>,
    created_at: Option<String>,
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
    pub gh_created_at: Option<String>,
    pub topics: Vec<String>,
}

/// Результат поиска (для Discover / похожих репо).
#[derive(Debug, Clone)]
pub struct SearchHit {
    pub full_name: String,
    pub description: String,
    pub html_url: String,
    pub language: Option<String>,
    pub stars: i64,
    pub forks: i64,
    pub topics: Vec<String>,
    pub pushed_at: Option<String>,
    pub gh_created_at: Option<String>,
}

fn client() -> reqwest::Result<reqwest::Client> {
    reqwest::Client::builder().user_agent("project-gallery").build()
}

fn auth(req: reqwest::RequestBuilder, token: Option<&str>) -> reqwest::RequestBuilder {
    let mut req = req
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28");
    if let Some(t) = token {
        if !t.is_empty() {
            req = req.header("Authorization", format!("Bearer {t}"));
        }
    }
    req
}

pub async fn fetch_user_repos(
    username: &str,
    token: Option<&str>,
    include_forks: bool,
) -> anyhow::Result<Vec<ImportedRepo>> {
    let client = client()?;
    let mut out = Vec::new();
    let mut page = 1u32;
    loop {
        let url = format!(
            "https://api.github.com/users/{username}/repos?per_page=100&page={page}&sort=pushed"
        );
        let resp = auth(client.get(&url), token).send().await?;
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
                gh_created_at: r.created_at,
                topics: r.topics,
            });
            let _ = r.full_name;
        }
        if count < 100 {
            break;
        }
        page += 1;
        if page > 10 {
            break;
        }
    }
    Ok(out)
}

#[derive(Debug, Deserialize)]
struct SearchResponse {
    items: Vec<GhRepo>,
}

/// Поиск репозиториев по произвольному GitHub-запросу.
pub async fn search_repos(
    query: &str,
    token: Option<&str>,
    limit: u32,
) -> anyhow::Result<Vec<SearchHit>> {
    let client = client()?;
    let per = limit.min(50).max(1);
    let url = format!(
        "https://api.github.com/search/repositories?q={}&sort=stars&order=desc&per_page={per}",
        urlencoding(query)
    );
    let resp = auth(client.get(&url), token).send().await?;
    if !resp.status().is_success() {
        let code = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("GitHub Search {code}: {body}");
    }
    let parsed: SearchResponse = resp.json().await?;
    Ok(parsed
        .items
        .into_iter()
        .map(|r| SearchHit {
            full_name: r.full_name,
            description: r.description.unwrap_or_default(),
            html_url: r.html_url,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            topics: r.topics,
            pushed_at: r.pushed_at,
            gh_created_at: r.created_at,
        })
        .collect())
}

/// Минимальное url-кодирование для строки запроса.
fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 3);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            b' ' => out.push_str("%20"),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}
