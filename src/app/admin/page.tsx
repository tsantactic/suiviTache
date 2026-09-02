"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";

export default function AdminPage() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setUsers(data);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const admin = data?.role === "admin";
      setIsAdmin(admin);
      if (admin) fetchUsers();
    })();
  }, []);

  const updateRole = async (id: string, role: string) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) setMessage("Erreur: " + error.message);
    else { setMessage("Rôle mis à jour"); fetchUsers(); }
  };

  const handleExport = async () => {
    setMessage("");
    const { data: projects } = await supabase.from("projects").select("*");
    const { data: tasks } = await supabase.from("tasks").select("*");
    const payload = { exported_at: new Date().toISOString(), projects, tasks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `suivitache-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setMessage("Export téléchargé avec succès.");
  };

  const handleExportCSV = async () => {
    const { data: tasks } = await supabase.from("tasks").select("*, projects(name)");
    if (!tasks || tasks.length === 0) { setMessage("Aucune donnée à exporter."); return; }
    const headers = ["task_id","title","status","project","created_at"];
    const rows = tasks.map((t: any) => [t.id, `"${t.title.replace(/"/g,'""')}"`, t.status, `"${(t.projects?.name||"").replace(/"/g,'""')}"`, t.created_at]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `taches-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setMessage("CSV exporté.");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setMessage("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const projects = json.projects || [];
      const tasks = json.tasks || [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Import projects first
      for (const p of projects) {
        const { error } = await supabase.from("projects").upsert({ id: p.id, name: p.name, description: p.description, user_id: p.user_id || user.id, created_at: p.created_at });
        if (error) console.warn("project import error", error.message);
      }
      for (const t of tasks) {
        const { error } = await supabase.from("tasks").upsert({ id: t.id, project_id: t.project_id, user_id: t.user_id || user.id, title: t.title, status: t.status, description: t.description, created_at: t.created_at });
        if (error) console.warn("task import error", error.message);
      }
      setMessage(`Import terminé : ${projects.length} projets, ${tasks.length} tâches.`);
    } catch (err: any) {
      setMessage("Erreur import : " + err.message);
    } finally { setImporting(false); }
  };

  if (isAdmin === null) return <div className="min-h-screen bg-slate-50"><Navbar /><p className="p-8">Vérification...</p></div>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
          <h1 className="font-bold text-amber-900">Accès réservé aux admins</h1>
          <p className="text-sm text-amber-800 mt-1">Votre compte n&apos;a pas le rôle admin. Pour vous promouvoir, exécutez dans Supabase SQL :</p>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <code className="block mt-3 bg-white p-3 rounded border text-xs overflow-auto">update profiles set role=&apos;admin&apos; where email=&apos;VOTRE_EMAIL&apos;;</code>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-slate-600 mt-1">Exportez et importez les données pour les migrations / mises à jour futures.</p>

        {message && <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg">{message}</div>}

        <div className="mt-6 grid gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-semibold">Gestion des utilisateurs</h3>
            <p className="text-sm text-slate-600 mt-1">Changez le rôle d&apos;un utilisateur (user ↔ admin).</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs text-slate-600"><th className="px-3 py-2">Email</th><th className="px-3 py-2">Rôle</th><th className="px-3 py-2">Créé</th><th className="px-3 py-2">Action</th></tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id}><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs ${u.role==='admin'?'bg-purple-100 text-purple-700':'bg-slate-100 text-slate-700'}`}>{u.role}</span></td><td className="px-3 py-2 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td><td className="px-3 py-2"><select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="user">user</option><option value="admin">admin</option></select></td></tr>
                  ))}
                </tbody>
              </table>
              {users.length===0 && <p className="text-sm text-slate-500 mt-2">Aucun utilisateur.</p>}
            </div>
            <p className="text-xs text-slate-500 mt-2">Si la mise à jour échoue, exécutez <code>supabase/admin-policies.sql</code> dans SQL Editor.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-semibold">Exporter les données</h3>
            <p className="text-sm text-slate-600 mt-1">Télécharge tous les projets + tâches au format JSON (recommandé pour sauvegarde complète).</p>
            <div className="mt-4 flex gap-3">
              <button onClick={handleExport} className="bg-slate-900 text-white px-4 py-2 rounded-lg">Exporter JSON</button>
              <button onClick={handleExportCSV} className="px-4 py-2 border border-slate-300 rounded-lg">Exporter CSV (tâches)</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-semibold">Importer les données</h3>
            <p className="text-sm text-slate-600 mt-1">Restaure un fichier JSON précédemment exporté. Les données existantes avec même ID seront mises à jour (upsert).</p>
            <label className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700">
              {importing ? "Import en cours..." : "Choisir un fichier JSON"}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
            </label>
            <p className="text-xs text-slate-500 mt-2">Format attendu : &#123; projects: [], tasks: [], exported_at &#125; — généré par l&apos;export ci-dessus.</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
            <h4 className="font-medium text-purple-900 text-sm">Astuce mise à jour future</h4>
            <p className="text-xs text-purple-800 mt-1">Avant une grosse mise à jour, exportez → déployez → ré-importez si besoin. Vous pouvez aussi utiliser ce JSON pour migrer vers un autre Supabase.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
