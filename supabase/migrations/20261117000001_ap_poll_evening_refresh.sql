-- AP poll refresh runs at 05:45 and 17:45 Eastern Standard Time
-- (10:45 and 22:45 UTC). The evening run catches new Monday AP polls.
DO $$
DECLARE ap_job bigint;
BEGIN
  SELECT jobid INTO ap_job FROM cron.job WHERE jobname='boek_ap_poll';
  IF ap_job IS NOT NULL THEN
    PERFORM cron.alter_job(job_id:=ap_job,schedule:='45 10,22 * * *');
  END IF;
END $$;
