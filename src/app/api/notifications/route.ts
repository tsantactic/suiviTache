import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authCheck() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function GET() {
  const { user, isAdmin } = await authCheck();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createAdminClient();
  let query = admin.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (isAdmin) {
    query = query.or(`recipient_user_id.eq.${user.id},recipient_role.eq.admin`);
  } else {
    query = query.eq("recipient_user_id", user.id);
  }
  const { data } = await query;
  const list = data || [];
  return NextResponse.json({ notifications: list, unread: list.filter((n: any) => !n.is_read).length });
}

export async function POST(req: NextRequest) {
  const { user, isAdmin } = await authCheck();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const admin = createAdminClient();
  const { id } = await req.json().catch(() => ({}));

  // Scope: own notifications (+ admin-role for admins)
  const scope = (q: any) => isAdmin
    ? q.or(`recipient_user_id.eq.${user.id},recipient_role.eq.admin`)
    : q.eq("recipient_user_id", user.id);

  if (id) {
    await scope(admin.from("notifications").update({ is_read: true }).eq("id", id));
  } else {
    await scope(admin.from("notifications").update({ is_read: true }).eq("is_read", false));
  }
  let query = admin.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  query = scope(query);
  const { data } = await query;
  const list = data || [];
  return NextResponse.json({ notifications: list, unread: list.filter((n: any) => !n.is_read).length });
}
