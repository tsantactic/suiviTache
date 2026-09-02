-- Migration: projets/tâches partagés pour tous, suppression user ne supprime plus rien
-- À exécuter dans Supabase SQL Editor

-- 1. Rendre user_id nullable + passer en SET NULL au lieu de CASCADE
alter table public.projects drop constraint if exists projects_user_id_fkey;
alter table public.projects alter column user_id drop not null;
alter table public.projects add constraint projects_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.tasks drop constraint if exists tasks_user_id_fkey;
alter table public.tasks alter column user_id drop not null;
alter table public.tasks add constraint tasks_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null;

-- garder tasks.project_id en CASCADE (si projet supprimé, ses tâches disparaissent)
-- (si tu veux aussi garder les tâches quand le projet est supprimé, décommente ci-dessous)
-- alter table public.tasks drop constraint if exists tasks_project_id_fkey;
-- alter table public.tasks add constraint tasks_project_id_fkey foreign key (project_id) references public.projects(id) on delete set null;

-- 2. RLS : tout authenticated peut tout voir/modifier (partagé)
drop policy if exists "projects owner all" on public.projects;
drop policy if exists "projects all auth" on public.projects;
create policy "projects all auth" on public.projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "tasks owner all" on public.tasks;
drop policy if exists "tasks all auth" on public.tasks;
create policy "tasks all auth" on public.tasks for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 3. Optionnel : garder les anciennes policies admin (inutile maintenant, tout le monde voit tout)
