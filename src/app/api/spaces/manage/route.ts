import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { action, spaceId, name, newOwnerId } = await req.json();
  if (!spaceId || !action) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const admin = createAdminClient();
  const { data: space } = await admin.from("spaces").select("id,user_id").eq("id", spaceId).single();
  if (!space) return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });

  const { data: member } = await admin.from("space_members").select("status").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle();
  const isCreator = space.user_id === user.id;
  const isApprovedMember = (member as any)?.status === "approved";
  if (!isCreator && !isApprovedMember) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  if (action === "rename") {
    if (!name || !String(name).trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    const { error } = await admin.from("spaces").update({ name: String(name).trim() }).eq("id", spaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (action === "delete") {
    const { error } = await admin.from("spaces").delete().eq("id", spaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (action === "transfer") {
    if (!isCreator) return NextResponse.json({ error: "Seul le créateur peut transférer le titre" }, { status: 403 });
    if (!newOwnerId) return NextResponse.json({ error: "newOwnerId requis" }, { status: 400 });
    const { data: target } = await admin.from("space_members").select("status").eq("space_id", spaceId).eq("user_id", newOwnerId).maybeSingle();
    if ((target as any)?.status !== "approved") return NextResponse.json({ error: "Le nouveau créateur doit être un membre approuvé" }, { status: 400 });
    const { error } = await admin.from("spaces").update({ user_id: newOwnerId }).eq("id", spaceId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Ancien créateur devient membre approuvé (pour conserver l'accès)
    await admin.from("space_members").upsert({ space_id: spaceId, user_id: user.id, status: "approved", updated_at: new Date().toISOString() }, { onConflict: "space_id,user_id" });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}