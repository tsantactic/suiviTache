import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "projectId requis" }, { status: 400 });

  const admin = createAdminClient();
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id,name,user_id")
    .eq("id", projectId)
    .single();
  if (projErr || !project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  if (project.user_id === user.id) {
    return NextResponse.json({ ok: true, status: "owner" });
  }

  // Upsert membership as pending (re-request allowed)
  const { error: upsertErr } = await admin
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: user.id, status: "pending", updated_at: new Date().toISOString() },
      { onConflict: "project_id,user_id" }
    );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Avoid duplicate pending notification for same request
  const { data: existingNotif } = await admin
    .from("notifications")
    .select("id")
    .eq("type", "project_access_request")
    .eq("recipient_user_id", project.user_id)
    .eq("related_user_id", user.id)
    .contains("message", project.name)
    .eq("status", "pending")
    .maybeSingle();

  // Fallback dedupe: check by metadata-like fields in title/message is imperfect; do a safer query
  const { data: dup } = await admin
    .from("notifications")
    .select("id")
    .eq("type", "project_access_request")
    .eq("recipient_user_id", project.user_id)
    .eq("related_user_id", user.id)
    .eq("status", "pending")
    .limit(20);
  const already = (dup || []).find((n: any) => false); // keep simple; allow new notif text match below
  // Better: search pending notifs for this pair and project name in message
  const { data: pendingNotifs } = await admin
    .from("notifications")
    .select("id,message")
    .eq("type", "project_access_request")
    .eq("recipient_user_id", project.user_id)
    .eq("related_user_id", user.id)
    .eq("status", "pending");
  const hasPending = (pendingNotifs || []).some((n: any) => (n.message || "").includes(`espace projet "${project.name}"`) || (n.message || "").includes(project.name));

  const requesterName = user.email || "Un utilisateur";
  if (!hasPending && project.user_id) {
    await admin.from("notifications").insert({
      type: "project_access_request",
      recipient_role: "user",
      recipient_user_id: project.user_id,
      related_user_id: user.id,
      related_email: user.email,
      title: "Demande d'accès à un espace projet",
      message: `L'utilisateur ${requesterName} veut entrer dans ton espace projet "${project.name}".`,
      status: "pending",
      is_read: false,
    });
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
