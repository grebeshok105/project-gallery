import { invoke } from "@tauri-apps/api/core";
import type {
  Achievement,
  AppConfig,
  ChatMessage,
  Project,
  ProjectFilter,
  ProjectInput,
  Stats,
} from "./types";

export const api = {
  // projects
  listProjects: (filter: ProjectFilter = {}) =>
    invoke<Project[]>("list_projects", { filter }),
  getProject: (id: number) => invoke<Project>("get_project", { id }),
  createProject: (input: ProjectInput) =>
    invoke<Project>("create_project", { input }),
  updateProject: (id: number, input: ProjectInput) =>
    invoke<Project>("update_project", { id, input }),
  deleteProject: (id: number) => invoke<void>("delete_project", { id }),
  toggleFavorite: (id: number) => invoke<void>("toggle_favorite", { id }),
  listTags: () => invoke<string[]>("list_tags"),
  getStats: () => invoke<Stats>("get_stats"),

  // achievements
  listAchievements: () => invoke<Achievement[]>("list_achievements"),
  checkNewAchievements: () => invoke<Achievement[]>("check_new_achievements"),
  createCustomAchievement: (input: {
    title: string;
    description: string;
    icon: string;
  }) => invoke<number>("create_custom_achievement", { input }),
  toggleCustomAchievement: (id: number) =>
    invoke<void>("toggle_custom_achievement", { id }),
  deleteCustomAchievement: (id: number) =>
    invoke<void>("delete_custom_achievement", { id }),

  // settings & secrets
  getConfig: () => invoke<AppConfig>("get_config"),
  getSetting: (key: string) => invoke<string | null>("get_setting", { key }),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),
  setSecret: (key: "github_token" | "llm_api_key", value: string) =>
    invoke<void>("set_secret", { key, value }),

  // github
  importGithub: (username: string) =>
    invoke<number>("import_github", { username }),

  // llm
  llmChat: (messages: ChatMessage[]) =>
    invoke<string>("llm_chat", { messages }),
  llmProjectIdeas: (projectId: number, mode: "ideas" | "description" | "tags") =>
    invoke<string>("llm_project_ideas", { projectId, mode }),
};
