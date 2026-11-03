(function startApp(){
  const root=document.querySelector('#app');
  const ICONS={home:'⌂',programs:'▦',draft:'▤',trades:'⇄',league:'▥',commissioner:'⚙'};
  const names={home:'Overview',programs:'Programs',draft:'Draft',trades:'Trades',league:'Standings',commissioner:'Commissioner'};
  const conferenceNames={
    '1':'America East','2':'ACC','3':'Atlantic 10','4':'Big East','5':'Big Sky','6':'Big South','7':'Big Ten','8':'Big 12',
    '9':'Big West','10':'Coastal Athletic','11':'Conference USA','12':'Ivy League','13':'Metro','14':'MAC','16':'MEAC',
    '18':'Missouri Valley','19':'Northeast','20':'Ohio Valley','21':'Pac-12','22':'Patriot League','23':'SEC','24':'Southern',
    '25':'Southland','26':'SWAC','27':'Sun Belt','28':'Summit League','29':'West Coast','30':'United Athletic',
    '44':'Mountain West','45':'Horizon League','46':'ASUN','62':'American Athletic'
  };
  const conferenceGroups=[
    {name:'MAJOR CONFERENCES',ids:['23','2','7','8','4','21']},
    {name:'MULTI-BID & MID-MAJOR',ids:['3','62','44','18','29','11','14','45','9','10']},
    {name:'OTHER DIVISION I',ids:['1','5','6','12','13','16','19','20','22','24','25','26','27','28','30','46']}
  ];
  let me=null, league=null, current='home', authMode='login', status={}, selectedInvite=new URLSearchParams(location.search).get('invite')||'';
  let inviteLink='', busy=false, syncActive=false, refreshId=null,toastId=null,tradeTargetId='',importError='',autoImportAttempted=false;
  let programQuery='',programConference='all',programOwnership='all';
  let appError='';
  const escapeHTML=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=(s)=>String(s||'??').trim().split(/\s+/).map(v=>v[0]).slice(0,2).join('').toUpperCase();
  const fmt=(v)=>Number(v||0).toLocaleString('en-US');
  const conf=(id)=>conferenceNames[String(id)]||'Conference';
  const v=(sel)=>document.querySelector(sel)?.value||'';
  const programs=()=>league?.programs||[];
  const members=()=>league?.users||[];
  const activeConfs=()=>league?.settings?.conferences||[];
  const picks=()=>league?.picks||[];
  const owners=()=>league?.ownership||[];
  const programOwned=(id)=>owners().find(p=>p.program_id===id);
  const myPrograms=()=>owners().filter(o=>o.manager_id===me?.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean);
  const season=()=>league?.season||'2026-27';
  const order=()=>league?.draft_order||members().map(x=>x.id);
  const nextManager=()=>{
    const arr=order();
    if(!arr.length)return null;
    const idx=picks().length;
    const round=Math.floor(idx/arr.length);
    if(round>=Number(league.settings.rounds))return null;
    const loc=idx%arr.length;
    const chosen=round%2===0?arr[loc]:arr[arr.length-1-loc];
    return members().find(u=>u.id===chosen)||null;
  };
  const isMyTurn=()=>league?.settings?.draft_status==='live'&&nextManager()?.id===me?.id;
  const draftTotal=()=>members().length*Number(league?.settings?.rounds||0);
  const img=(p)=>p.logo&&/^https:\/\/a\.espncdn\.com\//.test(p.logo)?'<img class="program-logo" src="'+escapeHTML(p.logo)+'" alt="" loading="lazy" referrerpolicy="no-referrer"/>':'<span class="program-logo program-initial">'+escapeHTML(initials(p.abbr||p.name))+'</span>';
  const avatar=(u)=>'<span class="avatar">'+escapeHTML(initials(u.display_name))+'</span>';
  const heading=(eyebrow,title,desc='')=>'<header class="page-heading">'+(eyebrow?'<div class="eyebrow">'+eyebrow+'</div>':'')+'<h1 class="headline">'+title+'</h1>'+(desc?'<p class="intro-text">'+desc+'</p>':'')+'</header>';
  const panelHeading=(title,subtitle='',action='')=>'<div class="panel-head"><div><h2>'+title+'</h2>'+(subtitle?'<p>'+subtitle+'</p>':'')+'</div>'+action+'</div>';
  const empty=(title,desc='')=>'<div class="empty"><strong>'+title+'</strong>'+(desc?'<span>'+desc+'</span>':'')+'</div>';
  function notice(text,bad=false){
    document.querySelector('.toast')?.remove();
    const el=document.createElement('div');el.className='toast'+(bad?' error':'');el.textContent=text;document.body.appendChild(el);
    clearTimeout(toastId);toastId=setTimeout(()=>el.remove(),4600);
  }
  async function api(path,body){
    const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});
    const parsed=await res.json().catch(()=>({error:'Server returned an invalid response.'}));
    if(!res.ok)throw new Error(parsed.error||'Request failed.');
    return parsed;
  }
  async function refresh(silent=false){
    try{
      // Keep checked trade selections when the 12-second poll updates the page.
      const chosen=silent&&!busy&&current==='trades'
        ?[...document.querySelectorAll('.trade-choice input:checked')].map(el=>el.name+':'+el.value):[];
      const next=await api('state');
      me=next.user;league=next;appError='';
      if(!silent)current='home';render();
      if(current==='programs')filterPrograms();
      if(chosen.length)document.querySelectorAll('.trade-choice input').forEach(el=>{el.checked=chosen.includes(el.name+':'+el.value);});
    }catch(e){
      if(String(e.message).includes('Sign in required')){me=null;league=null;if(!silent)await loadPublic();renderAuth();}
      else if(!silent){notice(e.message,true);}
    }
  }
  async function loadPublic(){
    try{status=await api('status');authMode=status.needs_setup?'setup':selectedInvite?'join':'login';}catch(e){appError=e.message;}
  }
  async function boot(){
    root.innerHTML='<div class="loading"><div class="spinner"></div></div>';
    await loadPublic();
    try{
      const next=await api('state'); me=next.user;league=next;render();
      refreshId=setInterval(()=>{if(me&&!busy&&!syncActive)refresh(true);},12000);
      if(me?.role==='commissioner')autoImportPrograms();
    }catch(e){renderAuth();}
    if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  async function autoImportPrograms(){
    if(autoImportAttempted||syncActive||!me||me.role!=='commissioner'||!league||league.settings.draft_status!=='pending'||picks().length)return;
    const missing=activeConfs().filter(id=>!programs().some(p=>p.conference_id===id));
    if(!missing.length)return;
    autoImportAttempted=true;
    syncActive=true;
    render();
    try{
      let count=0;
      const errors=[];
      for(let i=0;i<missing.length;i+=3){
        const results=await Promise.all(missing.slice(i,i+3).map(async id=>{
          try{return {id,added:(await api('admin/sync',{conference_id:id})).added||0};}
          catch(e){return {id,error:e.message};}
        }));
        for(const result of results){
          if(result.error)errors.push(conf(result.id)+': '+result.error);
          else count+=result.added;
        }
        await refresh(true);
      }
      importError=errors.join(' | ');
      if(count)notice('Loaded '+count+' college basketball programs.');
      if(errors.length)notice('Some conferences could not be imported. Retry in Commissioner settings.',true);
    }catch(e){importError=e.message;notice('Program import failed. Retry in Commissioner settings.',true);}
    finally{syncActive=false;render();}
  }
  function renderAuth(){
    const mode=status.needs_setup?'setup':authMode;
    const header=mode==='login'?'Sign in':mode==='join'?'Join league':'Commissioner setup';
    const desc=mode==='join'?'Invitation code required.':mode==='setup'?'Enter the commissioner setup code.':'';
    const form=mode==='login'?'<form data-form="login">'+input('Username','username','text','Username')+input('Password','password','password','Your password')+'<button class="btn" type="submit">Sign in</button></form>':
      mode==='join'?'<form data-form="join">'+input('Invitation code','code','text','Invitation code',selectedInvite)+input('Display / team name','display_name','text','Team name')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Password')+'<button class="btn" type="submit">Create account</button></form>':
      '<form data-form="setup">'+input('Commissioner setup code','code','password','Setup code')+input('Team name','display_name','text','Team name')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Create a password')+'<button class="btn" type="submit">Create commissioner account</button></form>';
    root.innerHTML='<div class="auth-layout"><main class="auth-panel"><div class="auth-card"><div class="auth-logo"><span class="brand-icon">★</span><div><div class="brand-title">BOEK <span>DYNASTY</span></div><div class="auth-season">COLLEGE BASKETBALL · 2026–27</div></div></div><div class="auth-section"><h1>'+header+'</h1>'+(desc?'<p class="auth-desc">'+desc+'</p>':'')+(!status.needs_setup?'<div class="auth-top"><button data-act="auth-mode" data-mode="login" class="'+(mode==='login'?'active':'')+'">Sign in</button><button data-act="auth-mode" data-mode="join" class="'+(mode==='join'?'active':'')+'">Join with invite</button></div>':'')+form+(appError?'<p class="auth-error">'+escapeHTML(appError)+'</p>':'')+'</div></div></main></div>';
  }
  function input(label,name,type,placeholder,value=''){
    return '<div class="form-row"><label for="'+name+'">'+label+'</label><input class="field" id="'+name+'" name="'+name+'" type="'+type+'" placeholder="'+escapeHTML(placeholder)+'" value="'+escapeHTML(value)+'" required autocomplete="'+(name==='password'?'current-password':'on')+'"/></div>';
  }
  function navButton(id){
    return '<button data-act="tab" data-id="'+id+'" class="'+(current===id?'active':'')+'"><span>'+ICONS[id]+'</span>'+names[id]+'</button>';
  }
  function sidebar(){
    return '<aside class="sidebar"><div class="brand"><div class="brand-icon">★</div><div><div class="brand-title">BOEK <span>DYNASTY</span></div></div></div><div><div class="nav-label">NAVIGATION</div><nav class="nav">'+['home','programs','draft','trades','league',...(me.role==='commissioner'?['commissioner']:[])].map(navButton).join('')+'</nav></div><div class="side-foot"><span class="season-pill">'+escapeHTML(season())+' SEASON</span><div class="account-mini">'+avatar(me)+'<div><strong>'+escapeHTML(me.display_name)+'</strong><div class="muted tiny">'+(me.role==='commissioner'?'Commissioner':'League manager')+'</div></div></div><button data-act="logout" class="logout">Sign out →</button></div></aside>';
  }
  function render(){
    if(!me||!league)return renderAuth();
    const isAdmin=me.role==='commissioner';
    if(current==='commissioner'&&!isAdmin)current='home';
    const tabs=['home','programs','draft','trades','league',...(isAdmin?['commissioner']:[])];
    root.innerHTML='<div class="shell">'+sidebar()+'<main class="main"><header class="topbar"><span class="title">BOEK DYNASTY <span class="sep">/</span> '+names[current]+'</span><div class="top-right"><span class="chip">'+escapeHTML(season())+'</span><div class="avatar-small">'+escapeHTML(initials(me.display_name))+'</div></div></header><section class="content">'+({home:overview,programs:programsPage,draft:draftPage,trades:tradesPage,league:leaguePage,commissioner:commissionerPage}[current]||overview)()+'</section></main></div><nav class="bottom">'+tabs.map(id=>'<button class="'+(current===id?'active':'')+'" data-act="tab" data-id="'+id+'"><span>'+ICONS[id]+'</span>'+(id==='commissioner'?'Commish':names[id])+'</button>').join('')+'</nav>';
  }
  function overview(){
    const owned=myPrograms();
    const selectedCount=programs().filter(p=>activeConfs().includes(p.conference_id)).length;
    return heading('', 'Overview')
      +'<div class="league-status"><div><span class="eyebrow">DRAFT STATUS</span><strong>'+(league.settings.draft_status==='live'?'Draft in progress':league.settings.draft_status==='finished'?'Draft complete':league.settings.draft_status==='paused'?'Draft paused':'Draft not started')+'</strong>'+(league.settings.draft_status==='live'&&nextManager()?'<span class="league-status-detail">On the clock: '+escapeHTML(nextManager().display_name)+'</span>':'')+'</div><button class="btn secondary small" data-act="tab" data-id="draft">View draft</button></div>'
      +(syncActive?'<div class="standings-notice">Importing programs from the selected conferences...</div>':'')
      +'<div class="metrics"><div class="metric"><span class="m-label">YOUR PROGRAMS</span><strong>'+owned.length+'</strong><span class="m-foot">Owned schools</span></div><div class="metric"><span class="m-label">LEAGUE MANAGERS</span><strong>'+members().length+' <span style="font-size:14px;color:#9babc0">/ 10</span></strong><span class="m-foot">Registered managers</span></div><div class="metric"><span class="m-label">ELIGIBLE PROGRAMS</span><strong>'+fmt(selectedCount)+'</strong><span class="m-foot">'+activeConfs().length+' conferences selected</span></div><div class="metric"><span class="m-label">SCORING SYSTEM</span><strong style="font-size:24px">Pending</strong><span class="m-foot">Not configured</span></div></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('Your roster')+(owned.length?owned.map(p=>'<div class="rowline">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+conf(p.conference_id)+'</small></div><span class="status draft">ROSTERED</span></div>').join(''):empty('No programs owned','Your roster will appear here after the draft.'))+'</section><section class="panel">'+panelHeading('League rosters')+leaderboard()+'</section></div>';
  }
  function leaderboard(){
    return '<table class="table"><thead><tr><th>MANAGER</th><th class="last">PROGRAMS</th></tr></thead><tbody>'+members().map(u=>'<tr><td><strong>'+escapeHTML(u.display_name)+'</strong>'+(u.id===me.id?' <span class="muted tiny">(you)</span>':'')+'</td><td class="last">'+owners().filter(p=>p.manager_id===u.id).length+'</td></tr>').join('')+'</tbody></table>';
  }
  function programCard(p,canPick){
    const owned=programOwned(p.id),owner=members().find(u=>u.id===owned?.manager_id);
    const status=owned?'<span class="owner-chip"><span class="owner-indicator"></span>'+escapeHTML(owner?.display_name||'Rostered')+'</span>':canPick?'<button class="btn small" data-act="pick" data-id="'+escapeHTML(p.id)+'">Draft</button>':'<span class="available-chip">Available</span>';
    return '<div class="program-card" data-conference="'+escapeHTML(p.conference_id)+'" data-owner="'+(owned?'owned':'available')+'" data-search="'+escapeHTML((p.name+' '+p.abbr+' '+conf(p.conference_id)).toLowerCase())+'">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></div>'+status+'</div>';
  }
  function programsPage(){
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id)).sort((a,b)=>a.name.localeCompare(b.name));
    const available=eligible.filter(p=>!programOwned(p.id)).length;
    const opts=activeConfs().map(id=>'<option value="'+id+'" '+(programConference===id?'selected':'')+'>'+escapeHTML(conf(id))+'</option>').join('');
    return heading('', 'Programs')
      +'<div class="directory-stats"><div><strong>'+eligible.length+'</strong><span>Eligible schools</span></div><div><strong>'+available+'</strong><span>Available</span></div><div><strong>'+(eligible.length-available)+'</strong><span>Rostered</span></div></div>'
      +'<div class="directory-toolbar"><label class="search-wrap"><span>⌕</span><input class="field" type="search" id="program-search" value="'+escapeHTML(programQuery)+'" placeholder="Search schools..." aria-label="Search schools"/></label><select class="field" id="program-conference" aria-label="Conference"><option value="all">All conferences</option>'+opts+'</select><select class="field" id="program-ownership" aria-label="Program ownership"><option value="all" '+(programOwnership==='all'?'selected':'')+'>All schools</option><option value="available" '+(programOwnership==='available'?'selected':'')+'>Available</option><option value="owned" '+(programOwnership==='owned'?'selected':'')+'>Rostered</option></select></div>'
      +'<div class="directory-result"><span id="program-results">'+eligible.length+' programs</span><span>'+(league.settings.draft_status==='live'&&isMyTurn()?'Your pick is live':'2026–27 program pool')+'</span></div>'
      +(eligible.length?'<div class="program-grid">'+eligible.map(p=>programCard(p,isMyTurn())).join('')+'</div>':empty('No programs loaded',me?.role==='commissioner'?(syncActive?'Importing selected conferences...':'Use the import button in Commissioner settings.'): 'The commissioner has not imported schools yet.'));
  }
  function filterPrograms(){
    const query=programQuery.trim().toLowerCase();
    let found=0;
    document.querySelectorAll('.program-card[data-search]').forEach(card=>{
      const match=card.dataset.search.includes(query)&&(programConference==='all'||card.dataset.conference===programConference)&&(programOwnership==='all'||card.dataset.owner===programOwnership);
      card.hidden=!match;
      if(match)found++;
    });
    const count=document.querySelector('#program-results');
    if(count)count.textContent=found+' programs';
  }
  function draftPage(){
    const statusText=league.settings.draft_status;
    const n=nextManager();
    const total=draftTotal();
    const round=Math.floor(picks().length/Math.max(1,members().length))+1;
    const owner=members().find(m=>m.id===n?.id);
    return heading('', 'Draft')
      +'<div class="draft-info"><div><span class="eyebrow">'+(statusText==='live'?'● DRAFT LIVE':statusText==='finished'?'✓ DRAFT COMPLETED':'● DRAFT NOT STARTED')+'</span><strong>'+(statusText==='live'?'On the clock: '+escapeHTML(owner?.display_name||''):(statusText==='finished'?'Draft complete':'Not started'))+'</strong><p>'+picks().length+' of '+total+' picks made · '+members().length+' managers · '+league.settings.rounds+' rounds</p><div class="draft-progress"><div style="width:'+((picks().length/Math.max(1,total))*100)+'%"></div></div></div><span class="status '+(statusText==='live'?'':'wait')+'">'+(statusText==='live'?'LIVE':statusText.toUpperCase())+'</span></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('Draft board')+(picks().length?[...picks()].reverse().map(p=>{const t=programs().find(t=>t.id===p.program_id),m=members().find(m=>m.id===p.manager_id);return '<div class="rowline"><span class="pos">'+p.overall+'</span>'+(t?img(t):'')+'<div class="grow"><strong>'+escapeHTML(t?.name||'Program')+'</strong><small>'+escapeHTML(m?.display_name||'Manager')+' · Round '+p.round+'</small></div></div>'}).join(''):empty('No picks yet','Draft selections appear here.'))+'</section><section class="panel">'+panelHeading('Draft order','Snake draft')+order().map((id,i)=>{const u=members().find(m=>m.id===id);return u?'<div class="manager-card"><span class="pos">'+(i+1)+'</span>'+avatar(u)+'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>'+escapeHTML(u.username)+'</small></div>'+(id===me.id?'<span class="status">YOU</span>':'')+'</div>':''}).join('')+'<div class="notice section-gap">Original picks stay on this board. Trading changes current rosters, not draft history.</div></section></div>'
      +(statusText==='live'?'<div class="button-row section-gap"><button class="btn" data-act="tab" data-id="programs">'+(isMyTurn()?'Make your pick →':'Browse eligible schools →')+'</button></div>':'');
  }

  function tradesPage(){
    const ready=league.settings.draft_status==='finished';
    const others=members().filter(u=>u.id!==me.id);
    const recipient=others.find(u=>u.id===tradeTargetId)||others[0];
    tradeTargetId=recipient?.id||'';
    const mine=myPrograms().sort((a,b)=>a.name.localeCompare(b.name));
    const theirs=owners().filter(o=>o.manager_id===tradeTargetId).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const selections=(items,side)=>items.length?'<div class="trade-program-list">'+items.map(p=>'<label class="trade-choice"><input type="checkbox" name="'+side+'" value="'+escapeHTML(p.id)+'"/>'+img(p)+'<span>'+escapeHTML(p.name)+'</span></label>').join('')+'</div>':empty('No programs available','This manager does not own any schools.');
    const offers=league.trades||[],items=league.trade_items||[];
    const card=(t)=>{
      const from=members().find(m=>m.id===t.from_manager_id),to=members().find(m=>m.id===t.to_manager_id);
      const give=items.filter(i=>i.trade_id===t.id&&i.from_manager_id===t.from_manager_id).map(i=>programs().find(p=>p.id===i.program_id)?.name||'Program');
      const receive=items.filter(i=>i.trade_id===t.id&&i.from_manager_id===t.to_manager_id).map(i=>programs().find(p=>p.id===i.program_id)?.name||'Program');
      const actions=t.status==='pending'?(t.to_manager_id===me.id?'<div class="button-row section-gap"><button class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept trade</button><button class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button></div>':t.from_manager_id===me.id?'<div class="button-row section-gap"><button class="btn small ghost" data-act="trade-cancel" data-id="'+escapeHTML(t.id)+'">Cancel offer</button></div>':''):'';
      return '<div class="trade-offer"><div class="trade-offer-head"><strong>'+escapeHTML(from?.display_name||'Manager')+' → '+escapeHTML(to?.display_name||'Manager')+'</strong><span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div><p><strong>Offering:</strong> '+escapeHTML(give.join(', '))+'</p><p><strong>Requesting:</strong> '+escapeHTML(receive.join(', '))+'</p>'+actions+'</div>';
    };
    return heading('', 'Trades')
      +(ready?'<section class="panel section-gap">'+panelHeading('Propose trade')+'<div class="form-row"><label for="trade-target">Trade with</label><select class="field" id="trade-target">'+others.map(u=>'<option value="'+escapeHTML(u.id)+'" '+(u.id===tradeTargetId?'selected':'')+'>'+escapeHTML(u.display_name)+'</option>').join('')+'</select></div><div class="trade-columns"><div><h3 class="subhead">YOU SEND · '+mine.length+' OWNED</h3>'+selections(mine,'trade-give')+'</div><div><h3 class="subhead">YOU RECEIVE · '+theirs.length+' OWNED</h3>'+selections(theirs,'trade-receive')+'</div></div><div class="section-gap"><button class="btn" data-act="trade-propose" '+(!mine.length||!theirs.length?'disabled':'')+'>Send trade offer</button></div></section>':
        '<section class="panel section-gap">'+empty('Trading unlocks after the draft','Finish the initial program draft before submitting offers. Drafted schools will be permanent franchise assets.')+'</section>')
      +'<section class="panel section-gap">'+panelHeading('Trade history')+(offers.length?offers.map(card).join(''):empty('No trades yet',''))+'</section>';
  }
  function leaguePage(){
    const users=members(),tracked=owners();
    const rows=users.map(u=>{
      const roster=tracked.filter(o=>o.manager_id===u.id);
      const schoolNames=roster.map(o=>programs().find(p=>p.id===o.program_id)?.name).filter(Boolean);
      return '<tr class="standing-row"><td><div class="standings-manager">'+avatar(u)+'<div><strong>'+escapeHTML(u.display_name)+'</strong><small>'+(u.id===me.id?'Your team':u.role==='commissioner'?'Commissioner':'Manager')+'</small></div></div></td><td class="numerical">'+roster.length+'</td><td class="numerical"><span class="pending-score">—</span></td><td class="standing-roster">'+(schoolNames.length?escapeHTML(schoolNames.slice(0,3).join(' · '))+(schoolNames.length>3?' +'+(schoolNames.length-3):''):'No programs yet')+'</td></tr>';
    }).join('');
    return heading('', 'Standings')
      +'<div class="standings-summary"><div><span>SEASON</span><strong>'+escapeHTML(season())+'</strong></div><div><span>MANAGERS</span><strong>'+users.length+'</strong></div><div><span>ROSTERED SCHOOLS</span><strong>'+tracked.length+'</strong></div><div><span>DRAFT PICKS</span><strong>'+picks().length+'</strong></div></div>'
      +'<section class="panel standings-panel">'+panelHeading('League standings','Season-long points')
      +'<div class="standings-notice">Scoring is not configured yet. Rankings and points will appear when the scoring system is enabled.</div>'
      +'<div class="standings-table-wrap"><table class="standings-table"><thead><tr><th>TEAM</th><th class="numerical">SCHOOLS</th><th class="numerical">POINTS</th><th>ROSTER PREVIEW</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'</section>';
  }
  function commissionerPage(){
    if(me.role!=='commissioner')return '';
    const disabled=picks().length>0||league.settings.draft_status==='live'||league.settings.draft_status==='finished';
    const confs=conferenceGroups.map(group=>'<h3 class="subhead section-gap">'+group.name+'</h3><div class="conf-grid">'+group.ids.map(id=>'<label class="conf-item"><input type="checkbox" name="conference" value="'+id+'" '+(activeConfs().includes(id)?'checked':'')+' '+(disabled?'disabled':'')+'/><span>'+conf(id)+'</span><small class="muted">'+programs().filter(p=>p.conference_id===id).length+'</small></label>').join('')+'</div>').join('');
    return heading('', 'Commissioner')
      +'<div class="grid2 section-gap"><section class="panel">'+panelHeading('Draft pool settings')+'<p class="hint">Select conferences and import programs before drafting.</p>'+confs+'<div class="form-row section-gap"><label>Rounds per manager</label><input class="field" id="rounds" type="number" min="1" max="20" value="'+league.settings.rounds+'" '+(disabled?'disabled':'')+'/></div><div class="button-row"><button class="btn" data-act="save-confs" '+(disabled?'disabled':'')+'>Save draft pool</button><button class="btn secondary" data-act="sync" '+(syncActive?'disabled':'')+'>'+(syncActive?'Importing schools...':'Import selected programs')+'</button></div><p class="hint section-gap">Imported school lists are sourced from ESPN and may need corrections.</p></section>'
      +'<section class="panel">'+panelHeading('Invitations')+'<p class="hint">'+members().length+' of 10 manager slots filled. Invitation codes expire after 7 days and can only be used once.</p><div class="button-row section-gap"><button class="btn" data-act="invite" '+(members().length>=10?'disabled':'')+'>Generate invite link</button></div>'+(inviteLink?'<div class="notice section-gap"><div style="overflow-wrap:anywhere">'+escapeHTML(inviteLink)+'</div><button class="btn small secondary section-gap" data-act="copy-invite">Copy invite link</button></div>':'')+'<hr style="border:0;border-top:1px solid #2c3951;margin:25px 0"/>'+panelHeading('Draft controls')+'<p class="hint">Draft order follows signup order.</p><div class="button-row section-gap"><button class="btn" data-act="start" '+(league.settings.draft_status==='live'||league.settings.draft_status==='finished'?'disabled':'')+'>Start / resume draft</button><button class="btn secondary" data-act="pause" '+(league.settings.draft_status!=='live'?'disabled':'')+'>Pause draft</button><button class="btn danger" data-act="reset" '+(league.settings.draft_status==='finished'?'disabled title="Permanent dynasty draft cannot be reset"':'')+'>Reset picks</button></div><hr style="border:0;border-top:1px solid #2c3951;margin:25px 0"/>'+panelHeading('Add program')+'<form data-form="program">'+input('Program name','name','text','University or school name')+input('Abbreviation','abbr','text','e.g. UF')+'<div class="form-row"><label>Conference</label><select class="field" name="conference_id">'+activeConfs().map(id=>'<option value="'+id+'">'+conf(id)+'</option>').join('')+'</select></div><button class="btn secondary" type="submit">Add program</button></form></section></div>';
  }
  async function action(button){
    const act=button.dataset.act,id=button.dataset.id;
    if(act==='tab'){current=id;render();if(current==='programs')filterPrograms();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(act==='auth-mode'){authMode=button.dataset.mode;renderAuth();return;}
    if(act==='logout'){await api('logout',{});me=null;league=null;inviteLink='';await loadPublic();renderAuth();return;}
    if(busy)return;
    busy=true;
    try{
      if(act==='trade-propose'){
        const give_ids=[...document.querySelectorAll('input[name="trade-give"]:checked')].map(x=>x.value);
        const receive_ids=[...document.querySelectorAll('input[name="trade-receive"]:checked')].map(x=>x.value);
        if(!give_ids.length||!receive_ids.length)throw Error('Select at least one program from each team.');
        if(!window.confirm('Send this trade offer? The other manager must accept before any programs move.')){busy=false;return;}
        await api('trade/propose',{to_manager_id:tradeTargetId,give_ids,receive_ids});notice('Trade offer sent.');
      }else if(act==='trade-accept'){
        if(!window.confirm('Accept this trade and permanently exchange the selected programs?')){busy=false;return;}
        await api('trade/respond',{trade_id:id,mode:'accept'});notice('Trade accepted. Rosters updated.');
      }else if(act==='trade-decline'){
        await api('trade/respond',{trade_id:id,mode:'decline'});notice('Trade declined.');
      }else if(act==='trade-cancel'){
        await api('trade/cancel',{trade_id:id});notice('Trade offer cancelled.');
      }else if(act==='save-confs'){
        const selected=[...document.querySelectorAll('input[name="conference"]:checked')].map(x=>x.value);
        const rounds=Number(v('#rounds'));
        await api('admin/settings',{conferences:selected,rounds});
        notice('Draft pool settings saved.');
      }else if(act==='invite'){
        const r=await api('admin/invite',{});
        inviteLink=location.origin+'/?invite='+encodeURIComponent(r.code);
        notice('New invitation ready to copy.');
      }else if(act==='copy-invite'){
        await navigator.clipboard.writeText(inviteLink);
        notice('Invitation link copied.');
        busy=false;return;
      }else if(act==='start'){
        await api('admin/draft-control',{mode:'start'});notice('Draft is live.');
      }else if(act==='pause'){
        await api('admin/draft-control',{mode:'pause'});notice('Draft paused.');
      }else if(act==='reset'){
        if(!window.confirm('Permanently erase every draft pick? This cannot be undone.')){busy=false;return;}
        await api('admin/draft-control',{mode:'reset'});notice('Draft picks reset.');
      }else if(act==='pick'){
        if(!window.confirm('Draft this program? The selection is permanent until commissioner reset.')){busy=false;return;}
        await api('draft/pick',{program_id:id});notice('Program drafted successfully.');
        current='draft';
      }else if(act==='sync'){
        const selected=[...document.querySelectorAll('input[name="conference"]:checked')].map(x=>x.value);
        if(!selected.length)throw Error('Select at least one conference.');
        if(!window.confirm('Import programs for '+selected.length+' conferences? This may take several moments.')){busy=false;return;}
        await api('admin/settings',{conferences:selected,rounds:Number(v('#rounds'))});
        syncActive=true;let done=0,errors=[];
        for(const confId of selected){
          try{const result=await api('admin/sync',{conference_id:confId});done+=result.added||0;}catch(e){errors.push(conf(confId)+': '+e.message);}
        }
        syncActive=false;
        await refresh(true);
        notice('Imported '+done+' programs.'+(errors.length?' '+errors.length+' conferences need review.':''),errors.length>0);
        if(errors.length)window.alert('Some imports could not be completed:\n\n'+errors.join('\n'));
        busy=false;return;
      }
      await refresh(true);
    }catch(e){notice(e.message,true);}finally{busy=false;}
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-act]');
    if(b)action(b);
  });
  root.addEventListener('submit',async e=>{
    const form=e.target.closest('form[data-form]');
    if(!form)return;
    e.preventDefault();if(busy)return;
    const type=form.dataset.form;
    const data=Object.fromEntries(new FormData(form).entries());
    busy=true;
    try{
      if(type==='program'){await api('admin/program',data);notice('Program added to pool.');await refresh(true);}
      else{
        const res=await api(type==='login'?'login':type==='join'?'join':'setup',data);
        selectedInvite='';
        if(location.search)history.replaceState({},'',location.pathname);
        me=res.user;await refresh();
        if(!refreshId)refreshId=setInterval(()=>{if(me&&!busy&&!syncActive)refresh(true);},12000);
        notice('Signed in.');
        if(me?.role==='commissioner')autoImportPrograms();
      }
    }catch(err){notice(err.message,true);}finally{busy=false;}
  });
  root.addEventListener('change',e=>{
    if(e.target?.id==='trade-target'){tradeTargetId=e.target.value;render();}
    if(e.target?.id==='program-conference'){programConference=e.target.value;filterPrograms();}
    if(e.target?.id==='program-ownership'){programOwnership=e.target.value;filterPrograms();}
  });
  root.addEventListener('input',e=>{
    if(e.target?.id!=='program-search')return;
    programQuery=e.target.value;
    filterPrograms();
  });
  boot();
})();