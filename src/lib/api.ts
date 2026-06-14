import { invoke } from "@tauri-apps/api/core";
import type {
  Achievement,
  AppConfig,
  BlacklistEntry,
  ChatMessage,
  ChatSession,
  CustomAchievementInput,
  McpServer,
  McpTool,
  Project,
  ProjectFilter,
  ProjectInput,
  RepoActivity,
  RepoHit,
  Stats,
  StoredChatMessage,
} from "./types";
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
  createCustomAchievement: (input: CustomAchievementInput) =>
    invoke<number>("create_custom_achievement", { input }),
    title: string;
    description: string;
    icon: string;
  }) => invoke<number>("create_custom_achievement", { input }),
  toggleCustomAchievement: (id: number) =>
    invoke<void>("toggle_custom_achievement", { id }),
  deleteCustomAchievement: (id: number) =>
  deleteCustomAchievement: (id: number) =>
    invoke<void>("delete_custom_achievement", { id }),
  bulkDeleteAchievements: (ids: number[]) =>
    invoke<number>("bulk_delete_achievements", { ids }),

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

  // activity
  refreshRepoActivity: (projectId: number) =>
    invoke<RepoActivity>("refresh_repo_activity", { projectId }),

  // blacklist
  listBlacklist: () => invoke<BlacklistEntry[]>("list_blacklist"),
  addToBlacklist: (githubId: number | null, repoUrl: string) =>
    invoke<void>("add_to_blacklist", { githubId, repoUrl }),
  removeFromBlacklist: (id: number) =>
    invoke<void>("remove_from_blacklist", { id }),

  // mcp servers
  listMcpServers: () => invoke<McpServer[]>("list_mcp_servers"),
  addMcpServer: (input: { name: string; url: string; api_key: string | null }) =>
    invoke<number>("add_mcp_server", { input }),
  removeMcpServer: (id: number) => invoke<void>("remove_mcp_server", { id }),
  toggleMcpServer: (id: number) => invoke<boolean>("toggle_mcp_server", { id }),
  mcpListTools: (serverId: number) =>
    invoke<McpTool[]>("mcp_list_tools", { serverId }),
};
