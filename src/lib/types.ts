import { TaskStatus } from "./constants";

export interface Profile {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  user_id: string | null; // créateur
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  profiles?: { email?: string } | null;
}

export interface Project {
  id: string;
  user_id: string | null;
  space_id?: string | null;
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
