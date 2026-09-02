export const TASK_STATUSES = [
  { value: "a_faire", label: "À faire", color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-800 dark:text-white dark:border-orange-600" },
  { value: "en_cours", label: "En cours", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-700 dark:text-white dark:border-red-500" },
  { value: "a_tester", label: "À tester", color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-700 dark:text-white dark:border-amber-500" },
  { value: "termine", label: "Terminer", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-700 dark:text-white dark:border-green-500" },
] as const;

export const KANBAN_COL_BG: Record<string, string> = {
  a_faire: "bg-orange-50 border-orange-300 dark:bg-orange-900 dark:border-orange-500 dark:shadow-[0_0_15px_rgba(251,146,60,0.3)]",
  en_cours: "bg-red-50 border-red-300 dark:bg-red-900 dark:border-red-500 dark:shadow-[0_0_15px_rgba(248,113,113,0.3)]",
  a_tester: "bg-amber-50 border-amber-300 dark:bg-amber-900 dark:border-amber-500 dark:shadow-[0_0_15px_rgba(251,191,36,0.3)]",
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
