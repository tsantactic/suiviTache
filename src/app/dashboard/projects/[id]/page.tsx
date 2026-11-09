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
    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
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
          className="flex-1 font-bold text-sm dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:border-blue-400 rounded px-2 py-1 outline-none resize-none overflow-hidden whitespace-pre-wrap break-words shadow-sm"
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
        className="mt-2 w-full text-xs bg-white dark:bg-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none overflow-hidden whitespace-pre-wrap break-words shadow-sm"
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


function CarteCard({ task, num, onUpdate, onDelete }: {
  task: Task;
  num: number;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note || task.description || "");
  const [saving, setSaving] = useState<"idle"|"saving"|"saved">("idle");
  const titleRef = useRef<NodeJS.Timeout | null>(null);
  const noteRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { setTitle(task.title); setNote(task.note || task.description || ""); }, [task.id, task.title, task.note]);
  const autoSaveTitle = (v: string) => { setTitle(v); if (titleRef.current) clearTimeout(titleRef.current); titleRef.current = setTimeout(async () => { if (v.trim() && v !== task.title) { setSaving("saving"); await onUpdate(task.id, { title: v }); setSaving("saved"); setTimeout(()=>setSaving("idle"), 800); } }, 600); };
  const autoSaveNote = (v: string) => { setNote(v); if (noteRef.current) clearTimeout(noteRef.current); noteRef.current = setTimeout(async () => { if (v !== (task.note || "")) { setSaving("saving"); await onUpdate(task.id, { note: v, description: v } as any); setSaving("saved"); setTimeout(()=>setSaving("idle"), 800); } }, 700); };
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">#{num}</span>
        <select value={task.status} onChange={(e) => onUpdate(task.id, { status: e.target.value as TaskStatus })} title="Changer le statut" className={"px-2 py-1 rounded-full text-xs border font-medium bg-white dark:bg-slate-700 " + getStatusColor(task.status)}>
          {TASK_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
        </select>
      </div>
      <textarea value={title} onChange={(e) => autoSaveTitle(e.target.value)} rows={2} placeholder="Nom de la tache..." className="w-full font-bold text-sm dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:border-blue-400 rounded px-2 py-1 outline-none resize-y shadow-sm" />
      {saving !== "idle" && <span className={saving==="saving"?"text-[10px] text-amber-600":"text-[10px] text-green-600"}>{saving==="saving"?"Enregistrement...":"Enregistre"}</span>}
      <textarea value={note} onChange={(e) => autoSaveNote(e.target.value)} placeholder="Note / commentaire..." rows={3} className="w-full text-xs bg-white dark:bg-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y shadow-sm" />
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Debut: <b className="text-red-600 dark:text-red-400">{task.start_date ? new Date(task.start_date).toLocaleDateString("fr-FR") : new Date(task.created_at).toLocaleDateString("fr-FR")}</b></span>
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
  const [view, setView] = useState<"kanban"|"liste"|"carte">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [sortKey, setSortKey] = useState<"num"|"title"|"status"|"start_date"|"created_at"|"updated_at"|"note">("num");
  const [accessState, setAccessState] = useState<"loading"|"ok"|"denied"|"pending">("loading");
  const [accessMsg, setAccessMsg] = useState("");
  const toggleSort = (key: typeof sortKey) => { if (sortKey === key) setSortAsc(v=>!v); else { setSortKey(key); setSortAsc(true); } };

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [projRes, tasksRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    ]);
    if (projRes.data) setProject(projRes.data as Project);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);

    // Access control: via espace (space) si présent, sinon fallback propriétaire
    const proj = projRes.data as any;
    if (!proj) {
      setAccessState("denied");
    } else if (proj.space_id && user) {
      const { data: sp } = await supabase.from("spaces").select("id,user_id").eq("id", proj.space_id).single();
      if (!sp || !(sp as any).user_id || (sp as any).user_id === user.id) setAccessState("ok");
      else {
        const { data: member } = await supabase.from("space_members").select("status").eq("space_id", proj.space_id).eq("user_id", user.id).maybeSingle();
        if ((member as any)?.status === "approved") setAccessState("ok");
        else if ((member as any)?.status === "pending") setAccessState("pending");
        else setAccessState("denied");
      }
    } else if (!proj.user_id || (user && proj.user_id === user.id)) {
      setAccessState("ok");
    } else if (user) {
      const { data: member } = await supabase.from("project_members").select("status").eq("project_id", id).eq("user_id", user.id).maybeSingle();
      if ((member as any)?.status === "approved") setAccessState("ok");
      else if ((member as any)?.status === "pending") setAccessState("pending");
      else setAccessState("denied");
    } else {
      setAccessState("denied");
    }
    setLoading(false);
  };

  const requestAccessHere = async () => {
    setAccessMsg("");
    const proj: any = project;
    if (proj?.space_id) {
      const r = await fetch("/api/spaces/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId: proj.space_id }) });
      const j = await r.json();
      if (!r.ok) setAccessMsg("Erreur: " + (j.error || "inconnue"));
      else { setAccessState("pending"); setAccessMsg("Demande envoyée au créateur de l'espace."); }
      return;
    }
    const r = await fetch("/api/projects/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id }) });
    const j = await r.json();
    if (!r.ok) setAccessMsg("Erreur: " + (j.error || "inconnue"));
    else { setAccessState("pending"); setAccessMsg("Demande envoyée au créateur."); }
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
      let cmp = 0;
      const na = sortedByNum.get(a.id) || 0;
      const nb = sortedByNum.get(b.id) || 0;
      switch(sortKey) {
        case "title": cmp = a.title.localeCompare(b.title, "fr"); break;
        case "status": cmp = TASK_ORDER.indexOf(a.status as TaskStatus) - TASK_ORDER.indexOf(b.status as TaskStatus); break;
        case "start_date": cmp = new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime(); break;
        case "created_at": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case "updated_at": cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(); break;
        case "note": cmp = (a.note || "").localeCompare(b.note || "", "fr"); break;
        default: cmp = na - nb;
      }
      return sortAsc ? cmp : -cmp;
    });
    return r;
  }, [tasks, search, filterStatus, sortAsc, sortKey, sortedByNum]);

  const tasksByStatus = (s: TaskStatus) => filtered.filter((t) => t.status === s);
  const taskNumber = (t: Task) => sortedByNum.get(t.id) || 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const temp: Task = { id: "tmp_"+Date.now(), project_id: id, user_id: user.id, title, status, note: note || null, start_date: startDate || null, description: note || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setTasks((ts) => [temp, ...ts]);
    setTitle(""); setStatus(DEFAULT_TASK_STATUS); setStartDate(""); setNote(""); setShowForm(false);
    const { error, data } = await supabase.from("tasks").insert({ project_id: id, user_id: user.id, title: temp.title, status: temp.status, start_date: startDate || null, note: note || null, description: note || null, etape: "recap" }).select().single();
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
        {[1,2,3,4].map((i) => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 border rounded-xl"></div>)}
      </div>
    </div>
  );
  if (!project) return <p className="text-red-600">Projet introuvable.</p>;
  if (accessState === "denied" || accessState === "pending") {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <Link href={project?.space_id ? `/dashboard/spaces/${project.space_id}` : "/dashboard"} className="text-sm text-slate-600 dark:text-slate-300">← Retour aux projets</Link>
        <div className="mt-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold dark:text-white">{project.name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Accès protégé. Le créateur de l&apos;espace doit accepter ta demande.</p>
          {accessMsg && <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">{accessMsg}</p>}
          {accessState === "pending" ? (
            <button disabled className="mt-4 px-5 py-2.5 bg-amber-100 text-amber-800 rounded-lg cursor-not-allowed">Demande envoyée</button>
          ) : (
            <button onClick={requestAccessHere} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Entrer (demander l&apos;accès)</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky floating header */}
      <div className="sticky top-[57px] z-10 -mx-3 sm:-mx-4 lg:mx-0 px-3 sm:px-4 lg:px-0 py-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <Link href={project?.space_id ? `/dashboard/spaces/${project.space_id}` : "/dashboard"} className="inline-flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">← Retour aux projets</Link>
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold dark:text-white break-words">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 break-words">{project.description}</p>}
            </div>
            <button onClick={() => setShowForm((v) => !v)} className="w-full sm:w-auto bg-green-600 dark:bg-green-700 text-white px-5 py-3 sm:py-2.5 rounded-xl font-medium hover:bg-green-700 shrink-0 touch-manipulation">
              + Nouvelle tâche
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom ou note)..." className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button onClick={() => setSortAsc(v=>!v)} className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white hover:bg-slate-50">Tri # {sortAsc ? "↑" : "↓"}</button>
              <button onClick={() => setView("kanban")} className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium border ${view==="kanban"?"bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900":"bg-white dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700"}`}>Kanban</button>
              <button onClick={() => setView("liste")} className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium border ${view==="liste"?"bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900":"bg-white dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700"}`}>Liste</button>
              <button onClick={() => setView("carte")} className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium border ${view==="carte"?"bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900":"bg-white dark:bg-slate-800 dark:text-white border-slate-200 dark:border-slate-700"}`}>Carte</button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <form onSubmit={handleCreate} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg my-8 bg-slate-100 dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold dark:text-white">Nouvelle tâche</h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Fermer" className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">×</button>
          </div>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la tâche" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm">
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Date début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm" />
            </div>
          </div>
          <label className="block mt-3 text-sm font-medium dark:text-slate-200">Note / Commentaire</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails..." rows={2} className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm" />
          <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:text-white rounded-lg">Annuler</button>
            <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2.5 rounded-lg">Créer</button>
          </div>
          </form>
        </div>
      )}

      {view === "liste" ? (
        <>
          {/* Mobile cards */}
          <div className="mt-4 lg:hidden space-y-3">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex gap-2 items-center">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2.5 text-sm">
                <option value="all">Tous les statuts</option>
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{filtered.length} tâches</span>
            </div>
            {filtered.length===0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-8">Aucune tâche</p> :
            filtered.map((t) => (
              <div key={t.id} className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm dark:text-white break-words flex-1">#{taskNumber(t)} {t.title}</p>
                  <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStatusColor(t.status)}`}>{getStatusLabel(t.status)}</span>
                </div>
                {t.note && <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 break-words bg-white dark:bg-slate-700 rounded-lg p-2 border border-slate-200 dark:border-slate-600">{t.note}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Début: <b className="text-red-600 dark:text-red-400">{t.start_date ? new Date(t.start_date).toLocaleDateString("fr-FR") : new Date(t.created_at).toLocaleDateString("fr-FR")}</b></span>
                  <span>Création: <b className="text-red-600 dark:text-red-400">{new Date(t.created_at).toLocaleDateString("fr-FR")}</b></span>
                  {t.status==="termine" && <span>Terminée: <b className="text-red-600 dark:text-red-400">{new Date(t.updated_at).toLocaleDateString("fr-FR")}</b></span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {getPrevStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"prev")} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 dark:text-white rounded-lg text-sm">‹ Précédent</button>}
                  {getNextStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"next")} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm">Suivant ›</button>}
                  <button onClick={()=>deleteTask(t.id)} className="px-3 py-2 text-red-600 text-sm">Suppr.</button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-4 hidden lg:block bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-3 flex gap-3 border-b border-slate-200 dark:border-slate-700">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm">
                <option value="all">Tous les statuts</option>
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <span className="text-sm text-slate-500 dark:text-slate-400 self-center">{filtered.length} tâches</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b"><tr className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300"><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("num")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">#{sortKey==="num" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("title")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Tache{sortKey==="title" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("status")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Statut{sortKey==="status" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("start_date")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Debut{sortKey==="start_date" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("created_at")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Creation{sortKey==="created_at" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("updated_at")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Terminee{sortKey==="updated_at" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap"><button onClick={() => toggleSort("note")} className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">Note{sortKey==="note" ? (sortAsc ? " ↑" : " ↓") : ""}</button></th><th className="px-3 py-2 whitespace-nowrap text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.length===0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">Aucune tâche</td></tr> :
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 align-top">
                      <td className="px-3 py-2 font-bold whitespace-nowrap">#{taskNumber(t)}</td>
                      <td className="px-3 py-2 font-medium whitespace-pre-wrap break-words min-w-[160px] max-w-[260px]">{t.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(t.status)}`}>{getStatusLabel(t.status)}</span></td>
                      <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{t.start_date ? new Date(t.start_date).toLocaleDateString("fr-FR") : new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-2 text-red-600 font-medium whitespace-nowrap">{t.status==="termine"?new Date(t.updated_at).toLocaleDateString("fr-FR"):"—"}</td>
                      <td className="px-3 py-2 whitespace-pre-wrap break-words min-w-[160px] max-w-[260px] text-xs">{t.note||"—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right flex gap-1 justify-end">
                        {getPrevStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"prev")} className="px-2 py-1 border border-slate-300 dark:border-slate-600 dark:text-white rounded text-xs">‹</button>}
                        {getNextStatus(t.status as TaskStatus) && <button onClick={()=>moveTask(t,"next")} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">›</button>}
                        <button onClick={()=>deleteTask(t.id)} className="px-2 py-1 text-red-600 text-xs">Suppr.</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : view === "carte" ? (
        <>
          <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex gap-2 items-center">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2.5 text-sm">
              <option value="all">Tous les statuts</option>
              {TASK_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
            </select>
            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{filtered.length} taches</span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-10 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">Aucune tache</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((t) => (
                <CarteCard key={t.id} task={t} num={taskNumber(t)} onUpdate={handleInlineUpdate} onDelete={deleteTask} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_ORDER.map((col) => {
          const colTasks = tasksByStatus(col);
          const colMeta = TASK_STATUSES.find((s) => s.value === col)!;
          return (
            <div key={col} className="snap-center shrink-0 w-[85vw] sm:w-[320px] lg:w-auto lg:shrink rounded-xl flex flex-col min-h-[360px] lg:min-h-[400px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`flex items-center justify-between px-3 py-2 border-b ${KANBAN_COL_BG[col]}`}>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs border ${colMeta.color}`}>{colMeta.label}</span>
                  <span className="text-slate-700 dark:text-slate-100 font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full text-xs shadow-sm">{colTasks.length}</span>
                </h3>
              </div>
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-200 bg-white/80 dark:bg-slate-700/50 rounded-lg py-6 text-center border border-dashed">Aucune tâche</p>
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
