-- Todos par étape à côté de l'image
alter table public.tasks add column if not exists etape text check (etape in ('recap','swatch_plan','echantillon'));
create index if not exists idx_tasks_etape on public.tasks(etape);
-- valeur par défaut pour existants
update public.tasks set etape='recap' where etape is null;
