-- Once daily, after official NET check. No Torvik import once official NET is complete.
-- Uses existing encrypted scheduler token, never placed in the repo.
SELECT cron.schedule('boek_torvik_preliminary', '5 12 * * *', $job$
 SELECT net.http_post(
  url:='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api/cron',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='boek_dynasty_job_token')),
  body:='{"kind":"torvik"}'::jsonb,
  timeout_milliseconds:=30000
 );
$job$);
