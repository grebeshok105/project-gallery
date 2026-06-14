import { create } from "zustand";
import { api } from "./api";
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
  loading: boolean;
  toasts: Toast[];

  setFilter: (f: Partial<ProjectFilter>) => void;
  refresh: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshConfig: () => Promise<void>;
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
    setTimeout(() => get().dismissToast(id), 5000);
  },

  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
