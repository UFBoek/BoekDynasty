(function startApp(){
  const root=document.querySelector('#app');
  const ICONS={home:'⌂',programs:'▦',draft:'▤',trades:'⇄',league:'▥',commissioner:'⚙',more:'⋯'};
  const iconSVG=(name)=>{
    const paths={
      home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      programs:'<path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h1m4 0h1M9 16h1m4 0h1"/>',
      draft:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
      league:'<path d="M4 20h16M7 17v-5h3v5m2 0V5h3v12m2 0V9h3v8"/>',
      trades:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
      scoring:'<path d="M4 4h16v16H4zM8 10h8M8 14h5"/>',
      commissioner:'<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/>',
      more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.more)+'</svg>';
  };
  const names={home:'Overview',programs:'Programs',draft:'Draft',trades:'Trades',league:'Standings',scoring:'Scoring',commissioner:'Commissioner',more:'More',waivers:'Waivers',history:'Dynasty history','program-detail':'Program','manager-detail':'Manager'};
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
  let adminSection='general',draftOrderPreview=[];
  let programQuery='',programConference='all',programOwnership='all',programShown=24,showAllDraft=false,lastAutoPoll=0;
  let selectedProgramId='',selectedManagerId='',profileReturn='programs',selectedHistorySeason='',draftRoundView='current';
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
      // Avoid dismissing the mobile keyboard every time the league auto-refreshes.
      const editing=silent&&!busy&&document.activeElement&&
        /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      const next=await api('state');
      me=next.user;league=next;appError='';
      if(!silent)current='home';
      if(!editing){render();if(current==='programs')filterPrograms();}
      if(chosen.length)document.querySelectorAll('.trade-choice input').forEach(el=>{el.checked=chosen.includes(el.name+':'+el.value);});
    }catch(e){
      if(String(e.message).includes('Sign in required')){me=null;league=null;if(!silent)await loadPublic();renderAuth();}
      else if(!silent){notice(e.message,true);}
    }
  }
  async function loadPublic(){
    try{status=await api('status');authMode=status.needs_setup?'setup':selectedInvite?'join':'login';}catch(e){appError=e.message;}
  }
  function startPolling(){
    if(refreshId)return;
    lastAutoPoll=Date.now();
    refreshId=setInterval(()=>{
      if(!me||busy||syncActive||current==='commissioner'||document.hidden)return;
      const onMobile=window.matchMedia?.('(max-width: 850px)').matches||false;
      const interval=onMobile&&league?.settings?.draft_status!=='live'?30000:12000;
      const now=Date.now();
      if(now-lastAutoPoll<interval)return;
      lastAutoPoll=now;
      refresh(true);
    },6000);
  }
  async function boot(){
    root.innerHTML='<div class="loading"><div class="spinner"></div></div>';
    await loadPublic();
    try{
      const next=await api('state'); me=next.user;league=next;render();
      startPolling();
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
    root.innerHTML='<div class="auth-layout"><main class="auth-panel"><div class="auth-card"><div class="auth-logo"><span class="brand-icon">★</span><div><div class="brand-title">'+escapeHTML(status.league_name||'Boek Dynasty')+'</div><div class="auth-season">COLLEGE BASKETBALL · 2026–27</div></div></div><div class="auth-section"><h1>'+header+'</h1>'+(desc?'<p class="auth-desc">'+desc+'</p>':'')+(!status.needs_setup?'<div class="auth-top"><button data-act="auth-mode" data-mode="login" class="'+(mode==='login'?'active':'')+'">Sign in</button><button data-act="auth-mode" data-mode="join" class="'+(mode==='join'?'active':'')+'">Join with invite</button></div>':'')+form+(appError?'<p class="auth-error">'+escapeHTML(appError)+'</p>':'')+'</div></div></main></div>';
  }
  function input(label,name,type,placeholder,value=''){
    return '<div class="form-row"><label for="'+name+'">'+label+'</label><input class="field" id="'+name+'" name="'+name+'" type="'+type+'" placeholder="'+escapeHTML(placeholder)+'" value="'+escapeHTML(value)+'" required autocomplete="'+(name==='password'?'current-password':'on')+'"/></div>';
  }
  function navButton(id){
    return '<button type="button" data-act="tab" data-id="'+id+'" class="'+(current===id?'active':'')+'">'+iconSVG(id)+'<span>'+names[id]+'</span></button>';
  }
  function sidebar(){
    return '<aside class="sidebar"><div class="brand"><div class="brand-icon">★</div><div><div class="brand-title">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+'</div></div></div><div><div class="nav-label">NAVIGATION</div><nav class="nav">'+['home','programs','draft','trades','league','scoring',...(me.role='commissioner'?['commissioner']:[])].map(navButton).join('')+'</nav></div><div class="side-foot"><span class="season-pill">'+escapeHTML(season())+' SEASON</span><div class="account-mini">'+avatar(me)+'<div><strong>'+escapeHTML(me.display_name)+'</strong><div class="muted tiny">'+(me.role==='commissioner'?'Commissioner':'League manager')+'</div></div></div><button data-act="logout" class="logout">Sign out →</button></div></aside>';
  }
  function render(){
    if(!me||!league)return renderAuth();
    const isAdmin=me.role==='commissioner';
    if(current==='commissioner'&&!isAdmin)current='home';
    const tabs=['home','programs','draft','league','more'];
    const activeMobile=(['trades','commissioner','waivers','history','scoring'].includes(current))?'more':current==='program-detail'?'programs':current==='manager-detail'?'league':current;
    root.innerHTML='<div class="shell">'+sidebar()+'<main class="main"><header class="topbar"><span class="title">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+' <span class="sep">/</span> '+(names[current]||'Profile')+'</span><div class="top-right"><span class="chip">'+escapeHTML(season())+'</span><div class="avatar-small">'+escapeHTML(initials(me.display_name))+'</div></div></header><section class="content">'+({home:overview,programs:programsPage,draft:draftPage,trades:tradesPage,league:leaguePage,scoring:scoringPage,commissioner:commissionerPage,more:morePage,'program-detail':programProfilePage,'manager-detail':managerProfilePage,waivers:waiversPage,history:historyPage}[current]||overview)()+'</section></main></div><nav class="bottom" aria-label="Mobile navigation">'+tabs.map(id=>'<button type="button" class="'+(activeMobile===id?'active':'')+'" data-act="tab" data-id="'+id+'" '+(activeMobile===id?'aria-current="page"':'')+' aria-label="'+names[id]+'">'+iconSVG(id)+'<span>'+names[id]+'</span></button>').join('')+'</nav>';
  }
  function morePage(){
    const links=[['scoring','Scoring','Point values and best-ball rules'],['trades','Trades','Propose trades and view league activity'],['waivers','Waivers','Claim or release unrostered schools'],['history','Dynasty history','Archived seasons and champions']];
    if(me.role==='commissioner')links.push(['commissioner','Commissioner','League settings and manager controls']);
    return heading('', 'More')
      +'<section class="panel more-menu">'+links.map(([id,title,description])=>
        '<button type="button" class="more-menu-item" data-act="tab" data-id="'+id+'"><span class="more-menu-icon">'+iconSVG(id)+'</span><span class="grow"><strong>'+title+'</strong><small>'+description+'</small></span><span class="more-chevron">›</span></button>'
      ).join('')+'</section>'
      +'<section class="panel more-account section-gap"><div>'+avatar(me)+'<div class="grow"><strong>'+escapeHTML(me.display_name)+'</strong><small>'+escapeHTML(me.username)+'</small></div></div><button class="btn secondary" data-act="logout">Sign out</button></section>';
  }
  function overview(){
    const owned=myPrograms();
    const selectedCount=programs().filter(p=>activeConfs().includes(p.conference_id)).length;
    return heading('', 'Overview')
      +'<div class="league-status"><div><span class="eyebrow">DRAFT STATUS</span><strong>'+(league.settings.draft_status==='live'?'Draft in progress':league.settings.draft_status==='finished'?'Draft complete':league.settings.draft_status==='paused'?'Draft paused':'Draft not started')+'</strong>'+(league.settings.draft_status==='live'&&nextManager()?'<span class="league-status-detail">On the clock: '+escapeHTML(nextManager().display_name)+'</span>':'')+'</div><button class="btn secondary small" data-act="tab" data-id="draft">View draft</button></div>'
      +(syncActive?'<div class="standings-notice">Importing programs from the selected conferences...</div>':'')
      +'<div class="metrics"><div class="metric"><span class="m-label">YOUR PROGRAMS</span><strong>'+owned.length+'</strong><span class="m-foot">Owned schools</span></div><div class="metric"><span class="m-label">LEAGUE MANAGERS</span><strong>'+members().length+' <span style="font-size:14px;color:#9babc0">/ '+league.settings.max_managers+'</span></strong><span class="m-foot">Registered managers</span></div><div class="metric"><span class="m-label">ELIGIBLE PROGRAMS</span><strong>'+fmt(selectedCount)+'</strong><span class="m-foot">'+activeConfs().length+' conferences selected</span></div><div class="metric"><span class="m-label">DRAFT ROUNDS</span><strong>'+league.settings.rounds+'</strong><span class="m-foot">Programs per manager</span></div></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('Your roster')+(owned.length?owned.map(p=>'<button class="rowline profile-row" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+conf(p.conference_id)+'</small></div><span class="status draft">ROSTERED</span></button>').join(''):empty('No programs owned','Your roster will appear here after the draft.'))+'</section><section class="panel">'+panelHeading('League rosters')+leaderboard()+'</section></div>';
  }
  function leaderboard(){
    return '<table class="table"><thead><tr><th>MANAGER</th><th class="last">PROGRAMS</th></tr></thead><tbody>'+members().map(u=>'<tr><td><button class="table-user" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'+escapeHTML(u.display_name)+'</button>'+(u.id===me.id?' <span class="muted tiny">(you)</span>':'')+'</td><td class="last">'+owners().filter(p=>p.manager_id===u.id).length+'</td></tr>').join('')+'</tbody></table>';
  }
  function programCard(p,canPick){
    const owned=programOwned(p.id),owner=members().find(u=>u.id===owned?.manager_id);
    const status=owned?'<span class="owner-chip"><span class="owner-indicator"></span>'+escapeHTML(owner?.display_name||'Rostered')+'</span>':canPick?'<button class="btn small" data-act="pick" data-id="'+escapeHTML(p.id)+'">Draft</button>':'<span class="available-chip">Available</span>';
    return '<div class="program-card" data-conference="'+escapeHTML(p.conference_id)+'" data-owner="'+(owned?'owned':'available')+'" data-search="'+escapeHTML((p.name+' '+p.abbr+' '+conf(p.conference_id)).toLowerCase())+'"><button class="program-card-main" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></div></button>'+status+'</div>';
  }
  function programsPage(){
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id)).sort((a,b)=>a.name.localeCompare(b.name));
    const available=eligible.filter(p=>!programOwned(p.id)).length;
    const opts=activeConfs().map(id=>'<option value="'+id+'" '+(programConference===id?'selected':'')+'>'+escapeHTML(conf(id))+'</option>').join('');
    return heading('', 'Programs')
      +'<div class="directory-stats"><div><strong>'+eligible.length+'</strong><span>Eligible schools</span></div><div><strong>'+available+'</strong><span>Available</span></div><div><strong>'+(eligible.length-available)+'</strong><span>Rostered</span></div></div>'
      +'<div class="directory-toolbar"><label class="search-wrap"><span>⌕</span><input class="field" type="search" id="program-search" value="'+escapeHTML(programQuery)+'" placeholder="Search schools..." aria-label="Search schools"/></label><select class="field" id="program-conference" aria-label="Conference"><option value="all">All conferences</option>'+opts+'</select><select class="field" id="program-ownership" aria-label="Program ownership"><option value="all" '+(programOwnership==='all'?'selected':'')+'>All schools</option><option value="available" '+(programOwnership==='available'?'selected':'')+'>Available</option><option value="owned" '+(programOwnership==='owned'?'selected':'')+'>Rostered</option></select></div>'
      +'<div class="directory-result"><span id="program-results">'+eligible.length+' programs</span><span>'+(league.settings.draft_status==='live'&&isMyTurn()?'Your pick is live':'2026–27 program pool')+'</span></div>'
      +(eligible.length?'<div class="program-grid">'+eligible.map(p=>programCard(p,isMyTurn())).join('')+'</div><div id="no-program-results" class="empty directory-empty" hidden>No matching schools</div><div id="directory-load" class="directory-load" hidden><button class="btn secondary" data-act="load-programs">Load more schools</button><span id="directory-progress"></span></div>':empty('No programs loaded',me?.role==='commissioner'?(syncActive?'Importing selected conferences...':'Use the import button in Commissioner settings.'): 'The commissioner has not imported schools yet.'));
  }
  function filterPrograms(){
    const query=programQuery.trim().toLowerCase();
    let found=0,visible=0;
    document.querySelectorAll('.program-card[data-search]').forEach(card=>{
      const match=card.dataset.search.includes(query)
        &&(programConference==='all'||card.dataset.conference===programConference)
        &&(programOwnership==='all'||card.dataset.owner===programOwnership);
      if(match)found++;
      card.hidden=!match||found>programShown;
      if(match&&found<=programShown)visible++;
    });
    const count=document.querySelector('#program-results');
    if(count)count.textContent=found>visible?visible+' of '+found+' programs':found+' programs';
    const more=document.querySelector('#directory-load');
    if(more)more.hidden=found<=visible;
    const progress=document.querySelector('#directory-progress');
    if(progress)progress.textContent=found>visible?(found-visible)+' remaining':'';
    const emptyMessage=document.querySelector('#no-program-results');
    if(emptyMessage)emptyMessage.hidden=found!==0;
  }
  function updateDraftClock(){
    const el=document.querySelector('#draft-clock');
    if(!el)return;
    const deadline=Number(league?.settings?.draft_deadline||0);
    if(!deadline||league.settings.draft_status!=='live'){el.textContent='OFF';return;}
    const left=Math.max(0,deadline-Math.floor(Date.now()/1000));
    if(!left){el.textContent='TIME UP';el.classList.add('expired');return;}
    el.classList.remove('expired');
    el.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
  }
  function draftPage(){
    const settings=league.settings;
    const total=draftTotal(),completed=picks().length;
    const count=members().length,available=programs().filter(p=>activeConfs().includes(p.conference_id)).length;
    const currentRound=Math.min(settings.rounds,Math.floor(completed/Math.max(1,count))+1);
    const canStart=count>=2&&available>=total;
    const status=settings.draft_status;
    const next=nextManager();
    const rounds=Number(settings.rounds);
    const selectedRound=draftRoundView==='current'?currentRound:draftRoundView==='all'?'all':Number(draftRoundView);
    const options='<option value="current" '+(draftRoundView==='current'?'selected':'')+'>Current round ('+currentRound+')</option><option value="all" '+(draftRoundView==='all'?'selected':'')+'>All rounds</option>'+Array.from({length:rounds},(_,i)=>'<option value="'+(i+1)+'" '+(selectedRound===i+1&&draftRoundView!=='current'?'selected':'')+'>Round '+(i+1)+'</option>').join('');
    const slots=[];
    for(let round=1;round<=rounds;round++){
      if(selectedRound!=='all'&&selectedRound!==round)continue;
      const sequence=round%2===1?order():order().slice().reverse();
      for(let i=0;i<sequence.length;i++){
        const overall=(round-1)*count+i+1,pick=picks().find(p=>p.overall===overall),manager=members().find(m=>m.id===sequence[i]);
        const team=programs().find(p=>p.id===pick?.program_id);
        slots.push('<div class="board-slot '+(overall===completed+1&&status==='live'?'on-clock':'')+'"><span class="board-number">#'+overall+'</span><span class="board-manager">'+escapeHTML(manager?.display_name||'Manager')+'</span>'+(team?'<button data-act="open-program" data-id="'+escapeHTML(team.id)+'" class="board-team">'+img(team)+'<strong>'+escapeHTML(team.name)+'</strong></button>':'<span class="board-open">'+(overall===completed+1&&status==='live'?'On the clock':'Upcoming')+'</span>')+'</div>');
      }
    }
    const recent=[...picks()].reverse();
    const shown=showAllDraft?recent:recent.slice(0,10);
    return heading('', 'Draft')
      +'<div class="draft-info"><div class="draft-info-main"><span class="eyebrow">'+(status==='live'?'DRAFT LIVE':status==='finished'?'DRAFT COMPLETE':status==='paused'?'DRAFT PAUSED':'NOT STARTED')+'</span>'
      +'<strong>'+(status==='live'?'On the clock: '+escapeHTML(next?.display_name||''):(status==='finished'?'Inaugural draft complete':status==='paused'?'Draft paused':'Awaiting draft start'))+'</strong>'
      +'<p>'+completed+' / '+total+' picks · '+count+' managers · '+rounds+' rounds</p>'
      +'<div class="draft-progress"><div style="width:'+((completed/Math.max(1,total))*100)+'%"></div></div></div>'
      +(settings.draft_clock_seconds>0?'<div class="draft-clock-box"><span>DRAFT CLOCK</span><strong id="draft-clock" aria-live="off">--:--</strong><small>No automatic picks</small></div>':'<span class="status '+(status==='live'?'':'wait')+'">'+(status==='live'?'LIVE':status.toUpperCase())+'</span>')+'</div>'
      +(status==='pending'?'<div class="readiness-panel"><strong>Draft readiness</strong><span>'+(count>=2?'✓ '+count+' managers registered':'• At least 2 managers required')+'</span><span>'+(available>=total?'✓ '+available+' eligible schools for '+total+' picks':'• Need '+Math.max(0,total-available)+' additional eligible schools')+'</span><span class="'+(canStart?'ready-label':'not-ready-label')+'">'+(canStart?'Ready to start':'Not ready')+'</span></div>':'')
      +(status==='live'?'<div class="draft-action"><div><strong>'+(isMyTurn()?'Your pick is up':'Draft in progress')+'</strong><small>'+(isMyTurn()?'Choose an eligible program.':'Browse schools while you wait for your pick.')+'</small></div><button class="btn" data-act="tab" data-id="programs">'+(isMyTurn()?'Make pick':'Programs')+'</button></div>':'')
      +'<section class="panel section-gap"><div class="board-head">'+panelHeading('Full draft board')+'<div class="board-select"><label for="draft-round">Show</label><select class="field" id="draft-round">'+options+'</select></div></div><div class="board-slots">'+(slots.join('')||empty('No managers'))+'</div></section>'
      +'<div class="grid2 draft-layout section-gap"><section class="panel draft-picks-panel">'+panelHeading('Recent selections')
      +(shown.length?shown.map(p=>{const t=programs().find(t=>t.id===p.program_id),m=members().find(m=>m.id===p.manager_id);return '<div class="rowline"><span class="pos">'+p.overall+'</span>'+(t?img(t):'')+'<div class="grow">'+(t?'<button class="table-user" data-act="open-program" data-id="'+escapeHTML(t.id)+'">'+escapeHTML(t.name)+'</button>':'<strong>Program</strong>')+'<small>'+escapeHTML(m?.display_name||'Manager')+' · Round '+p.round+'</small></div></div>'}).join(''):empty('No picks yet'))
      +(recent.length>10?'<button type="button" class="draft-history-toggle" data-act="draft-history-toggle">'+(showAllDraft?'Show recent selections':'View all '+recent.length+' picks')+'</button>':'')+'</section>'
      +'<section class="panel draft-order-panel">'+panelHeading('Draft order','Snake format')+order().map((id,i)=>{const u=members().find(m=>m.id===id);return u?'<button class="manager-card manager-profile-link" data-act="open-manager" data-id="'+escapeHTML(u.id)+'"><span class="pos">'+(i+1)+'</span>'+avatar(u)+'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>'+escapeHTML(u.username)+'</small></div>'+(id===me.id?'<span class="status">YOU</span>':'')+'</button>':''}).join('')+'</section></div>';
  }

  function updateTradeSelections(){
    const give=document.querySelectorAll('input[name="trade-give"]:checked').length;
    const receive=document.querySelectorAll('input[name="trade-receive"]:checked').length;
    const giveLabel=document.querySelector('#trade-give-count');
    const receiveLabel=document.querySelector('#trade-receive-count');
    const summary=document.querySelector('#trade-selection-summary');
    const submit=document.querySelector('[data-act="trade-propose"]');
    if(giveLabel)giveLabel.textContent=give+' selected';
    if(receiveLabel)receiveLabel.textContent=receive+' selected';
    if(summary)summary.textContent=give&&receive?give+' sent · '+receive+' requested':'Select schools from both teams';
    if(submit)submit.disabled=!give||!receive;
  }
  function tradesPage(){
    const ready=league.settings.draft_status==='finished'&&league.settings.trading_enabled;
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
      const actions=t.status==='pending'&&league.settings.trading_enabled?(t.to_manager_id===me.id?'<div class="button-row section-gap"><button class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept trade</button><button class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button></div>':t.from_manager_id===me.id?'<div class="button-row section-gap"><button class="btn small ghost" data-act="trade-cancel" data-id="'+escapeHTML(t.id)+'">Cancel offer</button></div>':''):'';
      return '<div class="trade-offer"><div class="trade-offer-head"><strong>'+escapeHTML(from?.display_name||'Manager')+' → '+escapeHTML(to?.display_name||'Manager')+'</strong><span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div><p><strong>Offering:</strong> '+escapeHTML(give.join(', '))+'</p><p><strong>Requesting:</strong> '+escapeHTML(receive.join(', '))+'</p>'+actions+'</div>';
    };
    return heading('', 'Trades')
      +(ready?'<section class="panel section-gap">'+panelHeading('Propose trade')+'<div class="form-row"><label for="trade-target">Trade with</label><select class="field" id="trade-target">'+others.map(u=>'<option value="'+escapeHTML(u.id)+'" '+(u.id===tradeTargetId?'selected':'')+'>'+escapeHTML(u.display_name)+'</option>').join('')+'</select></div><div class="trade-columns"><div><h3 class="subhead">YOU SEND <span id="trade-give-count">0 selected</span></h3>'+selections(mine,'trade-give')+'</div><div><h3 class="subhead">YOU RECEIVE <span id="trade-receive-count">0 selected</span></h3>'+selections(theirs,'trade-receive')+'</div></div><div class="trade-submit"><div id="trade-selection-summary">Select schools from both teams</div><button class="btn" data-act="trade-propose" disabled>Send trade offer</button></div></section>':
        '<section class="panel section-gap">'+empty(league.settings.trading_enabled?'Trading unavailable':'Trading disabled',league.settings.trading_enabled?'Trading opens after the initial draft.':'The commissioner has disabled new trades.')+'</section>')
      +'<section class="panel section-gap">'+panelHeading('Trade history')+(offers.length?offers.map(card).join(''):empty('No trades yet',''))+'</section>';
  }

  const scoringGroups=[
    ['Regular season',[['regular_win','Regular-season win'],['quad_2_win','Quad 2 win bonus'],['quad_1_win','Quad 1 win bonus'],['quad_1a_extra','Extra Quad 1A win bonus']]],
    ['Conference championships',[['conference_regular_title','Regular-season champion'],['conference_tournament_title','Tournament champion']]],
    ['NCAA appearance by seed',[['ncaa_seed_1_4','Seeds 1–4'],['ncaa_seed_5_8','Seeds 5–8'],['ncaa_seed_9_12','Seeds 9–12'],['ncaa_seed_13_16','Seeds 13–16']]],
    ['NCAA Tournament wins',[['ncaa_tournament_win','Tournament win'],['ncaa_opening_round_win','Opening Round win'],['national_championship','National champion bonus']]]
  ];
  const scoreRules=()=>league?.settings?.scoring||{};
  function scoringPage(){
    const r=scoreRules(),count=Number(r.best_programs||8);
    return heading('', 'Scoring')
      +'<section class="panel scoring-lead"><div><span class="eyebrow">SEASON-LONG BEST BALL</span><h2>Best '+count+' programs count</h2><p>Every program remains owned year after year. Only the highest-scoring '+count+' programs on each roster contribute to the annual standings.</p></div><strong>'+count+'</strong></section>'
      +'<div class="scoring-grid">'+scoringGroups.map(([title,fields])=>'<section class="panel scoring-panel">'+panelHeading(escapeHTML(title))
      +fields.map(([key,label])=>'<div class="score-row"><span>'+escapeHTML(label)+'</span><strong>+'+Number(r[key]||0).toLocaleString('en-US',{maximumFractionDigits:2})+'</strong></div>').join('')+'</section>').join('')+'</div>'
      +'<section class="panel section-gap scoring-panel">'+panelHeading('Rules and notes')
      +'<p>Q1A wins earn both the Quad 1 bonus and the additional Quad 1A bonus. Quadrants use final NET classifications.</p>'
      +'<p>Appearance points are awarded once for NCAA seeding. Opening Round games use their own win value. The national championship bonus stacks with tournament wins.</p>'
      +'<p>Regular-season win points exclude conference and NCAA tournament games. There is no AP Poll or KenPom bonus.</p>'
      +'<p class="muted">Verified game results have not yet been integrated; standings cannot calculate actual points until they are.</p></section>';
  }

  function leaguePage(){
    const users=members(),tracked=owners();
    const rows=users.map(u=>{
      const roster=tracked.filter(o=>o.manager_id===u.id);
      const schoolNames=roster.map(o=>programs().find(p=>p.id===o.program_id)?.name).filter(Boolean);
      return '<tr class="standing-row"><td><button class="standings-manager table-user" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'+avatar(u)+'<div><strong>'+escapeHTML(u.display_name)+'</strong><small>'+(u.id===me.id?'Your team':u.role==='commissioner'?'Commissioner':'Manager')+'</small></div></button></td><td class="numerical">'+roster.length+'</td><td class="numerical"><span class="pending-score">—</span></td><td class="standing-roster">'+(schoolNames.length?escapeHTML(schoolNames.slice(0,3).join(' · '))+(schoolNames.length>3?' +'+(schoolNames.length-3):''):'No programs yet')+'</td></tr>';
    }).join('');
    return heading('', 'Standings')
      +'<div class="standings-summary"><div><span>SEASON</span><strong>'+escapeHTML(season())+'</strong></div><div><span>MANAGERS</span><strong>'+users.length+'</strong></div><div><span>ROSTERED SCHOOLS</span><strong>'+tracked.length+'</strong></div><div><span>DRAFT PICKS</span><strong>'+picks().length+'</strong></div></div>'
      +'<section class="panel standings-panel">'+panelHeading('League standings','Season-long points')
      +'<div class="standings-notice">Scoring rules are configured. Verified program results are not connected yet, so standings points are not available.</div>'
      +'<div class="standings-table-wrap"><table class="standings-table"><thead><tr><th>TEAM</th><th class="numerical">SCHOOLS</th><th class="numerical">POINTS</th><th>ROSTER PREVIEW</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'</section>';
  }


  function profileBack(){return '<button class="profile-back" data-act="tab" data-id="'+escapeHTML(profileReturn)+'">← Back</button>';}
  function programProfilePage(){
    const p=programs().find(p=>p.id===selectedProgramId);
    if(!p)return heading('', 'Program unavailable')+profileBack();
    const owner=programOwned(p.id);
    const manager=members().find(m=>m.id===owner?.manager_id);
    const selection=picks().find(x=>x.program_id===p.id);
    const pickedBy=members().find(m=>m.id===selection?.manager_id);
    const history=(league.archived_rosters||[]).filter(x=>x.program_id===p.id).sort((a,b)=>b.season.localeCompare(a.season));
    const activity=(league.roster_transactions||[]).filter(x=>x.program_id===p.id).slice(0,10);
    const ownership=manager?'<button data-act="open-manager" data-id="'+escapeHTML(manager.id)+'" class="profile-link">'+escapeHTML(manager.display_name)+'</button>':'<span>Unrostered</span>';
    return profileBack()
      +'<div class="profile-hero">'+img(p)+'<div class="grow"><span class="eyebrow">'+escapeHTML(conf(p.conference_id))+'</span><h1>'+escapeHTML(p.name)+'</h1><div class="profile-subline">2026–27 college basketball program</div></div></div>'
      +'<div class="profile-stats"><div><span>CURRENT OWNER</span><strong>'+ownership+'</strong></div><div><span>ORIGINAL PICK</span><strong>'+(selection?'#'+selection.overall+' · Rd '+selection.round:'Undrafted')+'</strong></div><div><span>RECORD</span><strong class="muted">Not connected</strong></div><div><span>FANTASY POINTS</span><strong class="muted">Pending</strong></div></div>'
      +'<div class="profile-panels"><section class="panel">'+panelHeading('Program details')+'<div class="profile-facts"><div><span>Conference</span><strong>'+escapeHTML(conf(p.conference_id))+'</strong></div><div><span>Current season</span><strong>'+escapeHTML(season())+'</strong></div><div><span>Originally drafted by</span><strong>'+escapeHTML(pickedBy?.display_name||'Not drafted')+'</strong></div><div><span>Dynasty status</span><strong>'+(owner?'Rostered':'Available')+'</strong></div></div>'+(league.settings.waivers_enabled&&league.settings.draft_status==='finished'&&!owner?'<button class="btn section-gap" data-act="tab" data-id="waivers">Request on waivers</button>':'')+'</section>'
      +'<section class="panel">'+panelHeading('Season history')+(history.length?history.map(x=>{const u=members().find(m=>m.id===x.manager_id);return '<div class="history-row"><strong>'+escapeHTML(x.season)+'</strong><span>'+escapeHTML(u?.display_name||'Manager')+'</span></div>';}).join(''):empty('No archived seasons'))+'</section></div>'
      +'<section class="panel section-gap">'+panelHeading('Roster activity')+(activity.length?activity.map(t=>'<div class="history-row"><strong>'+escapeHTML(t.action==='claim'?'Claimed':'Dropped')+'</strong><span>'+escapeHTML(t.season)+' · '+escapeHTML(members().find(m=>m.id===t.manager_id)?.display_name||'Manager')+'</span></div>').join(''):empty('No roster moves'))+'</section>';
  }
  function managerProfilePage(){
    const u=members().find(m=>m.id===selectedManagerId);
    if(!u)return heading('', 'Manager unavailable')+profileBack();
    const roster=owners().filter(o=>o.manager_id===u.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const records=(league.season_records||[]).filter(x=>x.manager_id===u.id).sort((a,b)=>b.season.localeCompare(a.season));
    const titles=(league.archives||[]).filter(x=>x.champion_manager_id===u.id).length;
    const rows=roster.map(p=>'<button class="profile-roster-row" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span><span>›</span></button>').join('');
    return profileBack()+'<div class="profile-hero manager-hero">'+avatar(u)+'<div class="grow"><span class="eyebrow">DYNASTY MANAGER</span><h1>'+escapeHTML(u.display_name)+'</h1><div class="profile-subline">@'+escapeHTML(u.username)+(u.id===me.id?' · Your team':'')+'</div></div></div>'
      +'<div class="profile-stats"><div><span>OWNED PROGRAMS</span><strong>'+roster.length+'</strong></div><div><span>LEAGUE TITLES</span><strong>'+titles+'</strong></div><div><span>CURRENT POINTS</span><strong class="muted">Pending</strong></div></div>'
      +'<div class="profile-panels"><section class="panel">'+panelHeading('Current roster')+(rows||empty('No programs owned'))+'</section><section class="panel">'+panelHeading('Dynasty seasons')+(records.length?records.map(x=>'<div class="history-row"><strong>'+escapeHTML(x.season)+'</strong><span>'+x.programs_count+' schools · Points pending</span></div>').join(''):empty('No archived seasons'))+'</section></div>';
  }
  function historyPage(){
    const archives=league.archives||[];
    const chosen=archives.find(a=>a.season===selectedHistorySeason)||archives[0];
    if(chosen)selectedHistorySeason=chosen.season;
    const entries=chosen?(league.season_records||[]).filter(r=>r.season===chosen.season):[];
    const historyRows=entries.map(r=>{
      const m=members().find(u=>u.id===r.manager_id);
      return '<button class="history-team" data-act="open-manager" data-id="'+escapeHTML(r.manager_id)+'"><strong>'+escapeHTML(m?.display_name||'Manager')+'</strong><span>'+r.programs_count+' programs</span><span>'+(r.fantasy_points===null?'Points pending':r.fantasy_points.toFixed(1))+'</span></button>';
    }).join('');
    return heading('', 'Dynasty history')
      +'<div class="archive-intro">Program ownership carries into every new season. Archived rosters stay available for historical reference.</div>'
      +'<section class="panel">'+panelHeading('Completed seasons')
      +(archives.length?'<div class="form-row"><label for="history-season">Season</label><select id="history-season" class="field">'+archives.map(a=>'<option value="'+escapeHTML(a.season)+'" '+(a.season===selectedHistorySeason?'selected':'')+'>'+escapeHTML(a.season)+'</option>').join('')+'</select></div>'
        +'<div class="archive-champion"><span>CHAMPION</span><strong>'+escapeHTML(members().find(u=>u.id===chosen.champion_manager_id)?.display_name||'Not recorded')+'</strong></div>'
        +'<div class="history-team-list">'+historyRows+'</div>'
        +'<p class="hint section-gap">Scoring and final positions will populate after the scoring system is configured.</p>':empty('No seasons archived','The inaugural season is still in progress.'))+'</section>';
  }
  function waiversPage(){
    const enabled=league.settings.waivers_enabled&&league.settings.draft_status==='finished';
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id)&&!programOwned(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
    const mine=myPrograms().sort((a,b)=>a.name.localeCompare(b.name));
    const claims=(league.waiver_claims||[]).filter(c=>c.manager_id===me.id);
    const opts=eligible.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
    const drop='<option value="">No drop ('+mine.length+'/'+league.settings.rounds+' owned)</option>'+mine.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
    return heading('', 'Waivers')
      +(enabled?'<section class="panel">'+panelHeading('Submit a waiver claim')+'<div class="form-row"><label for="waiver-program">Available program</label><select id="waiver-program" class="field">'+opts+'</select></div><div class="form-row"><label for="waiver-drop">Release program (optional if roster not full)</label><select id="waiver-drop" class="field">'+drop+'</select></div><button class="btn" data-act="waiver-claim" '+(!eligible.length?'disabled':'')+'>Submit claim</button><p class="hint section-gap">Claims are reviewed by the commissioner in submission order. No automatic approvals.</p></section>'
          +'<section class="panel section-gap">'+panelHeading('Release a program')+'<div class="form-row"><label for="waiver-release">Your roster</label><select id="waiver-release" class="field">'+mine.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('')+'</select></div><button class="btn secondary" data-act="waiver-drop" '+(!mine.length?'disabled':'')+'>Drop selected program</button></section>'
          :'<section class="panel">'+empty('Waivers are closed',league.settings.draft_status==='finished'?'The commissioner has not enabled waivers.':'Waivers begin after the inaugural draft.')+'</section>')
      +'<section class="panel section-gap">'+panelHeading('Your claims')+(claims.length?claims.map(c=>{const p=programs().find(p=>p.id===c.program_id);return '<div class="history-row"><div><strong>'+escapeHTML(p?.name||'Program')+'</strong><small>'+escapeHTML(c.status)+'</small></div>'+(c.status==='pending'?'<button class="btn small secondary" data-act="waiver-cancel" data-id="'+escapeHTML(c.id)+'">Cancel</button>':'')+'</div>';}).join(''):empty('No waiver claims'))+'</section>';
  }
  function commissionerPage(){
    if(me.role!=='commissioner')return '';
    const settings=league.settings;
    const locked=settings.draft_status!=='pending'||picks().length>0;
    const cap=Number(settings.max_managers||10);
    const sections=[['general','General','League settings'],['draft','Draft','Order and controls'],['programs','Programs','Eligible schools'],['members','Members','Managers and invites'],['scoring','Scoring','Points and best ball'],['trades','Trades','Trade permissions']];
    const menu='<nav class="commissioner-menu" aria-label="Commissioner sections">'+sections.map(([id,label,detail])=>
      '<button data-act="commish-section" data-id="'+id+'" type="button" class="'+(adminSection===id?'active':'')+'"><strong>'+label+'</strong><span>'+detail+'</span></button>'
    ).join('')+'</nav>';
    let body='';
    if(adminSection==='general'){
      body='<section class="panel setting-panel">'+panelHeading('General')
        +'<div class="settings-grid"><div class="form-row"><label for="league-name">League name</label><input id="league-name" class="field" type="text" maxlength="40" value="'+escapeHTML(settings.league_name||'Boek Dynasty')+'"/></div>'
        +'<div class="form-row"><label for="manager-limit">Maximum managers</label><input id="manager-limit" class="field" type="number" min="'+Math.max(2,members().length)+'" max="20" step="1" value="'+cap+'" '+(locked?'disabled':'')+'/></div></div>'
        +'<p class="settings-hint">'+members().length+' of '+cap+' spots filled'+(locked?' · Capacity locked once drafting begins':' · Allowed: 2–20 managers')+'</p>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-general">Save changes</button></div>'
        +'</section>';
    }else if(adminSection==='draft'){
      if(draftOrderPreview.length!==members().length||draftOrderPreview.some(id=>!members().some(u=>u.id===id)))draftOrderPreview=order().slice();
      const rows=draftOrderPreview.map((id,index)=>{
        const person=members().find(u=>u.id===id);
        return '<div class="draft-order-row"><span class="draft-order-number">'+(index+1)+'</span>'+avatar(person)+'<strong class="grow">'+escapeHTML(person.display_name)+'</strong>'
          +(locked?'':'<span class="draft-order-buttons"><button data-act="move-draft" data-index="'+index+'" data-dir="-1" '+(index===0?'disabled':'')+' aria-label="Move '+escapeHTML(person.display_name)+' up">↑</button><button data-act="move-draft" data-index="'+index+'" data-dir="1" '+(index===draftOrderPreview.length-1?'disabled':'')+' aria-label="Move '+escapeHTML(person.display_name)+' down">↓</button></span>')
          +'</div>';
      }).join('');
      body='<section class="panel setting-panel">'+panelHeading('Draft settings')
        +'<div class="settings-grid"><div class="form-row"><label for="rounds">Rounds per manager</label><input class="field" id="rounds" type="number" min="1" max="20" value="'+settings.rounds+'" '+(locked?'disabled':'')+'/></div>'
        +'<div class="settings-static"><span>Draft format</span><strong>Snake</strong><small>Status: '+escapeHTML(settings.draft_status)+'</small></div></div>'
        +'<button class="btn" data-act="save-rounds" '+(locked?'disabled':'')+'>Save rounds</button></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Draft order')
        +(rows||empty('Waiting for managers'))
        +(locked?'':'<div class="button-row section-gap"><button class="btn secondary" data-act="shuffle-draft" '+(members().length<2?'disabled':'')+'>Shuffle</button><button class="btn ghost" data-act="signup-draft">Signup order</button><button class="btn" data-act="save-draft-order" '+(members().length<2?'disabled':'')+'>Save order</button></div>')+'</section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Draft controls')+'<div class="button-row">'
        +'<button class="btn" data-act="start" '+(settings.draft_status==='live'||settings.draft_status==='finished'?'disabled':'')+'>Start / resume</button>'
        +'<button class="btn secondary" data-act="pause" '+(settings.draft_status!=='live'?'disabled':'')+'>Pause draft</button>'
        +'<button class="btn danger" data-act="reset" '+(settings.draft_status==='finished'?'disabled':'')+'>Reset picks</button>'
        +'</div></section>';
    }else if(adminSection==='programs'){
      const confs=conferenceGroups.map(group=>'<h3 class="subhead section-gap">'+group.name+'</h3><div class="conf-grid">'+group.ids.map(id=>
        '<label class="conf-item"><input type="checkbox" name="conference" value="'+id+'" '+(activeConfs().includes(id)?'checked':'')+' '+(locked?'disabled':'')+'/><span>'+escapeHTML(conf(id))+'</span><small class="muted">'+programs().filter(p=>p.conference_id===id).length+'</small></label>'
      ).join('')+'</div>').join('');
      body='<section class="panel setting-panel">'+panelHeading('Eligible conferences')+confs
        +'<div class="button-row section-gap"><button class="btn" data-act="save-confs" '+(locked?'disabled':'')+'>Save conferences</button><button class="btn secondary" data-act="sync" '+(locked||syncActive?'disabled':'')+'>'+(syncActive?'Importing...':'Import schools')+'</button></div>'
        +(importError?'<p class="notice section-gap">'+escapeHTML(importError)+'</p>':'')+'</section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Add a school')+'<form data-form="program">'
        +input('Program name','name','text','School name')+input('Abbreviation','abbr','text','e.g. UF')
        +'<div class="form-row"><label for="conference_id">Conference</label><select class="field" id="conference_id" name="conference_id">'+activeConfs().map(id=>'<option value="'+id+'">'+escapeHTML(conf(id))+'</option>').join('')+'</select></div>'
        +'<button class="btn secondary" type="submit" '+(locked?'disabled':'')+'>Add school</button></form></section>';
    }else if(adminSection==='members'){
      body='<section class="panel setting-panel">'+panelHeading('Managers',members().length+' / '+cap+' registered')
        +members().map(u=>'<div class="manager-card">'+avatar(u)+'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>@'+escapeHTML(u.username)+'</small></div><span class="status '+(u.role==='commissioner'?'wait':'')+'">'+(u.role==='commissioner'?'COMMISSIONER':'MANAGER')+'</span></div>').join('')
        +'</section><section class="panel setting-panel section-gap">'+panelHeading('Invitations')
        +'<p class="hint">Each invite link expires after 7 days and works once.</p>'
        +'<div class="button-row section-gap"><button class="btn" data-act="invite" '+(members().length>=cap||settings.draft_status!=='pending'?'disabled':'')+'>Generate invite</button></div>'
        +(inviteLink?'<div class="invite-result section-gap"><span>'+escapeHTML(inviteLink)+'</span><button class="btn small secondary" data-act="copy-invite">Copy</button></div>':'')+'</section>';
    }else if(adminSection==='scoring'){
      const r=scoreRules();
      body='<section class="panel setting-panel">'+panelHeading('Scoring settings')
        +'<div class="form-row"><label for="score-best_programs">Best-ball counting programs</label><input id="score-best_programs" class="field" type="number" min="1" max="20" step="1" value="'+Number(r.best_programs||8)+'"/></div>'
        +scoringGroups.map(([title,fields])=>'<div class="section-gap"><h3 class="subhead">'+escapeHTML(title)+'</h3><div class="settings-grid">'
        +fields.map(([key,label])=>'<div class="form-row"><label for="score-'+key+'">'+escapeHTML(label)+'</label><input class="field" id="score-'+key+'" type="number" min="0" max="100" step="0.25" value="'+Number(r[key]||0)+'"/></div>').join('')+'</div></div>').join('')
        +'<p class="settings-hint">Q1A stacks with Q1. No KenPom or AP Poll points. Changing a scoring weight does not import game results.</p>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-scoring">Save scoring</button><button class="btn secondary" data-act="tab" data-id="scoring">View rules</button></div></section>';
    }else if(adminSection==='trades'){
      body='<section class="panel setting-panel">'+panelHeading('Trading')
        +'<label class="settings-toggle" for="trading-enabled"><div><strong>Allow program trades</strong><span>Managers can propose and accept trades after the initial draft.</span></div><input id="trading-enabled" type="checkbox" '+(settings.trading_enabled?'checked':'')+'/></label>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-trades">Save trading settings</button></div></section>';
    }
    return heading('', 'Commissioner')+'<div class="commissioner-layout">'+menu+'<div class="commissioner-body">'+body+'</div></div>';
  }
  async function action(button){
    const act=button.dataset.act,id=button.dataset.id;
    if(act==='tab'){current=id;render();if(current==='programs')filterPrograms();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(act==='commish-section'){adminSection=id;render();return;}
    if(act==='load-programs'){programShown+=24;filterPrograms();return;}
    if(act==='draft-history-toggle'){showAllDraft=!showAllDraft;render();return;}
    if(act==='move-draft'){
      const i=Number(button.dataset.index),j=i+Number(button.dataset.dir);
      if(i>=0&&i<draftOrderPreview.length&&j>=0&&j<draftOrderPreview.length){
        [draftOrderPreview[i],draftOrderPreview[j]]=[draftOrderPreview[j],draftOrderPreview[i]];
        render();
      }
      return;
    }
    if(act==='signup-draft'){draftOrderPreview=members().map(u=>u.id);render();return;}
    if(act==='shuffle-draft'){
      const list=draftOrderPreview.slice();
      for(let i=list.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[list[i],list[j]]=[list[j],list[i]];}
      draftOrderPreview=list;render();return;
    }
    if(act==='auth-mode'){authMode=button.dataset.mode;renderAuth();return;}
    if(act==='logout'){await api('logout',{});me=null;league=null;inviteLink='';await loadPublic();renderAuth();return;}
    if(busy)return;
    busy=true;
    try{
      if(act==='save-general'){
        await api('admin/general',{league_name:v('#league-name').trim(),max_managers:Number(v('#manager-limit')||league.settings.max_managers)});
        notice('General settings saved.');
      }else if(act==='save-scoring'){
        const scoring={};
        for(const key of Object.keys(scoreRules()))scoring[key]=Number(v('#score-'+key));
        await api('admin/scoring-settings',{scoring});
        notice('Scoring rules saved.');
      }else if(act==='save-trades'){
        await api('admin/trade-settings',{trading_enabled:!!document.querySelector('#trading-enabled')?.checked});
        notice('Trading settings saved.');
      }else if(act==='save-draft-order'){
        await api('admin/draft-order',{order:draftOrderPreview});
        notice('Draft order saved.');
      }else if(act==='save-rounds'){
        await api('admin/settings',{rounds:Number(v('#rounds')),conferences:activeConfs()});
        notice('Draft rounds saved.');
      }else if(act==='trade-propose'){
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
        await api('admin/settings',{conferences:selected,rounds:league.settings.rounds});
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
        await api('admin/settings',{conferences:selected,rounds:league.settings.rounds});
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
        startPolling();
        notice('Signed in.');
        if(me?.role==='commissioner')autoImportPrograms();
      }
    }catch(err){notice(err.message,true);}finally{busy=false;}
  });
  root.addEventListener('change',e=>{
    if(e.target?.id==='trade-target'){tradeTargetId=e.target.value;render();}
    if(e.target?.id==='program-conference'){programConference=e.target.value;programShown=24;filterPrograms();}
    if(e.target?.id==='program-ownership'){programOwnership=e.target.value;programShown=24;filterPrograms();}
    if(e.target?.matches?.('input[name="trade-give"], input[name="trade-receive"]'))updateTradeSelections();
  });
  root.addEventListener('input',e=>{
    if(e.target?.id!=='program-search')return;
    programQuery=e.target.value;
    programShown=24;
    filterPrograms();
  });
  setInterval(updateDraftClock,1000);
  boot();
})();