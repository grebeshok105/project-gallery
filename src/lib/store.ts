import { create } from "zustand";
import { api } from "./api";
import { applyTheme, playSound } from "./utils";
import type { Achievement, AppConfig, Project, ProjectFilter, Stats } from "./types";

interface Toast {
  id: number;
  title: string;
  description: string;
  icon: string;
}

interface AppState {
  projects: Project[];
  tags: string[];
  stats: Stats | null;
  achievements: Achievement[];
  config: AppConfig | null;
  filter: ProjectFilter;
  theme: string;
  accent: string;
  soundEnabled: boolean;
  loading: boolean;
  toasts: Toast[];

  setFilter: (f: Partial<ProjectFilter>) => void;
  refresh: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  loadAppearance: () => Promise<void>;
  setAppearance: (a: { theme?: string; accent?: string; soundEnabled?: boolean }) => Promise<void>;
  pollAchievements: () => Promise<void>;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  tags: [],
  stats: null,
  achievements: [],
  config: null,
  filter: { sort: "updated" },
  theme: "midnight",
  accent: "blue",
  soundEnabled: true,
  loading: false,
  toasts: [],

  setFilter: (f) => {
    set({ filter: { ...get().filter, ...f } });
    void get().refresh();
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const [projects, tags, stats] = await Promise.all([
        api.listProjects(get().filter),
        api.listTags(),
        api.getStats(),
      ]);
      set({ projects, tags, stats });
    } finally {
      set({ loading: false });
    }
    void get().pollAchievements();
  },

  refreshAchievements: async () => {
    const achievements = await api.listAchievements();
    set({ achievements });
  },

  refreshConfig: async () => {
    const config = await api.getConfig();
    set({ config });
  },

  loadAppearance: async () => {
    try {
      const [theme, accent, sound] = await Promise.all([
        api.getSetting("theme"),
        api.getSetting("accent"),
        api.getSetting("sound_enabled"),
      ]);
      const t = theme || "midnight";
      const a = accent || "blue";
      const s = sound !== "false";
      set({ theme: t, accent: a, soundEnabled: s });
      applyTheme(t, a);
    } catch {
      /* no-op */
    }
  },

  setAppearance: async (a) => {
    const next = {
      theme: a.theme ?? get().theme,
      accent: a.accent ?? get().accent,
      soundEnabled: a.soundEnabled ?? get().soundEnabled,
    };
    set(next);
    applyTheme(next.theme, next.accent);
    await Promise.all([
      a.theme !== undefined ? api.setSetting("theme", next.theme) : Promise.resolve(),
      a.accent !== undefined ? api.setSetting("accent", next.accent) : Promise.resolve(),
      a.soundEnabled !== undefined
        ? api.setSetting("sound_enabled", String(next.soundEnabled))
        : Promise.resolve(),
    ]);
  },

  pollAchievements: async () => {
    try {
      const fresh = await api.checkNewAchievements();
      for (const a of fresh) {
        get().pushToast({
          title: "Достижение разблокировано!",
          description: a.title,
          icon: a.icon,
        });
      }
      if (fresh.length) {
        const [achievements, stats] = await Promise.all([
          api.listAchievements(),
          api.getStats(),
        ]);
        set({ achievements, stats });
      }
    } catch {
      /* no-op */
    }
  },

  pushToast: (t) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { ...t, id }] });
    if (get().soundEnabled) playSound("unlock");
    setTimeout(() => get().dismissToast(id), 5000);
  },

  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
