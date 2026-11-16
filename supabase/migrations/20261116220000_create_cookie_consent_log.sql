-- Contador anônimo das escolhas do banner de cookies: só escolha, caminho da página e data.
create table if not exists public.cookie_consent_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  choice      text not null check (choice in ('accepted', 'necessary')),
  via         text not null check (via in ('banner', 'close', 'prefs')),
  page        text not null default '/'
);

alter table public.cookie_consent_log enable row level security;

create or replace view public.cookie_consent_daily
with (security_invoker = true) as
select
  (created_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*)                                              as total,
  count(*) filter (where choice = 'accepted')           as aceitaram,
  count(*) filter (where choice = 'necessary')          as somente_necessarios,
  round(100.0 * count(*) filter (where choice = 'accepted') / count(*), 1) as pct_aceite
from public.cookie_consent_log
group by 1
order by 1 desc;
