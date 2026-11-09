import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !String(email).includes("@")) return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    if (!password || String(password).length < 6) return NextResponse.json({ error: "Mot de passe min 6 caractères" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true, // pas d'email de confirmation envoyé
      user_metadata: {},
    });
    if (error) {
      const msg = error.message || "Erreur lors de l'inscription";
      if (/already|exists|registered/i.test(msg)) return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Le trigger handle_new_user crée le profil + notification admin (auto-inscription).
    // Sécurité/dédup : s'assurer que la notification existe si le trigger n'a pas encore tourné comme attendu.
    const userId = data.user?.id;
    if (userId) {
      try {
        const { data: existing } = await admin.from("notifications").select("id").eq("type", "approval_request").eq("related_user_id", userId).eq("status", "pending").maybeSingle();
        if (!existing) {
          const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").eq("is_approved", true);
          if (admins && admins.length > 0) {
            await admin.from("notifications").insert(
              admins.map((a: any) => ({
                type: "approval_request", recipient_role: "admin", recipient_user_id: a.id,
                related_user_id: userId, related_email: email,
                title: "Nouvelle inscription à valider",
                message: `Un nouvel utilisateur (${email}) attend votre approbation pour accéder à SuiviTâche.`,
                status: "pending", is_read: false,
              }))
            );
          }
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, userId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
