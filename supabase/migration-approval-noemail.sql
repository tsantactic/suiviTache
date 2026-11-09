-- Inscription SANS validation email : l'admin approuve via notification in-app.
-- À exécuter dans Supabase SQL Editor (compatible si migration-approval déjà faite).

alter table public.profiles add column if not exists is_approved boolean not null default true;
alter table public.profiles add column if not exists email_verified boolean not null default true;
alter table public.profiles add column if not exists approval_status text not null default 'approved';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_approval_status_check') then
    alter table public.profiles add constraint profiles_approval_status_check check (approval_status in ('approved','pending','rejected'));
  end if;
end $$;

-- Cohérence flux sans email : comptes approuvés considérés vérifiés
update public.profiles set email_verified = true where is_approved = true;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'approval_request',
  recipient_role text not null default 'admin',
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  related_user_id uuid references public.profiles(id) on delete cascade,
  related_email text,
  title text not null,
  message text,
  is_read boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamp with time zone default now()
);
alter table public.notifications enable row level security;

-- Policies notifications (idempotentes)
drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all" on public.notifications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "notifications recipient read" on public.notifications;
create policy "notifications recipient read" on public.notifications for select using (recipient_user_id = auth.uid() or recipient_role = 'admin');
drop policy if exists "notifications insert auth" on public.notifications;
create policy "notifications insert auth" on public.notifications for insert with check (auth.role() = 'authenticated');
drop policy if exists "notifications update auth" on public.notifications;
create policy "notifications update auth" on public.notifications for update using (auth.role() = 'authenticated');

create index if not exists idx_notifications_unread on public.notifications(is_read, recipient_role);

-- À l'inscription : profil en attente (non-admin) + notification aux admins
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
declare
  v_role text;
  v_approved boolean;
  v_status text;
begin
  v_role := case when new.email in ('admin@suivitache.com') then 'admin' else 'user' end;
  v_approved := (v_role = 'admin');
  v_status := case when v_role = 'admin' then 'approved' else 'pending' end;

  insert into public.profiles (id, email, role, is_approved, email_verified, approval_status)
  values (new.id, new.email, v_role, v_approved, true, v_status)
  on conflict (id) do update set role = excluded.role;

  if v_role <> 'admin' then
    insert into public.notifications (type, recipient_role, recipient_user_id, related_user_id, related_email, title, message, status, is_read)
    select 'approval_request', 'admin', p.id, new.id, new.email,
      'Nouvelle inscription à valider',
      'Un nouvel utilisateur (' || new.email || ') attend votre approbation pour accéder à SuiviTâche.',
      'pending', false
    from public.profiles p where p.role = 'admin' and (p.is_approved is null or p.is_approved = true);

    if not exists (select 1 from public.profiles p where p.role = 'admin' and (p.is_approved is null or p.is_approved = true)) then
      insert into public.notifications (type, recipient_role, related_user_id, related_email, title, message, status, is_read)
      values ('approval_request', 'admin', new.id, new.email,
        'Nouvelle inscription à valider',
        'Un nouvel utilisateur (' || new.email || ') attend votre approbation pour accéder à SuiviTâche.',
        'pending', false);
    end if;
  end if;
  return new;
end; $func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Désactive l'ancien flux basé sur email vérifié (si présent)
drop trigger if exists on_auth_user_email_verified on auth.users;
drop function if exists public.handle_email_verified();
