export default (function makeWorker(){
  const COOKIE='boek_session';
  const SESSION_SECONDS=90*24*60*60;
  const ENCODER=new TextEncoder();
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
  const htmlHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://a.espncdn.com data:; font-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
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
    return {conferences:JSON.parse(map.conferences||'[]'),rounds:Number(map.rounds||8),draft_status:map.draft_status||'pending',current_season:map.current_season||'2026-27'};
  }
  async function setSetting(env,key,value){
    await q(env,'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,String(value)).run();
  }
  async function getState(env,user){
    const [users,teams,picks,ownership,trades,tradeItems,settings]=await Promise.all([
      q(env,"SELECT id,username,display_name,role,created_at FROM users ORDER BY created_at,rowid").all(),
      q(env,'SELECT id,name,abbr,conference_id,logo FROM programs ORDER BY name').all(),
      q(env,'SELECT overall,round,manager_id,program_id,picked_at FROM picks ORDER BY overall').all(),
      q(env,'SELECT program_id,manager_id,acquired_at FROM program_owners').all(),
      q(env,'SELECT id,from_manager_id,to_manager_id,status,offered_at,resolved_at FROM trades ORDER BY offered_at DESC LIMIT 100').all(),
      q(env,'SELECT trade_id,program_id,from_manager_id,to_manager_id FROM trade_items WHERE trade_id IN (SELECT id FROM trades ORDER BY offered_at DESC LIMIT 100)').all(),
      getSettings(env)
    ]);
    const allUsers=users.results||[];
    const order=allUsers.map(u=>u.id);
    return {user,users:allUsers,programs:teams.results||[],picks:picks.results||[],ownership:ownership.results||[],trades:trades.results||[],trade_items:tradeItems.results||[],settings,draft_order:order,max_managers:10,season:settings.current_season};
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
      return response({needs_setup:Number(row?.total||0)===0,max_managers:10,registered:Number(row?.total||0)});
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
      if(num.total>=10)return failure('This league already has 10 managers.',409);
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
      const users=(await q(env,'SELECT id FROM users ORDER BY created_at,rowid').all()).results;
      const count=(await q(env,'SELECT count(*) AS total FROM picks').first()).total;
      const roundIndex=Math.floor(count/users.length);
      if(roundIndex>=settings.rounds)return failure('Draft already finished.',409);
      const idx=count%users.length,up=users[roundIndex%2===0?idx:users.length-1-idx].id;
      if(user.id!==up)return failure('It is not your turn to draft.',403);
      const programId=String(data.program_id||'');
      const selected=(await q(env,'SELECT conference_id FROM programs WHERE id=?',programId).first());
      if(!selected || !settings.conferences.includes(selected.conference_id))return failure('This program is not eligible.',400);
      await q(env,'INSERT INTO picks(overall,round,manager_id,program_id) VALUES(?,?,?,?)',count+1,roundIndex+1,user.id,programId).run();
      if(count+1===users.length*settings.rounds)await setSetting(env,'draft_status','finished');
      return response({ok:true,overall:count+1});
    }
    // Program ownership is perpetual. The draft board records original picks, not current owners.
    if(path==='trade/propose'){
      const settings=await getSettings(env);
      if(settings.draft_status!=='finished')return failure('Trading opens after the initial draft is complete.',409);
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
    if(user.role!=='commissioner')return failure('Commissioner access required.',403);
    if(path==='admin/invite'){
      const num=await q(env,'SELECT count(*) AS total FROM users').first();
      if(num.total>=10)return failure('League is full.',409);
      const settings=await getSettings(env);
      if(settings.draft_status!=='pending')return failure('Invitations are closed after the draft starts.',409);
      const code=rand(24);
      await q(env,'INSERT INTO invites(code_hash,created_at,expires_at,issued_by) VALUES(?,?,?,?)',await hash(code),timestamp(),timestamp()+7*86400,user.id).run();
      return response({code,expires_in_days:7});
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
      const coreUrl='https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2027/types/2/groups/'+encodeURIComponent(confId)+'/teams?limit=100&lang=en&region=us';
      const listUrl='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500';
      let ids,all;
      try{
        const [core,site]=await Promise.all([
          fetch(coreUrl,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(12000)}),
          fetch(listUrl,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(12000)})
        ]);
        if(!core.ok||!site.ok)throw Error('Sports feed returned '+core.status+'/'+site.status);
        const [membership,listing]=await Promise.all([core.json(),site.json()]);
        const items=membership.items||[];
        ids=[...new Set(items.map(item=>String(item.$ref||'').match(/\/teams\/(\d+)(?:\?|$)/)?.[1]).filter(Boolean))];
        all=listing?.sports?.[0]?.leagues?.[0]?.teams||[];
      }catch(e){return failure('Conference data unavailable: '+e.message,502);}
      if(!Array.isArray(ids)||!ids.length||ids.length>40)return failure('Membership feed returned an unexpected number of schools. No changes made.',502);
      const byId=new Map(all.map(e=>[String((e.team||e).id),e.team||e]));
      const missing=ids.filter(id=>!byId.has(id));
      if(missing.length){
        const supplemental=await Promise.all(missing.map(async id=>{
          try{
            const result=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/'+id,{signal:AbortSignal.timeout(7500)});
            return result.ok?((await result.json()).team||null):null;
          }catch{return null;}
        }));
        for(const t of supplemental)if(t?.id)byId.set(String(t.id),t);
      }
      const statements=[];
      for(const id of ids){
        const team=byId.get(id);
        if(!team)continue;
        const name=String(team.displayName||team.name||'').trim();
        if(!name)continue;
        const logo=team.logos?.[0]?.href||null;
        const safeLogo=typeof logo==='string'&&/^https:\/\/a\.espncdn\.com\//.test(logo)?logo:null;
        statements.push(q(env,"INSERT INTO programs(id,name,abbr,conference_id,logo,updated_at) VALUES(?,?,?,?,?,unixepoch()) ON CONFLICT(id) DO UPDATE SET name=excluded.name,abbr=excluded.abbr,conference_id=excluded.conference_id,logo=excluded.logo,updated_at=unixepoch()",id,name,String(team.abbreviation||'').slice(0,10),confId,safeLogo));
      }
      if(statements.length!==ids.length)return failure('Some schools could not be resolved. No changes made; try again later.',502);
      await env.DB.batch(statements);
      return response({ok:true,added:statements.length,conference_id:confId});
    }
    if(path==='admin/draft-control'){
      const mode=String(data.mode||'');
      const settings=await getSettings(env);
      if(mode==='reset'){
        const trades=(await q(env,'SELECT count(*) AS n FROM trades').first()).n;
        if(settings.draft_status==='finished'||trades>0)
          return failure('The completed dynasty draft cannot be reset. Permanent ownership and trade history are protected.',409);
        await env.DB.batch([q(env,'DELETE FROM program_owners'),q(env,'DELETE FROM picks')]);
        await setSetting(env,'draft_status','pending');
        return response({ok:true});
      }
      if(mode==='pause'){
        if(settings.draft_status!=='live')return failure('Draft is not live.',409);
        await setSetting(env,'draft_status','paused');
        return response({ok:true});
      }
      if(mode==='start'){
        if(!['pending','paused'].includes(settings.draft_status))return failure('Draft cannot start from its current state.',409);
        const users=(await q(env,'SELECT count(*) AS n FROM users').first()).n;
        if(users<2)return failure('At least two managers must join before drafting.',409);
        const placeholders=settings.conferences.map(()=>'?').join(',');
        const count=await q(env,'SELECT count(*) AS n FROM programs WHERE conference_id IN ('+placeholders+')',...settings.conferences).first();
        if(count.n<users*settings.rounds)return failure('Not enough eligible programs for all draft rounds. Import more schools or reduce rounds.',409);
        await setSetting(env,'draft_status','live');
        return response({ok:true});
      }
      return failure('Invalid draft control mode.',400);
    }
    return failure('Not found.',404);
  }
  const ICON='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="38" fill="#0b1626"/><path d="M38 68h116v19c0 38-20 63-58 73-38-10-58-35-58-73V68Z" fill="#e8b66d"/><path d="M43 75h106v11c0 32-17 54-53 65-36-11-53-33-53-65V75Z" fill="#17273b"/><path d="m96 31 13 26 28 4-20 20 5 29-26-14-26 14 5-29-20-20 28-4 13-26Z" fill="#e8b66d"/><text x="96" y="135" font-size="39" font-weight="900" fill="#e8b66d" text-anchor="middle" font-family="Arial">BD</text></svg>';
  const SW="const NAME='boek-dynasty-shell-v1';self.addEventListener('install',e=>{e.waitUntil(caches.open(NAME).then(c=>c.addAll(['/','/style.css','/app.js','/icon.svg'])));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))})";
  return {
    async fetch(request,env){
      const url=new URL(request.url);
      try{
        if(url.pathname.startsWith('/api/'))return await handleApi(request,env,url);
        if(request.method!=='GET'&&request.method!=='HEAD')return failure('Method not allowed.',405);
        if(url.pathname==='/app.js')return new Response(CLIENT,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff'}});
        if(url.pathname==='/style.css')return new Response(CSS,{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff'}});
        if(url.pathname==='/sw.js')return new Response(SW,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-cache'}});
        if(url.pathname==='/icon.svg'||url.pathname==='/favicon.svg')return new Response(ICON,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400'}});
        if(url.pathname==='/manifest.webmanifest')return response({id:'/',name:'Boek Dynasty',short_name:'Boek Dynasty',description:'College basketball fantasy by NCAA program',start_url:'/',display:'standalone',theme_color:'#0b1626',background_color:'#0b1626',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},200,{'Content-Type':'application/manifest+json'});
        if(url.pathname!=='/'&&url.pathname!=='/index.html')return new Response('Not found.',{status:404});
        return new Response(PAGE,{headers:htmlHeaders});
      }catch(e){
        const msg=e?.message||'Unexpected server error.';
        if(url.pathname.startsWith('/api/')){
          if(/UNIQUE constraint failed/i.test(msg))return failure('This username or program has already been taken. Please try another.',409);
          if(/League is full/i.test(msg))return failure('The league is full (10 managers).',409);
          return failure(msg.startsWith('Username')||msg.startsWith('Team name')||msg.startsWith('Password')?msg:'Server could not complete the request.',500);
        }
        return new Response('Application error.',{status:500});
      }
    }
  };
})();