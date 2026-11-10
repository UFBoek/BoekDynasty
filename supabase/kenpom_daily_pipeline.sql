
-- Noncommercial, permissioned KenPom integration. Exactly one HTTP retrieval
-- per America/New_York calendar day. The site only reads stored snapshots.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS private.cbb_kenpom_team_map (
  kenpom_team text PRIMARY KEY,
  program_id text NOT NULL UNIQUE REFERENCES public.programs(id)
);
CREATE TABLE IF NOT EXISTS private.cbb_kenpom_fetches (
  snapshot_date date PRIMARY KEY,
  request_id bigint UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','requested','ready','failed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  rows_seen integer NOT NULL DEFAULT 0,
  rows_saved integer NOT NULL DEFAULT 0,
  error_text text
);
CREATE TABLE IF NOT EXISTS private.cbb_kenpom_daily (
  snapshot_date date NOT NULL,
  season text NOT NULL,
  program_id text NOT NULL REFERENCES public.programs(id),
  kenpom_name text NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 400),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date,program_id),
  UNIQUE (snapshot_date,rank)
);
CREATE INDEX IF NOT EXISTS cbb_kenpom_daily_program_date ON private.cbb_kenpom_daily(program_id,snapshot_date DESC);
INSERT INTO private.cbb_kenpom_team_map (kenpom_team,program_id) VALUES
('Duke','150'),
('Florida','57'),
('Houston','248'),
('Illinois','356'),
('Kansas','2305'),
('Michigan St.','127'),
('Vanderbilt','238'),
('Texas','251'),
('Connecticut','41'),
('Virginia','258'),
('Gonzaga','2250'),
('Alabama','333'),
('Arizona','12'),
('Iowa St.','66'),
('Nebraska','158'),
('UCLA','26'),
('Texas Tech','2641'),
('Louisville','97'),
('St. John''s','2599'),
('BYU','252'),
('Miami FL','2390'),
('Auburn','2'),
('Tennessee','2633'),
('Texas A&M','245'),
('Marquette','269'),
('Missouri','142'),
('Arkansas','8'),
('Kentucky','96'),
('Michigan','130'),
('Ohio St.','194'),
('West Virginia','277'),
('LSU','99'),
('USC','30'),
('Mississippi','145'),
('Minnesota','135'),
('Oklahoma St.','197'),
('Baylor','239'),
('Cincinnati','2132'),
('Iowa','2294'),
('TCU','2628'),
('Purdue','2509'),
('Villanova','222'),
('Xavier','2752'),
('Saint Louis','139'),
('North Carolina','153'),
('Utah St.','328'),
('Indiana','84'),
('Virginia Tech','259'),
('Creighton','156'),
('Grand Canyon','2253'),
('Wisconsin','275'),
('Providence','2507'),
('Oklahoma','201'),
('Boise St.','68'),
('Florida St.','52'),
('Mississippi St.','344'),
('VCU','2670'),
('Maryland','120'),
('Oregon','2483'),
('Georgia','61'),
('Nevada','2440'),
('Pittsburgh','221'),
('UCF','2116'),
('Saint Mary''s','2608'),
('New Mexico','167'),
('DePaul','305'),
('San Diego St.','21'),
('Georgetown','46'),
('High Point','2272'),
('Arizona St.','9'),
('N.C. State','152'),
('Notre Dame','87'),
('Memphis','235'),
('Clemson','228'),
('Syracuse','183'),
('SMU','2567'),
('Stanford','24'),
('Washington','264'),
('Santa Clara','2541'),
('Seton Hall','2550'),
('Wichita St.','2724'),
('Rutgers','164'),
('Colorado','38'),
('Colorado St.','36'),
('Oregon St.','204'),
('Northwestern','77'),
('Butler','2086'),
('UC San Diego','28'),
('South Florida','58'),
('Wake Forest','154'),
('Murray St.','93'),
('UC Santa Barbara','2540'),
('Dayton','2168'),
('South Carolina','2579'),
('George Washington','45'),
('Boston College','103'),
('Penn St.','213'),
('Akron','2006'),
('UNLV','2439'),
('Utah','254'),
('Richmond','257'),
('California','25'),
('George Mason','2244'),
('Illinois Chicago','82'),
('Seattle','2547'),
('Texas St.','326'),
('Georgia Tech','59'),
('McNeese','2377'),
('North Texas','249'),
('Davidson','2166'),
('Rhode Island','227'),
('UC Irvine','300'),
('Tulsa','202'),
('Illinois St.','2287'),
('UNC Wilmington','350'),
('Wyoming','2751'),
('Fordham','2230'),
('Charlotte','2429'),
('Kansas St.','2306'),
('Wright St.','2750'),
('Valparaiso','2674'),
('Utah Valley','3084'),
('Loyola Chicago','2350'),
('Miami OH','193'),
('Pacific','279'),
('Western Kentucky','98'),
('Charleston','232'),
('Penn','219'),
('Duquesne','2184'),
('Furman','231'),
('Montana St.','147'),
('Hawaii','62'),
('Yale','43'),
('Saint Joseph''s','2603'),
('Washington St.','265'),
('Harvard','108'),
('Belmont','2057'),
('Toledo','2649'),
('UAB','5'),
('Ohio','195'),
('Florida Atlantic','2226'),
('New Mexico St.','166'),
('Kent St.','2309'),
('Hofstra','2275'),
('San Jose St.','23'),
('James Madison','256'),
('Drake','2181'),
('Liberty','2335'),
('San Francisco','2539'),
('Cal Poly','13'),
('Temple','218'),
('Stephen F. Austin','2617'),
('Loyola Marymount','2351'),
('Northern Iowa','2460'),
('Eastern Washington','331'),
('Marshall','276'),
('Central Arkansas','2110'),
('Kennesaw St.','338'),
('Old Dominion','295'),
('Towson','119'),
('St. Bonaventure','179'),
('Massachusetts','113'),
('Pepperdine','2492'),
('Arkansas St.','2032'),
('CSUN','2463'),
('Western Carolina','2717'),
('Sam Houston St.','2534'),
('Sacramento St.','16'),
('William & Mary','2729'),
('Bowling Green','189'),
('East Tennessee St.','2193'),
('UTEP','2638'),
('East Carolina','151'),
('Elon','2210'),
('Southern Illinois','79'),
('Jacksonville St.','55'),
('Vermont','261'),
('St. Thomas','2900'),
('San Diego','301'),
('La Salle','2325'),
('Eastern Michigan','2199'),
('Middle Tennessee','2393'),
('Princeton','163'),
('Green Bay','2739'),
('Fresno St.','278'),
('Tulane','2655'),
('Northern Kentucky','94'),
('Queens','2511'),
('South Dakota St.','2571'),
('Western Michigan','2711'),
('Youngstown St.','2754'),
('American','44'),
('Texas A&M Corpus Chris','357'),
('Howard','47'),
('Portland','2501'),
('Jacksonville','294'),
('Indiana St.','282'),
('Austin Peay','2046'),
('Tennessee Tech','2635'),
('Troy','2653'),
('Bethune Cookman','2065'),
('Samford','2535'),
('Cal St. Fullerton','2239'),
('FIU','2229'),
('UC Riverside','27'),
('Monmouth','2405'),
('Florida Gulf Coast','526'),
('Denver','2172'),
('Bradley','71'),
('Iona','314'),
('Appalachian St.','2026'),
('Cornell','172'),
('UT Arlington','250'),
('Northern Colorado','2458'),
('UC Davis','302'),
('Longwood','2344'),
('Colgate','2142'),
('Little Rock','2031'),
('Stony Brook','2619'),
('East Texas A&M','2837'),
('Georgia St.','2247'),
('Delaware','48'),
('Robert Morris','2523'),
('Lipscomb','288'),
('Tarleton St.','2627'),
('Buffalo','2084'),
('Oakland','2473'),
('Chattanooga','236'),
('Ball St.','2050'),
('Mercer','2382'),
('Columbia','171'),
('Southern Miss','2572'),
('Portland St.','2502'),
('Tennessee St.','2634'),
('Presbyterian','2506'),
('Houston Christian','2277'),
('Cal St. Bakersfield','2934'),
('Abilene Christian','2000'),
('Drexel','2182'),
('Quinnipiac','2514'),
('Long Beach St.','299'),
('Rice','242'),
('Louisiana Tech','2348'),
('Montana','149'),
('Southern Utah','253'),
('Winthrop','2737'),
('Idaho','70'),
('UT Rio Grande Valley','292'),
('Brown','225'),
('South Alabama','6'),
('Fairfield','2217'),
('North Dakota St.','2449'),
('Louisiana','309'),
('Utah Tech','3101'),
('Missouri St.','2623'),
('Southeastern Louisiana','2545'),
('Georgia Southern','290'),
('Hampton','2261'),
('Merrimack','2771'),
('Coastal Carolina','324'),
('Southeast Missouri','2546'),
('Northern Illinois','2459'),
('Lamar','2320'),
('Purdue Fort Wayne','2870'),
('Northeastern','111'),
('Radford','2515'),
('LIU','112358'),
('UNC Greensboro','2430'),
('Siena','2561'),
('Milwaukee','270'),
('Central Michigan','2117'),
('Nicholls','2447'),
('Evansville','339'),
('South Dakota','233'),
('Lehigh','2329'),
('UMass Lowell','2349'),
('Southern','2582'),
('Kansas City','140'),
('Boston University','104'),
('Eastern Kentucky','2198'),
('UTSA','2636'),
('Alabama St.','2011'),
('Cal Baptist','2856'),
('LSU New Orleans','2443'),
('SIUE','2565'),
('Nebraska Omaha','2437'),
('Campbell','2097'),
('Tennessee Martin','2630'),
('North Alabama','2453'),
('Bellarmine','91'),
('Marist','2368'),
('Mount St. Mary''s','116'),
('Air Force','2005'),
('Stetson','56'),
('Northern Arizona','2464'),
('Weber St.','2692'),
('Grambling St.','2755'),
('North Florida','2454'),
('Wofford','2747'),
('Oral Roberts','198'),
('UMBC','2378'),
('North Carolina A&T','2448'),
('Detroit Mercy','2174'),
('Lindenwood','2815'),
('North Dakota','155'),
('Dartmouth','159'),
('Alabama A&M','2010'),
('Prairie View A&M','2504'),
('IU Indy','85'),
('Sacred Heart','2529'),
('Jackson St.','2296'),
('Southern Indiana','88'),
('Mercyhurst','2385'),
('Cleveland St.','325'),
('UNC Asheville','2427'),
('Le Moyne','2330'),
('Charleston Southern','2127'),
('Northwestern St.','2466'),
('Navy','2426'),
('Manhattan','2363'),
('Bryant','2803'),
('Norfolk St.','2450'),
('The Citadel','2643'),
('VMI','2678'),
('West Georgia','2698'),
('New Hampshire','160'),
('Saint Peter''s','2612'),
('South Carolina St.','2569'),
('Binghamton','2066'),
('Army','349'),
('Texas Southern','2640'),
('Alcorn St.','2016'),
('Niagara','315'),
('Incarnate Word','2916'),
('Lafayette','322'),
('Louisiana Monroe','2433'),
('Wagner','2681'),
('Central Connecticut','2115'),
('Morehead St.','2413'),
('Idaho St.','304'),
('Maine','311'),
('Morgan St.','2415'),
('Florida A&M','50'),
('Bucknell','2083'),
('Albany','399'),
('Chicago St.','2130'),
('USC Upstate','2908'),
('Fairleigh Dickinson','161'),
('North Carolina Central','2428'),
('Gardner Webb','2241'),
('Loyola MD','2352'),
('West Florida','2697'),
('NJIT','2885'),
('Stonehill','284'),
('New Haven','2441'),
('Maryland Eastern Shore','2379'),
('Arkansas Pine Bluff','2029'),
('Rider','2520'),
('Coppin St.','2154'),
('Canisius','2099'),
('Holy Cross','107'),
('Eastern Illinois','2197'),
('Western Illinois','2710'),
('Delaware St.','2169'),
('Mississippi Valley St.','2400')
ON CONFLICT (kenpom_team) DO NOTHING;

