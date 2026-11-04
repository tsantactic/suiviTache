"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AdminPanel } from "@/components/AdminPanel";

export default function SettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [msgEmail, setMsgEmail] = useState("");
  const [err, setErr] = useState("");
  const [errEmail, setErrEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      setNewEmail(data.user?.email ?? "");
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        setIsAdmin(profile?.role === "admin");
      } else setIsAdmin(false);
    });
  }, []);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrEmail(""); setMsgEmail("");
    if (!newEmail.includes("@")) { setErrEmail("Email invalide"); return; }
    if (newEmail === email) { setErrEmail("C'est déjà votre email"); return; }
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setErrEmail(error.message);
    else setMsgEmail("Email mis à jour ! Vérifiez votre boîte mail pour confirmer.");
    setLoadingEmail(false);
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (newPassword.length < 6) { setErr("Mot de passe min 6 caractères"); return; }
    if (newPassword !== confirm) { setErr("Les mots de passe ne correspondent pas"); return; }
    if (!currentPassword) { setErr("Veuillez saisir votre ancien mot de passe"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setErr("Email introuvable"); setLoading(false); return; }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (signInErr) { setErr("Ancien mot de passe incorrect"); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setErr(error.message);
    else { setMsg("Mot de passe mis à jour avec succès"); setCurrentPassword(""); setNewPassword(""); setConfirm(""); }
    setLoading(false);
  };

  return (
    <div className="max-w-lg">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">← Retour</Link>
      <h1 className="text-2xl font-bold dark:text-white mt-2">Paramètres</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Gérez votre compte et, pour les admins, toute la configuration de l&apos;application</p>

      <div className="mt-6 bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold dark:text-white">Mon compte</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Connecté en tant que <span className="font-medium text-slate-900 dark:text-white">{email || "—"}</span></p>
        <p className="text-xs text-slate-500 mt-1">User comme admin peuvent changer leur email et mot de passe ici.</p>
      </div>

      <form onSubmit={handleEmail} className="mt-4 bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold dark:text-white">Changer l&apos;email</h3>
        {errEmail && <p className="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">{errEmail}</p>}
        {msgEmail && <p className="mt-3 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800">{msgEmail}</p>}
        <label className="block mt-3 text-sm font-medium dark:text-slate-200">Nouvel email</label>
        <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loadingEmail} className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {loadingEmail ? "Mise à jour..." : "Mettre à jour l'email"}
        </button>
      </form>

      <form onSubmit={handleChange} className="mt-4 bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold dark:text-white">Changer le mot de passe</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">La mise à jour est instantanée, pas besoin de se reconnecter.</p>
        {err && <p className="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">{err}</p>}
        {msg && <p className="mt-3 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800">{msg}</p>}
        <label className="block mt-4 text-sm font-medium dark:text-slate-200">Ancien mot de passe</label>
        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white placeholder:text-slate-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="block mt-3 text-sm font-medium dark:text-slate-200">Nouveau mot de passe</label>
        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white placeholder:text-slate-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="block mt-3 text-sm font-medium dark:text-slate-200">Confirmer</label>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="mt-1 w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white placeholder:text-slate-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading} className="mt-4 w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50">
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-xl font-bold dark:text-white">Configuration de l&apos;application</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Utilisateurs, rôles, invitations, export et import — réservé aux admins. Au moins un admin doit toujours exister.</p>
          <AdminPanel />
        </div>
      )}
    </div>
  );
}
