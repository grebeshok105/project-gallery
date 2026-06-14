import { LayoutGrid, Trophy, Sparkles, Settings, FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export type Tab = "gallery" | "achievements" | "assistant" | "settings";

const ITEMS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "gallery", label: "Галерея", icon: LayoutGrid },
  { id: "achievements", label: "Достижения", icon: Trophy },
  { id: "assistant", label: "AI-ассистент", icon: Sparkles },
  { id: "settings", label: "Настройки", icon: Settings },
];

export function Sidebar({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const stats = useStore((s) => s.stats);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-bg-soft p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-glow">
          <FolderGit2 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold leading-tight text-slate-100">Gallery</div>
          <div className="text-xs text-slate-500">проекты · достижения</div>
        </div>
      </div>

      <nav className="space-y-1">
        {ITEMS.map((it) => {
          const I = it.icon;
          return (
            <div
              key={it.id}
              className={cn("nav-item", tab === it.id && "nav-item-active")}
              onClick={() => setTab(it.id)}
            >
              <I className="h-4 w-4" />
              {it.label}
              {it.id === "achievements" && stats && (
                <span className="ml-auto text-xs text-slate-500">
                  {stats.achievements_unlocked}/{stats.achievements_total}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {stats && (
        <div className="mt-auto space-y-2 rounded-2xl border border-line bg-bg p-4 text-sm">
          <Stat label="Проектов" value={stats.projects_total} />
          <Stat label="Завершено" value={stats.projects_done} />
          <Stat label="Языков" value={stats.languages} />
          <Stat label="★ всего" value={stats.stars_total} />
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </div>
  );
}
