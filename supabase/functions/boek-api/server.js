import {DATA_PIPELINE} from './results.js';
import {PROGRAM_DIRECTORY} from './data.js';
const BRAND_LOGO_BASE64='';
const CLIENT='';
const CSS='';
const PAGE='';
export default (function makeWorker(){
  const COOKIE='boek_session';
  const SESSION_SECONDS=90*24*60*60;
  const BROWSER_SESSION_SECONDS=24*60*60;
  const ENCODER=new TextEncoder();
  const DEFAULT_SCORING=Object.freeze({"regular_win":1,"conference_tournament_win":2,"quad_2_win":0.5,"quad_1_win":1.5,"quad_1a_win":2.5,"conference_regular_title":8,"conference_tournament_title":8,"ncaa_seed_1":14,"ncaa_seed_2":13,"ncaa_seed_3":12,"ncaa_seed_4":11,"ncaa_seed_5":10,"ncaa_seed_6":9,"ncaa_seed_7":8,"ncaa_seed_8":7,"ncaa_seed_9":6,"ncaa_seed_10":5,"ncaa_seed_11":5,"ncaa_seed_12":5,"ncaa_seed_13":5,"ncaa_seed_14":5,"ncaa_seed_15":5,"ncaa_seed_16":5,"ncaa_tournament_win":3,"ncaa_at_large_bid":5,"ncaa_upset_per_seed":1,"ncaa_opening_round_win":2,"national_championship":15,"best_programs":8});
  function scoringFrom(raw){
    let data={};try{data=JSON.parse(raw||'{}');}catch{}
    if(!data||typeof data!=='object'||Array.isArray(data))data={};
    // Read legacy settings without changing historical totals: old Q1A was Q1 + an extra point.
    if(data.quad_1a_win===undefined&&typeof data.quad_1a_extra==='number')
      data.quad_1a_win=Number(data.quad_1_win??DEFAULT_SCORING.quad_1_win)+data.quad_1a_extra;
    // Preserve league-specific legacy bucket weights until commissioners migrate
    // their scoring configuration to individual NCAA seed lines.
    for(let seed=1;seed<=16;seed++){
      const key='ncaa_seed_'+seed;
      if(data[key]!==undefined)continue;
      const legacy=seed<=4?'ncaa_seed_1_4':seed<=8?'ncaa_seed_5_8':
        seed<=12?'ncaa_seed_9_12':'ncaa_seed_13_16';
      if(typeof data[legacy]==='number')data[key]=data[legacy];
    }
    const result={...DEFAULT_SCORING};
    for(const key of Object.keys(result)){
      const value=data[key];
      if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100&&
        (key!=='best_programs'||(Number.isInteger(value)&&value>=1&&value<=20)))result[key]=value;
    }
    return result;
  }

  const confIds=new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','16','18','19','20','21','22','23','24','25','26','27','28','29','30','44','45','46','62']);
  const eligibleProgram=(program,settings)=>{
    if(!program)return false;
    const id=String(Array.isArray(program)?program[0]:program.id);
    const conference=String(Array.isArray(program)?program[3]:program.conference_id);
    return !settings.excluded_programs.includes(id)&&
      (settings.conferences.includes(conference)||settings.included_programs.includes(id));
  };
  const timestamp=()=>Math.floor(Date.now()/1000);
  const rand=(length=24)=>{
    const bytes=crypto.getRandomValues(new Uint8Array(length));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  async function hash(str){
    const digest=await crypto.subtle.digest('SHA-256',ENCODER.encode(str));
    return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function hashPassword(password,salt){
    const key=await crypto.subtle.importKey('raw',ENCODER.encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:ENCODER.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
    return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');
  }
  const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
  const cookie=(token)=>COOKIE+'='+encodeURIComponent(token)+'; Max-Age='+SESSION_SECONDS+'; Path=/; HttpOnly; Secure; SameSite=Lax';
  const clearCookie=()=>COOKIE+'=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';
  function response(payload,code=200,headers={}){
    return new Response(JSON.stringify(payload),{status:code,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
  }
  const failure=(message,code=400)=>response({error:message},code);
  const htmlHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://a.espncdn.com data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
  async function getUser(request,env){
    const authorization=request.headers.get('Authorization')||'';
    const supplied=authorization.startsWith('Bearer ')?authorization.slice(7):'';
    const raw=request.headers.get('Cookie')||'';
    const part=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
    if(!part&&!supplied)return null;
    let token=supplied;
    try{if(!supplied)token=decodeURIComponent(part.substring(COOKIE.length+1));}catch{return null;}
    if(!token||token.length<25||token.length>256)return null;
    const entry=await q(env,'SELECT s.token_hash,s.expires_at,u.id,u.username,u.display_name,u.role,u.avatar_data,u.accent_color,u.favorite_program_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await hash(token),timestamp()).first();
    if(!entry)return null;
    return {user:{id:entry.id,username:entry.username,display_name:entry.display_name,role:entry.role,avatar_data:entry.avatar_data,accent_color:entry.accent_color,favorite_program_id:entry.favorite_program_id},session:entry,token};
  }
  async function remember(env,userId,rememberDevice=true){
    const token=rand(32);
    const ttl=rememberDevice?SESSION_SECONDS:BROWSER_SESSION_SECONDS;
    await q(env,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await hash(token),userId,timestamp()+ttl).run();
    return token;
  }
  function invalidUser(data){
    const username=String(data.username||'').trim().toLowerCase();
    const display=String(data.display_name||'').trim();
    const password=String(data.password||'');
    if(!/^[a-z0-9_]{3,24}$/.test(username))return {error:'Username must be 3–24 letters, numbers or underscores.'};
    if(display.length<2||display.length>40)return {error:'Team name must be 2–40 characters.'};
    if(password.length<8||password.length>128)return {error:'Password must be 8–128 characters.'};
    return {username,display,password};
  }
  async function createUser(env,d,role){
    const data=invalidUser(d);
    if(data.error)throw new Error(data.error);
    const id=crypto.randomUUID(),salt=rand(18);
    const password_hash=await hashPassword(data.password,salt);
    await q(env,'INSERT INTO users(id,username,display_name,password_hash,salt,role) VALUES(?,?,?,?,?,?)',id,data.username,data.display,password_hash,salt,role).run();
    return {id,username:data.username,display_name:data.display,role};
  }
  async function getSettings(env){
    const result=(await q(env,'SELECT key,value FROM settings').all()).results||[];
    const map=Object.fromEntries(result.map(x=>[x.key,x.value]));
    return {conferences:JSON.parse(map.conferences||'[]'),included_programs:JSON.parse(map.included_programs||'[]'),excluded_programs:JSON.parse(map.excluded_programs||'[]'),rounds:Number(map.rounds||8),draft_status:map.draft_status||'pending',current_season:map.current_season||'2026-27',
      league_name:map.league_name||'Boek Dynasty',max_managers:Number(map.max_managers||10),
      trading_enabled:map.trading_enabled!=='0',draft_order:JSON.parse(map.draft_order||'[]'),
      draft_clock_seconds:Number(map.draft_clock_seconds||0),draft_deadline:Number(map.draft_deadline||0),
      waivers_enabled:map.waivers_enabled==='1',scoring:scoringFrom(map.scoring_rules),
      draft_race:(()=>{try{
        const race=JSON.parse(map.draft_race||'null');
        return race&&typeof race.id==='string'&&Array.isArray(race.order)&&Array.isArray(race.lanes)?race:null;
      }catch{return null;}})()};
  }
  async function setSetting(env,key,value){
    await q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,String(value)).run();
  }
  const resolvedOrder=(users,settings)=>{
    const ids=users.map(u=>u.id);
    const saved=Array.isArray(settings.draft_order)?settings.draft_order:[];
    return [...new Set([...saved.filter(id=>ids.includes(id)),...ids])];
  };
  const originalPickOwner=(slot,ids)=>{
    if(!ids.length||slot<1)return null;
    const pos=slot-1,round=Math.floor(pos/ids.length),index=pos%ids.length;
    return ids[round%2===0?index:ids.length-1-index]||null;
  };
  const currentPickOwner=(slot,ids,owners)=>owners.get(slot)||originalPickOwner(slot,ids);
  const tradeError=(message,status=409)=>Object.assign(new Error(message),{tradeStatus:status});
  async function pickInventory(env,settings){
    const users=(await q(env,'SELECT id FROM users ORDER BY created_at,id').all()).results||[];
    const ids=resolvedOrder(users,settings);
    const rows=(await q(env,'SELECT overall,owner_manager_id FROM draft_pick_owners').all()).results||[];
    const owners=new Map(rows.map(x=>[Number(x.overall),x.owner_manager_id]));
    const picked=Number((await q(env,'SELECT count(*) AS total FROM picks').first())?.total||0);
    return {ids,owners,picked,total:ids.length*settings.rounds};
  }
  const parseDraftQueue=row=>{
    let items=[];
    try{items=JSON.parse(row?.program_ids||'[]');}catch(e){}
    return {items:Array.isArray(items)?items.map(String).slice(0,120):[],version:Number(row?.revision)||0};
  };
  async function getState(env,user){
    const [users,teams,picks,ownership,trades,tradeItems,pickOwners,pickTradeItems,settings,archives,archivedRosters,seasonRecords,waiverClaims,rosterMoves,draftQueueRow]=await Promise.all([
      q(env,"SELECT id,username,display_name,role,created_at,avatar_data,accent_color,favorite_program_id FROM users ORDER BY created_at,id").all(),
      q(env,'SELECT id,name,abbr,conference_id,logo FROM programs ORDER BY name').all(),
      q(env,'SELECT overall,round,manager_id,program_id,picked_at FROM picks ORDER BY overall').all(),
      q(env,'SELECT program_id,manager_id,acquired_at FROM program_owners').all(),
      q(env,'SELECT id,from_manager_id,to_manager_id,status,offered_at,resolved_at FROM trades ORDER BY offered_at DESC LIMIT 100').all(),
      q(env,'SELECT trade_id,program_id,from_manager_id,to_manager_id FROM trade_items WHERE trade_id IN (SELECT id FROM trades ORDER BY offered_at DESC LIMIT 100)').all(),
      q(env,'SELECT overall,owner_manager_id FROM draft_pick_owners ORDER BY overall').all(),
      q(env,'SELECT trade_id,overall,from_manager_id,to_manager_id FROM draft_pick_trade_items WHERE trade_id IN (SELECT id FROM trades ORDER BY offered_at DESC LIMIT 100)').all(),
      getSettings(env),
      q(env,'SELECT season,archived_at,champion_manager_id FROM season_archives ORDER BY season DESC').all(),
      q(env,'SELECT season,manager_id,program_id FROM season_rosters ORDER BY season DESC').all(),
      q(env,'SELECT season,manager_id,programs_count,fantasy_points,final_place FROM season_manager_records ORDER BY season DESC').all(),
      q(env,'SELECT id,season,manager_id,program_id,drop_program_id,status,created_at,resolved_at FROM waiver_claims ORDER BY created_at DESC LIMIT 150').all(),
      q(env,'SELECT id,season,manager_id,program_id,action,created_at FROM roster_transactions ORDER BY created_at DESC LIMIT 150').all(),
      q(env,'SELECT program_ids,revision FROM draft_queues WHERE manager_id=?',user.id).first()
    ]);
    const allUsers=users.results||[];
    const order=resolvedOrder(allUsers,settings);
    return {user,users:allUsers,programs:teams.results||[],picks:picks.results||[],ownership:ownership.results||[],trades:trades.results||[],trade_items:tradeItems.results||[],draft_pick_owners:pickOwners.results||[],draft_pick_trade_items:pickTradeItems.results||[],settings,draft_order:order,max_managers:settings.max_managers,season:settings.current_season,archives:archives.results||[],archived_rosters:archivedRosters.results||[],season_records:seasonRecords.results||[],waiver_claims:waiverClaims.results||[],roster_transactions:rosterMoves.results||[],draft_queue:parseDraftQueue(draftQueueRow)};
  }
  function parseBody(req){
    if(!(req.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw new Error('JSON request required.');
    const size=Number(req.headers.get('Content-Length')||0);
    if(size>110000)throw new Error('Request too large.');
    return req.json();
  }
  async function handleApi(request,env,url){
    const path=url.pathname.slice(5);
    if(path==='status'&&request.method==='GET'){
      const row=await q(env,'SELECT count(*) AS total FROM users').first();
      const settings=await getSettings(env);
       return response({needs_setup:Number(row?.total||0)===0,max_managers:settings.max_managers,registered:Number(row?.total||0),league_name:settings.league_name});
    }
    if(path==='state'&&request.method==='GET'){
      const auth=await getUser(request,env);
      if(!auth)return failure('Sign in required.',401);
      const data=await getState(env,auth.user);
      // Fixed expiry ensures a temporary browser login never becomes a
      // 90-day remembered session during ordinary state polling.
      return response(data);
    }

    // Result views require an active manager session; data changes require commissioner access.
    if(request.method==='GET'&&path.startsWith('data/')){
      const auth=await getUser(request,env);
      if(!auth)return failure('Sign in required.',401);
      const settings=await getSettings(env),season=settings.current_season;
      if(path==='data/integrity'){
        if(auth.user.role!=='commissioner')return failure('Commissioner access required.',403);
        const [scans,revisions]=await Promise.all([
          q(env,'SELECT id,scanned_at,season,severity,critical_count,warning_count,metrics,issues FROM cbb_integrity_runs ORDER BY scanned_at DESC LIMIT 12').all(),
          q(env,'SELECT id,changed_at,actor_id,previous_rules,new_rules FROM cbb_scoring_revisions ORDER BY changed_at DESC LIMIT 10').all()
        ]);
        const history=scans.results||[];
        return response({latest:history[0]||null,history,revisions:revisions.results||[]});
      }
      if(path==='data/status')return response(await DATA_PIPELINE.status(env,season));
      if(path==='data/records')return response({season,records:await DATA_PIPELINE.records(env,season)});
      if(path==='data/standings'){
        const [history,allUsers,owners]=(await Promise.all([
          DATA_PIPELINE.historicalLeaders(env,settings.scoring,season),
          q(env,'SELECT id,display_name FROM users ORDER BY created_at,id').all(),
          q(env,'SELECT manager_id,program_id FROM program_owners').all()
        ]));
        const best=Math.max(1,Number(settings.scoring.best_programs)||8);
        const programPoints=Object.fromEntries(history.rows
          .filter(row=>row.season===season)
          .map(row=>[String(row.program_id),Math.round((Number(row.points)||0)*100)/100]));
        const allOwners=owners.results||[];
        const standings=(allUsers.results||[]).map(member=>{
          const schools=allOwners.filter(p=>p.manager_id===member.id)
            .map(p=>({program_id:p.program_id,points:programPoints[String(p.program_id)]||0}))
            .sort((a,b)=>b.points-a.points||String(a.program_id).localeCompare(String(b.program_id)));
          const counted=schools.slice(0,best);
          return {manager_id:member.id,display_name:member.display_name,
            points:Math.round(counted.reduce((total,p)=>total+p.points,0)*100)/100,
            counted_program_ids:counted.map(p=>p.program_id),
            counted_programs:counted.length,rostered_programs:schools.length};
        }).sort((a,b)=>b.points-a.points||a.display_name.localeCompare(b.display_name));
        return response({season,best_programs:best,as_of:timestamp(),standings,
          program_points:programPoints,net_verified:history.quadrant_source==='net',
          quadrant_source:history.quadrant_source,quadrant_provisional:history.quadrant_provisional});
      }

      if(path==='data/games'){
        const day=String(url.searchParams.get('date')||DATA_PIPELINE.localDay());
        if(!DATA_PIPELINE.dayInSeason(season,day))return failure('Select a date in the current basketball season.',400);
        const confMap=new Map(PROGRAM_DIRECTORY.map(row=>[String(row[0]),String(row[3])]));
        const [gamesByDay,ranking,recordsResult]=await Promise.all([
          DATA_PIPELINE.gamesByDate(env,season,day),
          DATA_PIPELINE.activeRankings(env,season),
          q(env,`SELECT program_id,SUM(w) AS wins,COUNT(*)-SUM(w) AS losses
            FROM (
              SELECT home_id AS program_id,CASE WHEN home_score>away_score THEN 1 ELSE 0 END AS w
              FROM cbb_games WHERE season=? AND game_date<=? AND status='final'
                AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score<>away_score
              UNION ALL
              SELECT away_id AS program_id,CASE WHEN away_score>home_score THEN 1 ELSE 0 END AS w
              FROM cbb_games WHERE season=? AND game_date<=? AND status='final'
                AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score<>away_score
            ) outcomes GROUP BY program_id`,season,day,season,day).all()
        ]);
        const records=Object.fromEntries((recordsResult.results||[])
          .map(r=>[String(r.program_id),{wins:Number(r.wins)||0,losses:Number(r.losses)||0}]));
        const net=Object.fromEntries(ranking.rows.map(r=>[String(r.program_id),Number(r.net_rank)]));
        const venue=(g,isHome)=>g.neutral_site?'neutral':isHome?'home':'away';
        const quad=(rank,site)=>DATA_PIPELINE.quadrant(rank,site);
        const games=gamesByDay.map(g=>{
          const homeNet=net[String(g.home_id)],awayNet=net[String(g.away_id)];
          const homeSite=venue(g,true),awaySite=venue(g,false);
          return {...g,
            home_conference_id:confMap.get(String(g.home_id))||null,
            away_conference_id:confMap.get(String(g.away_id))||null,
            home_record:records[String(g.home_id)]||null,
            away_record:records[String(g.away_id)]||null,
            home_net:Number.isInteger(homeNet)?homeNet:null,
            away_net:Number.isInteger(awayNet)?awayNet:null,
            home_quad:quad(awayNet,homeSite),
            away_quad:quad(homeNet,awaySite),
            home_q1a:DATA_PIPELINE.isQ1A(awayNet,homeSite),
            away_q1a:DATA_PIPELINE.isQ1A(homeNet,awaySite)
          };
        });
        return response({season,date:day,games,
          net_date:ranking.source==='net'?ranking.snapshot_date:null,
          ranking_date:ranking.snapshot_date,ranking_source:ranking.source,
          quadrant_provisional:ranking.provisional,
          record_note:'Records include final games through the selected date.',
          quadrant_note:ranking.source==='net'?'Quadrants use the latest official NCAA NET and the actual home, away or neutral venue.':
            ranking.source==='torvik'?'Provisional quadrants and fantasy bonuses use Bart Torvik T-Rank until complete NCAA NET rankings become available. All bonuses will be recalculated from official NET.':
            'Quadrants are pending until a complete T-Rank or official NCAA NET ranking feed becomes available.'});
      }
      if(path==='data/rankings'){
        const poll=await DATA_PIPELINE.apPoll(env,season);
        return response({season,source:poll[0]?.source||'Associated Press Top 25',as_of:poll[0]?.snapshot_date||null,
          teams:poll.map(p=>({program_id:p.program_id,rank:p.ap_rank}))});
      }
      if(path==='data/quad')return response({season,...await DATA_PIPELINE.seasonQuadrants(env,season)});
      if(path==='data/leaders')return response(await DATA_PIPELINE.historicalLeaders(env,settings.scoring,season,settings));
      if(path==='data/history'){
        const id=String(url.searchParams.get('id')||'');
        if(!id||id.length>120||!PROGRAM_DIRECTORY.some(p=>String(p[0])===id))return failure('Program not found.',404);
        return response(await DATA_PIPELINE.programHistory(env,id,settings.scoring,season,settings));
      }
      if(path==='data/schedule'){
        const id=String(url.searchParams.get('id')||'');
        if(!id||id.length>120||!PROGRAM_DIRECTORY.some(p=>String(p[0])===id))return failure('Program not found.',404);
        return response(await DATA_PIPELINE.publishedTeamSchedule(env,season,id));
      }
      if(path==='data/program'){
        const id=String(url.searchParams.get('id')||'');
        if(!id||id.length>120||!PROGRAM_DIRECTORY.some(p=>String(p[0])===id))return failure('Program not found.',404);
        const [games,ranks,allRecords,awards,quads]=await Promise.all([
          DATA_PIPELINE.programGames(env,season,id),
          DATA_PIPELINE.activeRankings(env,season),
          DATA_PIPELINE.records(env,season),
          q(env,'SELECT award_type,value,source_note FROM cbb_awards WHERE season=? AND program_id=?',season,id).all(),
          DATA_PIPELINE.seasonQuadrants(env,season)
        ]);
        return response({season,id,games,record:allRecords.find(x=>x.program_id===id)||{wins:0,losses:0,played:0},
          net:ranks.rows.find(x=>x.program_id===id)||null,net_date:ranks.source==='net'?ranks.snapshot_date:null,
          ranking_date:ranks.snapshot_date,ranking_source:ranks.source,quadrant_provisional:ranks.provisional,
          quadrants:quads.by_program[id]||null,awards:awards.results||[]});
      }
      return failure('Not found.',404);
    }
    if(request.method!=='POST')return failure('Not found.',404);
    if(request.headers.get('Origin') && request.headers.get('Origin')!==env.FRONTEND_ORIGIN)return failure('Invalid request origin.',403);
    let data;
    try{data=await parseBody(request);}catch(e){return failure('Invalid JSON request.',400);}
    if(path==='setup'){
      const count=await q(env,'SELECT count(*) AS total FROM users').first();
      if(Number(count.total)>0)return failure('Commissioner already exists.',409);
      const expected=await q(env,"SELECT value FROM settings WHERE key='setup_hash'").first();
      if(!expected||await hash(String(data.code||''))!==expected.value)return failure('Invalid commissioner setup code.',403);
      const user=await createUser(env,data,'commissioner');
      await q(env,"DELETE FROM settings WHERE key='setup_hash'").run();
      return response({user,token:await remember(env,user.id,data.remember_device!==false)});
    }
    if(path==='join'){
      const code=String(data.code||'').trim();
      const entry=await q(env,'SELECT * FROM invites WHERE code_hash=? AND used_at IS NULL AND expires_at>?',await hash(code),timestamp()).first();
      if(!entry)return failure('This invitation is invalid, expired or already used.',403);
      const setting=await getSettings(env);
      if(setting.draft_status!=='pending')return failure('New members cannot join after the draft has started.',409);
      if(setting.draft_race)return failure('The draft order race is finalized. Ask the commissioner to reset it before inviting more managers.',409);
      if((await q(env,'SELECT count(*) AS n FROM draft_pick_owners').first()).n>0)
        return failure('The draft order is locked following a pick trade.',409);
      const num=await q(env,'SELECT count(*) AS total FROM users').first();
      if(num.total>=setting.max_managers)return failure('This league is full ('+setting.max_managers+' managers).',409);
      const user=await createUser(env,data,'manager');
      await q(env,'UPDATE invites SET used_at=? WHERE code_hash=? AND used_at IS NULL',timestamp(),entry.code_hash).run();
      return response({user,token:await remember(env,user.id,data.remember_device!==false)});
    }
    if(path==='login'){
      const username=String(data.username||'').trim().toLowerCase();
      const password=String(data.password||'');
      if(!username||!password)return failure('Enter username and password.');
      const attempts=await q(env,'SELECT attempts,started_at FROM login_attempts WHERE username=?',username).first();
      if(attempts && attempts.started_at>timestamp()-900 && attempts.attempts>=8)return failure('Too many attempts. Please try again in 15 minutes.',429);
      const row=await q(env,'SELECT id,username,display_name,role,password_hash,salt FROM users WHERE username=?',username).first();
      let valid=false;
      if(row)valid=(await hashPassword(password,row.salt))===row.password_hash;
      if(!valid){
        await q(env,'INSERT INTO login_attempts(username,attempts,started_at) VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET attempts=CASE WHEN started_at<? THEN 1 ELSE attempts+1 END,started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END',username,timestamp(),timestamp()-900,timestamp()-900).run();
        return failure('Incorrect username or password.',401);
      }
      await q(env,'DELETE FROM login_attempts WHERE username=?',username).run();
      const user={id:row.id,username:row.username,display_name:row.display_name,role:row.role};
      return response({user,token:await remember(env,row.id,data.remember_device!==false)});
    }
    if(path==='logout'){
      const auth=await getUser(request,env);
      if(auth)await q(env,'DELETE FROM sessions WHERE token_hash=?',auth.session.token_hash).run();
      return response({ok:true});
    }
    const auth=await getUser(request,env);
    if(!auth)return failure('Sign in required.',401);
    const user=auth.user;
    if(path==='draft/queue'){
      const ids=data?.program_ids;
      const version=Number(data?.version);
      if(!Array.isArray(ids)||ids.length>120||ids.some(id=>!((typeof id==='string'||typeof id==='number')&&/^[A-Za-z0-9_-]{1,40}$/.test(String(id)))))
        return failure('Invalid draft queue. Choose up to 120 programs.');
      const items=ids.map(String);
      if(new Set(items).size!==items.length)return failure('Draft queue cannot contain duplicates.');
      if(!Number.isInteger(version)||version<0||version>2147483646)
        return failure('Invalid draft queue revision.');
      let saved;
      if(version===0){
        saved=await q(env,'INSERT INTO draft_queues(manager_id,program_ids,revision,updated_at) VALUES(?,?,1,?) ON CONFLICT(manager_id) DO NOTHING RETURNING program_ids,revision',
          user.id,JSON.stringify(items),timestamp()).first();
      }else{
        saved=await q(env,'UPDATE draft_queues SET program_ids=?,revision=revision+1,updated_at=? WHERE manager_id=? AND revision=? RETURNING program_ids,revision',
          JSON.stringify(items),timestamp(),user.id,version).first();
      }
      if(!saved){
        const latest=await q(env,'SELECT program_ids,revision FROM draft_queues WHERE manager_id=?',user.id).first();
        return response({error:'Draft queue changed on another device.',draft_queue:parseDraftQueue(latest)},409);
      }
      return response({ok:true,draft_queue:parseDraftQueue(saved),version:Number(saved.revision)});
    }
    if(path==='account/profile'){
      const current=await q(env,'SELECT username,display_name,avatar_data,accent_color,favorite_program_id FROM users WHERE id=?',user.id).first();
      if(!current)return failure('Account not found.',404);
      const username=String(data.username??current.username).trim().toLowerCase();
      const display_name=String(data.display_name??current.display_name).trim();
      if(!/^[a-z0-9_]{3,24}$/.test(username))return failure('Username must be 3–24 letters, numbers or underscores.');
      if(display_name.length<2||display_name.length>40)return failure('Team name must be 2–40 characters.');
      const reserved=await q(env,'SELECT id FROM users WHERE lower(username)=? AND id<>?',username,user.id).first();
      if(reserved)return failure('That username is already taken.',409);
      const colors=['#D9611E','#164E8F','#1F8A70','#7C3AED','#D9468F','#B45309','#0F766E','#334155'];
      const accent_color=String(data.accent_color??current.accent_color??'#D9611E').toUpperCase();
      if(!colors.includes(accent_color))return failure('Choose one of the available team colors.');
      const favorite_program_id=data.favorite_program_id===undefined?current.favorite_program_id:
        String(data.favorite_program_id||'').trim()||null;
      if(favorite_program_id){
        const match=PROGRAM_DIRECTORY.find(p=>String(p[0])===favorite_program_id);
        const settings=await getSettings(env);
        if(!match||!eligibleProgram(match,settings))
          return failure('Favorite school must be eligible in this league.');
      }
      let avatar_data=data.avatar_data===undefined?current.avatar_data:String(data.avatar_data||'')||null;
      if(avatar_data){
        if(avatar_data.length>85000)return failure('Profile picture is too large. Use an image smaller than 60 KB.');
        const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(avatar_data);
        if(!match)return failure('Profile photo must be a JPEG, PNG or WebP image.');
        let bytes;
        try{bytes=Uint8Array.from(atob(match[2]),ch=>ch.charCodeAt(0));}
        catch{return failure('The profile picture could not be decoded.');}
        if(bytes.length<24||bytes.length>62000)return failure('Profile photo must be smaller than 60 KB.');
        const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
          match[1]==='png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:
          bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&
          bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
        if(!valid)return failure('Invalid profile picture format.');
      }
      await q(env,'UPDATE users SET username=?,display_name=?,avatar_data=?,accent_color=?,favorite_program_id=? WHERE id=?',
        username,display_name,avatar_data,accent_color,favorite_program_id,user.id).run();
      return response({ok:true,user:{...user,username,display_name,avatar_data,accent_color,favorite_program_id}});
    }
    if(path==='account/password'){
      const current_password=String(data.current_password||''),new_password=String(data.new_password||'');
      if(new_password.length<8||new_password.length>128)return failure('New password must be 8–128 characters.');
      if(!current_password)return failure('Enter your current password.');
      if(current_password===new_password)return failure('Choose a different new password.');
      const entry=await q(env,'SELECT password_hash,salt FROM users WHERE id=?',user.id).first();
      if(!entry||await hashPassword(current_password,entry.salt)!==entry.password_hash)
        return failure('Current password is incorrect.',403);
      const salt=rand(18),passwordHash=await hashPassword(new_password,salt);
      await q(env,'UPDATE users SET salt=?,password_hash=? WHERE id=?',salt,passwordHash,user.id).run();
      // Preserve the current session but invalidate any others.
      await q(env,'DELETE FROM sessions WHERE user_id=? AND token_hash<>?',user.id,auth.session.token_hash).run();
      return response({ok:true});
    }
    if(path==='draft/pick'){
      const programId=String(data.program_id||'');
      try{
        const slot=await env.DB.transaction(async DB=>{
          const tx={...env,DB};
          await q(tx,"SELECT value FROM settings WHERE key='draft_status' FOR UPDATE").first();
          const settings=await getSettings(tx);
          if(settings.draft_status!=='live')throw tradeError('The draft is not live.');
          const inv=await pickInventory(tx,settings);
          if(!inv.ids.length||inv.picked>=inv.total)throw tradeError('The draft is already finished.');
          const overall=inv.picked+1,owner=currentPickOwner(overall,inv.ids,inv.owners);
          if(owner!==user.id)throw tradeError('This pick belongs to another manager.',403);
          const school=await q(tx,'SELECT id,conference_id FROM programs WHERE id=?',programId).first();
          if(!eligibleProgram(school,settings))throw tradeError('This school is not eligible.',400);
          if(await q(tx,'SELECT id FROM picks WHERE program_id=?',programId).first())throw tradeError('This school has been drafted.');
          await q(tx,'INSERT INTO picks(overall,round,manager_id,program_id) VALUES(?,?,?,?)',
            overall,Math.floor(inv.picked/inv.ids.length)+1,user.id,programId).run();
          if(overall===inv.total){
            await q(tx,"UPDATE settings SET value='finished' WHERE key='draft_status'").run();
            await q(tx,"UPDATE settings SET value='0' WHERE key='draft_deadline'").run();
            await q(tx,`UPDATE trades SET status='cancelled',resolved_at=unixepoch()
              WHERE status='pending' AND EXISTS (SELECT 1 FROM draft_pick_trade_items d WHERE d.trade_id=trades.id)`).run();
          }else if(settings.draft_clock_seconds>0)
            await q(tx,"UPDATE settings SET value=? WHERE key='draft_deadline'",String(timestamp()+settings.draft_clock_seconds)).run();
          return overall;
        });
        return response({ok:true,overall:slot});
      }catch(error){
        if(error.tradeStatus)return failure(error.message,error.tradeStatus);
        if(error.code==='23505')return failure('Another manager just drafted that school. Refresh.',409);
        throw error;
      }
    }
    if(path==='trade/propose'){
      const settings=await getSettings(env);
      if(!settings.trading_enabled)return failure('Trades are disabled by the commissioner.',409);
      const recipient=String(data.to_manager_id||'');
      const other=await q(env,'SELECT id FROM users WHERE id=?',recipient).first();
      if(!other||recipient===user.id)return failure('Choose another manager.',400);
      const give=Array.isArray(data.give_ids)?data.give_ids.map(String):[];
      const receive=Array.isArray(data.receive_ids)?data.receive_ids.map(String):[];
      const givePicks=Array.isArray(data.give_picks)?data.give_picks.map(Number):[];
      const receivePicks=Array.isArray(data.receive_picks)?data.receive_picks.map(Number):[];
      const ids=[...give,...receive],slots=[...givePicks,...receivePicks];
      if(give.length+givePicks.length<1||receive.length+receivePicks.length<1||
        give.length+givePicks.length>20||receive.length+receivePicks.length>20||
        ids.some(id=>!id||id.length>120)||new Set(ids).size!==ids.length||
        slots.some(n=>!Number.isSafeInteger(n)||n<1)||new Set(slots).size!==slots.length)
        return failure('Select unique picks or programs on both sides, up to 20 assets per side.',400);
      if(slots.length){
        if(settings.draft_status==='finished')return failure('Draft picks cannot be traded after the draft.',409);
        const inv=await pickInventory(env,settings);
        if(settings.draft_order.length!==inv.ids.length||inv.ids.length<2)
          return failure('The commissioner must set the final draft order before pick trading.',409);
        if(slots.some(n=>n<=inv.picked||n>inv.total)||
          givePicks.some(n=>currentPickOwner(n,inv.ids,inv.owners)!==user.id)||
          receivePicks.some(n=>currentPickOwner(n,inv.ids,inv.owners)!==recipient))
          return failure('A draft pick has already been used or changed owners.',409);
      }
      if(ids.length){
        const rows=(await q(env,'SELECT program_id,manager_id FROM program_owners WHERE program_id IN ('+ids.map(()=>'?').join(',')+')',...ids).all()).results||[];
        const held=new Map(rows.map(p=>[p.program_id,p.manager_id]));
        if(give.some(id=>held.get(id)!==user.id)||receive.some(id=>held.get(id)!==recipient))
          return failure('A selected program has changed owners.',409);
      }
      const id=crypto.randomUUID();
      const statements=[q(env,'INSERT INTO trades(id,from_manager_id,to_manager_id) VALUES(?,?,?)',id,user.id,recipient)];
      for(const school of give)statements.push(q(env,'INSERT INTO trade_items(trade_id,program_id,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,school,user.id,recipient));
      for(const school of receive)statements.push(q(env,'INSERT INTO trade_items(trade_id,program_id,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,school,recipient,user.id));
      for(const slot of givePicks)statements.push(q(env,'INSERT INTO draft_pick_trade_items(trade_id,overall,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,slot,user.id,recipient));
      for(const slot of receivePicks)statements.push(q(env,'INSERT INTO draft_pick_trade_items(trade_id,overall,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,slot,recipient,user.id));
      await env.DB.batch(statements);
      return response({ok:true,id});
    }
    if(path==='trade/respond'){
      const id=String(data.trade_id||''),mode=String(data.mode||'');
      if(!['accept','decline'].includes(mode))return failure('Invalid trade response.',400);
      if(mode==='decline'){
        const result=await q(env,"UPDATE trades SET status='declined',resolved_at=unixepoch() WHERE id=? AND to_manager_id=? AND status='pending'",id,user.id).run();
        if(!result.meta?.changes)return failure('This offer is no longer pending or was not sent to you.',409);
        return response({ok:true});
      }
      try{
        await env.DB.transaction(async DB=>{
          const tx={...env,DB};
          // Serialize transfers against actual draft selections.
          await q(tx,"SELECT value FROM settings WHERE key='draft_status' FOR UPDATE").first();
          const settings=await getSettings(tx);
          if(!settings.trading_enabled)throw tradeError('Trades are disabled by the commissioner.');
          const trade=await q(tx,'SELECT id,from_manager_id,to_manager_id,status FROM trades WHERE id=? FOR UPDATE',id).first();
          if(!trade||trade.status!=='pending'||trade.to_manager_id!==user.id)
            throw tradeError('This offer is no longer pending or was not sent to you.');
          const programs=(await q(tx,'SELECT program_id,from_manager_id,to_manager_id FROM trade_items WHERE trade_id=? ORDER BY program_id',id).all()).results||[];
          const picks=(await q(tx,'SELECT overall,from_manager_id,to_manager_id FROM draft_pick_trade_items WHERE trade_id=? ORDER BY overall',id).all()).results||[];
          if(!programs.length&&!picks.length)throw tradeError('This offer is empty.');
          if(programs.length){
            const ids=programs.map(p=>p.program_id);
            const rows=(await q(tx,'SELECT program_id,manager_id FROM program_owners WHERE program_id IN ('+ids.map(()=>'?').join(',')+') ORDER BY program_id FOR UPDATE',...ids).all()).results||[];
            const held=new Map(rows.map(row=>[row.program_id,row.manager_id]));
            if(programs.some(p=>held.get(p.program_id)!==p.from_manager_id))
              throw tradeError('A school changed owners. Request a new offer.');
          }
          if(picks.length){
            if(settings.draft_status==='finished')throw tradeError('The draft has ended; these picks can no longer be traded.');
            const inv=await pickInventory(tx,settings);
            if(settings.draft_order.length!==inv.ids.length||
              picks.some(p=>Number(p.overall)<=inv.picked||Number(p.overall)>inv.total||
                currentPickOwner(Number(p.overall),inv.ids,inv.owners)!==p.from_manager_id))
              throw tradeError('A pick has been used or changed owners. Request a new offer.');
          }
          for(const p of programs)
            await q(tx,'UPDATE program_owners SET manager_id=?,acquired_at=unixepoch() WHERE program_id=?',p.to_manager_id,p.program_id).run();
          for(const p of picks)
            await q(tx,`INSERT INTO draft_pick_owners(overall,owner_manager_id,updated_at)
              VALUES(?,?,unixepoch()) ON CONFLICT(overall) DO UPDATE
              SET owner_manager_id=excluded.owner_manager_id,updated_at=excluded.updated_at`,Number(p.overall),p.to_manager_id).run();
          await q(tx,"UPDATE trades SET status='accepted',resolved_at=unixepoch() WHERE id=? AND status='pending'",id).run();
        });
        return response({ok:true});
      }catch(error){
        if(error.tradeStatus)return failure(error.message,error.tradeStatus);
        throw error;
      }
    }
    if(path==='trade/cancel'){
      const result=await q(env,"UPDATE trades SET status='cancelled',resolved_at=unixepoch() WHERE id=? AND from_manager_id=? AND status='pending'",String(data.trade_id||''),user.id).run();
      if(!result.meta?.changes)return failure('Only the sender can cancel a pending offer.',409);
      return response({ok:true});
    }
    if(path==='waiver/claim'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished'||!settings.waivers_enabled)return failure('Waiver claims are closed.',409);
      const programId=String(data.program_id||''),dropId=String(data.drop_program_id||'');
      if(!programId||programId.length>120||dropId.length>120||programId===dropId)return failure('Choose a valid unrostered school.',400);
      const school=await q(env,'SELECT id,conference_id FROM programs WHERE id=?',programId).first();
      if(!eligibleProgram({id:programId,conference_id:school?.conference_id},settings))return failure('This school is not eligible for waivers.',400);
      if(await q(env,'SELECT 1 FROM program_owners WHERE program_id=?',programId).first())return failure('This school is already rostered.',409);
      if(dropId&&!await q(env,'SELECT 1 FROM program_owners WHERE program_id=? AND manager_id=?',dropId,user.id).first())return failure('You do not own the school selected to drop.',409);
      const owned=(await q(env,'SELECT count(*) AS n FROM program_owners WHERE manager_id=?',user.id).first()).n;
      if(!dropId&&owned>=settings.rounds)return failure('Your roster is full. Select a school to drop.',409);
      if(await q(env,"SELECT 1 FROM waiver_claims WHERE manager_id=? AND program_id=? AND status='pending'",user.id,programId).first())return failure('You already have a pending claim for this school.',409);
      const id=crypto.randomUUID();
      await q(env,"INSERT INTO waiver_claims(id,season,manager_id,program_id,drop_program_id) VALUES(?,?,?,?,?)",id,settings.current_season,user.id,programId,dropId||null).run();
      return response({ok:true,id});
    }
    if(path==='waiver/cancel'){
      const claimId=String(data.claim_id||'');
      const result=await q(env,"UPDATE waiver_claims SET status='cancelled',resolved_at=unixepoch() WHERE id=? AND manager_id=? AND status='pending'",claimId,user.id).run();
      if(result.meta?.changes!==1)return failure('This waiver claim can no longer be cancelled.',409);
      return response({ok:true});
    }
    if(path==='waiver/drop'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished'||!settings.waivers_enabled)return failure('Roster moves are closed.',409);
      const programId=String(data.program_id||'');
      const id=crypto.randomUUID();
      const moves=await env.DB.batch([
        q(env,"INSERT INTO roster_transactions(id,season,manager_id,program_id,action) SELECT ?,?,?,program_id,'drop' FROM program_owners WHERE program_id=? AND manager_id=?",id,settings.current_season,user.id,programId,programId,user.id),
        q(env,'DELETE FROM program_owners WHERE program_id=? AND manager_id=?',programId,user.id)
      ]);
      if(moves[1].meta?.changes!==1)return failure('You do not own this school.',409);
      return response({ok:true});
    }
    if(user.role!=='commissioner')return failure('Commissioner access required.',403);

    // Commissioner-only recovery. Existing passwords are never exposed.
    // The temporary credential is returned only in the reset response.
    if(path==='admin/member/reset-password'){
      const targetId=String(data.manager_id||'').trim();
      if(!/^[0-9a-f-]{36}$/i.test(targetId))return failure('Choose a valid manager.',400);
      const target=await q(env,'SELECT id,username,display_name,role FROM users WHERE id=?',targetId).first();
      if(!target||target.role!=='manager')return failure('Only manager accounts can be reset.',404);
      const temporaryPassword=rand(18);
      const salt=rand(18),passwordHash=await hashPassword(temporaryPassword,salt);
      // Hash update and session revocation happen in the same transaction.
      const operations=await env.DB.batch([
        q(env,"UPDATE users SET password_hash=?,salt=? WHERE id=? AND role='manager'",passwordHash,salt,target.id),
        q(env,'DELETE FROM sessions WHERE user_id=?',target.id)
      ]);
      if(Number(operations[0]?.meta?.changes)!==1)return failure('Password reset failed.',500);
      return response({ok:true,manager_id:target.id,username:target.username,
        display_name:target.display_name,temporary_password:temporaryPassword});
    }

    if(path==='admin/data/integrity-scan'){
      const scanned=await q(env,'SELECT public.cbb_run_integrity_scan() AS report').first();
      return response({ok:true,report:scanned?.report||null});
    }
    if(path==='admin/data/repair-interrupted'){
      const recovered=await DATA_PIPELINE.repairInterrupted(env,2);
      const scanned=await q(env,'SELECT public.cbb_run_integrity_scan() AS report').first();
      return response({ok:recovered.results.every(x=>x.ok),...recovered,report:scanned?.report||null});
    }
    if(path==='admin/data/verify-scoring'){
      const settings=await getSettings(env);
      // All standings and program profiles use this one scoring engine, not
      // separately cached or persisted per-page point calculations.
      const report=await DATA_PIPELINE.historicalLeaders(env,settings.scoring,settings.current_season,settings);
      const seen=new Set(),invalid=[];
      for(const row of report.rows){
        const key=row.season+'|'+row.program_id;
        const points=Number(row.points);
        if(seen.has(key)||!Number.isFinite(points)||points<0)
          invalid.push({season:row.season,program_id:row.program_id,issue:seen.has(key)?'duplicate':'invalid points'});
        seen.add(key);
      }
      return response({ok:invalid.length===0,valid:invalid.length===0,
        program_seasons:report.rows.length,unique_program_seasons:seen.size,
        verified_seasons:report.verified_seasons,
        quadrant_source:report.quadrant_source,quadrant_provisional:report.quadrant_provisional,
        invalid:invalid.slice(0,25),note:'Scores are computed on demand from verified records and the current scoring configuration.'});
    }
    if(path==='admin/data/sync'){
      const settings=await getSettings(env),day=String(data.date||DATA_PIPELINE.localDay());
      if(!DATA_PIPELINE.dayInSeason(settings.current_season,day))return failure('Choose a date in the current season.',400);
      const result=await DATA_PIPELINE.importDay(env,settings.current_season,day,{job:'manual'});
      return response({ok:true,...result});
    }
    if(path==='admin/data/torvik-refresh'){
      const settings=await getSettings(env);
      const result=await DATA_PIPELINE.syncPreliminaryTorvik(env,settings.current_season);
      return response({ok:true,...result});
    }
    if(path==='admin/data/ap-refresh'){
      const settings=await getSettings(env);
      const result=await DATA_PIPELINE.syncAPPoll(env,settings.current_season);
      return response({ok:true,...result});
    }
    if(path==='admin/data/history-backfill'){
      const days=Number(data.days||8);
      if(!Number.isInteger(days)||days<1||days>12)return failure('Historical batch must be 1–12 dates.',400);
      const result=await DATA_PIPELINE.backfillHistory(env,days);
      return response({ok:result.results.every(x=>x.ok),...result});
    }
    if(path==='admin/data/conference-titles'){
      const selected=String(data.season||'');
      if(!['2021-22','2022-23','2023-24','2024-25','2025-26'].includes(selected))return failure('Select an archived year.',400);
      return response({ok:true,...await DATA_PIPELINE.syncHistoricalConference(env,selected)});
    }
    if(path==='admin/data/history-net'){
      const season=String(data.season||'');
      if(!['2021-22','2022-23','2023-24','2024-25','2025-26'].includes(season))
        return failure('Select a completed season from 2021–22 to 2025–26.',400);
      const result=await DATA_PIPELINE.syncArchivedNet(env,season);
      return response({ok:true,...result});
    }
    if(path==='admin/data/upcoming'){
      const settings=await getSettings(env);
      const output=await DATA_PIPELINE.upcoming(env,settings.current_season,3);
      return response({ok:output.every(x=>x.ok),days:output});
    }
    if(path==='admin/data/fill-missing'){
      const settings=await getSettings(env);
      const days=Number(data.days||4);
      if(!Number.isInteger(days)||days<1||days>6)return failure('Missing day repair supports 1–6 days.',400);
      const repaired=await DATA_PIPELINE.fillMissing(env,settings.current_season,days);
      return response({ok:repaired.every(x=>x.ok),days:repaired,coverage:await DATA_PIPELINE.coverage(env,settings.current_season)});
    }
    if(path==='admin/data/net-auto'){
      const settings=await getSettings(env),day=DATA_PIPELINE.localDay();
      if(day<settings.current_season.slice(0,4)+'-12-08')return failure('Current-season NET is not yet released.',409);
      const feed=await DATA_PIPELINE.fetchOfficialNet(day,settings.current_season);
      const result=await DATA_PIPELINE.saveNet(env,settings.current_season,feed.date,feed.records,feed.source);
      return response({ok:true,...result});
    }
    if(path==='admin/data/backfill'){
      const settings=await getSettings(env),days=Number(data.days||7);
      if(!Number.isInteger(days)||days<1||days>14)return failure('Backfill supports 1–14 days.',400);
      const result=await DATA_PIPELINE.backfill(env,settings.current_season,days);
      return response({ok:result.every(x=>x.ok),days:result});
    }
    if(path==='admin/data/auto'){
      if(typeof data.enabled!=='boolean')return failure('Invalid automatic import setting.',400);
      await setSetting(env,'results_auto_sync',data.enabled?'1':'0');
      return response({ok:true});
    }
    if(path==='admin/data/net'){
      const settings=await getSettings(env),day=String(data.date||'');
      let records=data.records;
      if(typeof data.csv==='string'){
        const lines=data.csv.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
        if(lines.some(line=>!/^\d+[\s,;\t]+\d+$/.test(line)))return failure('Every NET row must contain exactly ESPN_ID,rank.',400);
        records=lines.map(line=>{
          const parts=line.split(/[\s,;\t]+/);
          return {program_id:parts[0],net_rank:Number(parts[1])};
        });
      }
      const result=await DATA_PIPELINE.saveNet(env,settings.current_season,day,records);
      return response({ok:true,...result});
    }
    if(path==='admin/data/award'){
      const settings=await getSettings(env);
      const selectedSeason=String(data.season||settings.current_season);
      const first=Number(selectedSeason.slice(0,4));
      if(!/^20\d{2}-\d{2}$/.test(selectedSeason)||!Number.isInteger(first)||
        first<2021||first>Number(settings.current_season.slice(0,4))||
        selectedSeason!==first+'-'+String((first+1)%100).padStart(2,'0'))
        return failure('Select a historical season from 2021–22 through the current season.',400);
      const kind=String(data.award_type||''),team=String(data.program_id||'');
      const allowed=new Set(['conference_regular_champion','conference_tournament_champion','ncaa_seed','ncaa_wins','national_champion','kenpom_final_rank']);
      if(!allowed.has(kind)||!team||!await q(env,'SELECT id FROM programs WHERE id=?',team).first())return failure('Unknown school or achievement type.',400);
      const value=Number(data.value),note=String(data.source_note||'').trim();
      const max=kind==='ncaa_seed'?16:kind==='ncaa_wins'?6:kind==='kenpom_final_rank'?400:1;
      if(!Number.isInteger(value)||value<(kind==='ncaa_wins'?0:1)||value>max||(max===1&&value!==1)||note.length<8||note.length>240)
        return failure('Provide a valid value and source reference (8–240 characters).',400);
      await q(env,"INSERT INTO cbb_awards(season,program_id,award_type,value,source_note) VALUES(?,?,?,?,?) ON CONFLICT(season,program_id,award_type) DO UPDATE SET value=excluded.value,source_note=excluded.source_note,confirmed_at=unixepoch()",selectedSeason,team,kind,value,note).run();
      return response({ok:true});
    }
    if(path==='admin/invite'){
      const num=await q(env,'SELECT count(*) AS total FROM users').first();
      const settings=await getSettings(env);
      if(num.total>=settings.max_managers)return failure('League is full ('+settings.max_managers+' managers).',409);
      if(settings.draft_status!=='pending')return failure('Invitations are closed after the draft starts.',409);
      const code=rand(24);
      await q(env,'INSERT INTO invites(code_hash,created_at,expires_at,issued_by) VALUES(?,?,?,?)',await hash(code),timestamp(),timestamp()+7*86400,user.id).run();
      return response({code,expires_in_days:7});
    }
    if(path==='admin/general'){
      const leagueName=String(data.league_name||'').trim().replace(/\s+/g,' ');
      const max=Number(data.max_managers);
      if(leagueName.length<3||leagueName.length>40)return failure('League name must be 3–40 characters.',400);
      if(!Number.isInteger(max)||max<2||max>20)return failure('Manager limit must be between 2 and 20.',400);
      const settings=await getSettings(env);
      const currentManagers=(await q(env,'SELECT count(*) AS n FROM users').first()).n;
      if(max<currentManagers)return failure('Manager limit cannot be below the number of registered managers.',409);
      if(max!==settings.max_managers && (settings.draft_status!=='pending'||(await q(env,'SELECT count(*) AS n FROM picks').first()).n>0))
        return failure('Manager limit is locked after the draft begins.',409);
      await env.DB.batch([
        q(env,"INSERT INTO settings(key,value) VALUES('league_name',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",leagueName),
        q(env,"INSERT INTO settings(key,value) VALUES('max_managers',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",String(max))
      ]);
      return response({ok:true});
    }
    if(path==='admin/bestball'){
      const settings=await getSettings(env);
      const count=Number(data.count);
      if(!Number.isInteger(count)||count<1||count>Number(settings.rounds))
        return failure('Best-ball programs must be between 1 and the draft rounds ('+settings.rounds+').',400);
      const updated={...settings.scoring,best_programs:count};
      await env.DB.batch([
        q(env,"INSERT INTO settings(key,value) VALUES('scoring_rules',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(updated)),
        q(env,'INSERT INTO cbb_scoring_revisions(actor_id,previous_rules,new_rules) VALUES(?,?,?)',user.id,JSON.stringify(settings.scoring),JSON.stringify(updated))
      ]);
      return response({ok:true,best_programs:count});
    }
    if(path==='admin/scoring-settings'){
      const input=data.scoring;
      if(!input||typeof input!=='object'||Array.isArray(input))return failure('Invalid scoring rules.',400);
      const scoringSettings=await getSettings(env);
      if(!Number.isInteger(input.best_programs)||input.best_programs<1||input.best_programs>scoringSettings.rounds)
        return failure('Best-ball programs cannot exceed the number of draft rounds.',400);
      const next={};
      for(const key of Object.keys(DEFAULT_SCORING)){
        if(!Object.prototype.hasOwnProperty.call(input,key))return failure('Missing scoring category: '+key,400);
        const value=input[key];
        if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.round(value*4)!==value*4)
          return failure('Scoring values must be between 0 and 100 in quarter-point increments.',400);
        if(key==='best_programs'&&(!Number.isInteger(value)||value<1||value>20))
          return failure('Best-ball programs must be between 1 and 20.',400);
        next[key]=value;
      }
      if(Object.keys(input).some(key=>!Object.prototype.hasOwnProperty.call(DEFAULT_SCORING,key)))return failure('Unsupported scoring rule.',400);
      await env.DB.batch([
        q(env,"INSERT INTO settings(key,value) VALUES('scoring_rules',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(next)),
        q(env,'INSERT INTO cbb_scoring_revisions(actor_id,previous_rules,new_rules) VALUES(?,?,?)',user.id,JSON.stringify(scoringSettings.scoring),JSON.stringify(next))
      ]);
      return response({ok:true,scoring:next});
    }
    if(path==='admin/trade-settings'){
      if(typeof data.trading_enabled!=='boolean')return failure('Invalid trade setting.',400);
      await setSetting(env,'trading_enabled',data.trading_enabled?'1':'0');
      return response({ok:true});
    }

    if(path==='admin/race/run'){
      const settings=await getSettings(env);
      const picks=Number((await q(env,'SELECT count(*) AS n FROM picks').first())?.n||0);
      const trades=Number((await q(env,'SELECT count(*) AS n FROM draft_pick_owners').first())?.n||0);
      if(settings.draft_status!=='pending'||picks>0||trades>0)
        return failure('The race cannot run after the draft begins or draft picks are traded.',409);
      if(settings.draft_race)return failure('The official race has already been run. Reset it in Commissioner settings to run a new race.',409);
      const allUsers=(await q(env,'SELECT id FROM users ORDER BY created_at,rowid').all()).results||[];
      if(allUsers.length<2)return failure('At least two managers must be registered.',409);
      const ids=resolvedOrder(allUsers,settings);
      const race={
        id:crypto.randomUUID(),
        order:ids,
        lanes:allUsers.map(u=>u.id),
        started_at:timestamp(),
        duration_ms:9400,
        stagger_ms:460
      };
      // One atomic statement: only the first race claim may save the official
      // snake draft order. Concurrent attempts cannot overwrite the result.
      const sql="WITH claimed AS (INSERT INTO settings(key,value) VALUES('draft_race',?) "
        +"ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value IN ('null','') RETURNING value), "
        +"official AS (INSERT INTO settings(key,value) SELECT 'draft_order',? FROM claimed "
        +"ON CONFLICT(key) DO UPDATE SET value=excluded.value RETURNING value) "
        +"SELECT (SELECT count(*) FROM official)::integer AS saved";
      const result=await q(env,sql,JSON.stringify(race),JSON.stringify(ids)).first();
      if(Number(result?.saved)!==1)return failure('The race has already been finalized. Reload to view it.',409);
      return response({ok:true,race,order:ids});
    }
    if(path==='admin/race/reset'){
      const settings=await getSettings(env);
      const picks=Number((await q(env,'SELECT count(*) AS n FROM picks').first())?.n||0);
      const trades=Number((await q(env,'SELECT count(*) AS n FROM draft_pick_owners').first())?.n||0);
      if(settings.draft_status!=='pending'||picks>0||trades>0)
        return failure('The race cannot be reset after the draft begins or draft picks are traded.',409);
      if(!settings.draft_race)return failure('No completed race to reset.',409);
      const signupOrder=(await q(env,'SELECT id FROM users ORDER BY created_at,rowid').all()).results.map(u=>u.id);
      const sql="WITH cleared AS (UPDATE settings SET value='null' WHERE key='draft_race' "
        +"AND value NOT IN ('null','') RETURNING value), "
        +"restored AS (INSERT INTO settings(key,value) SELECT 'draft_order',? FROM cleared "
        +"ON CONFLICT(key) DO UPDATE SET value=excluded.value RETURNING value) "
        +"SELECT (SELECT count(*) FROM restored)::integer AS saved";
      const result=await q(env,sql,JSON.stringify(signupOrder)).first();
      if(Number(result?.saved)!==1)return failure('The race was already reset. Reload the page.',409);
      return response({ok:true,order:signupOrder});
    }
    if(path==='admin/draft-order'){
      const settings=await getSettings(env);
      const havePicks=(await q(env,'SELECT count(*) AS n FROM picks').first()).n;
      if(settings.draft_status!=='pending'||havePicks>0||(await q(env,'SELECT count(*) AS n FROM draft_pick_owners').first()).n>0)
        return failure('Draft order is locked after an accepted pick trade or draft start.',409);
      if(settings.draft_race)return failure('The draft order is final. Reset the race before changing the order.',409);
      const actual=(await q(env,'SELECT id FROM users ORDER BY created_at,rowid').all()).results.map(u=>u.id);
      const ids=Array.isArray(data.order)?data.order.map(String):[];
      if(ids.length!==actual.length||new Set(ids).size!==ids.length||ids.some(id=>!actual.includes(id)))
        return failure('Draft order must contain each registered manager exactly once.',400);
      await setSetting(env,'draft_order',JSON.stringify(ids));
      return response({ok:true});
    }
    if(path==='admin/settings'){
      const picksCount=(await q(env,'SELECT count(*) AS total FROM picks').first()).total;
      const settings=await getSettings(env);
      if(picksCount>0||settings.draft_status!=='pending')return failure('Cannot edit the draft pool after the draft begins.',409);
      if((await q(env,'SELECT count(*) AS n FROM draft_pick_owners').first()).n>0&&Number(data.rounds??settings.rounds)!==settings.rounds)
        return failure('Rounds are locked following a pick trade.',409);
      const conferences=Array.isArray(data.conferences)?[...new Set(data.conferences.map(String))]:settings.conferences;
      const included=Array.isArray(data.included_programs)?[...new Set(data.included_programs.map(String))]:settings.included_programs;
      const excluded=Array.isArray(data.excluded_programs)?[...new Set(data.excluded_programs.map(String))]:settings.excluded_programs;
      const rounds=data.rounds===undefined?settings.rounds:Number(data.rounds);
      if(conferences.some(c=>!confIds.has(c)))return failure('Choose valid conferences.',400);
      if(!Number.isInteger(rounds)||rounds<1||rounds>20)return failure('Rounds must be between 1 and 20.',400);
      const directory=(await q(env,'SELECT id,conference_id FROM programs').all()).results||[];
      const validIds=new Set(directory.map(p=>String(p.id)));
      if(included.length>500||excluded.length>500||[...included,...excluded].some(id=>!validIds.has(id))||
        included.some(id=>excluded.includes(id)))return failure('Choose valid school selections.',400);
      const selection={conferences,included_programs:included,excluded_programs:excluded};
      const eligible=directory.filter(p=>eligibleProgram(p,selection)).length;
      if(!eligible)return failure('Select at least one eligible school.',400);
      await env.DB.batch([
        q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','conferences',JSON.stringify(conferences)),
        q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','included_programs',JSON.stringify(included)),
        q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','excluded_programs',JSON.stringify(excluded)),
        q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','rounds',String(rounds))
      ]);
      return response({ok:true,eligible});
    }
    if(path==='admin/program'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='pending')return failure('Cannot add programs after the draft starts.',409);
      const name=String(data.name||'').trim(),abbr=String(data.abbr||'').trim().slice(0,10),confId=String(data.conference_id||'');
      if(name.length<2||name.length>90||!confIds.has(confId))return failure('Enter a program name and a valid conference.',400);
      const id='manual-'+crypto.randomUUID();
      await q(env,'INSERT INTO programs(id,name,abbr,conference_id,logo) VALUES(?,?,?,?,NULL)',id,name,abbr,confId).run();
      if(!settings.conferences.includes(confId))await setSetting(env,'included_programs',JSON.stringify([...new Set([...settings.included_programs,id])]));
      return response({ok:true,id});
    }
    if(path==='admin/sync'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='pending')return failure('Conference imports are locked after draft start.',409);
      const confId=String(data.conference_id||'');
      if(!settings.conferences.includes(confId))return failure('Conference not selected.',400);
      // Frozen ESPN 2026–27 conference roster. The live ESPN Core endpoint
      // refuses requests from Cloudflare with HTTP 403; never depend on it at draft time.
      const rows=PROGRAM_DIRECTORY.filter(row=>row[3]===confId);
      if(rows.length<5||rows.length>40)return failure('No verified 2026–27 school list exists for this conference.',502);
      if(rows.some(row=>!/^[0-9]+$/.test(row[0])||!row[1]||!row[2]))
        return failure('Conference data failed integrity checks.',502);
      const statements=rows.map(([id,name,abbr])=>
        q(env,"INSERT INTO programs(id,name,abbr,conference_id,logo,updated_at) VALUES(?,?,?,?,?,unixepoch()) ON CONFLICT(id) DO UPDATE SET name=excluded.name,abbr=excluded.abbr,conference_id=excluded.conference_id,logo=excluded.logo,updated_at=unixepoch()",
          id,name,abbr.slice(0,10),confId,'https://a.espncdn.com/i/teamlogos/ncaa/500/'+id+'.png')
      );
      await env.DB.batch(statements);
      return response({ok:true,added:statements.length,conference_id:confId,source:'verified-2026-27-directory'});
    }


    if(path==='admin/season/rollover'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished')return failure('Complete the inaugural draft before starting a new dynasty season.',409);
      const last=String(settings.current_season);
      const match=last.match(/^(\d{4})-(\d{2})$/);
      if(!match)return failure('Current season format is invalid.',409);
      const year=Number(match[1]);
      if(year<2020||year>=2098||Number(match[2])!==(year+1)%100)return failure('Current season cannot roll over automatically.',409);
      const next=(year+1)+'-'+String((year+2)%100).padStart(2,'0');
      if(await q(env,'SELECT 1 AS x FROM season_archives WHERE season=?',last).first())return failure('This season has already been archived.',409);
      const pending=(await q(env,"SELECT count(*) AS n FROM waiver_claims WHERE status='pending'").first()).n;
      if(pending)return failure('Resolve pending waiver claims before starting a new season.',409);
      // Store a full permanent season snapshot. Never redraft or clear ownership.
      const result=await env.DB.batch([
        q(env,'INSERT INTO season_archives(season) VALUES(?)',last),
        q(env,'INSERT INTO season_rosters(season,manager_id,program_id) SELECT ?,manager_id,program_id FROM program_owners',last),
        q(env,'INSERT INTO season_manager_records(season,manager_id,programs_count) SELECT ?,u.id,(SELECT count(*) FROM program_owners po WHERE po.manager_id=u.id) FROM users u',last),
        q(env,"INSERT INTO settings(key,value) VALUES('current_season',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",next)
      ]);
      return response({ok:true,archived:last,current_season:next,rosters:result[1].meta?.changes||0});
    }
    if(path==='admin/season/champion'){
      const season=String(data.season||'');
      const champion=String(data.manager_id||'');
      if(!/^[0-9]{4}-[0-9]{2}$/.test(season))return failure('Invalid season.',400);
      const archived=await q(env,'SELECT 1 AS x FROM season_archives WHERE season=?',season).first();
      if(!archived)return failure('Season has not been archived.',409);
      if(champion&&!await q(env,'SELECT 1 AS x FROM season_manager_records WHERE season=? AND manager_id=?',season,champion).first())return failure('Select a manager who participated in that season.',400);
      await q(env,'UPDATE season_archives SET champion_manager_id=? WHERE season=?',champion||null,season).run();
      return response({ok:true});
    }

    if(path==='admin/waiver/review'){
      const id=String(data.claim_id||''),mode=String(data.mode||'');
      if(!['approve','deny'].includes(mode))return failure('Invalid waiver review decision.',400);
      if(mode==='deny'){
        const denied=await q(env,"UPDATE waiver_claims SET status='denied',resolved_at=unixepoch() WHERE id=? AND status='pending'",id).run();
        if(denied.meta?.changes!==1)return failure('This waiver claim is no longer pending.',409);
        return response({ok:true});
      }
      const settings=await getSettings(env);
      if(!settings.waivers_enabled||settings.draft_status!=='finished')return failure('Waivers are disabled.',409);
      const claim=await q(env,"SELECT * FROM waiver_claims WHERE id=? AND status='pending'",id).first();
      if(!claim||claim.season!==settings.current_season)return failure('This waiver claim is no longer available.',409);
      const statements=[
        q(env,`UPDATE waiver_claims SET status='approved',resolved_at=unixepoch()
          WHERE id=? AND status='pending'
          AND NOT EXISTS(SELECT 1 FROM program_owners po WHERE po.program_id=waiver_claims.program_id)
          AND (drop_program_id IS NULL OR EXISTS(
            SELECT 1 FROM program_owners po WHERE po.program_id=waiver_claims.drop_program_id AND po.manager_id=waiver_claims.manager_id))
          AND (drop_program_id IS NOT NULL OR
            (SELECT count(*) FROM program_owners po WHERE po.manager_id=waiver_claims.manager_id)<?)`,id,settings.rounds),
        q(env,"INSERT INTO program_owners(program_id,manager_id) SELECT program_id,manager_id FROM waiver_claims WHERE id=? AND status='approved'",id),
        q(env,"INSERT INTO roster_transactions(id,season,manager_id,program_id,action) SELECT ?,season,manager_id,program_id,'claim' FROM waiver_claims WHERE id=? AND status='approved'",crypto.randomUUID(),id),
        q(env,"INSERT INTO roster_transactions(id,season,manager_id,program_id,action) SELECT ?,season,manager_id,drop_program_id,'drop' FROM waiver_claims WHERE id=? AND status='approved' AND drop_program_id IS NOT NULL",crypto.randomUUID(),id),
        q(env,"DELETE FROM program_owners WHERE program_id=(SELECT drop_program_id FROM waiver_claims WHERE id=? AND status='approved') AND manager_id=(SELECT manager_id FROM waiver_claims WHERE id=?)",id,id)
      ];
      const results=await env.DB.batch(statements);
      if(results[0].meta?.changes!==1)return failure('Claim is stale or the requested school is not available.',409);
      if(results[1].meta?.changes!==1)return failure('Waiver claim transfer failed; inspect the claim before retrying.',500);
      return response({ok:true});
    }
    if(path==='admin/clock'){
      const settings=await getSettings(env);
      if(!['pending','paused'].includes(settings.draft_status))return failure('Pause the draft before changing the clock.',409);
      const secs=Number(data.seconds);
      if(![0,60,120,180,300,600,900,1800].includes(secs))return failure('Choose a valid draft clock duration.',400);
      await env.DB.batch([
        q(env,"INSERT INTO settings(key,value) VALUES('draft_clock_seconds',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",String(secs)),
        q(env,"INSERT INTO settings(key,value) VALUES('draft_deadline','0') ON CONFLICT(key) DO UPDATE SET value='0'")
      ]);
      return response({ok:true});
    }
    if(path==='admin/waiver-settings'){
      if(typeof data.enabled!=='boolean')return failure('Invalid waiver setting.',400);
      await setSetting(env,'waivers_enabled',data.enabled?'1':'0');
      return response({ok:true});
    }
    if(path==='admin/draft-control'){
      const mode=String(data.mode||'');
      const settings=await getSettings(env);
      if(mode==='reset'){
        const trades=(await q(env,'SELECT count(*) AS n FROM trades').first()).n;
        if(settings.draft_status==='finished'||trades>0)
          return failure('The completed dynasty draft cannot be reset. Permanent ownership and trade history are protected.',409);
        await env.DB.batch([q(env,'DELETE FROM program_owners'),q(env,'DELETE FROM picks')]);
        await env.DB.batch([q(env,"UPDATE settings SET value='pending' WHERE key='draft_status'"),q(env,"INSERT INTO settings(key,value) VALUES('draft_deadline','0') ON CONFLICT(key) DO UPDATE SET value='0'")]);
        return response({ok:true});
      }
      if(mode==='pause'){
        if(settings.draft_status!=='live')return failure('Draft is not live.',409);
        await env.DB.batch([q(env,"UPDATE settings SET value='paused' WHERE key='draft_status'"),q(env,"INSERT INTO settings(key,value) VALUES('draft_deadline','0') ON CONFLICT(key) DO UPDATE SET value='0'")]);
        return response({ok:true});
      }
      if(mode==='start'){
        if(!['pending','paused'].includes(settings.draft_status))return failure('Draft cannot start from its current state.',409);
        const users=(await q(env,'SELECT count(*) AS n FROM users').first()).n;
        if(users<2)return failure('At least two managers must join before drafting.',409);
        const allPrograms=(await q(env,'SELECT id,conference_id FROM programs').all()).results||[];
        const eligibleCount=allPrograms.filter(p=>eligibleProgram(p,settings)).length;
        if(eligibleCount<users*settings.rounds)return failure('Not enough eligible programs for all draft rounds. Import more schools or reduce rounds.',409);
        await env.DB.batch([
          q(env,"UPDATE settings SET value='live' WHERE key='draft_status'"),
          q(env,"INSERT INTO settings(key,value) VALUES('draft_deadline',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",String(settings.draft_clock_seconds>0?timestamp()+settings.draft_clock_seconds:0))
        ]);
        return response({ok:true});
      }
      return failure('Invalid draft control mode.',400);
    }
    return failure('Not found.',404);
  }
  const BRAND_LOGO_BYTES=Uint8Array.from(atob(BRAND_LOGO_BASE64),x=>x.charCodeAt(0));
  const SW="const NAME='boek-dynasty-shell-v4';self.addEventListener('install',e=>{e.waitUntil(caches.open(NAME).then(c=>c.addAll(['/','/style.css','/app.js','/icon.png'])));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))})";
  return {
    async scheduled(controller,env){
      try{
        const outcome=await DATA_PIPELINE.scheduled(env,controller.cron);
        console.log('CBB results sync',JSON.stringify(outcome));
      }catch(e){console.error('CBB results sync failed',String(e?.message||e));throw e;}
    },
    async fetch(request,env){
      const url=new URL(request.url);
      try{
        if(url.pathname.startsWith('/api/'))return await handleApi(request,env,url);
        if(request.method!=='GET'&&request.method!=='HEAD')return failure('Method not allowed.',405);
        if(url.pathname==='/app.js')return new Response(CLIENT,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff'}});
        if(url.pathname==='/style.css')return new Response(CSS,{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff'}});
        if(url.pathname==='/sw.js')return new Response(SW,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache'}});
        if(['/brand-logo.png','/icon.png','/apple-touch-icon.png','/favicon.ico'].includes(url.pathname))return new Response(BRAND_LOGO_BYTES,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
        if(url.pathname==='/icon.svg'||url.pathname==='/favicon.svg')return Response.redirect(new URL('/icon.png',request.url).toString(),302);
        if(url.pathname==='/manifest.webmanifest')return response({id:'/',name:'Boek Dynasty',short_name:'Boek Dynasty',description:'College basketball fantasy by NCAA program',start_url:'/',display:'standalone',theme_color:'#f4f6fa',background_color:'#f4f6fa',icons:[{src:'/icon.png?v=3',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon.png?v=3',sizes:'192x192',type:'image/png',purpose:'maskable'}]},200,{'Content-Type':'application/manifest+json'});
        if(url.pathname!=='/'&&url.pathname!=='/index.html')return new Response('Not found.',{status:404});
        return new Response(PAGE,{headers:htmlHeaders});
      }catch(e){
        const msg=e?.message||'Unexpected server error.';
        if(url.pathname.startsWith('/api/')){
          console.error('Boek Dynasty API error',url.pathname,e?.name||'Error',msg);
          if(/daily row write limit|exceeded.*D1.*write/i.test(msg))
            return failure('Cloudflare database write limit reached for today. Registration and other updates will resume after the midnight UTC reset. Please try again then.',503);
          if(/duplicate key value violates unique constraint|UNIQUE constraint failed/i.test(msg))return failure('This username or program has already been taken. Please try another.',409);
          if(/League is full/i.test(msg))return failure('The league is full. Ask the commissioner to increase the manager limit.',409);
          return failure(msg.startsWith('Username')||msg.startsWith('Team name')||msg.startsWith('Password')?msg:'Server could not complete the request.',500);
        }
        return new Response('Application error.',{status:500});
      }
    }
  };
})();