"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TASK_STATUSES, TASK_ORDER, KANBAN_COL_BG, DEFAULT_TASK_STATUS, getStatusColor, getStatusLabel, getNextStatus, getPrevStatus, TaskStatus } from "@/lib/constants";
import type { Project, Task } from "@/lib/types";

function TaskCard({ task, num, onUpdate, onDelete, onMove }: {
  task: Task;
  num: number;
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-1">#{num}</span>
        <textarea
          value={title}
          onChange={(e) => {
            autoSaveTitle(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = t.scrollHeight + "px";
          }}
          ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          rows={1}
          className="flex-1 font-medium text-sm dark:text-white bg-transparent border border-transparent hover:border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:bg-white dark:bg-slate-800 rounded px-1 py-0.5 outline-none resize-none overflow-hidden whitespace-pre-wrap break-words"
        />
      </div>
      {saving !== "idle" && <span className={`text-[10px] ${saving==="saving"?"text-amber-600":"text-green-600"}`}>{saving==="saving"?"Enregistrement...":"Enregistré"}</span>}

      <div className="mt-2 space-y-1 text-xs dark:text-slate-300">
        <p><span className="text-slate-500 dark:text-slate-400">Début:</span> <span className="text-red-600 dark:text-red-400 font-medium">{task.start_date ? new Date(task.start_date).toLocaleDateString("fr-FR") : new Date(task.created_at).toLocaleDateString("fr-FR")}</span></p>
        <p><span className="text-slate-500 dark:text-slate-400">Création:</span> <span className="text-red-600 dark:text-red-400 font-medium">{new Date(task.created_at).toLocaleDateString("fr-FR")}</span></p>
        {task.status === "termine" && <p><span className="text-slate-500 dark:text-slate-400">Terminée:</span> <span className="text-red-600 dark:text-red-400 font-bold">{new Date(task.updated_at).toLocaleDateString("fr-FR")}</span></p>}
      </div>

      <textarea
        value={note}
        onChange={(e) => {
          autoSaveNote(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement;
          t.style.height = "auto";
          t.style.height = t.scrollHeight + "px";
        }}
        ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
        placeholder="Note / commentaire..."
        rows={2}
        className="mt-2 w-full text-xs dark:text-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none overflow-hidden whitespace-pre-wrap break-words"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {getPrevStatus(task.status as TaskStatus) && (
            <button onClick={() => onMove(task, "prev")} title="Précédent" className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-900 text-xs">‹</button>
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
  const [view, setView] = useState<"kanban"|"liste">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(true);

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

  const sortedByNum = useMemo(() => {
    const sorted = [...tasks].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const map = new Map(sorted.map((t,i)=>[t.id, i+1]));
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    let r = tasks;
    if (search) r = r.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || (t.note && t.note.toLowerCase().includes(search.toLowerCase())));
    if (filterStatus !== "all") r = r.filter((t) => t.status === filterStatus);
    r = [...r].sort((a,b) => {
      const na = sortedByNum.get(a.id) || 0;
      const nb = sortedByNum.get(b.id) || 0;
      return sortAsc ? na - nb : nb - na;
    });
    return r;
  }, [tasks, search, filterStatus, sortAsc, sortedByNum]);

  const tasksByStatus = (s: TaskStatus) => filtered.filter((t) => t.status === s);
  const taskNumber = (t: Task) => sortedByNum.get(t.id) || 0;

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
        {[1,2,3,4].map((i) => <div key={i} className="h-64 bg-white dark:bg-slate-800 border rounded-xl"></div>)}
      </div>
    </div>
  );
  if (!project) return <p className="text-red-600">Projet introuvable.</p>;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white">← Retour aux projets</Link>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{project.name}</h1>
          {project.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{project.description}</p>}
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-green-600 dark:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 shrink-0">
          + Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">Nouvelle tâche</h3>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la tâche" className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-sm font-medium">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2">
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2" />
            </div>
          </div>
          <label className="block mt-3 text-sm font-medium">Note / Commentaire</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails..." rows={2} className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2" />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg">Annuler</button>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom ou note)..." className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 bg-white" />
        <div className="flex gap-2">
          <button onClick={() => setSortAsc(v=>!v)} className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border hover:bg-slate-50 dark:bg-slate-900">Tri # {sortAsc ? "↑" : "↓"}</button>
          <button onClick={() => setView("kanban")} className={`px-4 py-2 rounded-lg text-sm font-medium ${view==="kanban"?"bg-slate-900 text-white":"bg-white dark:bg-slate-800 border"}`}>Kanban</button>
          <button onClick={() => setView("liste")} className={`px-4 py-2 rounded-lg text-sm font-medium ${view==="liste"?"bg-slate-900 text-white":"bg-white dark:bg-slate-800 border"}`}>Liste</button>
        </div>
      </div>

      {view === "liste" ? (
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-3 flex flex-col sm:flex-row gap-3 border-b">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm">
              <option value="all">Tous les statuts</option>
              {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <span className="text-sm text-slate-500 self-center">{filtered.length} tâches</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b"><tr className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300"><th className="px-3 py-2 whitespace-nowrap">#</th><th className="px-3 py-2 whitespace-nowrap">Tâche</th><th className="px-3 py-2 whitespace-nowrap">Statut</th><th className="px-3 py-2 whitespace-nowrap">Début</th><th className="px-3 py-2 whitespace-nowrap">Création</th><th className="px-3 py-2 whitespace-nowrap">Terminée</th><th className="px-3 py-2 whitespace-nowrap">Note</th><th className="px-3 py-2 whitespace-nowrap text-right">Actions</th></tr></thead>
              <tbody className="divide-y">
                {filtered.length===0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Aucune tâche</td></tr> :
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:bg-slate-900 align-top">
                    <td className="px-3 py-2 font-bold whitespace-nowrap">#{taskNumber(t)}</td>
                    <td className="px-3 py-2 font-medium whitespace-pre-wrap break-words min-w-[160px] max-w-[260px]">{t.title}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(t.status)}`}>{getStatusLabel(t.status)}</span></td>
                    <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{t.start_date ? new Date(t.start_date).toLocaleDateString("fr-FR") : new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{t.status==="termine"?new Date(t.updated_at).toLocaleDateString("fr-FR"):"—"}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap break-words min-w-[160px] max-w-[260px] text-xs">{t.note||"—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right flex gap-1 justify-end">
                      {getPrevStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"prev")} className="px-2 py-1 border rounded text-xs">‹</button>}
                      {getNextStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"next")} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">›</button>}
                      <button onClick={()=>deleteTask(t.id)} className="px-2 py-1 text-red-600 text-xs">Suppr.</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_ORDER.map((col) => {
          const colTasks = tasksByStatus(col);
          const colMeta = TASK_STATUSES.find((s) => s.value === col)!;
          return (
            <div key={col} className={`rounded-xl p-3 flex flex-col min-h-[400px] border ${KANBAN_COL_BG[col]}`}>
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
                  <TaskCard key={t.id} task={t} num={taskNumber(t)} onUpdate={handleInlineUpdate} onDelete={deleteTask} onMove={moveTask} />
                ))}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
