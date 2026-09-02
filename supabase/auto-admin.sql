-- Auto-admin : exécuter APRÈS schema.sql
-- Remplace 'admin@suivitache.com' par l'email que tu veux
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email in ('admin@suivitache.com') then 'admin' else 'user' end
  )
  on conflict (id) do update set role = excluded.role;
  return new;
end; $$;

-- Pour promouvoir un admin existant (si déjà inscrit) :
-- update profiles set role='admin' where email='admin@suivitache.com';
