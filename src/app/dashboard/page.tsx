"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Space } from "@/lib/types";

export default function DashboardPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<Record<string, "pending" | "approved" | "rejected" | "none" | "owner">>({});
  const [reqMsg, setReqMsg] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  const fetchSpaces = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setCurrentUserId(uid);
    const { data, error } = await supabase.from("spaces").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setSpaces(data as Space[]);
      if (data.length > 0) {
        const { data: projects } = await supabase.from("projects").select("space_id").in("space_id", data.map((s: any) => s.id));
        const map: Record<string, number> = {};
        data.forEach((s: any) => map[s.id] = 0);
        (projects as any[] || []).forEach((p) => { if (p.space_id && map[p.space_id] !== undefined) map[p.space_id]++; });
        setCounts(map);
      }
      if (uid) {
        const { data: members } = await supabase.from("space_members").select("space_id,status").eq("user_id", uid);
        const acc: Record<string, "pending"|"approved"|"rejected"|"none"|"owner"> = {};
        data.forEach((s: any) => { acc[s.id] = (!s.user_id || s.user_id === uid) ? "owner" : "none"; });
        (members as any[] || []).forEach((m) => { if (acc[m.space_id] !== "owner") acc[m.space_id] = m.status; });
        setAccess(acc);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchSpaces(true); }, []);

  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const tempId = "tmp_" + Date.now();
    const optimistic: Space = { id: tempId, user_id: user.id, name: name.trim() || "Espace", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setSpaces((prev) => [optimistic, ...prev]);
    setName(""); setShowForm(false);
    const { error, data } = await supabase.from("spaces").insert({ name: optimistic.name, user_id: user.id }).select().single();
    if (!error && data) {
      setSpaces((prev) => [data as Space, ...prev.filter((s) => s.id !== tempId)]);
      setAccess((a) => ({ ...a, [(data as any).id]: "owner" }));
    } else { setSpaces((prev) => prev.filter((s) => s.id !== tempId)); if (error) alert(error.message); }
  };

  const requestAccess = async (spaceId: string) => {
    setReqMsg((m) => ({ ...m, [spaceId]: "" }));
    const r = await fetch("/api/spaces/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId }) });
    const j = await r.json();
    if (!r.ok) setReqMsg((m) => ({ ...m, [spaceId]: "Erreur: " + (j.error || "inconnue") }));
    else { setAccess((a) => ({ ...a, [spaceId]: "pending" })); setReqMsg((m) => ({ ...m, [spaceId]: "Demande envoyée" })); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Espaces</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Crée un espace pour tes projets. Le créateur accepte ou refuse les demandes d&apos;entrée.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="w-full sm:w-auto bg-green-600 text-white px-5 py-3 sm:py-2.5 rounded-xl font-medium hover:bg-green-700 touch-manipulation">
          + Nouvel espace
        </button>
      </div>

      {showForm && (
        <form onSubmit={createSpace} className="mt-6 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold dark:text-white mb-3">Créer un espace</h3>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'espace (ex: Équipe, Client X...)" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm" />
          <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:text-white rounded-lg">Annuler</button>
            <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-4 py-2.5 rounded-lg">Créer</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-full mt-3"></div>
            </div>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="mt-8 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <p className="text-slate-600 dark:text-slate-300">Aucun espace pour le moment.</p>
          <p className="text-sm text-slate-500 mt-1">Crée ton premier espace pour y ajouter des projets.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {spaces.map((s) => {
            const acc = access[s.id] || (currentUserId && (!s.user_id || s.user_id === currentUserId) ? "owner" : "none");
            const canEnter = acc === "owner" || acc === "approved" || !s.user_id;
            const isOwner = !!currentUserId && s.user_id === currentUserId;
            return (
              <div key={s.id} className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base sm:text-lg dark:text-white leading-tight break-words">{s.name}</h3>
                    {isOwner && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0">Créateur</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{counts[s.id] ?? 0} projet(s)</p>
                  <p className="text-xs text-slate-400 mt-3">Créé le {new Date(s.created_at).toLocaleDateString("fr-FR")}{!canEnter ? " · Accès protégé" : ""}</p>
                </div>
                {reqMsg[s.id] && <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">{reqMsg[s.id]}</p>}
                <div className="mt-3 flex gap-2">
                  {canEnter ? (
                    <Link href={`/dashboard/spaces/${s.id}`} className="flex-1 text-center bg-slate-900 text-white text-xs sm:text-sm py-2.5 sm:py-2 rounded-lg hover:bg-slate-800 flex items-center justify-center">Entrer</Link>
                  ) : acc === "pending" ? (
                    <button disabled className="flex-1 text-center bg-amber-100 text-amber-800 text-xs sm:text-sm py-2.5 sm:py-2 rounded-lg cursor-not-allowed">Demande envoyée</button>
                  ) : (
                    <button onClick={() => requestAccess(s.id)} className="flex-1 text-center bg-blue-600 text-white text-xs sm:text-sm py-2.5 sm:py-2 rounded-lg hover:bg-blue-700">Entrer</button>
                  )}
                </div>
                {isOwner && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">Tu es le créateur de cet espace.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
