"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(""); setSuccess("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setError(j.error || "Erreur lors de l'inscription");
    else {
      setSuccess("Compte créé !");
      setShowPopup(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-6">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Inscription</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Créez votre compte gratuitement</p>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-200 bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800">{success}</p>}
        <label className="block mt-6 text-sm font-medium dark:text-slate-200">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="vous@exemple.com" />
        <label className="block mt-4 text-sm font-medium dark:text-slate-200">Mot de passe</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 6 caractères" />
        <button type="submit" disabled={loading} className="mt-6 w-full bg-blue-600 text-white py-3 sm:py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 touch-manipulation">
          {loading ? "Création..." : "Créer mon compte"}
        </button>
        <p className="mt-4 text-sm text-center text-slate-600 dark:text-slate-300">Déjà inscrit ? <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Se connecter</Link></p>
      </form>
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center" role="dialog" aria-modal="true">
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-lg font-bold dark:text-white">Inscription en attente d&apos;approbation</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Votre compte <b className="dark:text-white">{email}</b> a bien été créé.<br/><br/>Un administrateur doit maintenant accepter votre entrée sur l&apos;application SuiviTâche via une notification. Vous pourrez vous connecter dès que votre inscription sera approuvée.</p>
            <button onClick={() => { setShowPopup(false); router.push("/login"); }} className="mt-5 w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">Compris, aller à la connexion</button>
          </div>
        </div>
      )}
    </div>
  );
}
