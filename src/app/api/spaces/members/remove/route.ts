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
  const isCreator = space.user_id === user.id;
  if (!isCreator) return NextResponse.json({ error: "Non autorisé (réservé au créateur)" }, { status: 403 });
  if (userId === space.user_id) return NextResponse.json({ error: "Impossible de renvoyer le créateur" }, { status: 400 });

  await admin.from("space_members").delete().eq("space_id", spaceId).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
