import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { spaceId } = await req.json();
  if (!spaceId) return NextResponse.json({ error: "spaceId requis" }, { status: 400 });

  const admin = createAdminClient();
  const { data: space } = await admin.from("spaces").select("id,name,user_id").eq("id", spaceId).single();
  if (!space) return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  if (space.user_id === user.id) return NextResponse.json({ ok: true, status: "owner" });

  await admin.from("space_members").upsert(
    { space_id: spaceId, user_id: user.id, status: "pending", updated_at: new Date().toISOString() },
    { onConflict: "space_id,user_id" }
  );

  const { data: pendingNotifs } = await admin
    .from("notifications")
    .select("id,message")
    .eq("type", "space_access_request")
    .eq("recipient_user_id", space.user_id)
    .eq("related_user_id", user.id)
    .eq("status", "pending");
  const hasPending = (pendingNotifs || []).some((n: any) => (n.message || "").includes(space.name));

  if (!hasPending && space.user_id) {
    await admin.from("notifications").insert({
      type: "space_access_request",
      recipient_role: "user",
      recipient_user_id: space.user_id,
      related_user_id: user.id,
      related_email: user.email,
      title: "Demande d'accès à un espace",
      message: `L'utilisateur ${user.email || "Un utilisateur"} veut entrer dans ton espace "${space.name}".`,
      status: "pending",
      is_read: false,
    });
  }
  return NextResponse.json({ ok: true, status: "pending" });
}
