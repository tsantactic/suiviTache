import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { notificationId, projectId, userId, action } = body as {
    notificationId?: string;
    projectId?: string;
    userId?: string;
    action: "approved" | "rejected";
  };
  if (!action || !["approved", "rejected"].includes(action)) {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  let targetProjectId = projectId;
  let targetUserId = userId;
  let notif: any = null;

  if (notificationId) {
    const { data } = await admin.from("notifications").select("*").eq("id", notificationId).single();
    notif = data;
    if (!notif) return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
    targetUserId = targetUserId || notif.related_user_id;
    // Resolve project from message is fragile; better store project id. But schema has no project_id column.
    // We'll find the pending membership for this related user owned by current user matching context.
  }

  // Authorization: must be project owner (or admin)
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  if (!targetProjectId && targetUserId) {
    // Find a pending project_members row for targetUserId where current user owns the project
    // If notification exists, try to infer project by matching owner + pending member
    const { data: memberships } = await admin
      .from("project_members")
      .select("project_id, projects!inner(user_id,name)")
      .eq("user_id", targetUserId)
      .eq("status", "pending");
    const owned = (memberships || []).find((m: any) => m.projects?.user_id === user.id);
    if (owned) targetProjectId = (owned as any).project_id;
    else if (notif?.message) {
      // try to match by project name in message
      const nameMatch = notif.message.match(/espace projet "(.+)"\./);
      if (nameMatch) {
        const { data: proj } = await admin.from("projects").select("id").eq("user_id", user.id).eq("name", nameMatch[1]).maybeSingle();
        if (proj) targetProjectId = proj.id;
      }
    }
  }

  if (!targetProjectId || !targetUserId) {
    return NextResponse.json({ error: "Impossible de résoudre la demande d'accès" }, { status: 400 });
  }

  const { data: project } = await admin.from("projects").select("id,user_id").eq("id", targetProjectId).single();
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  if (project.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { error: updErr } = await admin
    .from("project_members")
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq("project_id", targetProjectId)
    .eq("user_id", targetUserId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (notificationId) {
    await admin.from("notifications").update({ status: action, is_read: true }).eq("id", notificationId);
  } else if (notif?.id) {
    await admin.from("notifications").update({ status: action, is_read: true }).eq("id", notif.id);
  } else {
    // mark matching pending notifications
    await admin
      .from("notifications")
      .update({ status: action, is_read: true })
      .eq("type", "project_access_request")
      .eq("recipient_user_id", user.id)
      .eq("related_user_id", targetUserId)
      .eq("status", "pending");
  }

  return NextResponse.json({ ok: true, status: action });
}
