import { STATUS_LABELS, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  idea: "text-fg-dim",
  active: "text-accent",
  paused: "text-warn",
  done: "text-ok",
  archived: "text-fg-faint",
};

const DOT: Record<ProjectStatus, string> = {
  idea: "bg-fg-dim",
  active: "bg-accent",
  paused: "bg-warn",
  done: "bg-ok",
  archived: "bg-fg-faint",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        STATUS_STYLE[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
