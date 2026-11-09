-- Migration: Espaces (workspaces) contenant des projets, accès au niveau espace
-- À exécuter dans Supabase SQL Editor

-- 1. Table spaces
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Espace',
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

drop trigger if exists trg_spaces_updated on public.spaces;
create trigger trg_spaces_updated before update on public.spaces
  for each row execute function public.handle_updated_at();

alter table public.spaces enable row level security;

drop policy if exists "spaces read auth" on public.spaces;
create policy "spaces read auth" on public.spaces for select using (auth.role() = 'authenticated');
drop policy if exists "spaces insert auth" on public.spaces;
create policy "spaces insert auth" on public.spaces for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
drop policy if exists "spaces update owner" on public.spaces;
create policy "spaces update owner" on public.spaces for update using (auth.uid() = user_id);
drop policy if exists "spaces delete owner" on public.spaces;
create policy "spaces delete owner" on public.spaces for delete using (auth.uid() = user_id);

-- 2. Membres d'espace (demandes d'accès)
create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (space_id, user_id)
);

create index if not exists idx_space_members_space on public.space_members(space_id);
create index if not exists idx_space_members_user on public.space_members(user_id);

drop trigger if exists trg_space_members_updated on public.space_members;
create trigger trg_space_members_updated before update on public.space_members
  for each row execute function public.handle_updated_at();

alter table public.space_members enable row level security;

drop policy if exists "space_members read auth" on public.space_members;
create policy "space_members read auth" on public.space_members for select using (auth.role() = 'authenticated');
drop policy if exists "space_members insert self" on public.space_members;
create policy "space_members insert self" on public.space_members for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
drop policy if exists "space_members update owner" on public.space_members;
create policy "space_members update owner" on public.space_members for update using (
  exists (select 1 from public.spaces s where s.id = space_id and s.user_id = auth.uid())
);
drop policy if exists "space_members delete owner" on public.space_members;
create policy "space_members delete owner" on public.space_members for delete using (
  exists (select 1 from public.spaces s where s.id = space_id and s.user_id = auth.uid())
  or auth.uid() = user_id
);

-- 3. Lier les projets aux espaces
alter table public.projects add column if not exists space_id uuid references public.spaces(id) on delete cascade;
create index if not exists idx_projects_space on public.projects(space_id);

-- 4. Migration des projets existants vers un espace "Espace"
do $$
declare
  v_space_id uuid;
  v_owner_id uuid;
begin
  -- Choisir un créateur: premier admin approuvé, sinon premier profil
  select id into v_owner_id from public.profiles where role = 'admin' and (is_approved is null or is_approved = true) order by created_at limit 1;
  if v_owner_id is null then
    select id into v_owner_id from public.profiles order by created_at limit 1;
  end if;

  if exists (select 1 from public.projects where space_id is null) then
    insert into public.spaces (name, user_id) values ('Espace', v_owner_id) returning id into v_space_id;
    update public.projects set space_id = v_space_id where space_id is null;

    -- Ajouter les anciens propriétaires de projets comme membres approuvés (si différents du créateur)
    insert into public.space_members (space_id, user_id, status)
    select distinct v_space_id, p.user_id, 'approved'
    from public.projects p
    where p.space_id = v_space_id and p.user_id is not null and p.user_id <> v_owner_id
    on conflict (space_id, user_id) do nothing;
  end if;
end $$;
