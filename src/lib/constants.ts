export const TASK_STATUSES = [
  { value: "a_faire", label: "À faire", color: "bg-slate-500 text-white border-slate-600 dark:bg-slate-600 dark:text-white dark:border-slate-500" },
  { value: "en_cours", label: "En cours", color: "bg-blue-600 text-white border-blue-700 dark:bg-blue-600 dark:text-white dark:border-blue-500" },
  { value: "a_tester", label: "À tester", color: "bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:text-white dark:border-orange-500" },
  { value: "termine", label: "Terminer", color: "bg-green-600 text-white border-green-700 dark:bg-green-600 dark:text-white dark:border-green-500" },
] as const;

export const KANBAN_COL_BG: Record<string, string> = {
  a_faire: "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/70 dark:border-orange-500 dark:text-orange-50 dark:shadow-[0_0_15px_rgba(251,146,60,0.3)]",
  en_cours: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/70 dark:border-blue-500 dark:text-blue-50 dark:shadow-[0_0_15px_rgba(96,165,250,0.3)]",
  a_tester: "bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950/70 dark:border-yellow-500 dark:text-yellow-50 dark:shadow-[0_0_15px_rgba(250,204,21,0.3)]",
  termine: "bg-green-50 border-green-300 text-green-900 dark:bg-green-950/70 dark:border-green-500 dark:text-green-50 dark:shadow-[0_0_15px_rgba(74,222,128,0.3)]",
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
