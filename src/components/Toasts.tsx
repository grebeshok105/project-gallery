import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

const SPRING = [0.32, 0.72, 0, 1] as const;

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 60, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: SPRING }}
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto w-[320px] cursor-pointer bezel"
          >
            <div className="bezel-core flex items-center gap-3 p-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <Icon name={t.icon} weight="duotone" className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                  {t.title}
                </div>
                <div className="truncate text-sm font-medium text-fg">
                  {t.description}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
