import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function adminCheck() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function GET() {
  const { supabase, isAdmin, user } = await adminCheck();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ notifications: [], unread: 0 });
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const list = data || [];
  return NextResponse.json({ notifications: list, unread: list.filter((n: any) => !n.is_read).length });
}

export async function POST(req: NextRequest) {
  const { supabase, isAdmin, user } = await adminCheck();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await req.json();
  if (id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  } else {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  }
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const list = data || [];
  return NextResponse.json({ notifications: list, unread: list.filter((n: any) => !n.is_read).length });
}
