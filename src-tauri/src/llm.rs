//! Провайдер-агностичный LLM-клиент.
//! Работает с любым OpenAI-совместимым `/chat/completions` эндпоинтом
//! (OpenAI, OpenRouter, Together, локальный Ollama/LM Studio с OpenAI-режимом и т.п.).
//! Пользователь задаёт base_url + model в настройках и кладёт ключ в Credential Manager.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // system | user | assistant
    pub content: String,
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMessage],
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: RespMessage,
}

#[derive(Deserialize)]
struct RespMessage {
    content: String,
}

pub struct LlmConfig {
    pub base_url: String, // напр. https://api.openai.com/v1
    pub model: String,    // напр. gpt-4o-mini
    pub api_key: Option<String>,
}

pub async fn chat(cfg: &LlmConfig, messages: &[ChatMessage]) -> anyhow::Result<String> {
    if cfg.model.trim().is_empty() {
        anyhow::bail!("Не задана модель LLM. Укажи её в настройках.");
    }
    let base = cfg.base_url.trim_end_matches('/');
    let url = format!("{base}/chat/completions");

    let client = reqwest::Client::builder()
        .user_agent("project-gallery")
        .build()?;

    let body = ChatRequest {
        model: &cfg.model,
        messages,
        temperature: 0.6,
        // Щедрый лимит: reasoning-модели (напр. minimax-m3) тратят часть
        // токенов на размышления, иначе content приходит пустым.
        max_tokens: 8192,
    };

    let mut req = client.post(&url).json(&body);
    if let Some(key) = &cfg.api_key {
        if !key.is_empty() {
            req = req.header("Authorization", format!("Bearer {key}"));
        }
    }

    let resp = req.send().await?;
    if !resp.status().is_success() {
        let code = resp.status();
        let text = resp.text().await.unwrap_or_default();
        anyhow::bail!("LLM API {code}: {text}");
    }
    let parsed: ChatResponse = resp.json().await?;
    let answer = parsed
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .unwrap_or_default();
    Ok(answer)
}
