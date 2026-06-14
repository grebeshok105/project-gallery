import { useEffect, useState } from "react";
import { Plus, Trash, Check, X } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Achievement } from "@/lib/types";
import { Icon, ICON_CHOICES } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

export function AchievementsView() {
  const { achievements, refreshAchievements } = useStore();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void refreshAchievements();
  }, [refreshAchievements]);

  const auto = achievements.filter((a) => a.kind === "auto");
  const custom = achievements.filter((a) =>
    ["custom", "manual", "metric", "milestone"].includes(a.kind)
  );
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-4 px-8 pt-8">
        <div>
          <div className="eyebrow mb-3">прогресс</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Достижения</h1>
          <p className="mt-1.5 text-sm text-fg-dim">
            <span className="font-mono text-fg">{unlocked}</span> из{" "}
            <span className="font-mono">{achievements.length}</span> разблокировано
          </p>
        </div>
        <button className="btn-primary group" onClick={() => setAdding(true)}>
          Своя цель
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
            <Plus weight="bold" className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-8 pb-10 pt-6">
        {custom.length > 0 && (
          <Section title="личные цели">
            {custom.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.04}>
                <CustomCard a={a} onChange={refreshAchievements} />
              </Reveal>
            ))}
          </Section>
        )}
        <Section title="авто-достижения">
          {auto.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.03}>
              <AutoCard a={a} />
            </Reveal>
          ))}
        </Section>
      </div>

      {adding && (
        <AddCustom
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void refreshAchievements();
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-faint">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function AutoCard({ a }: { a: Achievement }) {
  const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
  return (
    <div className={cn("bezel transition-opacity duration-500", !a.unlocked && "opacity-70")}>
      <div className="bezel-core space-y-4 p-5">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              a.unlocked ? "bg-gold/15 text-gold" : "bg-white/[0.03] text-fg-faint"
            )}
          >
            <Icon name={a.icon} weight={a.unlocked ? "fill" : "duotone"} className="h-6 w-6" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="font-medium text-fg">{a.title}</div>
            <div className="text-[13px] leading-snug text-fg-dim">{a.description}</div>
          </div>
        </div>
        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-spring", a.unlocked ? "bg-gold" : "bg-accent")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-right font-mono text-[11px] text-fg-faint">
            {a.progress}/{a.target}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomCard({ a, onChange }: { a: Achievement; onChange: () => void }) {
  return (
    <div className={cn("bezel", a.unlocked && "ring-1 ring-ok/30")}>
      <div className="bezel-core flex items-center gap-3.5 p-5">
        <button
          onClick={() => api.toggleCustomAchievement(a.id).then(onChange)}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ease-spring active:scale-95",
            a.unlocked ? "border-ok/40 bg-ok/15 text-ok" : "border-white/[0.08] text-fg-faint hover:border-accent/50"
          )}
        >
          {a.unlocked && <Check weight="bold" className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("font-medium text-fg", a.unlocked && "text-fg-dim line-through")}>
            {a.title}
          </div>
          {a.description && <div className="text-[13px] text-fg-dim">{a.description}</div>}
        </div>
        <button className="text-fg-faint transition-colors hover:text-danger" onClick={() => api.deleteCustomAchievement(a.id).then(onChange)}>
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AddCustom({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("target");
  const [kind, setKind] = useState<"manual" | "metric" | "milestone">("manual");
  const [metric, setMetric] = useState("projects_total");
  const [target, setTarget] = useState(5);

  async function save() {
    if (!title.trim()) return;
    await api.createCustomAchievement({
      title,
      description,
      icon,
      kind,
      metric: kind === "manual" ? null : metric,
      target: kind === "manual" ? null : target,
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-sunken/70 p-6 backdrop-blur-xl" onClick={onClose}>
      <div className="bezel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="bezel-core p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="eyebrow mb-2">новая цель</div>
              <h2 className="text-lg font-semibold text-fg">Личная цель</h2>
            </div>
            <button className="btn-icon" onClick={onClose}><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            <input className="input" placeholder="Например: зарелизить мод v5.0" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <input className="input" placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div>
              <div className="mb-2 text-xs text-fg-dim">Тип цели</div>
              <div className="flex gap-2">
                {([
                  ["manual", "Ручная"],
                  ["metric", "По метрике"],
                  ["milestone", "Веха"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex-1 rounded-2xl border px-3 py-2 text-xs transition-all duration-300 active:scale-95",
                      kind === k ? "border-accent/50 bg-accent/15 text-accent" : "border-white/[0.08] text-fg-faint hover:text-fg"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {kind !== "manual" && (
              <div className="flex gap-2">
                <select className="input flex-1" value={metric} onChange={(e) => setMetric(e.target.value)}>
                  <option value="projects_total">Всего проектов</option>
                  <option value="projects_done">Завершённых</option>
                  <option value="languages">Языков</option>
                  <option value="stars_total">Звёзд всего</option>
                  <option value="favorites">Избранных</option>
                  <option value="github_imported">Из GitHub</option>
                </select>
                <input
                  type="number"
                  className="input w-24"
                  value={target}
                  min={1}
                  onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}
            <div>
              <div className="mb-2 text-xs text-fg-dim">Иконка</div>
              <div className="flex flex-wrap gap-2">
                {ICON_CHOICES.map((name) => (
                  <button
                    key={name}
                    onClick={() => setIcon(name)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-300 active:scale-95",
                      icon === name ? "border-accent/50 bg-accent/15 text-accent" : "border-white/[0.08] text-fg-faint hover:text-fg"
                    )}
                  >
                    <Icon name={name} weight="duotone" className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-soft" onClick={onClose}>Отмена</button>
            <button className="btn-primary" onClick={save} disabled={!title.trim()}>Добавить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
