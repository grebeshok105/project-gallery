import { useEffect, useState } from "react";
import { GithubLogo, Sparkle, Check, CircleNotch, FloppyDisk, Palette, SpeakerHigh, Plugs, Prohibit, Trash, Plus, ArrowsClockwise } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { McpServer, BlacklistEntry } from "@/lib/types";
import { THEME_PRESETS, ACCENT_PRESETS, playSound, cn } from "@/lib/utils";

export function SettingsView() {
  const { config, refreshConfig, pushToast } = useStore();
  const [ghUser, setGhUser] = useState("");
  const [ghForks, setGhForks] = useState(false);
  const [ghToken, setGhToken] = useState("");
  const [llmBase, setLlmBase] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmKey, setLlmKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setGhUser(config.github_username || "grebeshok105");
      setGhForks(config.github_include_forks === "true");
      setLlmBase(config.llm_base_url);
      setLlmModel(config.llm_model);
    }
  }, [config]);

  async function save() {
    setSaving(true);
    try {
      await api.setSetting("github_username", ghUser);
      await api.setSetting("github_include_forks", String(ghForks));
      await api.setSetting("llm_base_url", llmBase);
      await api.setSetting("llm_model", llmModel);
      if (ghToken) await api.setSecret("github_token", ghToken);
      if (llmKey) await api.setSecret("llm_api_key", llmKey);
      setGhToken("");
      setLlmKey("");
      await refreshConfig();
      pushToast({ title: "сохранено", description: "Настройки обновлены", icon: "check-circle" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="flex items-end justify-between gap-4 px-6 pt-8">
        <div>
          <div className="eyebrow mb-3">конфигурация</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Настройки</h1>
        </div>
        <button className="btn-primary group" onClick={save} disabled={saving}>
          {saving ? <CircleNotch className="h-4 w-4 animate-spin" /> : null}
          Сохранить
          {!saving && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10">
              <FloppyDisk weight="bold" className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-10 pt-6">
        <Card title="GitHub" icon={<GithubLogo weight="duotone" className="h-5 w-5" />}>
          <Field label="Имя пользователя">
            <input className="input" value={ghUser} onChange={(e) => setGhUser(e.target.value)} placeholder="grebeshok105" />
          </Field>
          <Field
            label="Personal access token (необязательно)"
            hint={config?.has_github_token ? "Токен сохранён в Credential Manager. Введи новый, чтобы заменить." : "Поднимает лимит запросов и открывает приватные репозитории."}
          >
            <input className="input" type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder={config?.has_github_token ? "•••••••• (сохранён)" : "ghp_..."} />
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-fg-muted">
            <input type="checkbox" checked={ghForks} onChange={(e) => setGhForks(e.target.checked)} className="h-4 w-4 accent-accent" />
            Импортировать форки
          </label>
        </Card>

        <Card title="LLM-агент" icon={<Sparkle weight="duotone" className="h-5 w-5" />}>
          <p className="text-sm leading-relaxed text-fg-dim">
            Любой OpenAI-совместимый эндпоинт: Fireworks, OpenAI, OpenRouter,
            локальный Ollama/LM Studio в OpenAI-режиме.
          </p>
          <Field label="Base URL">
            <input className="input" value={llmBase} onChange={(e) => setLlmBase(e.target.value)} placeholder="https://api.fireworks.ai/inference/v1" />
          </Field>
          <Field label="Модель">
            <input className="input" value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder="accounts/fireworks/models/minimax-m3" />
          </Field>
          <Field
            label="API-ключ"
            hint={config?.has_llm_key ? "Ключ сохранён в Credential Manager. Введи новый, чтобы заменить." : "Хранится в Windows Credential Manager, не в базе."}
          >
            <input className="input" type="password" value={llmKey} onChange={(e) => setLlmKey(e.target.value)} placeholder={config?.has_llm_key ? "•••••••• (сохранён)" : "fw_... / sk-..."} />
          </Field>
        </Card>

        <AppearanceCard />
        <McpCard />
        <BlacklistCard />

        <div className="flex items-center gap-2 px-1 text-xs text-fg-faint">
          <Check weight="bold" className="h-3.5 w-3.5 text-ok" />
          Все данные хранятся локально на этом компьютере.
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bezel">
      <div className="bezel-core space-y-3.5 p-6">
        <div className="flex items-center gap-2.5 font-semibold tracking-tight text-fg">
          <span className="text-accent">{icon}</span>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg-dim">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-fg-faint">{hint}</span>}
    </label>
  );
}

function AppearanceCard() {
  const { theme, accent, soundEnabled, setAppearance } = useStore();
  return (
    <Card title="Оформление" icon={<Palette weight="duotone" className="h-5 w-5" />}>
      <Field label="Тема фона">
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((t) => (
            <button
              key={t.id}
              onClick={() => void setAppearance({ theme: t.id })}
              className={cn(
                "rounded-2xl border px-3.5 py-2 text-xs transition-all duration-300 active:scale-95",
                theme === t.id ? "border-accent/50 bg-accent/15 text-accent" : "border-white/[0.08] text-fg-faint hover:text-fg"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Акцент">
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_PRESETS.map((a) => (
            <button
              key={a.id}
              onClick={() => void setAppearance({ accent: a.id })}
              aria-label={a.label}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-transform duration-300 active:scale-90",
                accent === a.id ? "border-fg" : "border-transparent"
              )}
              style={{ background: `rgb(${a.rgb})` }}
            />
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-fg-muted">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(e) => {
            void setAppearance({ soundEnabled: e.target.checked });
            if (e.target.checked) playSound("unlock");
          }}
          className="h-4 w-4 accent-accent"
        />
        <SpeakerHigh weight="duotone" className="h-4 w-4" />
        Звуки и уведомления
      </label>
    </Card>
  );
}

function McpCard() {
  const { pushToast } = useStore();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [tools, setTools] = useState<Record<number, string[]>>({});

  async function load() {
    setServers(await api.listMcpServers());
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!name.trim() || !url.trim()) return;
    await api.addMcpServer({ name: name.trim(), url: url.trim(), api_key: apiKey.trim() || null });
    setName("");
    setUrl("");
    setApiKey("");
    await load();
  }

  async function probe(id: number) {
    setBusy(id);
    try {
      const list = await api.mcpListTools(id);
      setTools((t) => ({ ...t, [id]: list.map((x) => x.name) }));
      pushToast({ title: "MCP", description: `Найдено инструментов: ${list.length}`, icon: "plugs" });
    } catch (err) {
      pushToast({ title: "MCP ошибка", description: String(err).slice(0, 80), icon: "x" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="MCP-серверы" icon={<Plugs weight="duotone" className="h-5 w-5" />}>
      <p className="text-sm leading-relaxed text-fg-dim">
        Внешние remote-MCP серверы расширяют агента (DeepWiki — без ключа, Context7 — с ключом).
      </p>
      <div className="space-y-2">
        {servers.length === 0 && (
          <div className="text-xs text-fg-faint">Пока нет серверов.</div>
        )}
        {servers.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/[0.08] bg-ink-sunken p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => api.toggleMcpServer(s.id).then(load)}
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  s.enabled ? "bg-ok" : "bg-fg-faint"
                )}
                aria-label="вкл/выкл"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-fg">{s.name}</div>
                <div className="truncate font-mono text-[11px] text-fg-faint">{s.url}</div>
              </div>
              <button className="btn-soft px-3 py-1.5 text-xs" onClick={() => probe(s.id)} disabled={busy === s.id}>
                {busy === s.id ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : "tools/list"}
              </button>
              <button className="text-fg-faint hover:text-danger" onClick={() => api.removeMcpServer(s.id).then(load)}>
                <Trash className="h-4 w-4" />
              </button>
            </div>
            {tools[s.id] && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tools[s.id].map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-white/[0.05] pt-3">
        <input className="input" placeholder="Название (напр. Context7)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="https://mcp.context7.com/mcp" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="input" type="password" placeholder="API-ключ (необязательно)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <button className="btn-soft w-full" onClick={add} disabled={!name.trim() || !url.trim()}>
          <Plus className="h-4 w-4" /> Добавить сервер
        </button>
      </div>
    </Card>
  );
}

function BlacklistCard() {
  const [items, setItems] = useState<BlacklistEntry[]>([]);
  async function load() {
    setItems(await api.listBlacklist());
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <Card title="Чёрный список репо" icon={<Prohibit weight="duotone" className="h-5 w-5" />}>
      <p className="text-sm leading-relaxed text-fg-dim">
        Репозитории из списка пропускаются при импорте из GitHub.
      </p>
      {items.length === 0 ? (
        <div className="text-xs text-fg-faint">Список пуст.</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-ink-sunken px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">{b.repo_url}</span>
              <button className="text-fg-faint hover:text-accent" onClick={() => api.removeFromBlacklist(b.id).then(load)}>
                <ArrowsClockwise className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
