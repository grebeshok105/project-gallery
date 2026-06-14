import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto flex w-80 items-center gap-3 rounded-2xl border border-accent/40 bg-bg-card p-4 shadow-glow"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-soft">
              <Icon name={t.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-accent-soft">
                {t.title}
              </div>
              <div className="truncate font-semibold text-slate-100">
                {t.description}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
