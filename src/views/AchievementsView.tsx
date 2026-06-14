import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Achievement } from "@/lib/types";
import { Icon, ICON_CHOICES } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function AchievementsView() {
  const { achievements, refreshAchievements } = useStore();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void refreshAchievements();
  }, [refreshAchievements]);

  const auto = achievements.filter((a) => a.kind === "auto");
  const custom = achievements.filter((a) => a.kind === "custom");
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <h1 className="text-xl font-bold text-slate-100">Достижения</h1>
        <span className="text-sm text-slate-500">
          {unlocked}/{achievements.length} разблокировано
        </span>
        <button className="btn-primary ml-auto" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Своя цель
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {custom.length > 0 && (
          <Section title="Личные цели">
            {custom.map((a) => (
              <CustomCard key={a.id} a={a} onChange={refreshAchievements} />
            ))}
          </Section>
        )}
        <Section title="Авто-достижения">
          {auto.map((a) => (
            <AutoCard key={a.id} a={a} />
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function AutoCard({ a }: { a: Achievement }) {
  const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "card relative overflow-hidden p-4",
        a.unlocked ? "border-accent/40 shadow-glow" : "opacity-90"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            a.unlocked
              ? "bg-accent/20 text-accent-soft"
              : "bg-bg-soft text-slate-600"
          )}
        >
          <Icon name={a.icon} className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{a.title}</div>
          <div className="text-xs text-slate-500">{a.description}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              a.unlocked ? "bg-ok" : "bg-accent"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-right text-xs text-slate-500">
          {a.progress}/{a.target}
        </div>
      </div>
    </motion.div>
  );
}

function CustomCard({
  a,
  onChange,
}: {
  a: Achievement;
  onChange: () => void;
}) {
  return (
    <div
      className={cn(
        "card flex items-center gap-3 p-4",
        a.unlocked && "border-ok/40"
      )}
    >
      <button
        onClick={() => api.toggleCustomAchievement(a.id).then(onChange)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition",
          a.unlocked
            ? "border-ok bg-ok/20 text-ok"
            : "border-line text-slate-600 hover:border-accent"
        )}
      >
        {a.unlocked && <Check className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "font-medium text-slate-100",
            a.unlocked && "line-through opacity-70"
          )}
        >
          {a.title}
        </div>
        {a.description && (
          <div className="text-xs text-slate-500">{a.description}</div>
        )}
      </div>
      <button
        className="text-slate-600 hover:text-danger"
        onClick={() => api.deleteCustomAchievement(a.id).then(onChange)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddCustom({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("target");

  async function save() {
    if (!title.trim()) return;
    await api.createCustomAchievement({ title, description, icon });
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Новая личная цель</h2>
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Например: Зарелизить мод v5.0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="Описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <div className="mb-2 text-xs text-slate-400">Иконка</div>
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    icon === name
                      ? "border-accent bg-accent/20 text-accent-soft"
                      : "border-line text-slate-500 hover:text-slate-300"
                  )}
                >
                  <Icon name={name} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-primary" onClick={save} disabled={!title.trim()}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
