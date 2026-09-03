-- Whiteboard Excalidraw par projet (partagé)
create table if not exists public.whiteboards (
  project_id uuid primary key references public.projects(id) on delete cascade,
  data jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.whiteboards enable row level security;
drop policy if exists "whiteboards all auth" on public.whiteboards;
create policy "whiteboards all auth" on public.whiteboards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create index if not exists idx_whiteboards_project on public.whiteboards(project_id);
