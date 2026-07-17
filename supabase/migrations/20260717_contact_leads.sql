-- Contact form leads (Auto mode email delivery + audit log)
create table if not exists public.contact_leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'auto' check (mode in ('auto', 'custom')),
  notification_email text,
  endpoint_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_leads_project_id_idx on public.contact_leads (project_id);
create index if not exists contact_leads_user_id_idx on public.contact_leads (user_id);
create index if not exists contact_leads_created_at_idx on public.contact_leads (created_at desc);

alter table public.contact_leads enable row level security;

drop policy if exists contact_leads_select_own on public.contact_leads;
create policy contact_leads_select_own on public.contact_leads
  for select to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.contact_leads from anon, authenticated;
grant select on public.contact_leads to authenticated;
grant all on public.contact_leads to service_role;
