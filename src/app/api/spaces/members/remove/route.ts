import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { spaceId, userId } = await req.json();
  if (!spaceId || !userId) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const admin = createAdminClient();
  const { data: space } = await admin.from("spaces").select("id,user_id").eq("id", spaceId).single();
  if (!space) return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  const { data: member } = await admin.from("space_members").select("status").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle();
  const isCreator = space.user_id === user.id;
  const isApprovedMember = (member as any)?.status === "approved";
  if (!isCreator && !isApprovedMember) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (userId === space.user_id) return NextResponse.json({ error: "Impossible de renvoyer le créateur" }, { status: 400 });

  await admin.from("space_members").delete().eq("space_id", spaceId).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
