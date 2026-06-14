//! Remote MCP-клиент: JSON-RPC поверх Streamable HTTP (с поддержкой SSE-ответов).
//! Делает полный хендшейк: initialize -> notifications/initialized -> tools/list | tools/call.
//! Захватывает Mcp-Session-Id из заголовка initialize и прокидывает в последующие запросы.

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Инструмент MCP в нормализованном виде (под формат OpenAI tools).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    #[serde(default)]
    pub description: String,
    /// JSON-schema параметров (из inputSchema MCP).
    pub parameters: serde_json::Value,
}

fn rpc(id: u64, method: &str, params: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    })
}

fn notify(method: &str, params: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
    })
}

/// Разбирает тело ответа: либо чистый JSON, либо SSE (`data: {...}`).
fn parse_body(content_type: &str, body: &str) -> Result<serde_json::Value> {
    if content_type.contains("text/event-stream") || body.trim_start().starts_with("event:") || body.contains("\ndata:") || body.starts_with("data:") {
        // Берём последний непустой data-кусок.
        let mut last_json: Option<serde_json::Value> = None;
        for line in body.lines() {
            let line = line.trim_start();
            if let Some(rest) = line.strip_prefix("data:") {
                let payload = rest.trim();
                if payload.is_empty() || payload == "[DONE]" {
                    continue;
                }
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) {
                    last_json = Some(v);
                }
            }
        }
        last_json.ok_or_else(|| anyhow::anyhow!("MCP SSE: не найден data-блок с JSON"))
    } else {
        Ok(serde_json::from_str(body)?)
    }
}

struct McpSession {
    client: reqwest::Client,
    url: String,
    api_key: Option<String>,
    session_id: Option<String>,
    next_id: u64,
}

impl McpSession {
    fn new(url: &str, api_key: Option<&str>) -> Result<Self> {
        let client = reqwest::Client::builder()
            .user_agent("project-gallery-mcp")
            .build()?;
        Ok(Self {
            client,
            url: url.to_string(),
            api_key: api_key.map(String::from),
            session_id: None,
            next_id: 1,
        })
    }

    fn id(&mut self) -> u64 {
        let v = self.next_id;
        self.next_id += 1;
        v
    }

    async fn send(&mut self, payload: &serde_json::Value, expect_response: bool) -> Result<Option<serde_json::Value>> {
        let mut req = self
            .client
            .post(&self.url)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json, text/event-stream")
            .json(payload);
        if let Some(sid) = &self.session_id {
            req = req.header("Mcp-Session-Id", sid);
        }
        if let Some(key) = &self.api_key {
            if !key.is_empty() {
                req = req.header("Authorization", format!("Bearer {key}"));
            }
        }
        let resp = req.send().await?;
        // Захватываем session id, если сервер его выдал.
        if let Some(sid) = resp.headers().get("Mcp-Session-Id").and_then(|v| v.to_str().ok()) {
            self.session_id = Some(sid.to_string());
        }
        let status = resp.status();
        let content_type = resp
            .headers()
            .get("Content-Type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        let text = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            anyhow::bail!("MCP HTTP {status}: {text}");
        }
        if !expect_response || text.trim().is_empty() {
            return Ok(None);
        }
        let json = parse_body(&content_type, &text)?;
        if let Some(err) = json.get("error") {
            if !err.is_null() {
                anyhow::bail!("MCP RPC error: {err}");
            }
        }
        Ok(json.get("result").cloned())
    }

    async fn handshake(&mut self) -> Result<()> {
        let id = self.id();
        let init = rpc(
            id,
            "initialize",
            serde_json::json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "project-gallery", "version": "1.0.0"}
            }),
        );
        self.send(&init, true).await?;
        // Уведомляем о готовности (ответа нет).
        let initialized = notify("notifications/initialized", serde_json::json!({}));
        let _ = self.send(&initialized, false).await;
        Ok(())
    }
}

/// Получает список инструментов с MCP-сервера.
pub async fn list_tools(url: &str, api_key: Option<&str>) -> Result<Vec<McpTool>> {
    let mut s = McpSession::new(url, api_key)?;
    s.handshake().await?;
    let id = s.id();
    let result = s
        .send(&rpc(id, "tools/list", serde_json::json!({})), true)
        .await?
        .ok_or_else(|| anyhow::anyhow!("MCP tools/list: пустой результат"))?;
    let raw = result
        .get("tools")
        .and_then(|t| t.as_array())
        .cloned()
        .unwrap_or_default();
    let tools = raw
        .into_iter()
        .map(|t| McpTool {
            name: t.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            description: t
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            parameters: t
                .get("inputSchema")
                .cloned()
                .unwrap_or_else(|| serde_json::json!({"type": "object", "properties": {}})),
        })
        .filter(|t| !t.name.is_empty())
        .collect();
    Ok(tools)
}

/// Вызывает инструмент на MCP-сервере и возвращает текстовый результат.
pub async fn call_tool(
    url: &str,
    api_key: Option<&str>,
    tool_name: &str,
    arguments: serde_json::Value,
) -> Result<String> {
    let mut s = McpSession::new(url, api_key)?;
    s.handshake().await?;
    let id = s.id();
    let result = s
        .send(
            &rpc(
                id,
                "tools/call",
                serde_json::json!({"name": tool_name, "arguments": arguments}),
            ),
            true,
        )
        .await?
        .ok_or_else(|| anyhow::anyhow!("MCP tools/call: пустой результат"))?;
    // MCP возвращает {content: [{type:"text", text:"..."}], isError: bool}.
    let mut out = String::new();
    if let Some(items) = result.get("content").and_then(|c| c.as_array()) {
        for item in items {
            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                if !out.is_empty() {
                    out.push('\n');
                }
                out.push_str(text);
            }
        }
    }
    if out.is_empty() {
        // На случай нестандартного формата — отдаём весь result.
        out = serde_json::to_string(&result).unwrap_or_default();
    }
    Ok(out)
}
