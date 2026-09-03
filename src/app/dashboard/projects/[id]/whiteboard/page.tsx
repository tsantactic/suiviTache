"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

export default function WhiteboardPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
      if (proj) setProject(proj as Project);
      const { data } = await supabase.from("whiteboards").select("data").eq("project_id", id).single();
      if (data?.data?.image_url) setImageUrl(data.data.image_url);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Seules les images PNG/JPG sont autorisées"); return; }
    setUploading(true); setMsg(""); setShowMenu(false);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("project-images").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("whiteboards").upsert({ project_id: id, data: { image_url: url }, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
      if (dbErr) throw dbErr;
      setImageUrl(url);
      setMsg("Image mise à jour avec succès (une seule image par projet)");
    } catch (err: any) {
      setMsg("Erreur: " + (err.message || "upload échoué") + " - Vérifie bucket project-images (migration-whiteboard.sql)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setShowMenu(false);
    if (!imageUrl) return;
    if (!confirm("Supprimer l'image ?")) return;
    await supabase.from("whiteboards").delete().eq("project_id", id);
    setImageUrl(null);
    setMsg("Image supprimée");
  };

  if (loading) return <div className="p-8 animate-pulse dark:text-white">Chargement...</div>;
  if (!project) return <p className="p-8 text-red-600">Projet introuvable.</p>;

  return (
    <div>
      <div className="sticky top-[57px] z-10 -mx-3 sm:-mx-4 lg:mx-0 px-3 sm:px-4 py-3 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/dashboard/projects/${id}`} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 shrink-0">← Retour aux tâches</Link>
          <Link href={`/dashboard/projects/${id}`} className="shrink-0 px-3 py-1.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full text-xs sm:text-sm">Tâches</Link>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-bold dark:text-white truncate">{project.name} — Image</h1>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Clique sur l&apos;image pour voir le menu</span>
        </div>
        {msg && <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-200 dark:border-blue-800">{msg}</p>}
      </div>

      <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col items-center">
        {imageUrl ? (
          <div className="relative" ref={menuRef}>
            <img
              src={imageUrl}
              alt="Image projet"
              onClick={() => setShowMenu((v) => !v)}
              className="max-w-full max-h-[70vh] rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm object-contain bg-white cursor-pointer hover:opacity-90 transition"
              title="Clique pour menu"
            />
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">Clique sur l&apos;image pour ouvrir le menu</p>
            {showMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-20">
                <button onClick={() => { setShowPreview(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">👁️ Voir</button>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-800">
                  {uploading ? "Envoi..." : "➕ Ajouter / Remplacer"}
                </button>
                <button onClick={handleRemove} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-slate-100 dark:border-slate-800">🗑️ Supprimer</button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Aucune image pour ce projet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Une seule image par projet</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              {uploading ? "Envoi..." : "➕ Ajouter une image PNG"}
            </button>
            {uploading && <p className="text-xs text-slate-500 mt-2">Envoi en cours...</p>}
          </div>
        )}
        {/* input caché unique */}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={uploading} className="hidden" />
      </div>

      {/* Modal Voir - même page */}
      {showPreview && imageUrl && (
        <div onClick={() => setShowPreview(false)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-5xl w-full">
            <button onClick={() => setShowPreview(false)} className="absolute -top-10 right-0 text-white hover:text-slate-200 text-sm bg-black/50 px-3 py-1 rounded-full">✕ Fermer</button>
            <img src={imageUrl} alt="Prévisualisation" className="w-full max-h-[85vh] object-contain rounded-lg bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
