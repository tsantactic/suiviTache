# SuiviTache — Gestion de tâches par projet

Next.js 14 + Supabase + Vercel

## Fonctionnalités
- Auth : inscription / connexion (Supabase Auth)
- Projets : création, suppression, clic → vue liste tâches
- Tâches : nom + statut, statut par défaut `À faire`, bouton **Nouvelle tâche**, édition rapide du statut
- Recherche par nom + filtre par statut
- Admin : export JSON/CSV + import JSON (sauvegarde & migration future)
- RLS sécurisé par user

## Installation locale

```bash
npm install
cp .env.example .env.local
# remplir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Supabase

1. Créer un projet sur https://supabase.com
2. SQL Editor → coller `supabase/schema.sql` → Run
3. Authentication → Settings → désactiver "Confirm email" pour tests (optionnel)
4. Copier URL + anon key dans `.env.local`

Passer un user admin :
```sql
update profiles set role='admin' where email='votre@email.com';
```

## Déploiement Vercel

1. Push sur GitHub (`git push`)
2. Vercel → New Project → Import repo
3. Ajouter les 2 variables d'env `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — c'est en ligne

## Statuts
`a_faire` (À faire, défaut), `en_cours` (En cours), `en_attente` (En attente), `termine` (Terminée)

## Export / Import (Admin)
`/admin` → Export JSON complet ou CSV tâches → Import JSON (upsert par id)

