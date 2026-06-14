import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, MagnifyingGlass, Heart, DownloadSimple, CircleNotch, Sparkle, Archive,
} from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { STATUS_LABELS, type Project } from "@/lib/types";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectDialog } from "@/components/ProjectDialog";
import { ProjectDetail } from "@/components/ProjectDetail";
import { api } from "@/lib/api";

export function GalleryView() {
  const { projects, tags, filter, setFilter, loading, config, refresh, pushToast } =
    useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detail, setDetail] = useState<Project | null>(null);
  const [importing, setImporting] = useState(false);
  const [describing, setDescribing] = useState(false);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(p: Project) {
    setDetail(null);
    setEditing(p);
    setDialogOpen(true);
  }

  async function importGithub() {
    const username = config?.github_username || "grebeshok105";
    setImporting(true);
    try {
      const n = await api.importGithub(username);
      await refresh();
      pushToast({ title: "импорт завершён", description: `Репозиториев: ${n}`, icon: "github" });
    } catch (e) {
      pushToast({ title: "ошибка импорта", description: String(e).slice(0, 60), icon: "github" });
    } finally {
      setImporting(false);
    }
  }

  async function autodescribe() {
    setDescribing(true);
    try {
      const n = await api.llmAutodescribeMissing();
      await refresh();
      pushToast({ title: "описания готовы", description: `Сгенерировано: ${n}`, icon: "sparkles" });
    } catch (e) {
      pushToast({ title: "ошибка генерации", description: String(e).slice(0, 60), icon: "sparkles" });
    } finally {
      setDescribing(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">коллекция</div>
            <h1 className="text-3xl font-semibold tracking-tight text-fg">
              Галерея проектов
            </h1>
            <p className="mt-1.5 text-sm text-fg-dim">
              {projects.length} {plural(projects.length)} в коллекции
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-soft" onClick={autodescribe} disabled={describing} title="Короткие описания для проектов без описания">
              {describing ? <CircleNotch className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}
              Описать ИИ
            </button>
            <button className="btn-soft" onClick={importGithub} disabled={importing}>
              {importing ? <CircleNotch className="h-4 w-4 animate-spin" /> : <DownloadSimple className="h-4 w-4" />}
              Импорт
            </button>
            <button className="btn-primary group" onClick={openNew}>
              Новый проект
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-spring group-hover:translate-x-0.5">
                <Plus weight="bold" className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
            <input
              className="input pl-10"
              placeholder="Поиск по названию, описанию, языку..."
              value={filter.search ?? ""}
              onChange={(e) => setFilter({ search: e.target.value })}
            />
          </div>
          <select className="input w-auto" value={filter.status ?? ""} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="" className="bg-ink-raised">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-ink-raised">{v}</option>
            ))}
          </select>
          <select className="input w-auto" value={filter.tag ?? ""} onChange={(e) => setFilter({ tag: e.target.value })}>
            <option value="" className="bg-ink-raised">Все теги</option>
            {tags.map((t) => (
              <option key={t} value={t} className="bg-ink-raised">#{t}</option>
            ))}
          </select>
          <select className="input w-auto" value={filter.sort ?? "updated"} onChange={(e) => setFilter({ sort: e.target.value as never })}>
            <option value="updated" className="bg-ink-raised">Обновлённые</option>
            <option value="created" className="bg-ink-raised">Новые</option>
            <option value="title" className="bg-ink-raised">По имени</option>
            <option value="stars" className="bg-ink-raised">По звёздам</option>
            <option value="activity" className="bg-ink-raised">По активности</option>
          </select>
          <button
            className={`btn-icon ${filter.favorite_only ? "border-danger/40 text-danger" : ""}`}
            onClick={() => setFilter({ favorite_only: !filter.favorite_only })}
            title="Только избранное"
          >
            <Heart weight={filter.favorite_only ? "fill" : "regular"} className="h-4 w-4" />
          </button>
          <button
            className={`btn-icon ${filter.include_archived ? "border-accent/40 text-accent" : ""}`}
            onClick={() => setFilter({ include_archived: !filter.include_archived })}
            title="Показать архив"
          >
            <Archive weight={filter.include_archived ? "fill" : "regular"} className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10 pt-6">
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bezel">
                <div className="bezel-core h-56 animate-pulse" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Empty onNew={openNew} onImport={importGithub} />
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                onOpen={setDetail}
                onFav={(pr) => api.toggleFavorite(pr.id).then(refresh)}
              />
            ))}
          </motion.div>
        )}
      </div>

      <ProjectDialog open={dialogOpen} project={editing} onClose={() => setDialogOpen(false)} />
      <ProjectDetail project={detail} onClose={() => setDetail(null)} onEdit={openEdit} />
    </div>
  );
}

function plural(n: number): string {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return "проект";
  if (d >= 2 && d <= 4 && (h < 10 || h >= 20)) return "проекта";
  return "проектов";
}

function Empty({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <div className="bezel">
        <div className="bezel-core flex h-20 w-20 items-center justify-center">
          <Plus weight="light" className="h-8 w-8 text-fg-faint" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-fg">Коллекция пуста</h3>
        <p className="mt-1 max-w-sm text-sm text-fg-dim">
          Добавь первый проект вручную или импортируй репозитории с GitHub.
        </p>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={onNew}>Новый проект</button>
        <button className="btn-soft" onClick={onImport}>Импорт GitHub</button>
      </div>
    </div>
  );
}
