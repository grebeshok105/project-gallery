import { useEffect, useState } from "react";
import { GithubLogo, Sparkle, Check, CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

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
