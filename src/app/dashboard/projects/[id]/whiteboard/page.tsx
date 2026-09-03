"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    (async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
      if (proj) setProject(proj as Project);
      const { data } = await supabase.from("whiteboards").select("data").eq("project_id", id).single();
      if (data?.data?.image_url) setImageUrl(data.data.image_url);
      setLoading(false);
    })();
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsg("Seules les images PNG/JPG sont autorisées"); return; }
    setUploading(true); setMsg("");
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${id}/${Date.now()}.${ext}`;
      // bucket project-images doit exister (voir supabase/migration-whiteboard.sql)
      const { error: upErr } = await supabase.storage.from("project-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("project-images").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("whiteboards").upsert({ project_id: id, data: { image_url: url }, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
      if (dbErr) throw dbErr;
      setImageUrl(url);
      setMsg("Image mise à jour avec succès");
    } catch (err: any) {
      setMsg("Erreur: " + (err.message || "upload échoué") + " - Vérifie que le bucket project-images existe (exécute migration-whiteboard.sql)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-bold dark:text-white truncate">{project.name} — Image</h1>
          <label className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium cursor-pointer shrink-0 ${uploading ? "bg-slate-400" : "bg-purple-600 hover:bg-purple-700"} text-white`}>
            {uploading ? "Envoi..." : imageUrl ? "Changer l'image" : "Ajouter une image PNG"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        {msg && <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-200 dark:border-blue-800">{msg}</p>}
      </div>

      <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col items-center">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="Image projet" className="max-w-full max-h-[70vh] rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm object-contain bg-white" />
            <div className="mt-4 flex gap-2">
              <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 dark:text-white rounded-lg text-sm hover:bg-slate-50">Ouvrir</a>
              <button onClick={handleRemove} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Supprimer</button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Aucune image pour ce projet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Clique sur Ajouter une image PNG pour uploader.</p>
          </div>
        )}
      </div>
    </div>
  );
}
