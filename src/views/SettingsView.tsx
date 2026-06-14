import { useEffect, useState } from "react";
import { Github, Sparkles, Check, Loader2, Save } from "lucide-react";
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
      pushToast({
        title: "Сохранено",
        description: "Настройки обновлены",
        icon: "check-circle",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <h1 className="text-xl font-bold text-slate-100">Настройки</h1>
        <button className="btn-primary ml-auto" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* GitHub */}
        <Card title="GitHub" icon={<Github className="h-5 w-5" />}>
          <Field label="Имя пользователя">
            <input
              className="input"
              value={ghUser}
              onChange={(e) => setGhUser(e.target.value)}
              placeholder="grebeshok105"
            />
          </Field>
          <Field
            label="Personal access token (необязательно)"
            hint={
              config?.has_github_token
                ? "Токен уже сохранён в Credential Manager. Введи новый, чтобы заменить."
                : "Поднимает лимит запросов и открывает приватные репозитории."
            }
          >
            <input
              className="input"
              type="password"
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              placeholder={config?.has_github_token ? "•••••••• (сохранён)" : "ghp_..."}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={ghForks}
              onChange={(e) => setGhForks(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Импортировать форки
          </label>
        </Card>

        {/* LLM */}
        <Card title="LLM-ассистент" icon={<Sparkles className="h-5 w-5" />}>
          <p className="text-sm text-slate-500">
            Любой OpenAI-совместимый эндпоинт: OpenAI, OpenRouter, Together,
            локальный Ollama/LM Studio в OpenAI-режиме и т.п.
          </p>
          <Field label="Base URL">
            <input
              className="input"
              value={llmBase}
              onChange={(e) => setLlmBase(e.target.value)}
              placeholder="https://api.fireworks.ai/inference/v1"
            />
          </Field>
          <Field label="Модель">
            <input
              className="input"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              placeholder="accounts/fireworks/models/minimax-m3"
            />
          </Field>
          <Field
            label="API-ключ"
            hint={
              config?.has_llm_key
                ? "Ключ уже сохранён в Credential Manager. Введи новый, чтобы заменить."
                : "Хранится в Windows Credential Manager, не в базе."
            }
          >
            <input
              className="input"
              type="password"
              value={llmKey}
              onChange={(e) => setLlmKey(e.target.value)}
              placeholder={config?.has_llm_key ? "•••••••• (сохранён)" : "sk-..."}
            />
          </Field>
        </Card>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Check className="h-3.5 w-3.5 text-ok" />
          Все данные хранятся локально на этом компьютере.
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card max-w-2xl space-y-3 p-5">
      <div className="flex items-center gap-2 font-semibold text-slate-100">
        <span className="text-accent-soft">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
    </label>
  );
}
