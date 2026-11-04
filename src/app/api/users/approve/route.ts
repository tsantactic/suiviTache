import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { notificationId, userId } = await req.json();
  const admin = createAdminClient();
  let targetId = userId;
  if (notificationId) {
    const { data: notif } = await admin.from("notifications").select("*").eq("id", notificationId).single();
    if (!notif) return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
    targetId = targetId || notif.related_user_id;
    await admin.from("notifications").update({ status: "approved", is_read: true }).eq("id", notificationId);
  }
  if (targetId) {
    await admin.from("profiles").update({ is_approved: true, approval_status: "approved" }).eq("id", targetId);
  }
  return NextResponse.json({ ok: true });
}
