# Guide Push — Modifier ton code sans aide

Pour `suiviTache` (Next.js + Supabase) déployé sur Vercel depuis GitHub `tsantactic/suiviTache`.

## 1. Préparer ton PC (une seule fois)

```bash
git clone git@github.com:tsantactic/suiviTache.git
cd suiviTache
npm install
cp .env.example .env.local
# remplis .env.local avec :
# NEXT_PUBLIC_SUPABASE_URL=https://vpwiapbxofdmzphnuvxw.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
npm run dev  # http://localhost:3000
```

## 2. Workflow quotidien : modifier → pousser → déployer

### a) Modifie ton code
Édite les fichiers dans `src/` (ex: `src/app/dashboard/page.tsx`).

Teste en local :
```bash
npm run build  # doit afficher ✓ Compiled successfully
npm run dev    # vérifie visuellement
```

### b) Vérifie ce qui a changé
```bash
git status          # fichiers modifiés en rouge
git diff            # détail des changements
git log --oneline -5
```

### c) Commit
```bash
git add .   # ou git add src/app/dashboard/page.tsx (plus précis)
git commit -m "feat: description courte de ta modif"
# Exemples :
# feat: ajout colonne priorité tâches
# fix: correction filtre statut
# style: dates en rouge
```

### d) Push vers GitHub
```bash
git push origin main
```
> Si `main` est protégée, Vercel bloque si l'auteur Git ≠ owner. Assure-toi :
> ```bash
> git config user.name "tsantactic"
> git config user.email "email_lie_a_ton_compte_github"
> ```

Si `git push` refuse car le distant a bougé :
```bash
git pull --rebase origin main
# résous les conflits si besoin, puis
git push origin main
```

## 3. Déploiement Vercel (automatique)

- Pas d'action si le repo est connecté : `git push` → Vercel détecte → `Building` → `Ready` (1-2 min) dans `Vercel > Deployments`.
- Sinon : `Vercel > Deployments > Redeploy`.

**Env vars :** si tu ajoutes une nouvelle variable `NEXT_PUBLIC_...`, ajoute-la aussi dans `Vercel > Settings > Environment Variables` (cocher Production + Preview) puis `Redeploy`.

## 4. Modif Supabase (tables / RLS)

1. Modifie `supabase/schema.sql` ou crée `supabase/migration-xxx.sql`
2. Va sur `supabase.com > SQL Editor > New query` → colle le SQL → `Run`
3. Commit le fichier SQL aussi :
```bash
git add supabase/
git commit -m "db: ajout colonne due_date"
git push origin main
```

## 5. Cas courants

| Problème | Solution |
|---|---|
| `Blocked: Hobby + private repo` | Rends le repo public OU `git commit --amend --author="tsantactic <email>"` + `git push -f` |
| `Project names must be lowercase` | Renomme le projet Vercel en `suivi-tache` (minuscules) |
| `supabase URL and API key required` | Mets les 3 vars dans Vercel + Redeploy |
| `NetworkError` au login | Vars non injectées au build → ajoute vars + Redeploy sans cache |
| Conflit git | `git pull --rebase`, édite les fichiers marqués, `git add .`, `git rebase --continue`, `git push` |

## 6. Annuler / Revenir en arrière

```bash
git log --oneline          # trouve le commit à restaurer
git revert <hash>          # crée un nouveau commit qui annule
git push origin main
# ou retour brutal (dangereux) :
git reset --hard HEAD~1
git push -f origin main
```

## 7. Structure à connaître

```
src/app/dashboard/page.tsx          # liste projets
src/app/dashboard/projects/[id]/page.tsx  # liste tâches en colonnes
src/app/dashboard/settings/page.tsx # changer email + mdp (user & admin)
src/app/admin/page.tsx              # gestion rôles + export/import
supabase/schema.sql                 # tables + RLS (à exécuter 1x)
supabase/admin-policies.sql         # droits admin (à exécuter 1x)
supabase/auto-admin.sql             # auto-admin par email
```

Tu n'as besoin de personne : édite → `npm run build` → `git add/commit/push` → Vercel fait le reste.
