-- Approbation des inscriptions + notifications (executer dans Supabase SQL Editor)
alter table public.profiles add column if not exists is_approved boolean not null default true;
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists approval_status text not null default 'approved' check (approval_status in ('approved','pending','rejected'));
update public.profiles set is_approved = true, approval_status = 'approved';

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
drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all" on public.notifications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create index if not exists idx_notifications_unread on public.notifications(is_read, recipient_role);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (id, email, role, is_approved, email_verified, approval_status) values (
    new.id, new.email,
    case when new.email in ('admin@suivitache.com') then 'admin' else 'user' end,
    case when new.email in ('admin@suivitache.com') then true else false end,
    (new.email_confirmed_at is not null),
    case when new.email in ('admin@suivitache.com') then 'approved' else 'pending' end
  )
  on conflict (id) do update set role = excluded.role;
  return new;
end; $func$;

create or replace function public.handle_email_verified()
returns trigger language plpgsql security definer set search_path = public as $func$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles set email_verified = true where id = new.id;
    insert into public.notifications (type, recipient_role, related_user_id, related_email, title, message)
    select 'approval_request', 'admin', new.id, new.email,
      'Nouvelle inscription a valider',
      'Un nouvel utilisateur (' || new.email || ') a confirme son email et attend votre approbation.'
    from public.profiles where role = 'admin' and is_approved = true;
  end if;
  return new;
end; $func$;

drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified after update on auth.users for each row execute function public.handle_email_verified();
