"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        if (profile) setRole(profile.role);
      }
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg text-slate-900">
          📋 SuiviTache
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {email && <span className="text-slate-600 hidden sm:inline mr-1">{email} {role === "admin" && <span className="ml-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">admin</span>}</span>}
          <Link href="/dashboard" className="px-3 py-1.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700">📁 Projets</Link>
          <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600">⚙️ Paramètres</Link>
          {role === "admin" && <Link href="/admin" className="px-3 py-1.5 rounded-full bg-purple-600 text-white font-medium hover:bg-purple-700">👑 Admin</Link>}
          <button onClick={logout} className="px-3 py-1.5 rounded-full bg-red-600 text-white font-medium hover:bg-red-700">
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
