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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleRegister} className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold">Inscription</h1>
        <p className="text-sm text-slate-600 mt-1">Créez votre compte gratuitement</p>
        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-700 bg-green-50 p-2 rounded">{success}</p>}
        <label className="block mt-6 text-sm font-medium">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="vous@exemple.com" />
        <label className="block mt-4 text-sm font-medium">Mot de passe</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 6 caractères" />
        <button type="submit" disabled={loading} className="mt-6 w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Création..." : "Créer mon compte"}
        </button>
        <p className="mt-4 text-sm text-center text-slate-600">Déjà inscrit ? <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link></p>
      </form>
    </div>
  );
}
