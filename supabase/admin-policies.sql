-- À exécuter dans Supabase SQL Editor après schema.sql
-- Permet à l'admin de gérer les rôles des autres users
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admin select all profiles" on public.profiles;
create policy "admin select all profiles" on public.profiles for select
  using (auth.role() = 'authenticated');
