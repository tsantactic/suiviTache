-- Migration Kanban : A faire | En cours | À tester | Terminer + date début + note
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter colonnes manquantes
alter table public.tasks add column if not exists note text;
alter table public.tasks add column if not exists start_date date;

-- 2. Migrer ancien statut en_attente -> a_tester
update public.tasks set status='a_tester' where status='en_attente';

-- 3. Mettre à jour le check constraint
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('a_faire','en_cours','a_tester','termine'));

-- 4. Mettre à jour le trigger handle_new_user si besoin (déjà fait)
