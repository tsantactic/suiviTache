-- SuiviTache - Schéma Supabase
-- À exécuter dans SQL Editor > New query

-- 1. Table profiles (étend auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamp with time zone default now()
);

-- 2. Table projects (partagé, SET NULL si user supprimé)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  is_notion_done boolean default false,
  notion_done_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Table tasks (partagé, SET NULL si user supprimé)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'a_faire' check (status in ('a_faire','en_cours','a_tester','termine')),
  note text,
  start_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects for each row execute function public.handle_updated_at();
drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.handle_updated_at();

-- Auto-create profile on signup (auto-admin si email listé)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role) values (
    new.id, new.email,
    case when new.email in ('admin@suivitache.com') then 'admin' else 'user' end
  )
  on conflict (id) do update set role = excluded.role;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Policies: profiles (users can read own, admin read all via service but we allow own)
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Allow authenticated to read all profiles for admin check (optional)
drop policy if exists "profiles read all auth" on public.profiles;
create policy "profiles read all auth" on public.profiles for select using (auth.role() = 'authenticated');

-- Projects: partagé pour tous les users authentifiés (tout le monde voit tout)
drop policy if exists "projects owner all" on public.projects;
drop policy if exists "projects all auth" on public.projects;
create policy "projects all auth" on public.projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Tasks: partagé pour tous
drop policy if exists "tasks owner all" on public.tasks;
drop policy if exists "tasks all auth" on public.tasks;
create policy "tasks all auth" on public.tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Pour autoriser l'admin à tout voir (optionnel, si tu veux que l'admin voie tout dans le dashboard)
-- Décommenter si besoin :
-- create policy "admin bypass projects" on public.projects for all using (exists (select 1 from public.profiles where id = auth.uid() and role='admin'));
-- create policy "admin bypass tasks" on public.tasks for all using (exists (select 1 from public.profiles where id = auth.uid() and role='admin'));
