import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { email, role = "user" } = await req.json();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { role } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Assure le profil avec le bon rôle
  if (data.user) {
    await admin.from("profiles").upsert({ id: data.user.id, email, role });
  }

  return NextResponse.json({ ok: true, message: `Invitation envoyée à ${email}` });
}
