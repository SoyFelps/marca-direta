create or replace function public.research_lead_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  perform net.http_post(
    url := 'https://api.manus.im/api/webhook/triggers/2ba1bbf6-24fd-4f25-bc01-6b003238bd56',
    headers := jsonb_build_object('Content-Type', 'application/json'),
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
