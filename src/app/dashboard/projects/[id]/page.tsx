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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const [projRes, tasksRes, imgRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("whiteboards").select("data").eq("project_id", id).single(),
    ]);
    if (projRes.data) setProject(projRes.data as Project);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if ((imgRes as any)?.data?.data?.image_url) setImageUrl((imgRes as any).data.data.image_url);
    else setImageUrl(null);
    setLoading(false);
  };

  useEffect(() => { fetchData(true); }, [id]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (imageMenuRef.current && !imageMenuRef.current.contains(e.target as Node)) setShowImageMenu(false); };
    if (showImageMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showImageMenu]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Seules les images PNG/JPG sont autorisées"); return; }
    setImgUploading(true); setShowImageMenu(false);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("project-images").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("whiteboards").upsert({ project_id: id, data: { image_url: url }, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
      if (dbErr) throw dbErr;
      setImageUrl(url);
    } catch (err: any) {
      alert("Erreur: " + (err.message || "upload échoué") + " - Vérifie bucket project-images (migration-whiteboard.sql)");
    } finally {
      setImgUploading(false);
      e.target.value = "";
    }
  };

  const handleImageRemove = async () => {
    setShowImageMenu(false);
    if (!imageUrl) return;
    if (!confirm("Supprimer l'image ?")) return;
    await supabase.from("whiteboards").delete().eq("project_id", id);
    setImageUrl(null);
  };

  const [quickNote, setQuickNote] = useState("");
  const notesForImage = useMemo(() => tasks.filter((t:any) => (t.etape || 'recap') === 'recap'), [tasks]);
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const temp: any = { id: "tmp_"+Date.now(), project_id: id, user_id: user.id, title: quickNote.trim(), status: "a_faire", etape: "recap", note: null, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setTasks((ts) => [temp, ...ts]);
    setQuickNote("");
    const { error, data } = await supabase.from("tasks").insert({ project_id: id, user_id: user.id, title: temp.title, status: "a_faire", etape: "recap" }).select().single();
    if (!error && data) setTasks((ts) => [data as Task, ...ts.filter((x) => x.id !== temp.id)]);
    else setTasks((ts) => ts.filter((x) => x.id !== temp.id));
  };

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

  return (
    <div>
      {/* Sticky floating header */}
      <div className="sticky top-[57px] z-10 -mx-3 sm:-mx-4 lg:mx-0 px-3 sm:px-4 lg:px-0 py-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">← Retour aux projets</Link>
        <div className="mt-2 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold dark:text-white break-words">{project.name}</h1>
                <div className="relative" ref={imageMenuRef}>
                  <button onClick={() => setShowImageMenu((v) => !v)} disabled={imgUploading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs sm:text-sm font-medium hover:bg-purple-700 shrink-0">
                    🖼️ Image {imgUploading ? "..." : "▾"}
                  </button>
                  {showImageMenu && (
                    <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-20">
                      {imageUrl && <button onClick={() => { setShowImagePreview(true); setShowImageMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">👁️ Voir</button>}
                      <button onClick={() => fileRef.current?.click()} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800">{imageUrl ? "➕ Remplacer" : "➕ Ajouter"} {imageUrl ? "" : "(1 seule)"}</button>
                      {imageUrl && <button onClick={handleImageRemove} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-slate-100 dark:border-slate-800">🗑️ Supprimer</button>}
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                </div>
              </div>
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
            </div>
          </div>
        </div>
      </div>

      {/* Image + Todos côte à côte */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
          <h3 className="font-semibold dark:text-white text-sm mb-3">🖼️ Image du projet</h3>
          {imageUrl ? (
            <div className="flex-1 flex flex-col items-center">
              <img src={imageUrl} onClick={() => setShowImagePreview(true)} alt="Image projet" className="w-full max-h-64 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white cursor-pointer hover:opacity-90" title="Clique pour voir" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Clique pour voir • Menu via bouton 🖼️ Image ci-dessus</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-white/50 dark:bg-slate-900/30">
              <p className="text-3xl">🖼️</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Aucune image</p>
              <button onClick={() => fileRef.current?.click()} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">➕ Ajouter (1 seule)</button>
            </div>
          )}
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
          <h3 className="font-semibold dark:text-white text-sm mb-2">📝 Todos / Notes <span className="font-normal text-xs text-slate-500">à côté de l&apos;image</span></h3>
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <input value={quickNote} onChange={(e)=>setQuickNote(e.target.value)} placeholder="Ajouter une note ou todo..." className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-lg text-sm shrink-0">Ajouter</button>
          </form>
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
            {notesForImage.length===0 ? <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Aucune note</p> :
              notesForImage.slice(0,20).map((t) => (
                <div key={t.id} className="flex items-start gap-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-2">
                  <span className="text-xs font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">#{taskNumber(t)}</span>
                  <p className="flex-1 text-sm dark:text-white break-words">{t.title}</p>
                  <button onClick={()=>deleteTask(t.id)} className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded shrink-0">×</button>
                </div>
              ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Étape: recap • {notesForImage.length} notes • Voir tout en Kanban/Liste ci-dessous</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 bg-slate-100 dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold dark:text-white mb-3">Nouvelle tâche</h3>
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
                <thead className="bg-slate-50 dark:bg-slate-900 border-b"><tr className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300"><th className="px-3 py-2 whitespace-nowrap">#</th><th className="px-3 py-2 whitespace-nowrap">Tâche</th><th className="px-3 py-2 whitespace-nowrap">Statut</th><th className="px-3 py-2 whitespace-nowrap">Début</th><th className="px-3 py-2 whitespace-nowrap">Création</th><th className="px-3 py-2 whitespace-nowrap">Terminée</th><th className="px-3 py-2 whitespace-nowrap">Note</th><th className="px-3 py-2 whitespace-nowrap text-right">Actions</th></tr></thead>
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
      {/* Modal Voir image - même page */}
      {showImagePreview && imageUrl && (
        <div onClick={() => setShowImagePreview(false)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-5xl w-full">
            <button onClick={() => setShowImagePreview(false)} className="absolute -top-10 right-0 text-white hover:text-slate-200 text-sm bg-black/50 px-3 py-1 rounded-full">✕ Fermer</button>
            <img src={imageUrl} alt="Prévisualisation" className="w-full max-h-[85vh] object-contain rounded-lg bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
