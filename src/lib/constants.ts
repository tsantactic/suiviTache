export const TASK_STATUSES = [
  { value: "a_faire", label: "À faire", color: "bg-slate-200 text-slate-800" },
  { value: "en_cours", label: "En cours", color: "bg-blue-100 text-blue-800" },
  { value: "en_attente", label: "En attente", color: "bg-amber-100 text-amber-800" },
  { value: "termine", label: "Terminée", color: "bg-green-100 text-green-800" },
] as const;

export type TaskStatus = typeof TASK_STATUSES[number]["value"];

export function getStatusLabel(value: string) {
  return TASK_STATUSES.find((s) => s.value === value)?.label ?? value;
}
export function getStatusColor(value: string) {
  return TASK_STATUSES.find((s) => s.value === value)?.color ?? "bg-gray-100 text-gray-800";
}

export const DEFAULT_TASK_STATUS: TaskStatus = "a_faire";
