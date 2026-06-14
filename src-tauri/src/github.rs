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
    out
}

// ──────────────────────── repo activity (PR + commits) ───────────────────

/// Сырые данные активности репозитория.
pub struct RepoActivityRaw {
    pub open_prs: i64,
    pub last_commit_at: Option<String>,
    pub last_commit_msg: Option<String>,
}

/// Извлекает owner/repo из URL вида https://github.com/owner/repo(/...).
pub fn parse_owner_repo(repo_url: &str) -> Option<(String, String)> {
    let rest = repo_url.split("github.com/").nth(1)?;
    let mut parts = rest.trim_end_matches('/').split('/');
    let owner = parts.next()?.to_string();
    let repo = parts.next()?.to_string();
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    Some((owner, repo.trim_end_matches(".git").to_string()))
}

#[derive(Debug, Deserialize)]
struct GhCommit {
    commit: GhCommitInner,
}

#[derive(Debug, Deserialize)]
struct GhCommitInner {
    message: String,
    committer: Option<GhCommitDate>,
}

#[derive(Debug, Deserialize)]
struct GhCommitDate {
    date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GhSearchCount {
    total_count: i64,
}

/// Тянет активность: число открытых PR + последний коммит (дата и сообщение).
pub async fn fetch_repo_activity(
    owner: &str,
    repo: &str,
    token: Option<&str>,
) -> anyhow::Result<RepoActivityRaw> {
    let client = client()?;

    // Последний коммит.
    let commits_url = format!(
        "https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    );
    let (last_commit_at, last_commit_msg) = match auth(client.get(&commits_url), token).send().await {
        Ok(resp) if resp.status().is_success() => {
            let commits: Vec<GhCommit> = resp.json().await.unwrap_or_default();
            if let Some(c) = commits.into_iter().next() {
                let date = c.commit.committer.and_then(|cm| cm.date);
                let msg = c.commit.message.lines().next().unwrap_or("").to_string();
                (date, Some(msg))
            } else {
                (None, None)
            }
        }
        _ => (None, None),
    };

    // Число открытых PR через Search API.
    let pr_query = format!("repo:{owner}/{repo}+type:pr+state:open");
    let pr_url = format!("https://api.github.com/search/issues?q={pr_query}&per_page=1");
    let open_prs = match auth(client.get(&pr_url), token).send().await {
        Ok(resp) if resp.status().is_success() => {
            let parsed: GhSearchCount = resp.json().await.unwrap_or(GhSearchCount { total_count: 0 });
            parsed.total_count
        }
        _ => 0,
    };

    Ok(RepoActivityRaw {
        open_prs,
        last_commit_at,
        last_commit_msg,
    })
}

/// Эвристическая оценка активности 1-10 по свежести коммита, PR и звёздам.
pub fn score_activity(
    last_commit_at: Option<&str>,
    open_prs: i64,
    stars: i64,
    status: &str,
) -> i64 {
    if status == "archived" {
        return 1;
    }
    let mut score: i64 = 1;

    // Свежесть последнего коммита (ISO 8601).
    if let Some(date) = last_commit_at {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(date) {
            let days = (chrono::Utc::now() - dt.with_timezone(&chrono::Utc)).num_days();
            score += match days {
                d if d <= 7 => 6,
                d if d <= 30 => 5,
                d if d <= 90 => 3,
                d if d <= 365 => 2,
                _ => 0,
            };
        }
    }

    // Открытые PR — признак живой работы.
    score += match open_prs {
        0 => 0,
        1..=3 => 1,
        _ => 2,
    };

    // Звёзды — лёгкий бонус.
    score += match stars {
        s if s >= 100 => 1,
        _ => 0,
    };

    score.clamp(1, 10)
}
