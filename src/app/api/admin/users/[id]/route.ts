import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function isAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { email, password, role } = await req.json();
  const admin = createAdminClient();
  const id = params.id;

  if (email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("profiles").update({ email }).eq("id", id);
  }
  if (password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (role) {
    const { error } = await admin.from("profiles").update({ role }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // profiles cascade delete via FK, but ensure
  await admin.from("profiles").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
