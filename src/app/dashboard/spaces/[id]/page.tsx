"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Space, Project } from "@/lib/types";

type Member = { id: string; user_id: string; status: string; profiles?: { email?: string } | null };

export default function SpaceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();
  const [space, setSpace] = useState<Space | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState<"loading"|"ok"|"denied"|"pending">("loading");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [msg, setMsg] = useState("");
  const [editingSpaceName, setEditingSpaceName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [isApprovedMember, setIsApprovedMember] = useState(false);
  const [transferTo, setTransferTo] = useState("");

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const [{ data: sp }, { data: projs }, { data: mems }] = await Promise.all([
      supabase.from("spaces").select("*").eq("id", id).single(),
      supabase.from("projects").select("*").eq("space_id", id).order("created_at", { ascending: false }),
      supabase.from("space_members").select("id,user_id,status,profiles(email)").eq("space_id", id).order("created_at", { ascending: false }),
    ]);
    if (sp) { setSpace(sp as Space); setEditingSpaceName((sp as any).name); }
    if (projs) setProjects(projs as Project[]);
    if (mems) setMembers(mems as any);

    let approved = false;
    if (!sp) setAccessState("denied");
    else if (!sp.user_id || (user && sp.user_id === user.id)) { setAccessState("ok"); approved = true; }
    else if (user) {
      const { data: member } = await supabase.from("space_members").select("status").eq("space_id", id).eq("user_id", user.id).maybeSingle();
      if ((member as any)?.status === "approved") { setAccessState("ok"); approved = true; }
      else if ((member as any)?.status === "pending") setAccessState("pending");
      else setAccessState("denied");
    } else setAccessState("denied");
    setIsApprovedMember(approved);
    setLoading(false);
  };

  useEffect(() => { fetchData(true); }, [id]);

  const isOwner = !!currentUserId && !!space && space.user_id === currentUserId;
  const canManage = isOwner || isApprovedMember;

  const requestAccessHere = async () => {
    setMsg("");
    const r = await fetch("/api/spaces/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId: id }) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else { setAccessState("pending"); setMsg("Demande envoyée au créateur."); }
  };

  const renameSpace = async () => {
    if (!editingSpaceName.trim()) return;
    const r = await fetch("/api/spaces/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rename", spaceId: id, name: editingSpaceName }) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else { setSpace((s) => s ? { ...s, name: editingSpaceName.trim() } : s); setMsg("Nom de l'espace mis à jour."); }
  };

  const deleteSpace = async () => {
    if (!confirm("Supprimer cet espace et tous ses projets/tâches ?")) return;
    const r = await fetch("/api/spaces/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", spaceId: id }) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else router.push("/dashboard");
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Renvoyer ce membre de l'espace ?")) return;
    const r = await fetch("/api/spaces/members/remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId: id, userId }) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else { setMsg("Membre renvoyé."); fetchData(false); }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error, data } = await supabase.from("projects").insert({ name: pName, description: pDesc || null, user_id: user.id, space_id: id }).select().single();
    if (error) setMsg("Erreur: " + error.message);
    else { if (data) setProjects((prev) => [data as Project, ...prev]); setPName(""); setPDesc(""); setShowForm(false); }
  };

  const saveProjectName = async (projectId: string) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    const prev = projects;
    setProjects((ps) => ps.map((p) => p.id === projectId ? { ...p, name: renameVal.trim() } : p));
    setRenamingId(null);
    const { error } = await supabase.from("projects").update({ name: renameVal.trim() }).eq("id", projectId);
    if (error) { setProjects(prev); setMsg("Erreur: " + error.message); }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Supprimer ce projet et ses tâches ?")) return;
    const prev = projects;
    setProjects((ps) => ps.filter((p) => p.id !== projectId));
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) { setProjects(prev); setMsg("Erreur: " + error.message); }
  };

  const transferCreator = async () => {
    if (!transferTo) return;
    if (!confirm("Transférer le titre de créateur à ce membre ?")) return;
    const r = await fetch("/api/spaces/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "transfer", spaceId: id, newOwnerId: transferTo }) });
    const j = await r.json();
    if (!r.ok) setMsg("Erreur: " + (j.error || "inconnue"));
    else { setMsg("Titre de créateur transféré."); fetchData(false); }
  };

  if (loading) return <div className="p-6 dark:text-white">Chargement...</div>;
  if (!space) return <p className="text-red-600 p-6">Espace introuvable.</p>;
  if (accessState === "denied" || accessState === "pending") {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-300">← Retour aux espaces</Link>
        <div className="mt-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold dark:text-white">{space.name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Cet espace est protégé. Le créateur doit accepter ta demande.</p>
          {msg && <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">{msg}</p>}
          {accessState === "pending" ? (
            <button disabled className="mt-4 px-5 py-2.5 bg-amber-100 text-amber-800 rounded-lg cursor-not-allowed">Demande envoyée</button>
          ) : (
            <button onClick={requestAccessHere} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Entrer (demander l&apos;accès)</button>
          )}
        </div>
      </div>
    );
  }

  const approvedMembers = members.filter((m) => m.status === "approved");
  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900">← Retour aux espaces</Link>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white break-words">{space.name}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{projects.length} projet(s) · {approvedMembers.length + 1} membre(s)</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700">+ Nouveau projet</button>
      </div>
      {msg && <p className="mt-3 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded">{msg}</p>}

      {showForm && (
        <form onSubmit={createProject} className="mt-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold dark:text-white mb-2">Créer un projet dans cet espace</h3>
          <input required value={pName} onChange={(e)=>setPName(e.target.value)} placeholder="Nom du projet" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-sm" />
          <textarea value={pDesc} onChange={(e)=>setPDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} className="mt-2 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-sm" />
          <div className="mt-2 flex gap-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 dark:text-white rounded-lg">Annuler</button><button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg">Créer</button></div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.length === 0 ? <p className="text-slate-500 dark:text-slate-400">Aucun projet dans cet espace.</p> : projects.map((p) => (
          <div key={p.id} className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
            {renamingId === p.id ? (
              <div className="flex gap-2">
                <input value={renameVal} onChange={(e)=>setRenameVal(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded px-2 py-1 text-sm" autoFocus />
                <button onClick={()=>saveProjectName(p.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">OK</button>
                <button onClick={()=>setRenamingId(null)} className="px-2 py-1 border border-slate-300 dark:border-slate-600 dark:text-white rounded text-xs">Annuler</button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold dark:text-white break-words">{p.name}</h3>
                <button onClick={()=>{setRenamingId(p.id); setRenameVal(p.name);}} className="text-xs text-blue-600 dark:text-blue-400 shrink-0">Renommer</button>
              </div>
            )}
            {p.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{p.description}</p>}
            <div className="mt-3 flex gap-2">
              <Link href={`/dashboard/projects/${p.id}`} className="flex-1 text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-800">Ouvrir</Link>
              {(isOwner || p.user_id === currentUserId) && <button onClick={()=>deleteProject(p.id)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg hover:bg-red-50 hover:text-red-600">Suppr.</button>}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Nom modifiable par les membres de l&apos;espace.</p>
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold dark:text-white">Membres de l&apos;espace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Un membre peut être renvoyé.</p>
            <ul className="mt-3 space-y-2">
              <li className="text-sm dark:text-slate-200 flex items-center justify-between"><span>Toi (créateur)</span><span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">créateur</span></li>
              {members.filter(m=>m.status==="approved").map((m) => (
                <li key={m.id} className="text-sm dark:text-slate-200 flex items-center justify-between gap-2">
                  <span className="truncate">{m.profiles?.email || m.user_id}{m.user_id === currentUserId ? " (toi)" : ""}</span>
                  {m.user_id !== space.user_id && <button onClick={()=>removeMember(m.user_id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 shrink-0">Renvoyer</button>}
                </li>
              ))}
              {members.filter(m=>m.status==="pending").length > 0 && <li className="text-xs text-amber-700 dark:text-amber-300 pt-1">{members.filter(m=>m.status==="pending").length} demande(s) en attente (notifications).</li>}
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="font-semibold dark:text-white">Gestion de l&apos;espace</h3>
            <label className="block mt-3 text-sm dark:text-slate-200">Nom de l&apos;espace (modifiable)</label>
            <div className="mt-1 flex gap-2">
              <input value={editingSpaceName} onChange={(e)=>setEditingSpaceName(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <button onClick={renameSpace} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Renommer</button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-sm dark:text-slate-200">Donner le titre de créateur à un membre</label>
              <div className="mt-1 flex gap-2">
                <select value={transferTo} onChange={(e)=>setTransferTo(e.target.value)} className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">Choisir un membre…</option>
                  {members.filter(m=>m.status==="approved" && m.user_id !== space.user_id).map((m)=>(
                    <option key={m.user_id} value={m.user_id}>{m.profiles?.email || m.user_id}</option>
                  ))}
                </select>
                <button onClick={transferCreator} disabled={!transferTo} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">Transférer</button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Un seul créateur par espace.</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300">Effacer l&apos;espace supprime ses projets et tâches.</p>
              <button onClick={deleteSpace} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Effacer l&apos;espace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
