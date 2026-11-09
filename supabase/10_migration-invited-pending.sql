-- Masquer les utilisateurs invités (pas encore inscrits) de la gestion admin
-- À exécuter dans Supabase SQL Editor.

alter table public.profiles add column if not exists invited_pending boolean not null default false;
update public.profiles set invited_pending = false where invited_pending is null;
