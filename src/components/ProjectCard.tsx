import { motion, useReducedMotion } from "framer-motion";
import { Heart, Star } from "@phosphor-icons/react";
import type { Project } from "@/lib/types";
import { cn, colorFor, relativeDate } from "@/lib/utils";
import { StatusBadge } from "./Badge";

const SPRING = [0.32, 0.72, 0, 1] as const;

interface Props {
  project: Project;
  index?: number;
  onOpen: (p: Project) => void;
  onFav: (p: Project) => void;
}

export function ProjectCard({ project, index = 0, onOpen, onFav }: Props) {
  const reduce = useReducedMotion();
  const accent = colorFor(project.language || project.title);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.04, 0.4), ease: SPRING }}
      className="group bezel cursor-pointer transition-transform duration-500 ease-spring hover:-translate-y-1"
      onClick={() => onOpen(project)}
    >
      <div className="bezel-core relative overflow-hidden">
        {/* header band, tinted to language hue, no AI-purple default */}
        <div
          className="h-20 w-full"
          style={{
            background: project.cover
              ? undefined
              : `radial-gradient(120% 120% at 85% -10%, ${accent}26, transparent 60%), linear-gradient(180deg, ${accent}14, transparent)`,
          }}
        >
          {project.cover && (
            <img src={project.cover} alt="" className="h-20 w-full object-cover opacity-80" />
          )}
        </div>

        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onFav(project);
          }}
          className={cn(
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-all duration-300",
            project.favorite
              ? "bg-danger/15 text-danger"
              : "bg-black/30 text-fg-dim opacity-0 group-hover:opacity-100 hover:text-danger"
          )}
          aria-label="В избранное"
        >
          <Heart weight={project.favorite ? "fill" : "regular"} className="h-4 w-4" />
        </button>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-fg">
              {project.title}
            </h3>
          </div>

          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-fg-muted">
            {project.description || "Без описания"}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
            {project.tags.length > 3 && (
              <span className="chip">+{project.tags.length - 3}</span>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-white/[0.05] pt-3 text-[11px] text-fg-dim">
            <StatusBadge status={project.status} />
            {project.language && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
                {project.language}
              </span>
            )}
            {project.source === "github" && (
              <span className="flex items-center gap-1 font-mono">
                <Star weight="fill" className="h-3 w-3" /> {project.stars}
              </span>
            )}
            <span className="ml-auto font-mono">{relativeDate(project.updated_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
