import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ArrowUpRight, GithubLogo, PencilSimple, Trash, Heart, Star,
  Sparkle, Lightbulb, Tag, CircleNotch,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "@/lib/api";
import { KIND_LABELS, type Project } from "@/lib/types";
import { relativeDate } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./Badge";

const SPRING = [0.32, 0.72, 0, 1] as const;

interface Props {
  project: Project | null;
  onClose: () => void;
  onEdit: (p: Project) => void;
}

export function ProjectDetail({ project, onClose, onEdit }: Props) {
  const { refresh, config } = useStore();
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiOut, setAiOut] = useState("");

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
      setAiOut("Сначала задай модель LLM в настройках.");
      return;
    }
    setAiBusy(mode);
    setAiOut("");
    try {
      setAiOut(await api.llmProjectIdeas(project.id, mode));
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
          className="fixed inset-0 z-40 flex justify-end bg-ink-sunken/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="h-full w-full max-w-xl overflow-y-auto p-3"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ duration: 0.5, ease: SPRING }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel min-h-full p-6">
              <header className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow">{KIND_LABELS[project.kind]}</span>
                    <StatusBadge status={project.status} />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-fg">
                    {project.title}
                    {project.favorite && (
                      <Heart weight="fill" className="ml-2 inline h-5 w-5 text-danger" />
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-fg-dim">
                    {project.language && <span className="chip">{project.language}</span>}
                    {project.source === "github" && (
                      <span className="chip font-mono">
                        <Star weight="fill" className="h-3 w-3" /> {project.stars}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn-icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </button>
              </header>

              <p className="mt-6 whitespace-pre-wrap leading-relaxed text-fg-muted">
                {project.description || "Без описания."}
              </p>

              {project.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.map((t) => (
                    <span key={t} className="chip">#{t}</span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {project.repo_url && (
                  <button className="btn-soft" onClick={() => openUrl(project.repo_url!)}>
                    <GithubLogo className="h-4 w-4" /> Репозиторий
                  </button>
                )}
                {project.homepage_url && (
                  <button className="btn-soft" onClick={() => openUrl(project.homepage_url!)}>
                    <ArrowUpRight className="h-4 w-4" /> Сайт
                  </button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Info label="Источник" value={project.source === "github" ? "GitHub" : "Вручную"} />
                <Info label="Обновлён" value={relativeDate(project.updated_at)} />
                <Info label="Создан" value={relativeDate(project.created_at)} />
                {project.pushed_at && <Info label="Коммит" value={relativeDate(project.pushed_at)} />}
              </div>

              <div className="mt-6 panel p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <Sparkle weight="duotone" className="h-4 w-4" /> AI-подсказки
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AiBtn busy={aiBusy} mode="ideas" onClick={() => ai("ideas")}>
                    <Lightbulb className="h-3.5 w-3.5" /> Идеи
                  </AiBtn>
                  <AiBtn busy={aiBusy} mode="description" onClick={() => ai("description")}>
                    <PencilSimple className="h-3.5 w-3.5" /> Описание
                  </AiBtn>
                  <AiBtn busy={aiBusy} mode="tags" onClick={() => ai("tags")}>
                    <Tag className="h-3.5 w-3.5" /> Теги
                  </AiBtn>
                </div>
                {aiOut && (
                  <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-ink-sunken p-3.5 text-sm text-fg-muted">
                    {aiOut}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button className="btn-primary flex-1" onClick={() => onEdit(project)}>
                  <PencilSimple className="h-4 w-4" /> Редактировать
                </button>
                <button className="btn-icon" onClick={() => api.toggleFavorite(project.id).then(refresh)}>
                  <Heart weight={project.favorite ? "fill" : "regular"} className="h-4 w-4" />
                </button>
                <button className="btn-danger" onClick={del}>
                  <Trash className="h-4 w-4" />
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
    <div className="rounded-2xl bg-ink-sunken p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="mt-1 text-fg">{value}</div>
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
    <button className="btn-soft text-xs" onClick={onClick} disabled={!!busy}>
      {busy === mode ? <CircleNotch className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
