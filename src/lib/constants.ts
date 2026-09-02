export const TASK_STATUSES = [
  { value: "a_faire", label: "À faire", color: "bg-slate-500 text-white border-slate-600 dark:bg-slate-600 dark:text-white dark:border-slate-500" },
  { value: "en_cours", label: "En cours", color: "bg-blue-600 text-white border-blue-700 dark:bg-blue-600 dark:text-white dark:border-blue-500" },
  { value: "a_tester", label: "À tester", color: "bg-violet-600 text-white border-violet-700 dark:bg-violet-600 dark:text-white dark:border-violet-500" },
  { value: "termine", label: "Terminer", color: "bg-green-600 text-white border-green-700 dark:bg-green-600 dark:text-white dark:border-green-500" },
] as const;

export const KANBAN_COL_BG: Record<string, string> = {
  a_faire: "bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-500 dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  en_cours: "bg-red-50 border-red-300 dark:bg-red-900 dark:border-red-500 dark:shadow-[0_0_15px_rgba(248,113,113,0.3)]",
  a_tester: "bg-violet-50 border-violet-300 dark:bg-violet-900 dark:border-violet-500 dark:shadow-[0_0_15px_rgba(139,92,246,0.3)]",
  termine: "bg-green-50 border-green-300 dark:bg-green-900 dark:border-green-500 dark:shadow-[0_0_15px_rgba(74,222,128,0.3)]",
};

export type TaskStatus = typeof TASK_STATUSES[number]["value"];

export const TASK_ORDER: TaskStatus[] = ["a_faire", "en_cours", "a_tester", "termine"];

export function getStatusLabel(value: string) {
  return TASK_STATUSES.find((s) => s.value === value)?.label ?? value;
}
export function getStatusColor(value: string) {
  return TASK_STATUSES.find((s) => s.value === value)?.color ?? "bg-gray-100 text-gray-800";
}
export function getNextStatus(s: TaskStatus): TaskStatus | null {
  const i = TASK_ORDER.indexOf(s);
  return i >= 0 && i < TASK_ORDER.length - 1 ? TASK_ORDER[i + 1] : null;
}
export function getPrevStatus(s: TaskStatus): TaskStatus | null {
  const i = TASK_ORDER.indexOf(s);
  return i > 0 ? TASK_ORDER[i - 1] : null;
}

export const DEFAULT_TASK_STATUS: TaskStatus = "a_faire";
