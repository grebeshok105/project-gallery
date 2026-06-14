import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Heart, Download, Loader2, Sparkles } from "lucide-react";
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
      pushToast({
        title: "Импорт завершён",
        description: `Загружено репозиториев: ${n}`,
        icon: "github",
      });
    } catch (e) {
      pushToast({
        title: "Ошибка импорта",
        description: String(e).slice(0, 60),
        icon: "github",
      });
    } finally {
      setImporting(false);
    }
  }

  async function autodescribe() {
    setDescribing(true);
    try {
      const n = await api.llmAutodescribeMissing();
      await refresh();
      pushToast({
        title: "Описания готовы",
        description: `Сгенерировано: ${n}`,
        icon: "sparkles",
      });
    } catch (e) {
      pushToast({
        title: "Ошибка генерации",
        description: String(e).slice(0, 60),
        icon: "sparkles",
      });
    } finally {
      setDescribing(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">Галерея проектов</h1>
          <span className="text-sm text-slate-500">{projects.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn-ghost"
              onClick={autodescribe}
              disabled={describing}
              title="Сгенерировать короткие описания для проектов без описания"
            >
              {describing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Описать ИИ
            </button>
            <button
              className="btn-ghost"
              onClick={importGithub}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Импорт GitHub
            </button>
            <button className="btn-primary" onClick={openNew}>
              <Plus className="h-4 w-4" /> Новый проект
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Поиск по названию, описанию, языку..."
              value={filter.search ?? ""}
              onChange={(e) => setFilter({ search: e.target.value })}
            />
          </div>

          <select
            className="input w-auto"
            value={filter.status ?? ""}
            onChange={(e) => setFilter({ status: e.target.value })}
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            className="input w-auto"
            value={filter.tag ?? ""}
            onChange={(e) => setFilter({ tag: e.target.value })}
          >
            <option value="">Все теги</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>

          <select
            className="input w-auto"
            value={filter.sort ?? "updated"}
            onChange={(e) => setFilter({ sort: e.target.value as never })}
          >
            <option value="updated">Сначала обновлённые</option>
            <option value="created">Сначала новые</option>
            <option value="title">По названию</option>
            <option value="stars">По звёздам</option>
          </select>

          <button
            className={`btn-ghost ${filter.favorite_only ? "text-danger border-danger/40" : ""}`}
            onClick={() => setFilter({ favorite_only: !filter.favorite_only })}
            title="Только избранное"
          >
            <Heart
              className="h-4 w-4"
              fill={filter.favorite_only ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-56 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Empty onNew={openNew} onImport={importGithub} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={setDetail}
                onFav={(pr) => api.toggleFavorite(pr.id).then(refresh)}
              />
            ))}
          </motion.div>
        )}
      </div>

      <ProjectDialog
        open={dialogOpen}
        project={editing}
        onClose={() => setDialogOpen(false)}
      />
      <ProjectDetail
        project={detail}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
      />
    </div>
  );
}

function Empty({
  onNew,
  onImport,
}: {
  onNew: () => void;
  onImport: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-6xl">🗂️</div>
      <div>
        <h3 className="text-lg font-semibold text-slate-200">
          Пока пусто
        </h3>
        <p className="text-sm text-slate-500">
          Добавь первый проект вручную или импортируй репозитории с GitHub.
        </p>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={onNew}>
          <Plus className="h-4 w-4" /> Новый проект
        </button>
        <button className="btn-ghost" onClick={onImport}>
          <Download className="h-4 w-4" /> Импорт GitHub
        </button>
      </div>
    </div>
  );
}
