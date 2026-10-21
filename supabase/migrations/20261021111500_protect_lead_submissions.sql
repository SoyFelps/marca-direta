-- Lead submissions must go through the protected Edge Function.
-- The function uses a Supabase secret key server-side, so public clients
-- no longer need direct INSERT access to this table.
revoke insert on table public.leads from anon, authenticated;

drop policy if exists "Allow public lead submissions" on public.leads;
