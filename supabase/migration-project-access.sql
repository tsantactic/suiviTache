-- Migration: contrôle d'accès aux espaces projet (demandes d'entrée + approbation créateur)
-- À exécuter dans Supabase SQL Editor

-- 1. Membres / demandes d'accès aux projets
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_project_members_status on public.project_members(status);

drop trigger if exists trg_project_members_updated on public.project_members;
create trigger trg_project_members_updated before update on public.project_members
  for each row execute function public.handle_updated_at();

alter table public.project_members enable row level security;

-- Lecture: tous les utilisateurs authentifiés (pour connaître son statut / lister)
drop policy if exists "project_members read auth" on public.project_members;
create policy "project_members read auth" on public.project_members
  for select using (auth.role() = 'authenticated');

-- Insertion: un utilisateur peut créer sa propre demande
drop policy if exists "project_members insert self" on public.project_members;
create policy "project_members insert self" on public.project_members
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

-- Mise à jour/suppression: créateur du projet (pour approuver/refuser) ou admin via service role
drop policy if exists "project_members update owner" on public.project_members;
create policy "project_members update owner" on public.project_members
  for update using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "project_members delete owner" on public.project_members;
create policy "project_members delete owner" on public.project_members
  for delete using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    or auth.uid() = user_id
  );

-- 2. Notifications: permettre aux destinataires (recipient_user_id) de lire leurs notifs
-- (les policies existantes sont permissives "auth all"; on ajoute une policy explicite de lecture)
drop policy if exists "notifications recipient read" on public.notifications;
create policy "notifications recipient read" on public.notifications
  for select using (recipient_user_id = auth.uid() or recipient_role = 'admin');

-- Permettre l'insertion de notifications par les utilisateurs authentifiés (demandes d'accès)
drop policy if exists "notifications insert auth" on public.notifications;
create policy "notifications insert auth" on public.notifications
  for insert with check (auth.role() = 'authenticated');

-- Permettre la mise à jour de ses propres notifications (marquer lu) ou par créateur cible via API/service
drop policy if exists "notifications update auth" on public.notifications;
create policy "notifications update auth" on public.notifications
  for update using (auth.role() = 'authenticated');

-- 3. Index utile pour retrouver une demande pending
create index if not exists idx_project_members_pending on public.project_members(project_id, user_id) where status = 'pending';
