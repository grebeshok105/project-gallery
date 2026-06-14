import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import {
  KIND_LABELS,
  STATUS_LABELS,
  type Project,
  type ProjectInput,
  type ProjectKind,
  type ProjectStatus,
} from "@/lib/types";
import { useStore } from "@/lib/store";

interface Props {
  open: boolean;
  project: Project | null; // null = создание
  onClose: () => void;
}

const EMPTY: ProjectInput = {
  title: "",
  description: "",
  status: "idea",
  kind: "pet",
  cover: null,
  repo_url: null,
  homepage_url: null,
  language: null,
  favorite: false,
  tags: [],
};

export function ProjectDialog({ open, project, onClose }: Props) {
  const refresh = useStore((s) => s.refresh);
  const [form, setForm] = useState<ProjectInput>(EMPTY);
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title,
        description: project.description,
        status: project.status,
        kind: project.kind,
        cover: project.cover,
        repo_url: project.repo_url,
        homepage_url: project.homepage_url,
        language: project.language,
        favorite: project.favorite,
        tags: project.tags,
      });
      setTagsText(project.tags.join(", "));
    } else {
      setForm(EMPTY);
      setTagsText("");
    }
  }, [project, open]);

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload: ProjectInput = {
        ...form,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (project) await api.updateProject(project.id, payload);
      else await api.createProject(payload);
      await refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card max-h-[88vh] w-full max-w-lg overflow-y-auto p-6"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {project ? "Редактировать проект" : "Новый проект"}
              </h2>
              <button className="btn-ghost px-2 py-2" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Название *">
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Codex-Superheroes"
                  autoFocus
                />
              </Field>

              <Field label="Описание">
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="О чём проект..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Статус">
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) =>
                      set("status", e.target.value as ProjectStatus)
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Тип">
                  <select
                    className="input"
                    value={form.kind}
                    onChange={(e) => set("kind", e.target.value as ProjectKind)}
                  >
                    {Object.entries(KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Язык / стек">
                <input
                  className="input"
                  value={form.language ?? ""}
                  onChange={(e) => set("language", e.target.value || null)}
                  placeholder="Rust, Java, TypeScript..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Репозиторий">
                  <input
                    className="input"
                    value={form.repo_url ?? ""}
                    onChange={(e) => set("repo_url", e.target.value || null)}
                    placeholder="https://github.com/..."
                  />
                </Field>
                <Field label="Сайт / демо">
                  <input
                    className="input"
                    value={form.homepage_url ?? ""}
                    onChange={(e) => set("homepage_url", e.target.value || null)}
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <Field label="Обложка (URL, необязательно)">
                <input
                  className="input"
                  value={form.cover ?? ""}
                  onChange={(e) => set("cover", e.target.value || null)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Теги (через запятую)">
                <input
                  className="input"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="minecraft, fabric, mod"
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={onClose}>
                Отмена
              </button>
              <button
                className="btn-primary"
                onClick={save}
                disabled={saving || !form.title.trim()}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
