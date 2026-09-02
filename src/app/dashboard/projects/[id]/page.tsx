"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TASK_STATUSES, TASK_ORDER, DEFAULT_TASK_STATUS, getNextStatus, getPrevStatus, TaskStatus } from "@/lib/constants";
import type { Project, Task } from "@/lib/types";

function TaskCard({ task, onUpdate, onDelete, onMove }: {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onMove: (t: Task, dir: "next"|"prev") => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note || task.description || "");
  const titleRef = useRef<NodeJS.Timeout | null>(null);
  const noteRef = useRef<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved">("idle");

  useEffect(() => { setTitle(task.title); setNote(task.note || task.description || ""); }, [task.id, task.title, task.note]);

  const autoSaveTitle = (v: string) => {
    setTitle(v);
    if (titleRef.current) clearTimeout(titleRef.current);
    titleRef.current = setTimeout(async () => {
      if (v.trim() && v !== task.title) {
        setSaving("saving");
        await onUpdate(task.id, { title: v });
        setSaving("saved"); setTimeout(()=>setSaving("idle"), 800);
      }
    }, 600);
  };

  const autoSaveNote = (v: string) => {
    setNote(v);
    if (noteRef.current) clearTimeout(noteRef.current);
    noteRef.current = setTimeout(async () => {
      if (v !== (task.note || "")) {
        setSaving("saving");
        await onUpdate(task.id, { note: v, description: v } as any);
        setSaving("saved"); setTimeout(()=>setSaving("idle"), 800);
      }
    }, 700);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <input
        value={title}
        onChange={(e) => autoSaveTitle(e.target.value)}
        onBlur={() => { if (title.trim() && title !== task.title) onUpdate(task.id, { title }); }}
        className="w-full font-medium text-sm bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded px-1 py-0.5 outline-none"
      />
      {saving !== "idle" && <span className={`text-[10px] ${saving==="saving"?"text-amber-600":"text-green-600"}`}>{saving==="saving"?"Enregistrement...":"Enregistré"}</span>}

      <div className="mt-2 space-y-1 text-xs">
        <p><span className="text-slate-500">Début:</span> <span className="text-red-600 font-medium">{task.start_date ? new Date(task.start_date).toLocaleDateString("fr-FR") : new Date(task.created_at).toLocaleDateString("fr-FR")}</span></p>
        <p><span className="text-slate-500">Création:</span> <span className="text-red-600 font-medium">{new Date(task.created_at).toLocaleDateString("fr-FR")}</span></p>
        {task.status === "termine" && <p><span className="text-slate-500">Terminée:</span> <span className="text-red-600 font-bold">{new Date(task.updated_at).toLocaleDateString("fr-FR")}</span></p>}
      </div>

      <textarea
        value={note}
        onChange={(e) => autoSaveNote(e.target.value)}
        placeholder="Note / commentaire..."
        rows={2}
        className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {getPrevStatus(task.status as TaskStatus) && (
            <button onClick={() => onMove(task, "prev")} title="Précédent" className="px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs">‹</button>
          )}
          {getNextStatus(task.status as TaskStatus) && (
            <button onClick={() => onMove(task, "next")} title="Suivant" className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">›</button>
          )}
        </div>
        <button onClick={() => onDelete(task.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Suppr.</button>
      </div>
    </div>
  );
}

export default function ProjectTasksPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS);
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const [projRes, tasksRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    ]);
    if (projRes.data) setProject(projRes.data as Project);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(true); }, [id]);

  const filtered = useMemo(() => {
    if (!search) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || (t.note && t.note.toLowerCase().includes(search.toLowerCase())));
  }, [tasks, search]);

  const tasksByStatus = (s: TaskStatus) => filtered.filter((t) => t.status === s);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const temp: Task = { id: "tmp_"+Date.now(), project_id: id, user_id: user.id, title, status, note: note || null, start_date: startDate || null, description: note || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setTasks((ts) => [temp, ...ts]);
    setTitle(""); setStatus(DEFAULT_TASK_STATUS); setStartDate(""); setNote(""); setShowForm(false);
    const { error, data } = await supabase.from("tasks").insert({ project_id: id, user_id: user.id, title: temp.title, status: temp.status, start_date: startDate || null, note: note || null, description: note || null }).select().single();
    if (!error && data) setTasks((ts) => [data as Task, ...ts.filter((x) => x.id !== temp.id)]);
    else { setTasks((ts) => ts.filter((x) => x.id !== temp.id)); if (error) alert(error.message); }
  };

  const handleInlineUpdate = async (taskId: string, patch: Partial<Task>) => {
    setTasks((ts) => ts.map((x) => x.id === taskId ? { ...x, ...patch } : x));
    const { error } = await supabase.from("tasks").update(patch as any).eq("id", taskId);
    if (error) { alert(error.message); fetchData(false); }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const prev = tasks;
    setTasks((ts) => ts.filter((x) => x.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { setTasks(prev); alert(error.message); }
  };

  const moveTask = async (t: Task, dir: "next" | "prev") => {
    const next = dir === "next" ? getNextStatus(t.status as TaskStatus) : getPrevStatus(t.status as TaskStatus);
    if (!next) return;
    setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, status: next } : x));
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    if (error) { alert(error.message); setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, status: t.status } : x)); }
  };

  if (loading) return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
      <div className="h-8 bg-slate-200 rounded w-1/3"></div>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-64 bg-white border rounded-xl"></div>)}
      </div>
    </div>
  );
  if (!project) return <p className="text-red-600">Projet introuvable.</p>;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">← Retour aux projets</Link>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && <p className="text-sm text-slate-600 mt-1">{project.description}</p>}
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 shrink-0">
          + Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="font-semibold mb-3">Nouvelle tâche</h3>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la tâche" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-sm font-medium">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2">
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
          </div>
          <label className="block mt-3 text-sm font-medium">Note / Commentaire</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails..." rows={2} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg">Annuler</button>
          </div>
        </form>
      )}

      <div className="mt-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom ou note)..." className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white" />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_ORDER.map((col) => {
          const colTasks = tasksByStatus(col);
          const colMeta = TASK_STATUSES.find((s) => s.value === col)!;
          return (
            <div key={col} className="bg-slate-100 rounded-xl p-3 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${colMeta.color}`}>{colMeta.label}</span>
                  <span className="text-slate-500">{colTasks.length}</span>
                </h3>
              </div>
              <div className="space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Aucune tâche</p>
                ) : colTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={handleInlineUpdate} onDelete={deleteTask} onMove={moveTask} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
