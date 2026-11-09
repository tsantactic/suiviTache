-- Image par projet (remplace Excalidraw) - partagé
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

-- Bucket Storage pour les images PNG
insert into storage.buckets (id, name, public) values ('project-images','project-images', true) on conflict (id) do nothing;
-- Policies storage (authenticated peut tout, public peut lire)
drop policy if exists "project-images public read" on storage.objects;
create policy "project-images public read" on storage.objects for select using (bucket_id = 'project-images');
drop policy if exists "project-images auth all" on storage.objects;
create policy "project-images auth all" on storage.objects for all using (bucket_id = 'project-images' and auth.role() = 'authenticated') with check (bucket_id = 'project-images' and auth.role() = 'authenticated');
