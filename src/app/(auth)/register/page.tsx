"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(""); setSuccess("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else {
      setSuccess("Compte créé ! Vérifiez votre email ou connectez-vous.");
      setTimeout(() => router.push("/login"), 1500);
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
    </div>
  );
}
