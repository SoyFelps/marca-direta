alter table public.leads
  add column if not exists research_status text not null default 'pending',
  add column if not exists research_started_at timestamptz,
  add column if not exists research_completed_at timestamptz,
  add column if not exists research_error text,
  add column if not exists research_report text;

-- Existing rows predate this automation and must not be reprocessed automatically.
update public.leads
set research_status = 'not_requested'
where research_status = 'pending'
  and created_at < now();

create or replace function public.research_lead_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  perform net.http_post(
    url := 'https://xsnubphqakjyhoaeoufc.supabase.co/functions/v1/research-lead',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbnVicGhxYWtqeWhvYWVvdWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTY5OTYsImV4cCI6MjEwNjg5Mjk5Nn0.3B3C-G6jaR3GR2vebyhAQ_S6SbAL5insFD-kpcw_rp0',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbnVicGhxYWtqeWhvYWVvdWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTY5OTYsImV4cCI6MjEwNjg5Mjk5Nn0.3B3C-G6jaR3GR2vebyhAQ_S6SbAL5insFD-kpcw_rp0'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'schema', 'public',
      'record', to_jsonb(NEW)
    )
  );
  return NEW;
end;
$function$;

drop trigger if exists leads_research_lead on public.leads;
create trigger leads_research_lead
after insert on public.leads
for each row execute function public.research_lead_on_insert();
