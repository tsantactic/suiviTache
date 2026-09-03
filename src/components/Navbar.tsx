"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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
    <nav className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="font-bold text-lg text-slate-900 dark:text-white shrink-0">
          📋 SuiviTache
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          {email && <span className="text-slate-600 dark:text-slate-300 truncate max-w-[180px] lg:max-w-[240px]">{email} {role === "admin" && <span className="ml-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">admin</span>}</span>}
          <ThemeToggle />
          <Link href="/dashboard" className="px-3 py-1.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 whitespace-nowrap">Projets</Link>
          <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 whitespace-nowrap">Paramètres</Link>
          {role === "admin" && <Link href="/admin" className="px-3 py-1.5 rounded-full bg-purple-600 text-white font-medium hover:bg-purple-700 whitespace-nowrap">Admin</Link>}
          <button onClick={logout} className="px-3 py-1.5 rounded-full bg-red-600 text-white font-medium hover:bg-red-700 whitespace-nowrap">
            Déconnexion
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white mb-1"></span>
            <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white mb-1"></span>
            <span className="block w-5 h-0.5 bg-slate-800 dark:bg-white"></span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 space-y-3">
          {email && <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{email} {role === "admin" && <span className="ml-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded-full text-xs">admin</span>}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-center px-3 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">Projets</Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="text-center px-3 py-2.5 rounded-xl bg-amber-500 text-white font-medium">Paramètres</Link>
            {role === "admin" && <Link href="/admin" onClick={() => setOpen(false)} className="text-center px-3 py-2.5 rounded-xl bg-purple-600 text-white font-medium">Admin</Link>}
            <button onClick={logout} className="col-span-2 px-3 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700">
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
