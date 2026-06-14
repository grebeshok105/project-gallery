import { invoke } from "@tauri-apps/api/core";
import type {
  Achievement,
  AppConfig,
  ChatMessage,
  ChatSession,
  Project,
  ProjectFilter,
  ProjectInput,
  RepoHit,
  Stats,
  StoredChatMessage,
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
  llmAgentChat: (messages: ChatMessage[], chatId?: number) =>
    invoke<{ reply: string; actions: string[] }>("llm_agent_chat", {
      messages,
      chatId: chatId ?? null,
    }),
  llmAutodescribeMissing: () => invoke<number>("llm_autodescribe_missing"),

  // chat history
  listChats: () => invoke<ChatSession[]>("list_chats"),
  createChat: (title?: string) => invoke<number>("create_chat", { title: title ?? null }),
  renameChat: (id: number, title: string) => invoke<void>("rename_chat", { id, title }),
  deleteChat: (id: number) => invoke<void>("delete_chat", { id }),
  listChatMessages: (chatId: number) =>
    invoke<StoredChatMessage[]>("list_chat_messages", { chatId }),

  // discover
  searchGithub: (query: string) => invoke<RepoHit[]>("search_github", { query }),
  findSimilar: (projectId: number) => invoke<RepoHit[]>("find_similar", { projectId }),
};