CREATE OR REPLACE FUNCTION private.queue_kenpom_once()
RETURNS bigint
LANGUAGE plpgsql SET search_path = ''
AS $proc$
DECLARE
  v_date date := (now() AT TIME ZONE 'America/New_York')::date;
  v_request bigint;
BEGIN
  -- In-season only. No retry and no HTTP request if this date was claimed.
  IF extract(month from v_date)::integer NOT IN (11,12,1,2,3,4) THEN RETURN NULL; END IF;
  INSERT INTO private.cbb_kenpom_fetches(snapshot_date,status)
  VALUES (v_date,'queued') ON CONFLICT (snapshot_date) DO NOTHING;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_request := net.http_get(
    url := 'https://kenpom.com/',
    headers := '{"Accept":"text/html"}'::jsonb,
    timeout_milliseconds := 20000
  );
  UPDATE private.cbb_kenpom_fetches SET request_id=v_request,status='requested'
  WHERE snapshot_date=v_date;
  RETURN v_request;
END;
$proc$;

CREATE OR REPLACE FUNCTION private.process_kenpom_daily(p_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = ''
AS $proc$
DECLARE
  v_day date := coalesce(p_day,(now() AT TIME ZONE 'America/New_York')::date);
  v_request bigint;
  v_state text;
  v_html text;
  v_http integer;
  v_http_error text;
  v_count integer;
  v_matched integer;
  v_unique integer;
  v_ranks integer;
  v_min integer;
  v_max integer;
  v_saved integer;
  v_season text;
  v_start_year integer;
  v_error text;
BEGIN
  SELECT request_id,status INTO v_request,v_state
  FROM private.cbb_kenpom_fetches WHERE snapshot_date=v_day;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_requested','date',v_day); END IF;
  IF v_state='ready' THEN RETURN jsonb_build_object('status','already_ready','date',v_day); END IF;
  IF v_request IS NULL THEN RETURN jsonb_build_object('status','no_request_id','date',v_day); END IF;

  SELECT status_code,content,error_msg INTO v_http,v_html,v_http_error
  FROM net._http_response WHERE id=v_request;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','response_pending_or_expired','date',v_day);
  END IF;
  IF v_http <> 200 OR v_html IS NULL OR length(v_html) < 20000 THEN
    v_error:= 'KenPom HTTP '||coalesce(v_http::text,'unknown')||': '||coalesce(v_http_error,'empty or blocked response');
    UPDATE private.cbb_kenpom_fetches SET status='failed',error_text=left(v_error,500),processed_at=now() WHERE snapshot_date=v_day;
    RETURN jsonb_build_object('status','failed','reason',v_error);
  END IF;

  WITH parsed AS (
    SELECT (m)[1]::integer AS rank,(m)[2] AS name
    FROM regexp_matches(v_html,
      '<td class="hard_left">([0-9]+)</td><td class="next_left"><a href="[^"]+">([^<]+)</a>','g') AS m
  )
  SELECT count(*),count(mp.program_id),count(distinct mp.program_id),count(distinct p.rank),min(p.rank),max(p.rank)
  INTO v_count,v_matched,v_unique,v_ranks,v_min,v_max
  FROM parsed p LEFT JOIN private.cbb_kenpom_team_map mp ON mp.kenpom_team=p.name;

  IF v_count < 350 OR v_count > 400 OR v_matched<>v_count OR
     v_unique<>v_count OR v_ranks<>v_count OR v_min<>1 OR v_max<>v_count THEN
    v_error:=format('Rank validation failed: rows=%s mapped=%s unique_schools=%s unique_ranks=%s range=%s-%s',
      v_count,v_matched,v_unique,v_ranks,v_min,v_max);
    UPDATE private.cbb_kenpom_fetches SET status='failed',rows_seen=v_count,error_text=v_error,processed_at=now()
    WHERE snapshot_date=v_day;
    RETURN jsonb_build_object('status','failed','reason',v_error);
  END IF;

  v_start_year := extract(year from v_day)::integer -
    CASE WHEN extract(month from v_day)::integer<7 THEN 1 ELSE 0 END;
  v_season := v_start_year::text||'-'||lpad(((v_start_year+1)%100)::text,2,'0');
  INSERT INTO private.cbb_kenpom_daily (snapshot_date,season,program_id,kenpom_name,rank)
  SELECT v_day,v_season,mp.program_id,p.name,p.rank
  FROM (
    SELECT (m)[1]::integer rank,(m)[2] name
    FROM regexp_matches(v_html,
      '<td class="hard_left">([0-9]+)</td><td class="next_left"><a href="[^"]+">([^<]+)</a>','g') m
  ) p
  JOIN private.cbb_kenpom_team_map mp ON mp.kenpom_team=p.name
  ON CONFLICT (snapshot_date,program_id) DO NOTHING;
  GET DIAGNOSTICS v_saved = ROW_COUNT;
  UPDATE private.cbb_kenpom_fetches SET status='ready',rows_seen=v_count,
    rows_saved=v_count,error_text=NULL,processed_at=now() WHERE snapshot_date=v_day;
  RETURN jsonb_build_object('status','ready','date',v_day,'season',v_season,'rankings',v_count,'inserted',v_saved);
END;
$proc$;

-- Execute by database scheduler only. No browser/client accesses KenPom.
SELECT cron.schedule('boek_kenpom_once_daily','5 16 * * *',
  'SELECT private.queue_kenpom_once()');
-- Reprocess the same cached response if slow; never issue another HTTP GET.
SELECT cron.schedule('boek_kenpom_parse_daily','15,35 16 * * *',
  'SELECT private.process_kenpom_daily()');
