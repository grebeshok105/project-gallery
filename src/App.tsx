import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, type Tab } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { GalleryView } from "./views/GalleryView";
import { AchievementsView } from "./views/AchievementsView";
import { AssistantView } from "./views/AssistantView";
import { SettingsView } from "./views/SettingsView";
import { DiscoverView } from "./views/DiscoverView";
import { StatsView } from "./views/StatsView";
import { useStore } from "./lib/store";

const SPRING = [0.32, 0.72, 0, 1] as const;

export default function App() {
  const [tab, setTab] = useState<Tab>("gallery");
  const { refresh, refreshConfig, loadAppearance } = useStore();

  useEffect(() => {
    void refresh();
    void refreshConfig();
    void loadAppearance();
    void refreshConfig();
  }, [refresh, refreshConfig, loadAppearance]);

  return (
    <div className="grain relative flex h-[100dvh] w-screen overflow-hidden bg-ink text-fg">
      {/* ambient mesh glow, fixed, pointer-events none */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 80% -10%, rgba(110,168,254,0.08), transparent 60%), radial-gradient(50rem 40rem at -10% 110%, rgba(52,211,153,0.05), transparent 55%)",
        }}
      />
      <Sidebar tab={tab} setTab={setTab} />
      <main className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: 0.4, ease: SPRING }}
            className="h-full"
          >
            {tab === "gallery" && <GalleryView />}
            {tab === "discover" && <DiscoverView />}
            {tab === "stats" && <StatsView />}
            {tab === "achievements" && <AchievementsView />}
            {tab === "assistant" && <AssistantView />}
            {tab === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toasts />
    </div>
  );
}
