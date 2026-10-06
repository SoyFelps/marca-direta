create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text,
  industry text,
  contact_name text,
  whatsapp text,
  email text,
  source text,
  page_url text,
  gclid text,
  user_agent text
);

alter table public.leads enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.leads to anon, authenticated;

drop policy if exists "Allow public lead submissions" on public.leads;
create policy "Allow public lead submissions"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
