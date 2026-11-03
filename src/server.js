export default (function makeWorker(){
  const COOKIE='boek_session';
  const SESSION_SECONDS=90*24*60*60;
  const ENCODER=new TextEncoder();
  const DEFAULT_SCORING=Object.freeze({"regular_win":1,"quad_2_win":0.5,"quad_1_win":1.5,"quad_1a_extra":1,"conference_regular_title":8,"conference_tournament_title":8,"ncaa_seed_1_4":8,"ncaa_seed_5_8":6,"ncaa_seed_9_12":5,"ncaa_seed_13_16":4,"ncaa_tournament_win":3,"ncaa_opening_round_win":2,"national_championship":15,"best_programs":8});
  function scoringFrom(raw){
    let data={};try{data=JSON.parse(raw||'{}');}catch{}
    if(!data||typeof data!=='object'||Array.isArray(data))data={};
    const result={...DEFAULT_SCORING};
    for(const key of Object.keys(result)){
      const value=data[key];
      if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100&&
        (key!=='best_programs'||(Number.isInteger(value)&&value>=1&&value<=20)))result[key]=value;
    }
    return result;
  }

  const confIds=new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','16','18','19','20','21','22','23','24','25','26','27','28','29','30','44','45','46','62']);
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
    const raw=request.headers.get('Cookie')||'';
    const part=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
    if(!part)return null;
    let token='';
    try{token=decodeURIComponent(part.substring(COOKIE.length+1));}catch{return null;}
    if(!token||token.length<25||token.length>256)return null;
    const entry=await q(env,'SELECT s.token_hash,s.expires_at,u.id,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await hash(token),timestamp()).first();
    if(!entry)return null;
    return {user:{id:entry.id,username:entry.username,display_name:entry.display_name,role:entry.role},session:entry,token};
  }
  async function remember(env,userId){
    const token=rand(32);
    await q(env,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await hash(token),userId,timestamp()+SESSION_SECONDS).run();
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
    return {conferences:JSON.parse(map.conferences||'[]'),rounds:Number(map.rounds||8),draft_status:map.draft_status||'pending',current_season:map.current_season||'2026-27',
      league_name:map.league_name||'Boek Dynasty',max_managers:Number(map.max_managers||10),
      trading_enabled:map.trading_enabled!=='0',draft_order:JSON.parse(map.draft_order||'[]'),
      draft_clock_seconds:Number(map.draft_clock_seconds||0),draft_deadline:Number(map.draft_deadline||0),
      waivers_enabled:map.waivers_enabled==='1',scoring:scoringFrom(map.scoring_rules)};
  }
  async function setSetting(env,key,value){
    await q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,String(value)).run();
  }
  const resolvedOrder=(users,settings)=>{
    const ids=users.map(u=>u.id);
    const saved=Array.isArray(settings.draft_order)?settings.draft_order:[];
    return [...new Set([...saved.filter(id=>ids.includes(id)),...ids])];
  };
  async function getState(env,user){
    const [users,teams,picks,ownership,trades,tradeItems,settings,archives,archivedRosters,seasonRecords,waiverClaims,rosterMoves]=await Promise.all([
      q(env,"SELECT id,username,display_name,role,created_at FROM users ORDER BY created_at,rowid").all(),
      q(env,'SELECT id,name,abbr,conference_id,logo FROM programs ORDER BY name').all(),
      q(env,'SELECT overall,round,manager_id,program_id,picked_at FROM picks ORDER BY overall').all(),
      q(env,'SELECT program_id,manager_id,acquired_at FROM program_owners').all(),
      q(env,'SELECT id,from_manager_id,to_manager_id,status,offered_at,resolved_at FROM trades ORDER BY offered_at DESC LIMIT 100').all(),
      q(env,'SELECT trade_id,program_id,from_manager_id,to_manager_id FROM trade_items WHERE trade_id IN (SELECT id FROM trades ORDER BY offered_at DESC LIMIT 100)').all(),
      getSettings(env),
      q(env,'SELECT season,archived_at,champion_manager_id FROM season_archives ORDER BY season DESC').all(),
      q(env,'SELECT season,manager_id,program_id FROM season_rosters ORDER BY season DESC').all(),
      q(env,'SELECT season,manager_id,programs_count,fantasy_points,final_place FROM season_manager_records ORDER BY season DESC').all(),
      q(env,'SELECT id,season,manager_id,program_id,drop_program_id,status,created_at,resolved_at FROM waiver_claims ORDER BY created_at DESC LIMIT 150').all(),
      q(env,'SELECT id,season,manager_id,program_id,action,created_at FROM roster_transactions ORDER BY created_at DESC LIMIT 150').all()
    ]);
    const allUsers=users.results||[];
    const order=resolvedOrder(allUsers,settings);
    return {user,users:allUsers,programs:teams.results||[],picks:picks.results||[],ownership:ownership.results||[],trades:trades.results||[],trade_items:tradeItems.results||[],settings,draft_order:order,max_managers:settings.max_managers,season:settings.current_season,archives:archives.results||[],archived_rosters:archivedRosters.results||[],season_records:seasonRecords.results||[],waiver_claims:waiverClaims.results||[],roster_transactions:rosterMoves.results||[]};
  }
  function parseBody(req){
    if(!(req.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw new Error('JSON request required.');
    const size=Number(req.headers.get('Content-Length')||0);
    if(size>20000)throw new Error('Request too large.');
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
      const headers={};
      if(auth.session.expires_at-timestamp()<SESSION_SECONDS/2){
        await q(env,'UPDATE sessions SET expires_at=? WHERE token_hash=?',timestamp()+SESSION_SECONDS,auth.session.token_hash).run();
        headers['Set-Cookie']=cookie(auth.token);
      }
      return response(data,200,headers);
    }

    // Result views require an active manager session; data changes require commissioner access.
    if(request.method==='GET'&&path.startsWith('data/')){
      const auth=await getUser(request,env);
      if(!auth)return failure('Sign in required.',401);
      const settings=await getSettings(env),season=settings.current_season;
      if(path==='data/status')return response(await DATA_PIPELINE.status(env,season));
      if(path==='data/records')return response({season,records:await DATA_PIPELINE.records(env,season)});
      if(path==='data/games'){
        const day=String(url.searchParams.get('date')||DATA_PIPELINE.localDay());
        if(!DATA_PIPELINE.dayInSeason(season,day))return failure('Select a date in the current basketball season.',400);
        const confMap=new Map(PROGRAM_DIRECTORY.map(row=>[String(row[0]),String(row[3])]));
        const games=(await DATA_PIPELINE.gamesByDate(env,season,day)).map(g=>({...g,
          home_conference_id:confMap.get(g.home_id)||null,away_conference_id:confMap.get(g.away_id)||null}));
        return response({season,date:day,games});
      }
      if(path==='data/rankings'){
        const poll=await DATA_PIPELINE.apPoll(env,season);
        return response({season,source:poll[0]?.source||'Associated Press Top 25',as_of:poll[0]?.snapshot_date||null,
          teams:poll.map(p=>({program_id:p.program_id,rank:p.ap_rank}))});
      }
      if(path==='data/quad')return response({season,...await DATA_PIPELINE.seasonQuadrants(env,season)});
      if(path==='data/leaders')return response(await DATA_PIPELINE.historicalLeaders(env,settings.scoring,season));
      if(path==='data/history'){
        const id=String(url.searchParams.get('id')||'');
        if(!id||id.length>120||!await q(env,'SELECT id FROM programs WHERE id=?',id).first())return failure('Program not found.',404);
        return response(await DATA_PIPELINE.programHistory(env,id,settings.scoring,season));
      }
      if(path==='data/program'){
        const id=String(url.searchParams.get('id')||'');
        if(!id||id.length>120||!await q(env,'SELECT id FROM programs WHERE id=?',id).first())return failure('Program not found.',404);
        const [games,ranks,allRecords,awards,quads]=await Promise.all([
          DATA_PIPELINE.programGames(env,season,id),
          DATA_PIPELINE.netRanks(env,season),
          DATA_PIPELINE.records(env,season),
          q(env,'SELECT award_type,value,source_note FROM cbb_awards WHERE season=? AND program_id=?',season,id).all(),
          DATA_PIPELINE.seasonQuadrants(env,season)
        ]);
        return response({season,id,games,record:allRecords.find(x=>x.program_id===id)||{wins:0,losses:0,played:0},
          net:ranks.find(x=>x.program_id===id)||null,net_date:ranks[0]?.snapshot_date||null,
          quadrants:quads.by_program[id]||null,awards:awards.results||[]});
      }
      return failure('Not found.',404);
    }
    if(request.method!=='POST')return failure('Not found.',404);
    if(request.headers.get('Origin') && request.headers.get('Origin')!==url.origin)return failure('Invalid request origin.',403);
    let data;
    try{data=await parseBody(request);}catch(e){return failure('Invalid JSON request.',400);}
    if(path==='setup'){
      const count=await q(env,'SELECT count(*) AS total FROM users').first();
      if(Number(count.total)>0)return failure('Commissioner already exists.',409);
      const expected=await q(env,"SELECT value FROM settings WHERE key='setup_hash'").first();
      if(!expected||await hash(String(data.code||''))!==expected.value)return failure('Invalid commissioner setup code.',403);
      const user=await createUser(env,data,'commissioner');
      await q(env,"DELETE FROM settings WHERE key='setup_hash'").run();
      return response({user},200,{'Set-Cookie':cookie(await remember(env,user.id))});
    }
    if(path==='join'){
      const code=String(data.code||'').trim();
      const entry=await q(env,'SELECT * FROM invites WHERE code_hash=? AND used_at IS NULL AND expires_at>?',await hash(code),timestamp()).first();
      if(!entry)return failure('This invitation is invalid, expired or already used.',403);
      const setting=await getSettings(env);
      if(setting.draft_status!=='pending')return failure('New members cannot join after the draft has started.',409);
      const num=await q(env,'SELECT count(*) AS total FROM users').first();
      if(num.total>=setting.max_managers)return failure('This league is full ('+setting.max_managers+' managers).',409);
      const user=await createUser(env,data,'manager');
      await q(env,'UPDATE invites SET used_at=? WHERE code_hash=? AND used_at IS NULL',timestamp(),entry.code_hash).run();
      return response({user},200,{'Set-Cookie':cookie(await remember(env,user.id))});
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
      return response({user},200,{'Set-Cookie':cookie(await remember(env,row.id))});
    }
    if(path==='logout'){
      const auth=await getUser(request,env);
      if(auth)await q(env,'DELETE FROM sessions WHERE token_hash=?',auth.session.token_hash).run();
      return response({ok:true},200,{'Set-Cookie':clearCookie()});
    }
    const auth=await getUser(request,env);
    if(!auth)return failure('Sign in required.',401);
    const user=auth.user;
    if(path==='draft/pick'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='live')return failure('The draft is not live.',409);
      const users=resolvedOrder((await q(env,'SELECT id FROM users ORDER BY created_at,rowid').all()).results,settings).map(id=>({id}));
      const count=(await q(env,'SELECT count(*) AS total FROM picks').first()).total;
      const roundIndex=Math.floor(count/users.length);
      if(roundIndex>=settings.rounds)return failure('Draft already finished.',409);
      const idx=count%users.length,up=users[roundIndex%2===0?idx:users.length-1-idx].id;
      if(user.id!==up)return failure('It is not your turn to draft.',403);
      const programId=String(data.program_id||'');
      const selected=(await q(env,'SELECT conference_id FROM programs WHERE id=?',programId).first());
      if(!selected || !settings.conferences.includes(selected.conference_id))return failure('This program is not eligible.',400);
      await q(env,'INSERT INTO picks(overall,round,manager_id,program_id) VALUES(?,?,?,?)',count+1,roundIndex+1,user.id,programId).run();
      if(count+1===users.length*settings.rounds){
        await env.DB.batch([q(env,"UPDATE settings SET value='finished' WHERE key='draft_status'"),q(env,"INSERT INTO settings(key,value) VALUES('draft_deadline','0') ON CONFLICT(key) DO UPDATE SET value='0'")]);
      }else if(settings.draft_clock_seconds>0)await setSetting(env,'draft_deadline',timestamp()+settings.draft_clock_seconds);
      return response({ok:true,overall:count+1});
    }
    // Program ownership is perpetual. The draft board records original picks, not current owners.
    if(path==='trade/propose'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished')return failure('Trading opens after the initial draft is complete.',409);
      if(!settings.trading_enabled)return failure('Trades are disabled by the commissioner.',409);
      const recipient=String(data.to_manager_id||'');
      const other=await q(env,'SELECT id FROM users WHERE id=?',recipient).first();
      if(!other||recipient===user.id)return failure('Choose another league manager.',400);
      const give=Array.isArray(data.give_ids)?data.give_ids.map(String):[];
      const receive=Array.isArray(data.receive_ids)?data.receive_ids.map(String):[];
      const ids=[...give,...receive];
      if(!give.length||!receive.length||ids.length>40||ids.some(id=>!id||id.length>120)||new Set(ids).size!==ids.length)
        return failure('Select unique programs from both teams (maximum 20 per side).',400);
      if(give.length>20||receive.length>20)return failure('Maximum 20 programs from each team.',400);
      const rows=(await q(env,'SELECT program_id,manager_id FROM program_owners WHERE program_id IN ('+ids.map(()=>'?').join(',')+')',...ids).all()).results||[];
      const owned=new Map(rows.map(p=>[p.program_id,p.manager_id]));
      if(give.some(id=>owned.get(id)!==user.id)||receive.some(id=>owned.get(id)!==recipient))
        return failure('One of the selected programs is no longer owned by the expected manager.',409);
      const id=crypto.randomUUID();
      const statements=[q(env,'INSERT INTO trades(id,from_manager_id,to_manager_id) VALUES(?,?,?)',id,user.id,recipient)];
      for(const programId of give)statements.push(q(env,'INSERT INTO trade_items(trade_id,program_id,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,programId,user.id,recipient));
      for(const programId of receive)statements.push(q(env,'INSERT INTO trade_items(trade_id,program_id,from_manager_id,to_manager_id) VALUES(?,?,?,?)',id,programId,recipient,user.id));
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
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished')return failure('Trading is not available until the draft finishes.',409);
      if(!settings.trading_enabled)return failure('Trades are disabled by the commissioner.',409);
      const nonce=rand(18);
      // D1 batch statements run in one transaction. A unique acceptance nonce makes
      // ownership transfers conditional on this request actually accepting the offer.
      const results=await env.DB.batch([
        q(env,`UPDATE trades SET status='accepted',resolved_at=unixepoch(),acceptance_token=?
          WHERE id=? AND to_manager_id=? AND status='pending'
          AND NOT EXISTS (
            SELECT 1 FROM trade_items ti LEFT JOIN program_owners po ON po.program_id=ti.program_id
            WHERE ti.trade_id=? AND (po.manager_id IS NULL OR po.manager_id<>ti.from_manager_id)
          )`,nonce,id,user.id,id),
        q(env,`UPDATE program_owners
          SET manager_id=(SELECT ti.to_manager_id FROM trade_items ti WHERE ti.trade_id=? AND ti.program_id=program_owners.program_id),
              acquired_at=unixepoch()
          WHERE program_id IN (SELECT program_id FROM trade_items WHERE trade_id=?)
          AND EXISTS (SELECT 1 FROM trades WHERE id=? AND status='accepted' AND acceptance_token=?)`,id,id,id,nonce)
      ]);
      if(results[0].meta?.changes!==1)return failure('Trade cannot be accepted. It may have expired or program ownership changed.',409);
      const expected=await q(env,'SELECT count(*) AS n FROM trade_items WHERE trade_id=?',id).first();
      if(results[1].meta?.changes!==Number(expected?.n||0))
        return failure('Trade accepted, but the program transfer needs commissioner review.',500);
      return response({ok:true});
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
      if(!school||!settings.conferences.includes(school.conference_id))return failure('This school is not eligible for waivers.',400);
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

    if(path==='admin/data/sync'){
      const settings=await getSettings(env),day=String(data.date||DATA_PIPELINE.localDay());
      if(!DATA_PIPELINE.dayInSeason(settings.current_season,day))return failure('Choose a date in the current season.',400);
      const result=await DATA_PIPELINE.importDay(env,settings.current_season,day,{job:'manual'});
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
      await setSetting(env,'scoring_rules',JSON.stringify(updated));
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
      await setSetting(env,'scoring_rules',JSON.stringify(next));
      return response({ok:true,scoring:next});
    }
    if(path==='admin/trade-settings'){
      if(typeof data.trading_enabled!=='boolean')return failure('Invalid trade setting.',400);
      await setSetting(env,'trading_enabled',data.trading_enabled?'1':'0');
      return response({ok:true});
    }
    if(path==='admin/draft-order'){
      const settings=await getSettings(env);
      const havePicks=(await q(env,'SELECT count(*) AS n FROM picks').first()).n;
      if(settings.draft_status!=='pending'||havePicks>0)return failure('Draft order is locked once the draft begins.',409);
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
      const conferences=data.conferences;
      const rounds=Number(data.rounds);
      if(!Array.isArray(conferences)||conferences.length===0||conferences.some(c=>!confIds.has(String(c))))return failure('Select valid conferences.',400);
      if(!Number.isInteger(rounds)||rounds<1||rounds>20)return failure('Rounds must be between 1 and 20.',400);
      await setSetting(env,'conferences',JSON.stringify([...new Set(conferences.map(String))]));
      await setSetting(env,'rounds',rounds);
      return response({ok:true});
    }
    if(path==='admin/program'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='pending')return failure('Cannot add programs after the draft starts.',409);
      const name=String(data.name||'').trim(),abbr=String(data.abbr||'').trim().slice(0,10),confId=String(data.conference_id||'');
      if(name.length<2||name.length>90||!settings.conferences.includes(confId))return failure('Enter a program name and an eligible conference.',400);
      const id='manual-'+crypto.randomUUID();
      await q(env,'INSERT INTO programs(id,name,abbr,conference_id,logo) VALUES(?,?,?,?,NULL)',id,name,abbr,confId).run();
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
        const placeholders=settings.conferences.map(()=>'?').join(',');
        const count=await q(env,'SELECT count(*) AS n FROM programs WHERE conference_id IN ('+placeholders+')',...settings.conferences).first();
        if(count.n<users*settings.rounds)return failure('Not enough eligible programs for all draft rounds. Import more schools or reduce rounds.',409);
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
          if(/UNIQUE constraint failed/i.test(msg))return failure('This username or program has already been taken. Please try another.',409);
          if(/League is full/i.test(msg))return failure('The league is full. Ask the commissioner to increase the manager limit.',409);
          return failure(msg.startsWith('Username')||msg.startsWith('Team name')||msg.startsWith('Password')?msg:'Server could not complete the request.',500);
        }
        return new Response('Application error.',{status:500});
      }
    }
  };
})();