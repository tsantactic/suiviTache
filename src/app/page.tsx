import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="max-w-6xl w-full mx-auto px-4 py-4 flex justify-between items-center">
        <span className="font-bold text-xl">📋 SuiviTache</span>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-slate-700 hover:text-slate-900">Connexion</Link>
          <Link href="/register" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">Inscription</Link>
        </div>
      </nav>
      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
          Gérez vos <span className="text-blue-600">projets</span> et vos tâches en toute simplicité
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl">
          Créez un projet, cliquez dessus et retrouvez une vue liste de tâches avec statut, recherche et filtres.
          Authentification Supabase, export/import admin, prêt pour Vercel.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/register" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Commencer gratuitement</Link>
          <Link href="/login" className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50">Se connecter</Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl w-full">
          {[
            { t: "Projets illimités", d: "Créez autant de projets que nécessaire" },
            { t: "Tâches avec statuts", d: "À faire, En cours, En attente, Terminée" },
            { t: "Recherche & filtres", d: "Retrouvez instantanément vos tâches" },
          ].map((f) => (
            <div key={f.t} className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="text-sm text-slate-600 mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="py-6 text-center text-sm text-slate-500">© 2026 SuiviTache — Propulsé par Next.js + Supabase + Vercel</footer>
    </main>
  );
}
