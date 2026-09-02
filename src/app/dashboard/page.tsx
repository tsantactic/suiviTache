"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [counts, setCounts] = useState<Record<string, { a_faire: number; en_cours: number; a_tester: number }>>({});
  const supabase = createClient();

  const fetchProjects = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setProjects(data as Project[]);
      // fetch counts for all projects
      const { data: tasks } = await supabase.from("tasks").select("project_id,status").in("project_id", data.map((p:any)=>p.id));
      const map: Record<string, any> = {};
      data.forEach((p:any) => map[p.id] = { a_faire: 0, en_cours: 0, a_tester: 0 });
      (tasks as any[] || []).forEach((t) => {
        if (map[t.project_id]) {
          if (t.status === "a_faire") map[t.project_id].a_faire++;
          else if (t.status === "en_cours") map[t.project_id].en_cours++;
          else if (t.status === "a_tester") map[t.project_id].a_tester++;
        }
      });
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(true); }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Optimistic: ajoute immédiatement sans loader
    const tempId = Math.random().toString();
    const optimistic: Project = { id: tempId, user_id: user.id, name, description: description || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setProjects((prev) => [optimistic, ...prev]);
    setName(""); setDescription(""); setShowForm(false);
    const { error, data } = await supabase.from("projects").insert({ name: optimistic.name, description: optimistic.description, user_id: user.id }).select().single();
    if (!error && data) setProjects((prev) => [data as Project, ...prev.filter((p) => p.id !== tempId)]);
    else { setProjects((prev) => prev.filter((p) => p.id !== tempId)); if (error) alert(error.message); }
  };

  const toggleNotion = async (p: Project) => {
    const next = !p.is_notion_done;
    setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, is_notion_done: next, notion_done_at: next ? new Date().toISOString() : null } : x));
    const { error } = await supabase.from("projects").update({ is_notion_done: next, notion_done_at: next ? new Date().toISOString() : null }).eq("id", p.id);
    if (error) {
      if (error.message.includes("is_notion_done")) alert("Colonne manquante: exécute supabase/migration-notion-done.sql dans Supabase SQL Editor puis recharge.");
      else alert(error.message);
      fetchProjects(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Supprimer ce projet et toutes ses tâches ?")) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { setProjects(prev); alert(error.message); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Mes Projets</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Cliquez sur un projet pour voir ses tâches</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
          + Nouveau projet
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="mt-6 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold mb-3">Créer un projet</h3>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du projet (ex: Refonte site vitrine)" className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" className="mt-3 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2" rows={2} />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg">Créer</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-full mt-3"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8 bg-white dark:bg-slate-800 border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <p className="text-slate-600 dark:text-slate-300">Aucun projet pour le moment.</p>
          <p className="text-sm text-slate-500 mt-1">Créez votre premier projet pour commencer à ajouter des tâches.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-5 hover:shadow-md transition-shadow flex flex-col ${p.is_notion_done ? "border-green-500 ring-1 ring-green-200" : "border-slate-200 dark:border-slate-700"}`}>
              <Link href={`/dashboard/projects/${p.id}`} className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg dark:text-white leading-tight hover:text-blue-600">{p.name}</h3>
                  {p.is_notion_done && <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-600 text-white whitespace-nowrap">✓ Done Notion</span>}
                </div>
                {p.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-800">À faire: {counts[p.id]?.a_faire ?? 0}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">En cours: {counts[p.id]?.en_cours ?? 0}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">À tester: {counts[p.id]?.a_tester ?? 0}</span>
                </div>
                <p className="text-xs text-slate-400 mt-3">Créé le {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
              </Link>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => toggleNotion(p)} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${p.is_notion_done ? "bg-green-600 text-white border-green-600 hover:bg-green-700" : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-50"}`}>
                  {p.is_notion_done ? "✓ Notion ON" : "○ Notion OFF"}
                </button>
                <Link href={`/dashboard/projects/${p.id}`} className="flex-1 text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-800">Voir</Link>
                <button onClick={() => deleteProject(p.id)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600">Suppr.</button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Tous les users peuvent toucher ce bouton</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
