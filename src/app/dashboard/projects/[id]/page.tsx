"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TASK_STATUSES, DEFAULT_TASK_STATUS, getStatusColor, getStatusLabel, TaskStatus } from "@/lib/constants";
import type { Project, Task } from "@/lib/types";

export default function ProjectTasksPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS);

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
    return tasks.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tasks, search, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editingTask) {
      const prev = tasks;
      setTasks((ts) => ts.map((x) => x.id === editingTask.id ? { ...x, title, status } : x));
      setEditingTask(null); setTitle(""); setStatus(DEFAULT_TASK_STATUS); setShowForm(false);
      const { error } = await supabase.from("tasks").update({ title, status }).eq("id", editingTask.id);
      if (error) { setTasks(prev); alert(error.message); } else fetchData(false);
    } else {
      const temp: Task = { id: "tmp_"+Date.now(), project_id: id, user_id: user.id, title, status, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setTasks((ts) => [temp, ...ts]);
      setTitle(""); setStatus(DEFAULT_TASK_STATUS); setShowForm(false);
      const { error, data } = await supabase.from("tasks").insert({ project_id: id, user_id: user.id, title: temp.title, status: temp.status, description: null }).select().single();
      if (!error && data) setTasks((ts) => [data as Task, ...ts.filter((x) => x.id !== temp.id)]);
      else { setTasks((ts) => ts.filter((x) => x.id !== temp.id)); if (error) alert(error.message); }
    }
  };

  const startEdit = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setStatus(t.status as TaskStatus);
    setShowForm(true);
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const prev = tasks;
    setTasks((ts) => ts.filter((x) => x.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { setTasks(prev); alert(error.message); }
  };

  const updateStatusQuick = async (t: Task, newStatus: string) => {
    setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, status: newStatus as TaskStatus } : x));
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", t.id);
    if (error) setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, status: t.status } : x));
  };

  if (loading) return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
      <div className="h-8 bg-slate-200 rounded w-1/3"></div>
      <div className="mt-6 h-20 bg-white border border-slate-200 rounded-xl"></div>
      <div className="mt-4 space-y-2">
        {[1,2,3].map((i) => <div key={i} className="h-14 bg-white border border-slate-200 rounded-xl"></div>)}
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
        <button onClick={() => { setEditingTask(null); setTitle(""); setStatus(DEFAULT_TASK_STATUS); setShowForm((v) => !v); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 shrink-0">
          + Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="font-semibold mb-3">{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la tâche (ex: Maquette homepage)" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          <label className="block mt-3 text-sm font-medium">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2">
            {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg">{editingTask ? "Mettre à jour" : "Créer"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingTask(null); }} className="px-4 py-2 border border-slate-300 rounded-lg">Annuler</button>
          </div>
        </form>
      )}

      <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom de tâche..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 sm:w-48">
          <option value="all">Tous les statuts</option>
          {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold">Tâches ({filtered.length})</h3>
          <span className="text-xs text-slate-500">{tasks.length} au total</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p>Aucune tâche trouvée.</p>
            {search || filterStatus !== "all" ? <p className="text-sm mt-1">Essayez de modifier votre recherche ou filtre.</p> : <p className="text-sm mt-1">Cliquez sur “Nouvelle tâche” pour en créer une.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <li key={t.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-xs text-slate-400">Créée le {new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={t.status} onChange={(e) => updateStatusQuick(t, e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${getStatusColor(t.status)}`}>
                    {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(t.status)}`}>{getStatusLabel(t.status)}</span>
                  <button onClick={() => startEdit(t)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">Éditer</button>
                  <button onClick={() => deleteTask(t.id)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">Supprimer</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
