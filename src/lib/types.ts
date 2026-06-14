export type ProjectStatus = "idea" | "active" | "paused" | "done" | "archived";
export type ProjectKind = "pet" | "work" | "study" | "other";

export interface Project {
  id: number;
  title: string;
  description: string;
  summary: string;
  status: ProjectStatus;
  kind: ProjectKind;
  cover: string | null;
  repo_url: string | null;
  homepage_url: string | null;
  language: string | null;
  stars: number;
  activity_score: number;
  open_prs: number;
  last_commit_at: string | null;
  last_commit_msg: string | null;
  commit_count: number;
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
  archived_only?: boolean;
  include_archived?: boolean;
  sort?: "updated" | "created" | "title" | "stars" | "activity";
}

export interface Achievement {
  id: number;
  code: string | null;
  title: string;
  description: string;
  icon: string;
  kind: "auto" | "custom" | "manual" | "metric" | "milestone";
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

export interface BlacklistEntry {
  id: number;
  github_id: number | null;
  repo_url: string;
  added_at: string;
}

export interface McpServer {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  api_key: string | null;
  created_at: string;
}

export interface McpTool {
  name: string;
  description: string;
  parameters: unknown;
}

export interface RepoActivity {
  activity_score: number;
  open_prs: number;
  last_commit_at: string | null;
  last_commit_msg: string | null;
}

export interface CustomAchievementInput {
  title: string;
  description: string;
  icon: string;
  kind: "manual" | "metric" | "milestone";
  metric: string | null;
  target: number | null;
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

export interface DevlogEntry {
  id: number;
  project_id: number;
  entry_date: string;
  body: string;
  created_at: string;
}

export interface ProjectScore {
  project_id: number;
  ui: number;
  code: number;
  idea: number;
  readiness: number;
  note: string;
  updated_at: string;
}

export interface ScoreHistoryPoint {
  ui: number;
  code: number;
  idea: number;
  readiness: number;
  created_at: string;
}

export interface ProjectScoreInput {
  ui: number;
  code: number;
  idea: number;
  readiness: number;
  note: string;
}

export interface Collection {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  project_ids: number[];
}

export interface Screenshot {
  id: number;
  project_id: number;
  path: string;
  caption: string;
  created_at: string;
}
