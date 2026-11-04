-- Historical schedules can include legitimate non-Division-I opponents.
CREATE OR REPLACE FUNCTION public.cbb_run_integrity_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_season text;
  v_final_missing integer;
  v_final_ties integer;
  v_final_unmapped integer;
  v_invalid_venue integer;
  v_stalled integer;
  v_errors integer;
  v_missing_coverage integer;
  v_last_success bigint;
  v_total_games bigint;
  v_critical integer;
  v_warning integer;
  v_issues jsonb := '[]'::jsonb;
  v_metrics jsonb;
  v_id bigint;
  v_severity text;
  v_today date;
BEGIN
  SELECT value INTO v_season FROM public.settings WHERE key='current_season';
  IF v_season IS NULL OR v_season !~ '^20[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Invalid configured current season';
  END IF;
  v_today := (now() AT TIME ZONE 'America/New_York')::date;
  SELECT count(*),
    count(*) FILTER (WHERE status='final' AND (home_score IS NULL OR away_score IS NULL OR home_id IS NULL OR away_id IS NULL)),
    count(*) FILTER (WHERE status='final' AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score=away_score),
    count(*) FILTER (WHERE neutral_site NOT IN (0,1) OR home_id=away_id)
  INTO v_total_games,v_final_missing,v_final_ties,v_invalid_venue
  FROM public.cbb_games;
  SELECT count(*) INTO v_final_unmapped FROM public.cbb_games g
    LEFT JOIN public.programs h ON h.id=g.home_id
    LEFT JOIN public.programs a ON a.id=g.away_id
    WHERE g.status='final' AND (h.id IS NULL OR a.id IS NULL);
  SELECT count(*) INTO v_stalled FROM public.cbb_sync_runs
    WHERE status='running' AND started_at<extract(epoch from now())-1800;
  SELECT count(*) INTO v_errors FROM public.cbb_sync_runs
    WHERE status='error' AND started_at>=extract(epoch from now())-86400;
  SELECT coalesce(max(finished_at),0) INTO v_last_success FROM public.cbb_sync_runs
    WHERE status='ok';
  SELECT count(*) INTO v_missing_coverage
    FROM generate_series(
      greatest((v_today-7)::timestamp, to_date(left(v_season,4)||'-11-01','YYYY-MM-DD')::timestamp),
      (v_today-1)::timestamp, interval '1 day'
    ) days(d)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cbb_game_coverage c
      WHERE c.season=v_season AND c.game_date=to_char(days.d,'YYYY-MM-DD')
        AND c.source_group=50
    );
  v_critical := v_final_missing+v_final_ties+v_invalid_venue;
  v_warning := v_stalled+v_errors+v_missing_coverage;
  IF v_final_missing>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','final_missing_data','count',v_final_missing,'message','Final games have missing scores or team IDs.')); END IF;
  IF v_final_ties>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','final_ties','count',v_final_ties,'message','Final basketball scores are tied and need source verification.')); END IF;
  IF v_invalid_venue>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','invalid_venue','count',v_invalid_venue,'message','Games have invalid venue flags or identical opponents.')); END IF;
  IF v_stalled>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','stalled_jobs','count',v_stalled,'message','Import jobs have been running over 30 minutes.')); END IF;
  IF v_errors>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','failed_jobs','count',v_errors,'message','Imports failed during the past 24 hours.')); END IF;
  IF v_missing_coverage>0 THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('code','missing_dates','count',v_missing_coverage,'message','Current-season dates in the last week have not been verified.')); END IF;
  v_severity:=CASE WHEN v_critical>0 THEN 'critical' WHEN v_warning>0 THEN 'warning' ELSE 'healthy' END;
  v_metrics:=jsonb_build_object(
    'game_count',v_total_games,'final_missing_data',v_final_missing,
    'final_ties',v_final_ties,'unlisted_opponents_in_archive',v_final_unmapped,
    'invalid_venue',v_invalid_venue,'stalled_jobs',v_stalled,
    'failed_24h',v_errors,'missing_recent_dates',v_missing_coverage,
    'last_success_epoch',v_last_success
  );
  INSERT INTO public.cbb_integrity_runs(season,severity,critical_count,warning_count,metrics,issues)
    VALUES(v_season,v_severity,v_critical,v_warning,v_metrics,v_issues) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'season',v_season,'severity',v_severity,
    'critical_count',v_critical,'warning_count',v_warning,
    'metrics',v_metrics,'issues',v_issues);
END;
$$;
REVOKE ALL ON FUNCTION public.cbb_run_integrity_scan() FROM PUBLIC, anon, authenticated;
