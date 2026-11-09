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
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL || "https://suivitache.vercel.app";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { role, invited: true } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Invité par admin : profil approuvé (pas de notification d'inscription), masqué de la gestion tant que non inscrit
  if (data.user) {
    const payload: any = { id: data.user.id, email, role, is_approved: true, approval_status: "approved", email_verified: true, invited_pending: true };
    const { error: upErr } = await admin.from("profiles").upsert(payload);
    if (upErr) await admin.from("profiles").upsert({ id: data.user.id, email, role, is_approved: true, approval_status: "approved", email_verified: true });
  }

  return NextResponse.json({ ok: true, message: `Invitation envoyée à ${email}` });
}
