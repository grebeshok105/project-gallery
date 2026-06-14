import { useState } from "react";
import {
  MagnifyingGlass, CircleNotch, Star, GitFork, ArrowUpRight, Check,
  Plus, Sparkle, Compass,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { RepoHit } from "@/lib/types";
import { Reveal } from "@/components/Reveal";
import { colorFor, relativeDate } from "@/lib/utils";

const PRESETS = [
  "minecraft fabric mod",
  "rust tauri app",
  "react component library",
  "game engine",
];

export function DiscoverView() {
  const { config, refresh, pushToast } = useStore();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RepoHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);

  async function run(q?: string) {
    const text = (q ?? query).trim();
    if (!text || loading) return;
    setQuery(text);
    setLoading(true);
    try {
      setHits(await api.searchGithub(text));
    } catch (e) {
      pushToast({ title: "ошибка поиска", description: String(e).slice(0, 60), icon: "github" });
    } finally {
      setLoading(false);
    }
  }

  async function save(h: RepoHit) {
    await api.createProject({
      title: h.full_name.split("/").pop() || h.full_name,
      description: h.description,
      status: "idea",
      kind: "other",
      cover: null,
      repo_url: h.html_url,
      homepage_url: null,
      language: h.language,
      favorite: false,
      tags: h.topics.slice(0, 6),
    });
    setSaved((s) => new Set(s).add(h.html_url));
    await refresh();
    pushToast({ title: "сохранено", description: h.full_name, icon: "layers" });
  }

  async function summarize(h: RepoHit) {
    if (!config?.llm_model) {
      pushToast({ title: "нужна модель", description: "Задай LLM в настройках", icon: "sparkles" });
      return;
    }
    setSummarizing(h.html_url);
    try {
      const out = await api.llmChat([
        { role: "system", content: "Ты кратко и по-русски объясняешь, что за GitHub-репозиторий, в 1-2 предложениях, без воды." },
        { role: "user", content: `Репозиторий ${h.full_name}. Описание: ${h.description}. Язык: ${h.language ?? "—"}. Темы: ${h.topics.join(", ")}.` },
      ]);
      setSummaries((s) => ({ ...s, [h.html_url]: out }));
    } catch (e) {
      setSummaries((s) => ({ ...s, [h.html_url]: "Ошибка: " + String(e) }));
    } finally {
      setSummarizing(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-8">
        <div className="eyebrow mb-3">discover</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Поиск репозиториев</h1>
        <p className="mt-1.5 text-sm text-fg-dim">
          Ищи проекты на GitHub, смотри статистику и сохраняй в свою галерею.
        </p>

        <div className="mt-6 flex gap-2.5">
          <div className="relative flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
            <input
              className="input pl-10"
              placeholder="rust tauri, minecraft mod, game engine..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <button className="btn-primary" onClick={() => run()} disabled={loading}>
            {loading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <MagnifyingGlass className="h-4 w-4" />}
            Искать
          </button>
        </div>
        {hits.length === 0 && !loading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} className="chip transition-colors hover:text-fg" onClick={() => run(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10 pt-6">
        {hits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-fg-dim">
            <Compass weight="duotone" className="h-12 w-12 text-fg-faint" />
            <p className="max-w-sm text-sm">Введи запрос и найди интересные репозитории с быстрой статистикой.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {hits.map((h, i) => {
              const accent = colorFor(h.language || h.full_name);
              const isSaved = h.already_saved || saved.has(h.html_url);
              return (
                <Reveal key={h.html_url} delay={Math.min(i * 0.03, 0.3)}>
                  <div className="bezel">
                    <div className="bezel-core space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          className="truncate text-left font-medium tracking-tight text-fg hover:text-accent"
                          onClick={() => openUrl(h.html_url)}
                        >
                          {h.full_name}
                        </button>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-faint" />
                      </div>
                      <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-fg-muted">
                        {h.description || "Без описания"}
                      </p>
                      {summaries[h.html_url] && (
                        <div className="rounded-2xl bg-ink-sunken p-3 text-[13px] text-fg-muted">
                          {summaries[h.html_url]}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-fg-dim">
                        {h.language && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                            {h.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono"><Star weight="fill" className="h-3 w-3" /> {h.stars}</span>
                        <span className="flex items-center gap-1 font-mono"><GitFork className="h-3 w-3" /> {h.forks}</span>
                        {h.gh_created_at && <span className="font-mono">создан {relativeDate(h.gh_created_at)}</span>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          className="btn-soft flex-1 text-xs"
                          onClick={() => save(h)}
                          disabled={isSaved}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5 text-ok" /> : <Plus className="h-3.5 w-3.5" />}
                          {isSaved ? "В галерее" : "Сохранить"}
                        </button>
                        <button
                          className="btn-soft text-xs"
                          onClick={() => summarize(h)}
                          disabled={summarizing === h.html_url}
                        >
                          {summarizing === h.html_url ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : <Sparkle className="h-3.5 w-3.5" />}
                          Саммари
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
