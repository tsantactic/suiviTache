import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId || !email) return NextResponse.json({ ok: false }, { status: 400 });
    const admin = createAdminClient();
    // Only for non-approved, non-admin users
    const { data: profile } = await admin.from("profiles").select("role,is_approved,approval_status").eq("id", userId).maybeSingle();
    if (!profile || profile.role === "admin" || profile.is_approved) return NextResponse.json({ ok: true });

    // Dedupe pending approval_request for this user
    const { data: existing } = await admin.from("notifications").select("id").eq("type", "approval_request").eq("related_user_id", userId).eq("status", "pending").maybeSingle();
    if (existing) return NextResponse.json({ ok: true });

    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_approved", true);
    if (admins && admins.length > 0) {
      await admin.from("notifications").insert(
        admins.map((a: any) => ({
          type: "approval_request",
          recipient_role: "admin",
          recipient_user_id: a.id,
          related_user_id: userId,
          related_email: email,
          title: "Nouvelle inscription à valider",
          message: `Un nouvel utilisateur (${email}) attend votre approbation pour accéder à SuiviTâche.`,
          status: "pending",
          is_read: false,
        }))
      );
    } else {
      // fallback: role-based
      await admin.from("notifications").insert({
        type: "approval_request",
        recipient_role: "admin",
        related_user_id: userId,
        related_email: email,
        title: "Nouvelle inscription à valider",
        message: `Un nouvel utilisateur (${email}) attend votre approbation pour accéder à SuiviTâche.`,
        status: "pending",
        is_read: false,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}