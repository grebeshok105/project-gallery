import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, type Tab } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { GalleryView } from "./views/GalleryView";
import { AchievementsView } from "./views/AchievementsView";
import { AssistantView } from "./views/AssistantView";
import { SettingsView } from "./views/SettingsView";
import { useStore } from "./lib/store";

export default function App() {
  const [tab, setTab] = useState<Tab>("gallery");
  const { refresh, refreshConfig } = useStore();

  useEffect(() => {
    void refresh();
    void refreshConfig();
  }, [refresh, refreshConfig]);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-bg text-slate-200">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {tab === "gallery" && <GalleryView />}
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
