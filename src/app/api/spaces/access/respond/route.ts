import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { notificationId, spaceId, userId, action } = await req.json();
  if (!action || !["approved", "rejected"].includes(action)) return NextResponse.json({ error: "action invalide" }, { status: 400 });

  const admin = createAdminClient();
  let targetSpaceId = spaceId;
  let targetUserId = userId;
  let notif: any = null;
  if (notificationId) {
    const { data } = await admin.from("notifications").select("*").eq("id", notificationId).single();
    notif = data;
    if (!notif) return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
    targetUserId = targetUserId || notif.related_user_id;
  }
  if (!targetSpaceId && targetUserId) {
    const { data: memberships } = await admin.from("space_members").select("space_id, spaces!inner(user_id,name)").eq("user_id", targetUserId).eq("status", "pending");
    const owned = (memberships || []).find((m: any) => m.spaces?.user_id === user.id);
    if (owned) targetSpaceId = (owned as any).space_id;
    else if (notif?.message) {
      const nameMatch = notif.message.match(/espace "(.+)"\./);
      if (nameMatch) {
        const { data: sp } = await admin.from("spaces").select("id").eq("user_id", user.id).eq("name", nameMatch[1]).maybeSingle();
        if (sp) targetSpaceId = sp.id;
      }
    }
  }
  if (!targetSpaceId || !targetUserId) return NextResponse.json({ error: "Impossible de résoudre la demande" }, { status: 400 });

  const { data: space } = await admin.from("spaces").select("id,user_id").eq("id", targetSpaceId).single();
  if (!space) return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (space.user_id !== user.id && profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  await admin.from("space_members").update({ status: action, updated_at: new Date().toISOString() }).eq("space_id", targetSpaceId).eq("user_id", targetUserId);
  if (notificationId) await admin.from("notifications").update({ status: action, is_read: true }).eq("id", notificationId);
  else await admin.from("notifications").update({ status: action, is_read: true }).eq("type", "space_access_request").eq("recipient_user_id", user.id).eq("related_user_id", targetUserId).eq("status", "pending");

  return NextResponse.json({ ok: true, status: action });
}
