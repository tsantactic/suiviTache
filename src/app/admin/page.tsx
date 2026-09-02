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
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const j = await res.json();
    if (!res.ok) setMessage("Erreur: " + j.error);
    else { setMessage("Rôle mis à jour"); fetchUsers(); }
  };

  const updateEmail = async (id: string, email: string) => {
    if (!email.includes("@")) { setMessage("Email invalide"); return; }
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await res.json();
    if (!res.ok) setMessage("Erreur email: " + j.error);
    else { setMessage("Email mis à jour"); fetchUsers(); }
  };

  const updatePassword = async (id: string, password: string) => {
    if (password.length < 6) { setMessage("Mot de passe min 6 caractères"); return; }
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const j = await res.json();
    if (!res.ok) setMessage("Erreur mdp: " + j.error);
    else setMessage("Mot de passe mis à jour");
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Supprimer cet utilisateur définitivement ? Ses projets/tâches resteront (partagés).")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) setMessage("Erreur suppression: " + j.error);
    else { setMessage("Utilisateur supprimé"); fetchUsers(); }
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
    const j = await res.json();
    if (!res.ok) setMessage("Erreur invitation: " + j.error);
    else { setMessage(j.message); setInviteEmail(""); fetchUsers(); }
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

function UserRow({ u, onRole, onEmail, onPassword, onDelete }: { u: any; onRole: any; onEmail: any; onPassword: any; onDelete: any }) {
  const [email, setEmail] = useState(u.email);
  const [pwd, setPwd] = useState("");
  useEffect(()=>{ setEmail(u.email); }, [u.email]);
  return (
    <tr>
      <td className="px-2 py-2 text-xs">{u.email}<br/><span className={`px-1.5 py-0.5 rounded-full text-[10px] ${u.role==='admin'?'bg-purple-100 text-purple-700':'bg-slate-100 dark:bg-slate-800'}`}>{u.role}</span></td>
      <td className="px-2 py-2"><select value={u.role} onChange={(e) => onRole(u.id, e.target.value)} className="border rounded px-1 py-1 text-xs"><option value="user">user</option><option value="admin">admin</option></select></td>
      <td className="px-2 py-2"><div className="flex gap-1"><input value={email} onChange={(e)=>setEmail(e.target.value)} className="border rounded px-1 py-1 text-xs w-28" /><button onClick={()=>onEmail(u.id, email)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button></div></td>
      <td className="px-2 py-2"><div className="flex gap-1"><input type="password" placeholder="••••" value={pwd} onChange={(e)=>setPwd(e.target.value)} className="border rounded px-1 py-1 text-xs w-24" /><button onClick={()=>{onPassword(u.id,pwd); setPwd("");}} className="px-2 py-1 bg-slate-900 text-white rounded text-xs">OK</button></div></td>
      <td className="px-2 py-2"><button onClick={()=>onDelete(u.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">Supprimer</button></td>
    </tr>
  );
}

  if (isAdmin === null) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900"><Navbar /><p className="p-8">Vérification...</p></div>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
          <h1 className="font-bold text-amber-900">Accès réservé aux admins</h1>
          <p className="text-sm text-amber-800 mt-1">Votre compte n&apos;a pas le rôle admin. Pour vous promouvoir, exécutez dans Supabase SQL :</p>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <code className="block mt-3 bg-slate-100 dark:bg-slate-800 p-3 rounded border text-xs overflow-auto">update profiles set role=&apos;admin&apos; where email=&apos;VOTRE_EMAIL&apos;;</code>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Exportez et importez les données pour les migrations / mises à jour futures.</p>

        {message && <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg">{message}</div>}

        <div className="mt-6 grid gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold">Inviter une personne par email</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Envoie un email d&apos;invitation (lien pour définir son mot de passe).</p>
            <form onSubmit={inviteUser} className="mt-3 flex flex-col sm:flex-row gap-2">
              <input type="email" required value={inviteEmail} onChange={(e)=>setInviteEmail(e.target.value)} placeholder="invite@exemple.com" className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <select value={inviteRole} onChange={(e)=>setInviteRole(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm"><option value="user">user</option><option value="admin">admin</option></select>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Inviter</button>
            </form>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold">Gestion des utilisateurs</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Admin peut modifier email, mot de passe, rôle et supprimer un utilisateur.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-left text-xs text-slate-600 dark:text-slate-300"><th className="px-2 py-2">Email</th><th className="px-2 py-2">Rôle</th><th className="px-2 py-2">Nouvel email</th><th className="px-2 py-2">Nouveau mdp</th><th className="px-2 py-2">Actions</th></tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <UserRow key={u.id} u={u} onRole={updateRole} onEmail={updateEmail} onPassword={updatePassword} onDelete={deleteUser} />
                  ))}
                </tbody>
              </table>
              {users.length===0 && <p className="text-sm text-slate-500 mt-2">Aucun utilisateur.</p>}
            </div>
            <p className="text-xs text-slate-500 mt-2">Nécessite <code>SUPABASE_SERVICE_ROLE_KEY</code> dans Vercel Env (sinon 403). Ajoutez-la puis Redeploy.</p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold">Exporter les données</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Télécharge tous les projets + tâches au format JSON (recommandé pour sauvegarde complète).</p>
            <div className="mt-4 flex gap-3">
              <button onClick={handleExport} className="bg-slate-900 text-white px-4 py-2 rounded-lg">Exporter JSON</button>
              <button onClick={handleExportCSV} className="px-4 py-2 border border-slate-300 rounded-lg">Exporter CSV (tâches)</button>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold">Importer les données</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Restaure un fichier JSON précédemment exporté. Les données existantes avec même ID seront mises à jour (upsert).</p>
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
