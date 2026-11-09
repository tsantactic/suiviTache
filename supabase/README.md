# Supabase — fichiers à utiliser (ordre numéroté)

Exécuter les scripts dans **Supabase → SQL Editor** dans l’ordre indiqué.

## Nouvelle installation (base vide)
1. `01_schema.sql` — schéma de base (tables, RLS, triggers).
2. `02_migration-shared.sql` — partage/projets visibles (si pas déjà inclus dans votre usage).
3. `03_migration-kanban.sql` — champs/statuts Kanban.
4. `04_migration-etape.sql` — étapes/tâches (si utilisé par l’app).
5. `05_migration-notion-done.sql` — statut Notion/done.
6. `06_migration-whiteboard.sql` — whiteboard.
7. `07_migration-approval-noemail.sql` — **inscription sans email** : approbation admin via notification in-app.
8. `08_migration-spaces.sql` — **espaces** (workspaces), accès par espace, et migration des projets existants dans un espace nommé **"Espace"**.
9. `09_migration-user-disable.sql` — désactivation/réactivation d'utilisateurs par l'admin.

## Base existante (mise à jour vers le flux actuel)
- Pour le flux **inscription sans email + approbation admin** : exécuter `07_migration-approval-noemail.sql`.
- Pour les **espaces** (et récupérer les anciens projets dans "Espace") : exécuter `08_migration-spaces.sql`.
- Pour la **désactivation/activation** d'utilisateurs : exécuter `09_migration-user-disable.sql`.

## Notes
- Désactiver l’envoi d’email de confirmation : **Supabase Dashboard → Authentication → (Providers/Settings) → Confirm email** = OFF (réglage projet, hors SQL).
- Si vos anciens projets "semblent perdus", ils sont en base : lancez `08_migration-spaces.sql` (déplace les projets sans `space_id` vers l’espace **Espace**).
- Les migrations sont prévues pour être **idempotentes** quand possible (`if not exists`, `create or replace`, etc.), mais lisez-les avant exécution sur une base de production.
