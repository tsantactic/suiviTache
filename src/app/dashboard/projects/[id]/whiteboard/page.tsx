"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((m) => m.Excalidraw), {
  ssr: false,
});

export default function WhiteboardPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [api, setApi] = useState<any>(null);
  const saveRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
      if (proj) setProject(proj as Project);
      const { data } = await supabase.from("whiteboards").select("data").eq("project_id", id).single();
      if (data?.data) setInitialData(data.data);
      setLoading(false);
    })();
  }, [id]);

  const handleChange = (elements: any, appState: any, files: any) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      setSaving(true);
      const scene = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files };
      const { error } = await supabase.from("whiteboards").upsert({ project_id: id, data: scene, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
      if (error && error.message.includes("whiteboards")) {
        console.warn("Table whiteboards manquante - exécute supabase/migration-whiteboard.sql");
      }
      setSaving(false);
    }, 800);
  };

  if (loading) return <div className="p-8 animate-pulse">Chargement...</div>;
  if (!project) return <p className="p-8 text-red-600">Projet introuvable.</p>;

  return (
    <>
      {/* barre flottante full-width qui sort du max-w-6xl du layout */}
      <div className="fixed left-0 right-0 top-[57px] z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
          <Link href={`/dashboard/projects/${id}`} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 shrink-0">← Retour</Link>
          <span className="hidden sm:inline text-slate-300">|</span>
          <h1 className="font-bold dark:text-white truncate text-sm sm:text-base">{project.name} — Tableau blanc</h1>
          {saving && <span className="text-xs text-amber-600 whitespace-nowrap">Enregistrement...</span>}
        </div>
        <Link href={`/dashboard/projects/${id}`} className="shrink-0 px-3 py-1.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full text-xs sm:text-sm">Tâches</Link>
      </div>
      {/* canvas plein écran sous la barre - évite Canvas exceeds max size (plus de -mx qui agrandit le canvas) */}
      <div className="fixed left-0 right-0 top-[100px] bottom-0 bg-white dark:bg-slate-900">
        <div style={{ width: "100%", height: "100%" }}>
          <Excalidraw
            excalidrawAPI={(a) => setApi(a)}
            initialData={initialData ? { elements: initialData.elements || [], appState: initialData.appState || {}, files: initialData.files || {} } as any : null}
            onChange={handleChange}
          />
        </div>
      </div>
    </>
  );
}
