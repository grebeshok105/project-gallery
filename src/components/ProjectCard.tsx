import { motion } from "framer-motion";
import { Heart, Star, GitBranch } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn, colorFor, relativeDate } from "@/lib/utils";
import { StatusBadge } from "./Badge";

interface Props {
  project: Project;
  onOpen: (p: Project) => void;
  onFav: (p: Project) => void;
}

export function ProjectCard({ project, onOpen, onFav }: Props) {
  const accent = colorFor(project.language || project.title);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpen(project)}
      className="card group relative cursor-pointer overflow-hidden p-0 hover:border-accent/40 hover:shadow-glow"
    >
      <div
        className="h-24 w-full"
        style={{
          background: `linear-gradient(135deg, ${accent}33, transparent 70%), radial-gradient(circle at 80% 20%, ${accent}22, transparent 50%)`,
        }}
      >
        {project.cover && (
          <img
            src={project.cover}
            alt=""
            className="h-24 w-full object-cover opacity-80"
          />
        )}
      </div>

      <button
        onClick={(ev) => {
          ev.stopPropagation();
          onFav(project);
        }}
        className={cn(
          "absolute right-3 top-3 rounded-full p-1.5 backdrop-blur transition",
          project.favorite
            ? "bg-danger/20 text-danger"
            : "bg-black/30 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-danger"
        )}
        title="Избранное"
      >
        <Heart
          className="h-4 w-4"
          fill={project.favorite ? "currentColor" : "none"}
        />
      </button>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-100">
            {project.title}
          </h3>
          <StatusBadge status={project.status} />
        </div>

        <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-400">
          {project.description || "Без описания"}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map((t) => (
            <span key={t} className="chip">
              #{t}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="chip">+{project.tags.length - 3}</span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
          {project.language && (
            <span className="flex items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: accent }}
              />
              {project.language}
            </span>
          )}
          {project.source === "github" && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" /> {project.stars}
            </span>
          )}
          {project.source === "github" && (
            <span className="flex items-center gap-1 text-accent-soft">
              <GitBranch className="h-3.5 w-3.5" /> GitHub
            </span>
          )}
          <span className="ml-auto">{relativeDate(project.updated_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}
