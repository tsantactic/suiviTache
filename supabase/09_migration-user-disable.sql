-- Désactivation/réactivation d'utilisateurs par l'admin
-- À exécuter dans Supabase SQL Editor.

-- Autoriser le statut 'disabled'
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'profiles' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%approval_status%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles add constraint profiles_approval_status_check
  check (approval_status in ('approved','pending','rejected','disabled'));
