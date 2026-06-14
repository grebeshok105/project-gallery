import { useEffect, useMemo } from "react";
import { Trophy, Star, Stack, CheckCircle, GitBranch, Code } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/types";
import { Reveal } from "@/components/Reveal";
import { colorFor } from "@/lib/utils";

export function StatsView() {
  const { projects, stats, refreshAchievements } = useStore();

  useEffect(() => {
    void refreshAchievements();
  }, [refreshAchievements]);

  const langs = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) {
      const l = (p.language || "").trim();
      if (l) m.set(l, (m.get(l) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [projects]);

  const statuses = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) m.set(p.status, (m.get(p.status) || 0) + 1);
    return m;
  }, [projects]);

  const topStarred = useMemo(
    () => [...projects].sort((a, b) => b.stars - a.stars).filter((p) => p.stars > 0).slice(0, 5),
    [projects]
  );

  const ghCount = projects.filter((p) => p.source === "github").length;
  const maxLang = langs[0]?.[1] || 1;
  const achPct = stats && stats.achievements_total > 0
    ? Math.round((stats.achievements_unlocked / stats.achievements_total) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-8">
        <div className="eyebrow mb-3">аналитика</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Статистика</h1>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-8 pb-10 pt-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={<Stack weight="duotone" />} value={stats?.projects_total ?? 0} label="всего проектов" />
          <Kpi icon={<CheckCircle weight="duotone" />} value={stats?.projects_done ?? 0} label="завершено" />
          <Kpi icon={<Code weight="duotone" />} value={stats?.languages ?? 0} label="языков" />
          <Kpi icon={<Star weight="fill" />} value={stats?.stars_total ?? 0} label="звёзд всего" />
          <Kpi icon={<GitBranch weight="duotone" />} value={ghCount} label="из GitHub" />
          <Kpi icon={<Star weight="duotone" />} value={stats?.favorites ?? 0} label="избранных" />
          <Kpi icon={<Trophy weight="fill" />} value={`${stats?.achievements_unlocked ?? 0}/${stats?.achievements_total ?? 0}`} label="достижений" />
          <Kpi icon={<Trophy weight="duotone" />} value={`${achPct}%`} label="прогресс ачивок" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Reveal>
            <Panel title="по статусам">
              <div className="space-y-2.5">
                {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => {
                  const n = statuses.get(s) || 0;
                  const pct = projects.length ? Math.round((n / projects.length) * 100) : 0;
                  return (
                    <Bar key={s} label={STATUS_LABELS[s]} value={n} pct={pct} color="#6ea8fe" />
                  );
                })}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.05}>
            <Panel title="топ языков">
              {langs.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2.5">
                  {langs.map(([l, n]) => (
                    <Bar key={l} label={l} value={n} pct={Math.round((n / maxLang) * 100)} color={colorFor(l)} />
                  ))}
                </div>
              )}
            </Panel>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Panel title="самые звёздные">
            {topStarred.length === 0 ? (
              <Empty />
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {topStarred.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: colorFor(p.language || p.title) }} />
                    <span className="flex-1 truncate text-sm text-fg">{p.title}</span>
                    <span className="font-mono text-sm text-fg-muted">★ {p.stars}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function Kpi({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="bezel">
      <div className="bezel-core space-y-2 p-4">
        <div className="text-accent">{icon}</div>
        <div className="font-mono text-2xl font-medium tabular-nums text-fg">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-fg-dim">{label}</div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bezel h-full">
      <div className="bezel-core h-full p-5">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-faint">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Bar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono text-fg-dim">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full transition-all duration-700 ease-spring" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Empty() {
  return <div className="py-6 text-center text-sm text-fg-faint">Нет данных</div>;
}
