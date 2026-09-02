-- Bouton Notion Done pour projets
alter table public.projects add column if not exists is_notion_done boolean default false;
alter table public.projects add column if not exists notion_done_at timestamp with time zone;
