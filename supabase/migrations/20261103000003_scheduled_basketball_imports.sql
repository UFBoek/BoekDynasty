-- Scheduled scoring sync stays inside Supabase, independent of Cloudflare D1.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('boek_live_scores', '*/15 * * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"live"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_recent_reconcile', '15 10 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"recent"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_upcoming', '30 10 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"upcoming"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_ap_poll', '45 10 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"ap"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_net_rankings', '0 11 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"net"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_history_backfill', '10 */2 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"history"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_postseason', '35 4 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"postseason"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_ncaa_results', '45 4 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"ncaa"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_conference_titles', '50 4 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"titles"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);

SELECT cron.schedule('boek_historical_net', '55 4 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"archive-net"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);
