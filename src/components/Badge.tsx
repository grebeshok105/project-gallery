import { STATUS_LABELS, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ProjectStatus, string> = {
  idea: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  active: "bg-accent/15 text-accent-soft border-accent/30",
  paused: "bg-warn/15 text-warn border-warn/30",
  done: "bg-ok/15 text-ok border-ok/30",
  archived: "bg-slate-700/30 text-slate-500 border-slate-600/30",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLE[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
