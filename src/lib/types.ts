import { TaskStatus } from "./constants";

export interface Profile {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  is_notion_done?: boolean;
  notion_done_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  note: string | null;
  start_date: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}
