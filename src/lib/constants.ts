export const TASK_STATUSES = [
  { value: "a_faire", label: "À faire", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "en_cours", label: "En cours", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "a_tester", label: "À tester", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "termine", label: "Terminer", color: "bg-green-100 text-green-800 border-green-200" },
] as const;

export const KANBAN_COL_BG: Record<string, string> = {
  a_faire: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  en_cours: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  a_tester: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  termine: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
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
