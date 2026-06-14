import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ExternalLink, Github, Pencil, Trash2, Heart, Star,
  Sparkles, Lightbulb, Tags, Loader2,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import { KIND_LABELS, type Project } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./Badge";

interface Props {
  project: Project | null;
  onClose: () => void;
  onEdit: (p: Project) => void;
}

export function ProjectDetail({ project, onClose, onEdit }: Props) {
  const { refresh, config } = useStore();
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiOut, setAiOut] = useState<string>("");

  async function del() {
    if (!project) return;
    if (!confirm(`Удалить проект «${project.title}»?`)) return;
    await api.deleteProject(project.id);
    await refresh();
    onClose();
  }

  async function ai(mode: "ideas" | "description" | "tags") {
    if (!project) return;
    if (!config?.llm_model) {
      setAiOut("⚠️ Сначала задай модель LLM в настройках.");
      return;
    }
    setAiBusy(mode);
    setAiOut("");
    try {
      const out = await api.llmProjectIdeas(project.id, mode);
      setAiOut(out);
    } catch (e) {
      setAiOut("Ошибка: " + String(e));
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-bg-soft"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">
                    {project.title}
                  </h2>
                  {project.favorite && (
                    <Heart className="h-4 w-4 text-danger" fill="currentColor" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span className="chip">{KIND_LABELS[project.kind]}</span>
                  {project.language && (
                    <span className="chip">{project.language}</span>
                  )}
                  {project.source === "github" && (
                    <span className="chip">
                      <Star className="h-3 w-3" /> {project.stars}
                    </span>
                  )}
                </div>
              </div>
              <button className="btn-ghost px-2 py-2" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-5 p-5">
              <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
                {project.description || "Без описания."}
              </p>

              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((t) => (
                    <span key={t} className="chip">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {project.repo_url && (
                  <button
                    className="btn-ghost"
                    onClick={() => openUrl(project.repo_url!)}
                  >
                    <Github className="h-4 w-4" /> Репозиторий
                  </button>
                )}
                {project.homepage_url && (
                  <button
                    className="btn-ghost"
                    onClick={() => openUrl(project.homepage_url!)}
                  >
                    <ExternalLink className="h-4 w-4" /> Сайт
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
                <Info label="Источник" value={project.source === "github" ? "GitHub" : "Вручную"} />
                <Info label="Обновлён" value={relativeDate(project.updated_at)} />
                <Info label="Создан" value={relativeDate(project.created_at)} />
                {project.pushed_at && (
                  <Info label="Последний коммит" value={relativeDate(project.pushed_at)} />
                )}
              </div>

              {/* LLM-ассистент по проекту */}
              <div className="card space-y-3 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent-soft">
                  <Sparkles className="h-4 w-4" /> AI-ассистент
                </div>
                <div className="flex flex-wrap gap-2">
                  <AiBtn busy={aiBusy} mode="ideas" onClick={() => ai("ideas")}>
                    <Lightbulb className="h-3.5 w-3.5" /> Идеи
                  </AiBtn>
                  <AiBtn busy={aiBusy} mode="description" onClick={() => ai("description")}>
                    <Pencil className="h-3.5 w-3.5" /> Описание
                  </AiBtn>
                  <AiBtn busy={aiBusy} mode="tags" onClick={() => ai("tags")}>
                    <Tags className="h-3.5 w-3.5" /> Теги
                  </AiBtn>
                </div>
                {aiOut && (
                  <div className="whitespace-pre-wrap rounded-xl bg-bg p-3 text-sm text-slate-300">
                    {aiOut}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn-primary flex-1" onClick={() => onEdit(project)}>
                  <Pencil className="h-4 w-4" /> Редактировать
                </button>
                <button className="btn-ghost" onClick={() => api.toggleFavorite(project.id).then(refresh)}>
                  <Heart className="h-4 w-4" fill={project.favorite ? "currentColor" : "none"} />
                </button>
                <button className="btn-danger" onClick={del}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-300">{value}</div>
    </div>
  );
}

function AiBtn({
  busy,
  mode,
  onClick,
  children,
}: {
  busy: string | null;
  mode: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="btn-ghost text-xs" onClick={onClick} disabled={!!busy}>
      {busy === mode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
