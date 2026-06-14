import {
  SquaresFour, Trophy, Sparkle, GearSix, Stack, Compass, ChartBar,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export type Tab = "gallery" | "discover" | "stats" | "achievements" | "assistant" | "settings";

const ITEMS: { id: Tab; label: string; icon: typeof SquaresFour }[] = [
  { id: "gallery", label: "Галерея", icon: SquaresFour },
  { id: "discover", label: "Поиск репо", icon: Compass },
  { id: "stats", label: "Статистика", icon: ChartBar },
  { id: "achievements", label: "Достижения", icon: Trophy },
  { id: "assistant", label: "Агент", icon: Sparkle },
  { id: "settings", label: "Настройки", icon: GearSix },
];

export function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const stats = useStore((s) => s.stats);

  return (
    <aside className="relative z-10 flex w-[248px] shrink-0 flex-col p-4">
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="bezel p-1">
          <div className="bezel-core flex h-9 w-9 items-center justify-center rounded-2xl">
            <Stack weight="duotone" className="h-5 w-5 text-accent" />
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-fg">
            Gallery
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            studio
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {ITEMS.map((it) => {
          const I = it.icon;
          const active = tab === it.id;
          return (
            <div
              key={it.id}
              className={cn("nav-item", active && "nav-item-active")}
              onClick={() => setTab(it.id)}
            >
              <I
                weight={active ? "duotone" : "regular"}
                className={cn("h-[18px] w-[18px]", active && "text-accent")}
              />
              {it.label}
              {it.id === "achievements" && stats && (
                <span className="ml-auto font-mono text-[11px] text-fg-faint">
                  {stats.achievements_unlocked}/{stats.achievements_total}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {stats && (
        <div className="mt-auto bezel">
          <div className="bezel-core space-y-3 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
              сводка
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="проектов" value={stats.projects_total} />
              <Metric label="готово" value={stats.projects_done} />
              <Metric label="языков" value={stats.languages} />
              <Metric label="★ всего" value={stats.stars_total} />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-xl font-medium tabular-nums text-fg">
        {value}
      </div>
      <div className="text-[11px] text-fg-dim">{label}</div>
    </div>
  );
}
