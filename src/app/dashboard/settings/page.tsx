"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [msgEmail, setMsgEmail] = useState("");
  const [err, setErr] = useState("");
  const [errEmail, setErrEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setNewEmail(data.user?.email ?? "");
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
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setErr(error.message);
    else { setMsg("Mot de passe mis à jour avec succès"); setNewPassword(""); setConfirm(""); }
    setLoading(false);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <p className="text-sm text-slate-600 mt-1">Gérez votre compte</p>

      <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="font-semibold">Mon compte</h3>
        <p className="text-sm text-slate-600 mt-1">Connecté en tant que <span className="font-medium text-slate-900">{email || "—"}</span></p>
        <p className="text-xs text-slate-500 mt-1">User comme admin peuvent changer leur email et mot de passe ici.</p>
      </div>

      <form onSubmit={handleEmail} className="mt-4 bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="font-semibold">Changer l&apos;email</h3>
        {errEmail && <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">{errEmail}</p>}
        {msgEmail && <p className="mt-3 text-sm text-green-700 bg-green-50 p-2 rounded">{msgEmail}</p>}
        <label className="block mt-3 text-sm font-medium">Nouvel email</label>
        <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loadingEmail} className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {loadingEmail ? "Mise à jour..." : "Mettre à jour l'email"}
        </button>
      </form>

      <form onSubmit={handleChange} className="mt-4 bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="font-semibold">Changer le mot de passe</h3>
        <p className="text-xs text-slate-500 mt-1">La mise à jour est instantanée, pas besoin de se reconnecter.</p>
        {err && <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">{err}</p>}
        {msg && <p className="mt-3 text-sm text-green-700 bg-green-50 p-2 rounded">{msg}</p>}
        <label className="block mt-4 text-sm font-medium">Nouveau mot de passe</label>
        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="block mt-3 text-sm font-medium">Confirmer</label>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading} className="mt-4 w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50">
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </div>
  );
}
