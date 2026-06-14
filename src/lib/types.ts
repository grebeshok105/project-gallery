export type ProjectStatus = "idea" | "active" | "paused" | "done" | "archived";
export type ProjectKind = "pet" | "work" | "study" | "other";

export interface Project {
  id: number;
  title: string;
  description: string;
  status: ProjectStatus;
  kind: ProjectKind;
  cover: string | null;
  repo_url: string | null;
  homepage_url: string | null;
  language: string | null;
  stars: number;
  favorite: boolean;
  source: "manual" | "github";
  github_id: number | null;
  pushed_at: string | null;
  gh_created_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  actions: string[];
}

export interface RepoHit {
  full_name: string;
  description: string;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  pushed_at: string | null;
  gh_created_at: string | null;
  already_saved: boolean;
}

export interface ProjectInput {
  title: string;
  description: string;
  status: ProjectStatus;
  kind: ProjectKind;
  cover: string | null;
  repo_url: string | null;
  homepage_url: string | null;
  language: string | null;
  favorite: boolean;
  tags: string[];
}

export interface ProjectFilter {
  search?: string;
  status?: string;
  kind?: string;
  tag?: string;
  favorite_only?: boolean;
  sort?: "updated" | "created" | "title" | "stars";
}

export interface Achievement {
  id: number;
  code: string | null;
  title: string;
  description: string;
  icon: string;
  kind: "auto" | "custom";
  metric: string | null;
  target: number;
  unlocked: boolean;
  progress: number;
  unlocked_at: string | null;
}

export interface Stats {
  projects_total: number;
  projects_done: number;
  languages: number;
  stars_total: number;
  favorites: number;
  github_imported: number;
  achievements_unlocked: number;
  achievements_total: number;
}

export interface AppConfig {
  github_username: string;
  github_include_forks: string;
  llm_base_url: string;
  llm_model: string;
  has_github_token: boolean;
  has_llm_key: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Идея",
  active: "В работе",
  paused: "На паузе",
  done: "Завершён",
  archived: "Архив",
};

export const KIND_LABELS: Record<ProjectKind, string> = {
  pet: "Pet",
  work: "Работа",
  study: "Учёба",
  other: "Другое",
};
