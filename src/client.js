(function startApp(){
  const root=document.querySelector('#app');
  const ICONS={home:'⌂',team:'♙',programs:'▦',draft:'▤',trades:'⇄',league:'▥',commissioner:'⚙',more:'⋯'};
  const iconSVG=(name)=>{
    const paths={
      home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      team:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
      programs:'<path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h1m4 0h1M9 16h1m4 0h1"/>',
      draft:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
      league:'<path d="M4 20h16M7 17v-5h3v5m2 0V5h3v12m2 0V9h3v8"/>',
      results:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4m-4 4h6m3-5h2m-2 4h2"/>',
      trades:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
      scoring:'<path d="M4 4h16v16H4zM8 10h8M8 14h5"/>',
      commissioner:'<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.5 1.5 0 0 0 .3 1.7l.1.1-1.8 1.8-.1-.1a1.5 1.5 0 0 0-1.7-.3l-.2.1a1.5 1.5 0 0 0-.9 1.4V20H9v-.3a1.5 1.5 0 0 0-.9-1.4l-.2-.1a1.5 1.5 0 0 0-1.7.3l-.1.1-1.8-1.8.1-.1A1.5 1.5 0 0 0 4.7 15l-.1-.2a1.5 1.5 0 0 0-1.4-.9H3v-3.8h.2a1.5 1.5 0 0 0 1.4-.9l.1-.2a1.5 1.5 0 0 0-.3-1.7l-.1-.1 1.8-1.8.1.1a1.5 1.5 0 0 0 1.7.3l.2-.1A1.5 1.5 0 0 0 9 4.3V4h6v.3a1.5 1.5 0 0 0 .9 1.4l.2.1a1.5 1.5 0 0 0 1.7-.3l.1-.1 1.8 1.8-.1.1a1.5 1.5 0 0 0-.3 1.7l.1.2a1.5 1.5 0 0 0 1.4.9h.2v3.8h-.2a1.5 1.5 0 0 0-1.4.9Z"/>' ,
      more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.more)+'</svg>';
  };
  const names={home:'League Overview',team:'My Team',programs:'Programs',draft:'Draft',trades:'Trades',league:'Standings',scoring:'Scoring',commissioner:'Commissioner',settings:'My Settings',more:'More',waivers:'Waivers',history:'Dynasty history',results:'Results','program-detail':'Program','manager-detail':'Manager'};
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
  let standingsData=null,standingsLoading=false,standingsFetchedAt=0,standingsError='';
  let avatarDraft=null;
  let inviteLink='', busy=false, syncActive=false, refreshId=null,toastId=null,tradeTargetId='',importError='',autoImportAttempted=false;
  let adminSection='general',draftOrderPreview=[];
  let programQuery='',programConference='all',programOwnership='all',programShown=36,programLetter='all',programSort='name',showAllDraft=false,lastAutoPoll=0;
  let programMode='directory',leaderSeason='all',schoolLeaders=null,schoolLeadersLoading=false,schoolLeadersError='',leaderQuery='';
  let ratingSeason='',ratingSort='rank',ratingQuery='',ratingCache={},ratingLoading={},ratingError={};
  let selectedProgramId='',selectedManagerId='',programBackPage='programs',managerBackPage='league',selectedHistorySeason='',selectedProgramSeason='',draftRoundView='all';
  let appError='';
  let resultsStatus=null,resultsGames=[],resultsError='',resultsLoading=false,programResultCache={},resultsSeason='',netImportError='';
  let resultsSelectedDay='',resultsConference='all',resultsScope='league',resultsAP=[],resultsAPAsOf=null,resultsAPSource='',resultsFetchedAt=0,resultsRequest=0;
  let resultsLoadedDay='';
  let resultsSearch='',resultsShown=40,resultsNetDate=null,resultsRecordNote='',resultsQuadNote='',resultsRankingSource='pending',resultsRankingDate=null;
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
  const avatar=(u)=>{
    const color=/^#[0-9A-Fa-f]{6}$/.test(u?.accent_color||'')?u.accent_color:'#D9611E';
    const photo=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u?.avatar_data||'')?u.avatar_data:'';
    return '<span class="avatar" style="background:'+escapeHTML(color)+'">'+
      (photo?'<img src="'+escapeHTML(photo)+'" alt="" loading="lazy"/>':escapeHTML(initials(u?.display_name)))+'</span>';
  };
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

  // T-Rank is informational in analytics and provisional for fantasy scoring until official NET arrives.
  const ratingYear=(label)=>Number(String(label||season()).slice(0,4))+1;
  const ratingName=(raw)=>String(raw||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' and ').replace(/\bsaint\b/g,'st').replace(/\bstate\b/g,'st')
    .replace(/\buniversity\b/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const ratingAliases={
    'uconn huskies':'connecticut','ole miss rebels':'mississippi','pitt panthers':'pittsburgh',
    'cal golden bears':'california','miami hurricanes':'miami fl','miami redhawks':'miami oh',
    'lsu tigers':'lsu','uc irvine anteaters':'uc irvine','uc santa barbara gauchos':'uc santa barbara',
    'uc davis aggies':'uc davis','uc riverside highlanders':'uc riverside',
    'unc asheville bulldogs':'unc asheville','nc st wolfpack':'nc st',
    'utep miners':'utep','utsa roadrunners':'utsa','fgcu eagles':'fgcu'
  };
  function ratingOf(program,year){
    const entries=ratingCache[year]?.teams;
    if(!program||!Array.isArray(entries))return null;
    const key=ratingName(program.name),explicit=ratingAliases[key]||'';
    if(explicit){
      const found=entries.find(x=>ratingName(x.team)===explicit);
      if(found)return found;
    }
    // ESPN uses mascot-inclusive names; Torvik uses institution names.
    // Longest unique prefix wins (Michigan State before Michigan).
    const matched=entries.filter(x=>{
      const candidate=ratingName(x.team);
      if(candidate==='florida'&&key.startsWith('florida gulf coast'))return false;
      if(candidate==='houston'&&key.startsWith('houston christian'))return false;
      if(candidate==='california'&&key.startsWith('california baptist'))return false;
      if(candidate==='north carolina'&&key.startsWith('north carolina a'))return false;
      if(candidate==='texas and m'&&key.startsWith('texas and m corpus'))return false;
      return candidate.length>2&&(key===candidate||key.startsWith(candidate+' '));
    }).sort((a,b)=>ratingName(b.team).length-ratingName(a.team).length);
    return matched[0]||null;
  }
  async function loadRatings(year,force=false){
    if(!me||!Number.isInteger(year)||year<2022||year>2027||ratingLoading[year])return;
    if(!force&&(ratingCache[year]||ratingError[year]))return;
    ratingLoading[year]=true;delete ratingError[year];
    try{const payload=await api('data/ratings?year='+year);
      if(!Array.isArray(payload.teams)||payload.teams.length<330)throw Error('Published ratings are incomplete.');
      ratingCache[year]=payload;
    }catch(e){ratingError[year]=e.message;}
    finally{delete ratingLoading[year];if(current==='programs'&&programMode==='ratings'||current==='program-detail')render();}
  }
  const ratingExternalLinks=()=>'<div class="rating-source-links">'
    +'<a href="https://barttorvik.com/" target="_blank" rel="noopener noreferrer">Bart Torvik ↗</a>'
    +'<a href="https://evanmiya.com/" target="_blank" rel="noopener noreferrer">EvanMiya ↗</a>'
    +'<a href="https://kenpom.com/" target="_blank" rel="noopener noreferrer">KenPom ↗</a></div>';
  async function refresh(silent=false){
    try{
      // Keep checked trade selections when the 12-second poll updates the page.
      const chosen=silent&&!busy&&current==='trades'
        ?[...document.querySelectorAll('.trade-choice input:checked')].map(el=>el.name+':'+el.value):[];
      // Avoid dismissing the mobile keyboard every time the league auto-refreshes.
      const editing=silent&&!busy&&document.activeElement&&
        /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      const next=await api('state');
      const oldScoringState=league?JSON.stringify([league.season,league.settings?.scoring,league.ownership]):'';
      const newScoringState=JSON.stringify([next.season,next.settings?.scoring,next.ownership]);
      if(oldScoringState!==newScoringState)standingsFetchedAt=0;
      me=next.user;league=next;appError='';
      if(!silent)current='home';
      if(!editing){render();if(current==='programs')filterPrograms();if(current==='program-detail')loadProgramResults(selectedProgramId);if(current==='results'&&Date.now()-resultsFetchedAt>55000&&!resultsLoading)loadResults();}
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
      if(!me||busy||syncActive||current==='commissioner'||current==='settings'||document.hidden)return;
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
    root.innerHTML='<div class="auth-layout"><main class="auth-panel"><div class="auth-card"><div class="auth-logo"><span class="brand-icon brand-image"><img src="/brand-logo.png?v=3" alt="Boek Dynasty logo" width="43" height="43"></span><div><div class="brand-title">'+escapeHTML(status.league_name||'Boek Dynasty')+'</div><div class="auth-season">COLLEGE BASKETBALL · 2026–27</div></div></div><div class="auth-section"><h1>'+header+'</h1>'+(desc?'<p class="auth-desc">'+desc+'</p>':'')+(!status.needs_setup?'<div class="auth-top"><button data-act="auth-mode" data-mode="login" class="'+(mode==='login'?'active':'')+'">Sign in</button><button data-act="auth-mode" data-mode="join" class="'+(mode==='join'?'active':'')+'">Join with invite</button></div>':'')+form+(appError?'<p class="auth-error">'+escapeHTML(appError)+'</p>':'')+'</div></div></main></div>';
  }
  function input(label,name,type,placeholder,value=''){
    return '<div class="form-row"><label for="'+name+'">'+label+'</label><input class="field" id="'+name+'" name="'+name+'" type="'+type+'" placeholder="'+escapeHTML(placeholder)+'" value="'+escapeHTML(value)+'" required autocomplete="'+(name==='password'?'current-password':'on')+'"/></div>';
  }
  const liveResultsCount=()=>resultsGames.filter(g=>g.status==='live').length;
  const draftIsLive=()=>league?.settings?.draft_status==='live';
  function navButton(id){
    const live=id==='draft'&&draftIsLive()||id==='results'&&liveResultsCount()>0;
    const active=current===id||current==='program-detail'&&id==='programs'||current==='manager-detail'&&id==='league';
    return '<button type="button" data-act="tab" data-id="'+id+'" class="'+(active?'active':'')+(live?' has-live':'')+'" '+(active?'aria-current="page"':'')+'>'+iconSVG(id)+'<span>'+names[id]+'</span>'+(live?'<i class="nav-live-indicator" aria-hidden="true"></i>':'')+'</button>';
  }
  function sidebar(){
    return '<aside class="sidebar"><div class="brand"><div class="brand-icon brand-image"><img src="/brand-logo.png?v=3" alt="Boek Dynasty logo" width="43" height="43"></div><div><div class="brand-title">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+'</div></div></div><div><div class="nav-label">LEAGUE HUB</div><nav class="nav">'+['home','team','results','league','programs','draft'].map(navButton).join('')+'</nav><div class="nav-label nav-label-secondary">MANAGEMENT</div><nav class="nav">'+['trades','scoring','settings',...(me.role==='commissioner'?['commissioner']:[])].map(navButton).join('')+'</nav></div><div class="side-foot"><span class="season-pill">'+escapeHTML(season())+' SEASON</span><div class="account-mini">'+avatar(me)+'<div><strong>'+escapeHTML(me.display_name)+'</strong><div class="muted tiny">'+(me.role==='commissioner'?'Commissioner':'League manager')+'</div></div></div><button data-act="tab" data-id="settings" class="logout">Edit account and profile</button><button data-act="logout" class="logout">Sign out →</button></div></aside>';
  }
  function render(){
    if(!me||!league)return renderAuth();
    if((current==='league'||current==='team')&&!standingsLoading&&Date.now()-standingsFetchedAt>=60000)loadStandings();
    if(current==='programs'&&programMode==='ratings')loadRatings(ratingYear(ratingSeason||season()));
    if(current==='program-detail')loadRatings(ratingYear(selectedProgramSeason||season()));
    const isAdmin=me.role==='commissioner';
    if(current==='commissioner'&&!isAdmin)current='home';
    const tabs=['home','team','results','programs','draft','more'];
    const mobileLabels={home:'League',team:'My Team',results:'Results',programs:'Schools',draft:'Draft',more:'More'};
    const activeMobile=(['trades','commissioner','waivers','history','scoring','settings'].includes(current))?'more':current==='program-detail'?'programs':current==='manager-detail'?'league':current;
    const liveGames=liveResultsCount(),liveDraft=draftIsLive();
    const eventLink=liveDraft?'<button type="button" class="topbar-event is-live" data-act="tab" data-id="draft"><span class="topbar-event-dot" aria-hidden="true"></span><span>Draft live</span></button>':
      liveGames?'<button type="button" class="topbar-event is-live" data-act="tab" data-id="results"><span class="topbar-event-dot" aria-hidden="true"></span><span>'+liveGames+' live game'+(liveGames===1?'':'s')+'</span></button>':'';
    root.innerHTML='<div class="shell">'+sidebar()+'<main class="main"><header class="topbar"><div class="topbar-heading"><img class="topbar-logo" src="/brand-logo.png?v=3" alt="" width="30" height="30"><span class="title">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+' <span class="sep">/</span> '+(names[current]||'Profile')+'</span></div><div class="top-right">'+eventLink+'<span class="chip">'+escapeHTML(season())+'</span><button class="header-account-avatar" type="button" title="Edit my profile" data-act="tab" data-id="settings">'+avatar(me)+'</button></div></header><section class="content">'+({home:overview,programs:programsPage,draft:draftPage,trades:tradesPage,league:leaguePage,team:myTeamPage,scoring:scoringPage,commissioner:commissionerPage,settings:settingsPage,more:morePage,'program-detail':programProfilePage,'manager-detail':managerProfilePage,waivers:waiversPage,history:historyPage,results:resultsPage}[current]||overview)()+'</section></main></div><nav class="bottom" aria-label="Mobile navigation">'+tabs.map(id=>'<button type="button" class="'+(activeMobile===id?'active':'')+((id==='draft'&&liveDraft||id==='results'&&liveGames)?' has-live':'')+'" data-act="tab" data-id="'+id+'" '+(activeMobile===id?'aria-current="page"':'')+' aria-label="'+names[id]+(id==='results'&&liveGames?', '+liveGames+' live games':'')+'">'+iconSVG(id)+'<span>'+mobileLabels[id]+'</span>'+((id==='draft'&&liveDraft||id==='results'&&liveGames)?'<i class="nav-live-indicator" aria-hidden="true"></i>':'')+'</button>').join('')+'</nav>';
  }

  const resultsToday=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'});
  const shiftResultsDay=(day,offset)=>{
    const d=new Date(day+'T12:00:00Z');
    if(Number.isNaN(d.getTime()))return resultsToday();
    d.setUTCDate(d.getUTCDate()+offset);
    return d.toISOString().slice(0,10);
  };
  const formatResultsDay=(day,parts={weekday:'short',month:'short',day:'numeric'})=>
    new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',...parts});
  async function loadResults(){
    if(!me)return;
    const request=++resultsRequest;
    const day=resultsSelectedDay||resultsToday();
    resultsSelectedDay=day;resultsLoading=true;resultsError='';
    if(current==='results')render();
    try{
      const outcomes=await Promise.allSettled([
        api('data/status'),
        api('data/games?date='+encodeURIComponent(day)),
        api('data/rankings')
      ]);
      if(request!==resultsRequest)return;
      if(outcomes[0].status==='fulfilled')resultsStatus=outcomes[0].value;
      if(outcomes[1].status==='fulfilled'){
        resultsGames=outcomes[1].value.games||[];
        resultsLoadedDay=day;
        resultsNetDate=outcomes[1].value.net_date||null;
        resultsRankingSource=outcomes[1].value.ranking_source||'pending';
        resultsRankingDate=outcomes[1].value.ranking_date||null;
        resultsRecordNote=outcomes[1].value.record_note||'Records through the selected date.';
        resultsQuadNote=outcomes[1].value.quadrant_note||'NET quadrants update with verified rankings.';
        resultsSeason=season();resultsFetchedAt=Date.now();
      }else{
        resultsGames=[];
        throw outcomes[1].reason;
      }
      if(outcomes[2].status==='fulfilled'){
        const ap=outcomes[2].value;
        resultsAP=ap.teams||[];resultsAPAsOf=ap.as_of||null;resultsAPSource=ap.source||'Associated Press';
      }else{resultsAP=[];resultsAPAsOf=null;resultsAPSource='';}
    }catch(e){if(request===resultsRequest)resultsError=e.message;}
    finally{if(request===resultsRequest){resultsLoading=false;if(current==='results'||(current==='commissioner'&&adminSection==='data'))render();}}
  }
  async function loadProgramResults(id){
    if(!me||(programResultCache[id]?.season===season()&&Date.now()-(programResultCache[id]?.loadedAt||0)<60000))return;
    try{
      const [data,historical]=await Promise.allSettled([
        api('data/program?id='+encodeURIComponent(id)),
        api('data/history?id='+encodeURIComponent(id))
      ]);
      if(data.status!=='fulfilled')throw data.reason;
      programResultCache[id]={...data.value,
        history:historical.status==='fulfilled'?historical.value:null,
        history_error:historical.status==='rejected'?historical.reason.message:'',
        loadedAt:Date.now()};
    }catch(e){programResultCache[id]={season:season(),error:e.message,loadedAt:Date.now()};}
    if(current==='program-detail'&&selectedProgramId===id)render();
  }
  const gameOutcome=(g,id)=>{
    if(g.status!=='final')return g.status==='live'?'LIVE':g.status==='scheduled'?'Scheduled':g.status;
    if(g.home_score===null||g.away_score===null)return 'Final';
    if(id){const own=g.home_id===id?g.home_score:g.away_score,opp=g.home_id===id?g.away_score:g.home_score;return own>opp?'W':own<opp?'L':'T';}
    return 'Final';
  };
  const resultGameRow=(g,id='')=>{
    const home=g.home_name||programs().find(p=>p.id===g.home_id)?.name||'Home';
    const away=g.away_name||programs().find(p=>p.id===g.away_id)?.name||'Away';
    const score=(g.status==='final'||g.status==='live')&&g.home_score!==null&&g.away_score!==null?escapeHTML(g.away_score)+'–'+escapeHTML(g.home_score):'vs';
    return '<div class="result-game-row"><div class="grow"><span class="game-day">'+escapeHTML(g.game_date)+'</span><strong>'+escapeHTML(away)+' <span class="game-score">'+score+'</span> '+escapeHTML(home)+'</strong></div><span class="result-game-status '+(g.status==='live'?'live':'')+'">'+escapeHTML(gameOutcome(g,id))+'</span></div>';
  };
  const scoreboardLogo=(id)=>{
    const school=programs().find(p=>String(p.id)===String(id));
    if(school)return img(school);
    return /^\d+$/.test(String(id||''))?'<img class="program-logo" src="https://a.espncdn.com/i/teamlogos/ncaa/500/'+id+'.png" loading="lazy" alt=""/>':'<span class="program-logo program-initial">NCAA</span>';
  };
  const scoreboardRank=(id,map)=>map.has(String(id))?'<span class="scoreboard-rank">'+map.get(String(id))+'</span>':'';
  const dailyNetLabel=(rank)=>rank===null||rank===undefined?(resultsRankingSource==='torvik'?'T-Rank pending':'NET pending'):(resultsRankingSource==='torvik'?'T-Rank #':'NET #')+Number(rank);
  const dailyRecord=(record)=>record?Number(record.wins||0)+'–'+Number(record.losses||0):'0–0';
  const dailyQuad=(quad,q1a)=>{
    if(!Number.isInteger(quad)||quad<1||quad>4)
      return '<span class="daily-quad pending" title="No complete current-season ranking source">Q pending</span>';
    return '<span class="daily-quad q'+quad+(resultsRankingSource==='torvik'?' preliminary':'')+'" title="'+(resultsRankingSource==='torvik'?'Provisional T-Rank ':'Official NET ')+'Quadrant '+quad+(q1a?', including the additional Q1A bonus':'')+'">'+
      'Q'+quad+(q1a?'<small>A</small>':'')+'</span>';
  };
  const dailyGameCard=(g,pollRanks)=>{
    const finished=g.status==='final',live=g.status==='live';
    const hasScore=finished||live;
    const t=g.start_utc?new Date(g.start_utc).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}):'TBD';
    const status=live?'LIVE':finished?'FINAL':g.status==='scheduled'?t:
      g.status==='cancelled'?'CANCELLED':g.status==='postponed'?'POSTPONED':'TBD';
    const linked=new Set(programs().map(p=>String(p.id)));
    const line=(id,name,record,net,quad,q1a,score,isWinner,isHome)=>{
      const ap=pollRanks.get(String(id));
      const body=scoreboardLogo(id)
        +'<span class="daily-team-identity">'+(ap?'<span class="daily-ap">#'+ap+'</span>':'')
        +'<strong>'+escapeHTML(name||'Unknown school')+'</strong>'
        +'<small class="daily-team-record">'+dailyRecord(record)+' <span>W–L</span></small></span>'
        +'<span class="daily-team-net">'+escapeHTML(dailyNetLabel(net))+'</span>'
        +dailyQuad(quad,q1a)
        +'<span class="daily-score">'+(hasScore&&score!==null?escapeHTML(String(score)):'—')+'</span>';
      const cls='daily-team-line'+(isWinner?' is-winner':'')+(isHome?' home':' away');
      return linked.has(String(id))
        ?'<button type="button" class="'+cls+'" data-act="open-program" data-id="'+escapeHTML(id)+'" title="Open '+escapeHTML(name)+' school history">'+body+'</button>'
        :'<div class="'+cls+'">'+body+'</div>';
    };
    const winner=finished&&g.home_score!==null&&g.away_score!==null;
    const rostered=owners().filter(o=>String(o.program_id)===String(g.home_id)||String(o.program_id)===String(g.away_id));
    const mine=rostered.some(o=>o.manager_id===me?.id);
    const selectedLeague=rostered.length>0;
    const isNeutral=Number(g.neutral_site)===1;
    const at= isNeutral?'Neutral site':'At '+escapeHTML(g.home_name||'home school');
    const special=g.tournament_tag==='ncaa'?'NCAA TOURNAMENT':g.tournament_tag==='conference'?'CONFERENCE TOURNAMENT':'';
    const link=/^\d+$/.test(String(g.game_id||''))?'https://www.espn.com/mens-college-basketball/game/_/gameId/'+g.game_id:null;
    return '<article class="daily-game-card '+(live?'is-live':'')+(mine?' is-my-game':'')+'" data-search="'+
      escapeHTML((String(g.home_name||'')+' '+String(g.away_name||'')+' '+String(g.home_id)+' '+String(g.away_id)).toLowerCase())+'">'
      +'<div class="daily-card-status"><strong class="'+(live?'live':'')+'">'+(live?'<i class="daily-live-dot"></i>':'')+escapeHTML(status)+'</strong>'
      +(special?'<span class="daily-card-tourney">'+special+'</span>':'')
      +(mine?'<span class="daily-card-mine">MY TEAM</span>':selectedLeague?'<span class="daily-card-league">ROSTERED</span>':'')
      +'</div><div class="daily-card-body">'
      +line(g.away_id,g.away_name,g.away_record,g.away_net,g.away_quad,g.away_q1a,g.away_score,winner&&Number(g.away_score)>Number(g.home_score),false)
      +line(g.home_id,g.home_name,g.home_record,g.home_net,g.home_quad,g.home_q1a,g.home_score,winner&&Number(g.home_score)>Number(g.away_score),true)
      +'</div><div class="daily-card-footer"><span>'+at+'</span>'
      +(link?'<a href="'+link+'" target="_blank" rel="noopener noreferrer" aria-label="View ESPN box score for '+escapeHTML(g.away_name+' at '+g.home_name)+'">Game details ↗</a>':'')
      +'</div></article>';
  };
  function resultsPage(){
    const day=resultsSelectedDay||resultsToday();
    const pollRanks=new Map(resultsAP.map(x=>[String(x.program_id),Number(x.rank)]));
    const enrolled=new Set(activeConfs().map(String));
    const owned=new Set(owners().filter(o=>o.manager_id===me?.id).map(o=>String(o.program_id)));
    const all=resultsLoadedDay===day&&resultsSeason===season()?resultsGames:[];
    const scopeButton=(id,label)=>'<button type="button" class="'+(resultsScope===id?'active':'')+
      '" data-act="results-scope" data-scope="'+id+'" aria-pressed="'+(resultsScope===id)+'">'+label+'</button>';
    const conferenceButton=(id,label)=>'<button type="button" class="'+(resultsConference===id?'active':'')+
      '" data-act="results-conference" data-id="'+escapeHTML(id)+'" aria-pressed="'+(resultsConference===id)+'">'+escapeHTML(label)+'</button>';
    const days=Array.from({length:7},(_,i)=>{
      const value=shiftResultsDay(day,i-3);
      return '<button type="button" class="daily-day '+(value===day?'active':'')+
        '" data-act="results-date" data-date="'+value+'" aria-pressed="'+(value===day)+'">'+
        '<span>'+formatResultsDay(value,{weekday:'short'})+'</span><strong>'+
        formatResultsDay(value,{month:'short',day:'numeric'})+'</strong></button>';
    }).join('');
    let list=all.filter(g=>{
      const homeConf=String(g.home_conference_id||''),awayConf=String(g.away_conference_id||'');
      if(resultsScope==='league'&&!enrolled.has(homeConf)&&!enrolled.has(awayConf))return false;
      if(resultsScope==='mine'&&!owned.has(String(g.home_id))&&!owned.has(String(g.away_id)))return false;
      if(resultsScope==='top25'&&!pollRanks.has(String(g.home_id))&&!pollRanks.has(String(g.away_id)))return false;
      if(resultsConference!=='all'&&homeConf!==resultsConference&&awayConf!==resultsConference)return false;
      if(resultsSearch){
        const q=resultsSearch.trim().toLowerCase();
        if(q&&!((g.home_name||'')+' '+(g.away_name||'')).toLowerCase().includes(q))return false;
      }
      return true;
    });
    const priority={live:0,scheduled:1,final:2,postponed:3,cancelled:4};
    list.sort((a,b)=>(priority[a.status]??5)-(priority[b.status]??5)||
      (a.start_utc||'').localeCompare(b.start_utc||''));
    const visible=list.slice(0,resultsShown);
    const totalFinal=list.filter(g=>g.status==='final').length;
    const totalLive=list.filter(g=>g.status==='live').length;
    const conferenceOptions=[...enrolled].sort((a,b)=>conf(a).localeCompare(conf(b)));
    const pollAvailable=resultsAP.length===25;
    const note=resultsQuadNote||'Rankings update as sources become available.';
    return heading('COLLEGE BASKETBALL','Daily Results','Every team’s record, game quadrant and score, all in one easy-to-scan view.')
      +'<section class="daily-results">'
      +'<div class="daily-toolbar"><div class="daily-toolbar-left"><span class="daily-status-dot '+(totalLive?'active':'')+'"></span><strong>'+
        list.length+'</strong> games <span class="daily-tool-separator">·</span> '+totalFinal+' final'+(totalLive?' <span class="daily-live-count">· '+totalLive+' live</span>':'')+
        '</div><button class="daily-refresh" type="button" data-act="refresh-results" aria-label="Refresh games">↻ <span>Refresh</span></button></div>'
      +'<div class="daily-calendar"><button class="daily-date-arrow" type="button" data-act="results-shift" data-dir="-1" aria-label="Previous day">‹</button>'
      +'<div class="daily-day-list">'+days+'</div><button class="daily-date-arrow" type="button" data-act="results-shift" data-dir="1" aria-label="Next day">›</button></div>'
      +'<div class="daily-control-bar"><div class="daily-filter-tabs" role="group" aria-label="Games to display">'+
        scopeButton('league','League schools')+scopeButton('mine','My roster')+scopeButton('all','All D-I')+scopeButton('top25','AP Top 25')+
        '</div><div class="daily-tools"><label class="daily-search"><span aria-hidden="true">⌕</span><input id="daily-team-search" type="search" autocomplete="off" placeholder="Find a school" aria-label="Search daily games by school" value="'+escapeHTML(resultsSearch)+'"/></label>'
      +'<input type="date" id="scoreboard-date" class="field daily-picker" aria-label="Jump to a date" value="'+escapeHTML(day)+'" />'
      +'<button type="button" class="daily-today" data-act="results-today">Today</button></div></div>'
      +'<div class="daily-conference-tabs" role="group" aria-label="Filter by conference">'+
        conferenceButton('all','All conferences')+conferenceOptions.map(id=>conferenceButton(id,conf(id))).join('')+'</div>'
      +'<div class="daily-day-header"><div><span>DAILY SCOREBOARD</span><h2>'+
        formatResultsDay(day,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+'</h2></div><small>'+
        (resultsLoading?'Updating…':visible.length+' of '+list.length+' games')+'</small></div>'
      +(resultsError?'<div class="notice">'+escapeHTML(resultsError)+'</div>':'')
      +(resultsScope==='top25'&&!pollAvailable
        ?'<div class="daily-empty"><strong>AP rankings are not available yet.</strong><p>Choose League schools or All D-I to see games while the current poll is being imported.</p></div>'
        :list.length?'<div class="daily-game-list">'+visible.map(g=>dailyGameCard(g,pollRanks)).join('')+'</div>'
        :'<div class="daily-empty"><strong>'+(resultsLoading?'Loading games…':'No games match these filters')+'</strong><p>'+
          (resultsScope==='mine'?'Draft a school to see its matchups here.':'Try another date, conference or school search.')+'</p>'+
          (me.role==='commissioner'?'<button class="btn small secondary" data-act="results-import-day">Import this day</button>':'')+'</div>')
      +(list.length>resultsShown?'<div class="daily-more"><button type="button" class="btn secondary" data-act="results-more">Show more games ('+(list.length-resultsShown)+' remaining)</button></div>':'')
      +'<div class="daily-footer-info"><span><strong>W–L</strong> Updated through the selected date</span><span><strong>Q</strong> '+(resultsRankingSource==='torvik'?'Preliminary T-Rank':'NCAA NET')+' quadrant from each school’s perspective</span><span>'+escapeHTML(note)+'</span></div>'
      +'</section>';
  }

  const teamAccentChoices=[
    ['#D9611E','Orange'],['#164E8F','Blue'],['#1F8A70','Emerald'],
    ['#7C3AED','Violet'],['#D9468F','Pink'],['#B45309','Amber'],
    ['#0F766E','Teal'],['#334155','Slate']
  ];
  function settingsPage(){
    const accent=me.accent_color||'#D9611E';
    const selectedAvatar=avatarDraft===null?me.avatar_data:avatarDraft;
    const favorite=String(me.favorite_program_id||'');
    const eligible=programs().filter(p=>activeConfs().includes(String(p.conference_id)))
      .sort((a,b)=>a.name.localeCompare(b.name));
    const colors=teamAccentChoices.map(([hex,label])=>
      '<label class="settings-color-option" title="'+label+'"><input type="radio" name="accent_color" value="'+hex+'" '+(accent.toUpperCase()===hex?'checked':'')+'/><span class="settings-color-dot" style="background:'+hex+'"></span><small>'+label+'</small></label>'
    ).join('');
    return heading('PERSONAL PROFILE','My Settings','Manage how your dynasty identity looks to the rest of the league.')
      +'<div class="settings-layout">'
      +'<section class="panel settings-card settings-primary">'+panelHeading('Team identity','Your name and picture are visible to the league')
      +'<div class="settings-persona"><div class="settings-avatar-preview">'+avatar({...me,avatar_data:selectedAvatar})+'</div><div><strong>'+escapeHTML(me.display_name)+'</strong><small>@'+escapeHTML(me.username)+'</small><span id="photo-hint">JPEG, PNG or WebP. Images are resized and stored securely.</span></div></div>'
      +'<div class="settings-photo-actions"><label for="settings-photo-input" class="btn secondary small">Choose profile photo</label><input id="settings-photo-input" class="settings-photo-input" type="file" accept="image/jpeg,image/png,image/webp"/><button type="button" class="btn small ghost" data-act="settings-remove-photo">Remove photo</button></div>'
      +'<form data-form="account-profile" class="settings-form">'
      +'<div class="settings-form-grid"><label class="settings-field"><span>Team name</span><input class="field" name="display_name" required minlength="2" maxlength="40" autocomplete="organization" value="'+escapeHTML(me.display_name)+'"/></label>'
      +'<label class="settings-field"><span>Username</span><div class="settings-username-wrap"><span>@</span><input class="field" name="username" required pattern="[a-zA-Z0-9_]{3,24}" maxlength="24" minlength="3" autocomplete="username" autocapitalize="off" value="'+escapeHTML(me.username)+'"/></div></label></div>'
      +'<div class="settings-field"><span>Profile accent color</span><div class="settings-colors" role="group" aria-label="Profile color">'+colors+'</div></div>'
      +'<label class="settings-field"><span>Favorite league program</span><select class="field settings-select" name="favorite_program_id"><option value="">No favorite selected</option>'
      +eligible.map(p=>'<option value="'+escapeHTML(p.id)+'" '+(favorite===String(p.id)?'selected':'')+'>'+escapeHTML(p.name)+'</option>').join('')
      +'</select><small>Shows on your manager profile. Choose from the league’s eligible schools.</small></label>'
      +'<div class="settings-actions"><button class="btn" type="submit">Save profile changes</button><span>Visible to other league managers immediately.</span></div>'
      +'</form></section>'
      +'<section class="panel settings-card">'+panelHeading('Security','Keep your account protected')
      +'<form class="settings-form" data-form="account-password" autocomplete="off">'
      +'<label class="settings-field"><span>Current password</span><input class="field" type="password" name="current_password" autocomplete="current-password" required minlength="8"/></label>'
      +'<label class="settings-field"><span>New password</span><input class="field" type="password" name="new_password" autocomplete="new-password" required minlength="8" maxlength="128"/></label>'
      +'<label class="settings-field"><span>Confirm new password</span><input class="field" type="password" name="confirm_password" autocomplete="new-password" required minlength="8" maxlength="128"/></label>'
      +'<div class="settings-actions"><button class="btn secondary" type="submit">Update password</button></div>'
      +'<p class="settings-security-note">Changing your password signs out other sessions. Your current session stays active.</p></form>'
      +'<div class="settings-account-footer"><span>League role</span><strong>'+(me.role==='commissioner'?'Commissioner':'Manager')+'</strong></div>'
      +'<button class="btn ghost settings-sign-out" data-act="logout">Sign out of Boek Dynasty</button></section>'
      +'</div>';
  }
  function morePage(){
    const links=[['settings','My Settings','Change team name, username, photo, colors and password'],['league','Standings','Season fantasy scores and manager rankings'],['results','Results','Scores, schedules and data status'],['scoring','Scoring','Point values and best-ball rules'],['trades','Trades','Propose trades and view league activity'],['waivers','Waivers','Claim or release unrostered schools'],['history','Dynasty history','Archived seasons and champions']];
    if(me.role==='commissioner')links.push(['commissioner','Commissioner','League settings and manager controls']);
    return heading('', 'More')
      +'<section class="panel more-menu">'+links.map(([id,title,description])=>
        '<button type="button" class="more-menu-item" data-act="tab" data-id="'+id+'"><span class="more-menu-icon">'+iconSVG(id)+'</span><span class="grow"><strong>'+title+'</strong><small>'+description+'</small></span><span class="more-chevron">›</span></button>'
      ).join('')+'</section>'
      +'<section class="panel more-account section-gap"><div>'+avatar(me)+'<div class="grow"><strong>'+escapeHTML(me.display_name)+'</strong><small>'+escapeHTML(me.username)+'</small></div></div><button class="btn secondary" data-act="logout">Sign out</button></section>';
  }

  function overview(){
    const users=members(),status=league.settings.draft_status;
    const programName=id=>programs().find(p=>p.id===id)?.name||'Program';
    const managerName=id=>users.find(u=>u.id===id)?.display_name||'Manager';
    const events=[
      ...(league.trades||[]).filter(t=>t.status==='accepted').map(t=>({
        when:Number(t.resolved_at||t.offered_at||0),type:'Completed trade',
        detail:managerName(t.from_manager_id)+' and '+managerName(t.to_manager_id)+' exchanged programs'
      })),
      ...(league.roster_transactions||[]).map(t=>({
        when:Number(t.created_at||0),type:t.action==='claim'?'Waiver claim':'Program release',
        detail:managerName(t.manager_id)+' · '+programName(t.program_id)
      })),
      ...picks().map(p=>({
        when:Number(p.picked_at||0),type:'Pick '+p.overall,
        detail:managerName(p.manager_id)+' selected '+programName(p.program_id)
      }))
    ].sort((a,b)=>b.when-a.when).slice(0,6);
    const teamCards=users.map(u=>{
      const owned=owners().filter(o=>o.manager_id===u.id)
        .map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean);
      return '<button class="league-team-tile'+(u.id===me.id?' is-mine':'')+'" type="button" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'
        +'<span class="league-tile-top">'+avatar(u)+'<span class="grow"><strong>'+escapeHTML(u.display_name)+(u.id===me.id?'<em class="team-self-pill">YOU</em>':'')+'</strong><small>'+(owned.length?owned.length+' rostered program'+(owned.length===1?'':'s'):u.id===me.id?'Your team':u.role==='commissioner'?'Commissioner':'League manager')+'</small></span><span class="league-tile-arrow">›</span></span>'
        +(owned.length?'<span class="league-logo-strip">'+owned.map(p=>'<span class="league-logo-holder" title="'+escapeHTML(p.name)+'">'+img(p)+'</span>').join('')+'</span>'
          :'<span class="league-tile-pending">No programs drafted yet</span>')
        +'</button>';
    }).join('');
    return heading('THE LEAGUE','League Overview')
      +'<div class="overview-status overview-status-hub"><span class="overview-status-dot '+(status==='live'?'live':'')+'"></span><span class="overview-status-copy"><span class="overview-hub-kicker">'+escapeHTML(season())+' SEASON · LEAGUE STATUS</span><strong>'+(status==='live'?'Draft in progress':status==='finished'?'Inaugural draft complete':status==='paused'?'Draft paused':'Draft preparations')+'</strong><small>'+(status==='live'&&nextManager()?'On the clock: '+escapeHTML(nextManager().display_name):'Permanent program ownership')+'</small></span><div class="overview-hub-actions"><button class="btn small secondary" data-act="tab" data-id="draft">Draft room '+iconSVG('draft')+'</button><button class="btn small ghost" data-act="tab" data-id="results">Results '+iconSVG('results')+'</button></div></div>'
      +(syncActive?'<div class="standings-notice">Importing selected conferences...</div>':'')
      +'<div class="overview-community-intro"><div><span class="eyebrow">YOUR LEAGUE</span><h2>'+users.length+' of '+Number(league.settings.max_managers)+' managers</h2><p>See every roster and follow the inaugural season as it unfolds.</p></div><button class="btn small secondary" data-act="tab" data-id="league">View standings</button></div>'
      +'<section class="panel overview-teams-panel">'+panelHeading('League teams','Every manager, every owned school','<button class="btn small ghost" data-act="tab" data-id="league">Standings</button>')+'<div class="league-teams-grid">'+(teamCards||empty('Awaiting managers'))+'</div></section>'
      +'<section class="panel section-gap overview-activity-panel">'+panelHeading('League activity','Recent moves and selections')
      +(events.length?'<div class="overview-activity-list">'+events.map(e=>'<div class="overview-activity-item '+(e.type.startsWith('Pick ')?'activity-pick':e.type==='Completed trade'?'activity-trade':'activity-waiver')+'"><span class="overview-activity-marker"></span><span><strong>'+escapeHTML(e.type)+'</strong><small>'+escapeHTML(e.detail)+'</small></span>'+(e.when>0?'<time class="overview-activity-date">'+escapeHTML(new Date(e.when*1000).toLocaleDateString('en-US',{month:'short',day:'numeric'}))+'</time>':'')+'</div>').join('')+'</div>':empty('Nothing to report yet','Draft selections and completed trades will appear here.'))+'</section>';
  }
  function myTeamPage(){
    const owned=myPrograms().sort((a,b)=>a.name.localeCompare(b.name));
    const draftFinished=league.settings.draft_status==='finished';
    const canTrade=draftFinished&&league.settings.trading_enabled;
    const canWaive=draftFinished&&league.settings.waivers_enabled;
    const bestCount=Number(league.settings.scoring?.best_programs||8);
    const titles=(league.archives||[]).filter(a=>a.champion_manager_id===me.id).length;
    const allOffers=(league.trades||[]).filter(t=>t.from_manager_id===me.id||t.to_manager_id===me.id);
    const offers=allOffers.sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||Number(b.offered_at||0)-Number(a.offered_at||0));
    const claims=(league.waiver_claims||[]).filter(c=>c.manager_id===me.id)
      .sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||Number(b.created_at||0)-Number(a.created_at||0));
    const transactions=(league.roster_transactions||[]).filter(t=>t.manager_id===me.id).slice(0,5);
    const getName=id=>programs().find(p=>p.id===id)?.name||'Program';
    const offerCards=offers.slice(0,8).map(t=>{
      const otherId=t.from_manager_id===me.id?t.to_manager_id:t.from_manager_id;
      const other=members().find(m=>m.id===otherId);
      const incoming=t.to_manager_id===me.id;
      const items=(league.trade_items||[]).filter(x=>x.trade_id===t.id);
      const give=items.filter(x=>x.from_manager_id===me.id).map(x=>getName(x.program_id));
      const receive=items.filter(x=>x.to_manager_id===me.id).map(x=>getName(x.program_id));
      const actions=t.status==='pending'
        ?(incoming&&canTrade?'<button class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept</button><button class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button>':
          !incoming?'<button class="btn small secondary" data-act="trade-cancel" data-id="'+escapeHTML(t.id)+'">Cancel offer</button>':'')
        :'';
      return '<div class="team-offer"><div class="team-offer-head"><strong>'+escapeHTML(incoming?'Incoming from ':'Sent to ')+escapeHTML(other?.display_name||'Manager')+'</strong><span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div>'
        +'<div class="team-offer-detail"><span>You send</span><strong>'+escapeHTML(give.join(', ')||'No programs')+'</strong></div>'
        +'<div class="team-offer-detail"><span>You receive</span><strong>'+escapeHTML(receive.join(', ')||'No programs')+'</strong></div>'
        +(actions?'<div class="team-offer-actions">'+actions+'</div>':'')+'</div>';
    }).join('');
    const roster=owned.map(p=>'<div class="team-program"><button class="team-program-link" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'
      +img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span><span class="team-program-arrow">›</span></button>'
      +(canWaive?'<button class="team-drop" type="button" data-act="team-drop" data-id="'+escapeHTML(p.id)+'" title="Release '+escapeHTML(p.name)+'">Release</button>':'')+'</div>').join('');
    const waiverRows=claims.slice(0,5).map(c=>'<div class="team-claim"><div class="grow"><strong>'+escapeHTML(getName(c.program_id))+'</strong><small>'+escapeHTML(c.status.toUpperCase())+(c.drop_program_id?' · Dropping '+escapeHTML(getName(c.drop_program_id)):'')+'</small></div>'
      +(c.status==='pending'?'<button class="btn small secondary" data-act="waiver-cancel" data-id="'+escapeHTML(c.id)+'">Cancel</button>':'')+'</div>').join('');
    const transactionRows=transactions.slice(0,4).map(t=>'<div class="team-claim"><div class="grow"><strong>'+escapeHTML(getName(t.program_id))+'</strong><small>'+escapeHTML(t.action==='claim'?'Acquired':'Released')+' · '+escapeHTML(t.season)+'</small></div></div>').join('');
    return heading('YOUR FRANCHISE', 'My Team',owned.length?'Your permanent collection of college basketball programs.':'Your dynasty starts with the inaugural program draft.')
      +'<div class="team-hero panel team-hero-fresh">'+avatar(me)+'<div class="grow"><span class="eyebrow">DYNASTY MANAGER</span><h2>'+escapeHTML(me.display_name)+'</h2><p>@'+escapeHTML(me.username)+' · '+escapeHTML(season())+' season</p></div>'
      +'<div class="team-hero-schools">'+(owned.length?owned.slice(0,9).map(p=>'<span title="'+escapeHTML(p.name)+'">'+img(p)+'</span>').join(''):'<span class="team-draft-prompt">Waiting for your first selection</span>')+'</div></div>'
      +'<div class="team-stats team-stats-refined"><div class="team-stat"><span>ROSTER</span><strong>'+owned.length+' <small>/ '+Number(league.settings.rounds)+'</small></strong><div class="team-roster-progress"><i style="width:'+Math.min(100,100*owned.length/Math.max(1,Number(league.settings.rounds)))+'%"></i></div></div>'
      +'<div class="team-stat"><span>COUNTING PROGRAMS</span><strong>Best '+bestCount+'</strong><small>Season-long best ball</small></div>'
      +'<div class="team-stat"><span>LEAGUE TITLES</span><strong>'+titles+'</strong><small>Dynasty championships</small></div></div>'
      +'<div class="team-actions"><button class="btn" data-act="tab" data-id="settings">Edit team profile</button><button class="btn" data-act="tab" data-id="trades">Propose trade</button><button class="btn secondary" data-act="tab" data-id="waivers">Waivers</button><button class="btn secondary" data-act="tab" data-id="programs">Browse programs</button></div>'
      +'<div class="team-layout"><section class="panel team-roster-panel">'+panelHeading('Your programs',owned.length+' permanently owned schools','<button class="btn small ghost" data-act="tab" data-id="programs">Browse schools</button>')
      +(owned.length?'<div class="team-program-grid">'+roster+'</div>':empty('Your roster is ready to build','Once the draft begins, your selected schools will appear here with their logos and season records.'))
      +(owned.length?'<p class="team-footnote">'+(standingsData?.season===season()?'Current season fantasy total (best '+bestCount+'): '+Number(standingsData.standings?.find(x=>x.manager_id===me.id)?.points||0).toLocaleString('en-US',{maximumFractionDigits:2})+' points':'Loading current fantasy points...')+'</p>':'')+'</section>'
      +'<div class="team-aside"><section class="panel team-offers-panel">'+panelHeading('Your trades',offers.filter(t=>t.status==='pending').length+' pending · '+allOffers.length+' total')
      +(offers.length?offerCards:empty('No trades yet','Proposals and completed deals will appear here.'))
      +'<div class="team-panel-footer"><button class="btn secondary small" data-act="tab" data-id="trades">View all trades</button></div></section>'
      +'<section class="panel team-waivers-panel">'+panelHeading('Waiver activity',claims.filter(c=>c.status==='pending').length+' pending claims')
      +(claims.length?waiverRows:empty('Nothing on waivers','Your pending claims and completed waiver moves will appear here.'))
      +(transactionRows?'<h3 class="team-subhead">Recent roster moves</h3>'+transactionRows:'')
      +'<div class="team-panel-footer"><button class="btn secondary small" data-act="tab" data-id="waivers">Manage waivers</button></div></section></div></div>';
  }
  function leaderboard(){
    return '<table class="table"><thead><tr><th>MANAGER</th><th class="last">PROGRAMS</th></tr></thead><tbody>'+members().map(u=>'<tr><td><button class="table-user" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'+escapeHTML(u.display_name)+'</button>'+(u.id===me.id?' <span class="muted tiny">(you)</span>':'')+'</td><td class="last">'+owners().filter(p=>p.manager_id===u.id).length+'</td></tr>').join('')+'</tbody></table>';
  }
  function programCard(p,canPick){
    const assignment=programOwned(p.id),owner=members().find(u=>u.id===assignment?.manager_id);
    const status=assignment?'<span class="program-dir-owner">'+escapeHTML(owner?.display_name||'Rostered')+'</span>'
      :canPick?'<button type="button" class="btn small program-dir-pick" data-act="pick" data-id="'+escapeHTML(p.id)+'">Draft</button>'
      :'<span class="program-dir-open">Available</span>';
    return '<div class="program-card program-directory-card" data-conference="'+escapeHTML(p.conference_id)+'" data-owner="'+(assignment?'owned':'available')+'" data-manager="'+escapeHTML(assignment?.manager_id||'')+'" data-letter="'+escapeHTML(p.name[0].toUpperCase())+'" data-search="'+escapeHTML((p.name+' '+p.abbr+' '+conf(p.conference_id)).toLowerCase())+'">'
      +'<button type="button" class="program-card-main" data-act="open-program" data-id="'+escapeHTML(p.id)+'" title="View '+escapeHTML(p.name)+'">'
      +img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span><span class="program-directory-chevron">›</span></button>'
      +'<span class="program-dir-status">'+status+'</span></div>';
  }
  async function loadStandings(){
    if(!me||standingsLoading||Date.now()-standingsFetchedAt<60000)return;
    standingsLoading=true;standingsFetchedAt=Date.now();
    try{standingsData=await api('data/standings');standingsError='';}
    catch(e){standingsError=e.message;}
    finally{standingsLoading=false;if(current==='league'||current==='team')render();}
  }
  async function loadSchoolLeaders(){
    if(!me||schoolLeadersLoading)return;
    schoolLeadersLoading=true;schoolLeadersError='';
    if(current==='programs'&&programMode==='leaders')render();
    try{schoolLeaders=await api('data/leaders');}
    catch(e){schoolLeadersError=e.message;}
    finally{schoolLeadersLoading=false;if(current==='programs'&&programMode==='leaders'){render();filterSchoolLeaders();}}
  }
  function schoolLeadersPage(){
    const all=schoolLeaders,years=all?.seasons||[];
    const period=leaderSeason==='all'?'all':years.includes(leaderSeason)?leaderSeason:'all';
    const nav='<div class="school-leaders-seasons" role="group" aria-label="Select scoring season">'
      +[['all','All seasons'],...years.slice().reverse().map(y=>[y,y])].map(([id,label])=>'<button type="button" data-act="leaders-season" data-id="'+id+'" class="'+(period===id?'active':'')+'" aria-pressed="'+(period===id)+'">'+escapeHTML(label)+'</button>').join('')+'</div>';
    if(!all)return '<section class="panel school-leaders-shell">'+panelHeading('Historical points','Eligible league conferences from 2021–22 onward')+nav
      +(schoolLeadersError?empty('Unable to load rankings',escapeHTML(schoolLeadersError)):empty('Loading school leaderboards','Calculating historical scores, seeds, championships and quadrant wins.'))+'</section>';
    const byId=new Map();
    for(const item of all.rows||[]){
      const id=String(item.program_id),map=byId.get(id)||new Map();
      map.set(item.season,item);byId.set(id,map);
    }
    const rows=(all.directory||[]).map(p=>{
      const history=byId.get(String(p.id))||new Map();
      const values=years.map(y=>history.get(y)?.points??null);
      const known=values.filter(v=>v!==null);
      const total=known.length?known.reduce((sum,val)=>sum+Number(val),0):null;
      const selected=period==='all'?total:history.get(period)?.points??null;
      return {p,history,values,selected,total};
    }).sort((a,b)=>(b.selected??-1)-(a.selected??-1)||a.p.name.localeCompare(b.p.name));
    const score=value=>value===null||value===undefined?'—':Number(value).toLocaleString('en-US',{maximumFractionDigits:2});
    const headerYears=years.map(y=>'<th class="school-leader-year">'+escapeHTML(y.slice(2))+'</th>').join('');
    const body=rows.map((row,index)=>{
      const p=row.p;return '<tr class="school-leader-row" data-search="'+escapeHTML((p.name+' '+p.abbr+' '+conf(p.conference_id)).toLowerCase())+'">'
        +'<td class="school-leader-rank">'+(index+1)+'</td>'
        +'<td><button class="school-leader-school" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span></button></td>'
        +'<td class="school-leader-points">'+score(row.selected)+'</td>'
        +row.values.map((v,i)=>'<td class="school-leader-year '+(period===years[i]?'selected':'')+'">'+score(v)+'</td>').join('')
        +'</tr>';
    }).join('');
    return '<section class="panel school-leaders-shell">'+panelHeading('Historical point leaders',rows.length+' eligible league programs · 2021–22 to '+escapeHTML(season()))
      +'<p class="school-leaders-note">'+(all.archive_complete?'Historical scores include only schools from the league’s eligible conferences. Five archived seasons are verified; current-season totals update live.':'Scores include only the league’s eligible conferences. Remaining unverified seasons may change.')+'</p>'
      +nav
      +'<div class="school-leader-tools"><label class="directory-search"><span aria-hidden="true">⌕</span><input id="leader-search" class="field" type="search" value="'+escapeHTML(leaderQuery)+'" placeholder="Find a team in the rankings..." aria-label="Search school leaders" autocomplete="off"/></label><span id="leader-count">'+rows.length+' schools</span></div>'
      +'<div class="school-leader-table-wrap"><table class="school-leader-table"><thead><tr><th>#</th><th>PROGRAM</th><th>'+(period==='all'?'TOTAL':escapeHTML(period))+'</th>'+headerYears+'</tr></thead><tbody>'+body+'</tbody></table></div></section>';
  }
  function filterSchoolLeaders(){
    const query=leaderQuery.toLowerCase().trim();let visible=0;
    document.querySelectorAll('.school-leader-row').forEach(row=>{
      const match=row.dataset.search.includes(query);row.hidden=!match;if(match)visible++;
    });
    const counter=document.querySelector('#leader-count');
    if(counter)counter.textContent=visible+' '+(visible===1?'school':'schools');
  }
  function ratingsPage(){
    const year=ratingYear(ratingSeason||season()),data=ratingCache[year];
    const years=Array.from({length:6},(_,i)=>ratingYear(season())-i).filter(y=>y>=2022&&y<=2027);
    const seasons='<div class="school-leaders-seasons rating-seasons" role="group" aria-label="T-Rank season">'
      +years.map(y=>'<button type="button" data-act="rating-season" data-id="'+y+'" class="'+(year===y?'active':'')+'">'+(y-1)+'-'+String(y%100).padStart(2,'0')+'</button>').join('')+'</div>';
    const header='<div class="rating-intro"><div><h3>Bart Torvik T-Rank</h3><p>National power ratings. Used for provisional quadrant bonuses until official NCAA NET becomes available.</p></div>'+ratingExternalLinks()+'</div>';
    if(!data)return '<section class="panel ratings-shell">'+header+seasons
      +(ratingError[year]?empty('Ratings unavailable',escapeHTML(ratingError[year]))+'<button class="btn secondary small" data-act="ratings-refresh" data-id="'+year+'">Retry</button>'
        :empty('Loading ratings','Retrieving '+(year-1)+'-'+String(year%100).padStart(2,'0')+' T-Rank ratings.'))+'</section>';
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id));
    const metrics={rank:(a,b)=>(a.r?.rank??999)-(b.r?.rank??999),
      offense:(a,b)=>(a.r?.adj_o_rank??999)-(b.r?.adj_o_rank??999),
      defense:(a,b)=>(a.r?.adj_d_rank??999)-(b.r?.adj_d_rank??999),
      power:(a,b)=>(b.r?.barthag??-1)-(a.r?.barthag??-1),
      wab:(a,b)=>(b.r?.wab??-999)-(a.r?.wab??-999)};
    const rows=eligible.map(p=>({p,r:ratingOf(p,year)})).sort((a,b)=>(metrics[ratingSort]||metrics.rank)(a,b)||a.p.name.localeCompare(b.p.name));
    const matched=rows.filter(x=>x.r).length;
    const dec=(value,places=1)=>value===null||value===undefined?'—':Number(value).toFixed(places);
    const sort=[['rank','T-Rank'],['offense','Offense'],['defense','Defense'],['power','Power'],['wab','WAB']].map(([id,label])=>
      '<button type="button" data-act="rating-sort" data-id="'+id+'" class="'+(ratingSort===id?'active':'')+'">'+label+'</button>').join('');
    const cells=rows.map(({p,r})=>'<tr class="rating-school-row" data-search="'+escapeHTML((p.name+' '+conf(p.conference_id)).toLowerCase())+'">'
      +'<td class="rating-rank">'+(r?'#'+r.rank:'—')+'</td>'
      +'<td><button class="school-leader-school" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span></button></td>'
      +'<td>'+dec(r?.barthag,3)+'</td><td>'+dec(r?.adj_o)+'<small>'+(r?.adj_o_rank?' #'+r.adj_o_rank:'')+'</small></td>'
      +'<td>'+dec(r?.adj_d)+'<small>'+(r?.adj_d_rank?' #'+r.adj_d_rank:'')+'</small></td>'
      +'<td>'+dec(r?.wab)+'</td><td>'+dec(r?.tempo)+'</td></tr>').join('');
    return '<section class="panel ratings-shell">'+header+seasons
      +'<div class="rating-controls"><label class="directory-search"><span aria-hidden="true">⌕</span><input id="rating-search" type="search" class="field" placeholder="Find a school..." value="'+escapeHTML(ratingQuery)+'" autocomplete="off"/></label><div class="directory-sort-tabs">'+sort+'</div></div>'
      +'<p class="rating-coverage"><span id="rating-count">'+matched+' matched schools</span> / '+eligible.length+' eligible · National rank · Fetched '+escapeHTML(new Date(data.fetched_at).toLocaleDateString())+'</p>'
      +'<div class="ratings-table-wrap"><table class="ratings-table"><thead><tr><th>T-RANK</th><th>SCHOOL</th><th>BARTHAG</th><th>ADJ. OFF.</th><th>ADJ. DEF.</th><th>WAB</th><th>TEMPO</th></tr></thead><tbody>'+cells+'</tbody></table></div>'
      +'<p class="hint">Offense and defense use points per 100 possessions (lower is better on defense). Unmatched schools show a dash rather than an estimated rating.</p></section>';
  }
  function filterRatings(){
    let count=0;const query=ratingQuery.toLowerCase().trim();
    root.querySelectorAll('.rating-school-row').forEach(row=>{const shown=row.dataset.search.includes(query);row.hidden=!shown;if(shown)count++;});
    const label=root.querySelector('#rating-count');if(label)label.textContent=count+' schools';
  }
  function programsPage(){
    const nav='<div class="school-view-tabs" role="group" aria-label="Schools sections">'
      +[['directory','School directory'],['leaders','Historical leaders'],['ratings','Power ratings']].map(([id,label])=>'<button type="button" data-act="school-mode" data-id="'+id+'" class="'+(programMode===id?'active':'')+'" aria-pressed="'+(programMode===id)+'">'+escapeHTML(label)+'</button>').join('')+'</div>';
    if(programMode==='leaders')return heading('COLLEGE BASKETBALL','Schools','Browse programs or compare historical fantasy scoring across all Division I schools.')+nav+schoolLeadersPage();
    if(programMode==='ratings')return heading('COLLEGE BASKETBALL','Schools','Compare eligible programs using T-Rank efficiency ratings.')+nav+ratingsPage();
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id));
    const available=eligible.filter(p=>!programOwned(p.id)).length;
    const sorters={
      name:(a,b)=>a.name.localeCompare(b.name),
      conference:(a,b)=>conf(a.conference_id).localeCompare(conf(b.conference_id))||a.name.localeCompare(b.name),
      availability:(a,b)=>Number(!!programOwned(a.id))-Number(!!programOwned(b.id))||a.name.localeCompare(b.name)
    };
    eligible.sort(sorters[programSort]||sorters.name);
    const chip=(value,label)=>'<button class="'+(programConference===value?'active':'')+'" data-act="directory-conference" data-id="'+escapeHTML(value)+'" type="button" aria-pressed="'+(programConference===value)+'">'+escapeHTML(label)+'</button>';
    const conferenceChips=chip('all','All conferences')+activeConfs().slice().sort((a,b)=>conf(a).localeCompare(conf(b))).map(id=>chip(id,conf(id))).join('');
    const filter=(key,title)=>'<button type="button" data-act="directory-ownership" data-id="'+key+'" class="'+(programOwnership===key?'active':'')+'">'+title+'</button>';
    const letters=['all',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(key=>'<button type="button" data-act="directory-letter" data-id="'+key+'" class="'+(programLetter===key?'active':'')+'" aria-label="'+(key==='all'?'All letters':'Schools starting with '+key)+'">'+(key==='all'?'All':key)+'</button>').join('');
    const sortButtons=[['name','A–Z'],['conference','Conference'],['availability','Available first']]
      .map(([id,title])=>'<button type="button" data-act="directory-sort" data-id="'+id+'" class="'+(programSort===id?'active':'')+'" aria-pressed="'+(programSort===id)+'">'+title+'</button>').join('');
    return heading('COLLEGE BASKETBALL','Schools','Explore the draft pool, compare programs and review season-by-season histories.')
      +nav
      +'<section class="program-directory-shell">'
      +'<div class="directory-welcome"><div><span>THE DRAFT POOL</span><strong>'+eligible.length+' programs</strong><small>'+available+' available · '+(eligible.length-available)+' rostered</small></div>'
      +(isMyTurn()?'<button class="btn small" data-act="tab" data-id="draft">Your pick is live →</button>':'<span class="directory-welcome-hint">Tap a school to view scores and history</span>')+'</div>'
      +'<div class="directory-filters"><div class="directory-search-row"><label class="directory-search"><span aria-hidden="true">⌕</span><input class="field" type="search" id="program-search" value="'+escapeHTML(programQuery)+'" placeholder="Search programs or conferences..." aria-label="Search programs" autocomplete="off"/></label>'
      +'<div class="directory-sort-tabs" role="group" aria-label="Sort schools">'+sortButtons+'</div></div>'
      +'<div class="directory-conference-strip" role="group" aria-label="Filter by conference">'+conferenceChips+'</div>'
      +'<div class="directory-filter-row"><div class="directory-status-tabs">'+filter('all','All schools')+filter('available','Available')+filter('owned','Rostered')+filter('mine','My programs')+'</div><span id="program-results" class="directory-current-count">'+eligible.length+' programs</span></div>'
      +'<div class="directory-letter-strip" aria-label="Browse schools alphabetically">'+letters+'</div></div>'
      +(eligible.length?'<div class="program-grid program-directory-grid">'+eligible.map(p=>programCard(p,isMyTurn())).join('')+'</div><div id="no-program-results" class="empty directory-empty" hidden>No schools match those filters.</div><div id="directory-load" class="directory-load" hidden><button class="btn secondary" data-act="load-programs">Show more programs</button><span id="directory-progress"></span></div>'
        :empty('No schools in the pool','The commissioner can import schools from league settings.'))
      +'</section>';
  }
  function filterPrograms(){
    const query=programQuery.trim().toLowerCase();
    let found=0,visible=0;
    document.querySelectorAll('.program-card[data-search]').forEach(card=>{
      const match=card.dataset.search.includes(query)
        &&(programConference==='all'||card.dataset.conference===programConference)
        &&(programOwnership==='all'||(programOwnership==='mine'?card.dataset.manager===me.id:card.dataset.owner===programOwnership))
        &&(programLetter==='all'||card.dataset.letter===programLetter);
      if(match)found++;
      card.hidden=!match||found>programShown;
      if(match&&found<=programShown)visible++;
    });
    const count=document.querySelector('#program-results');
    if(count)count.textContent=found>visible?visible+' of '+found+' programs':found+' '+(found===1?'program':'programs');
    const more=document.querySelector('#directory-load');
    if(more)more.hidden=found<=visible;
    const progress=document.querySelector('#directory-progress');
    if(progress)progress.textContent=found>visible?(found-visible)+' more to browse':'';
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
    const settings=league.settings,fullOrder=order(),count=fullOrder.length;
    const total=draftTotal(),completed=picks().length;
    const status=settings.draft_status,rounds=Number(settings.rounds||0);
    const preview=status==='pending'&&count<2;
    const openSeats=preview?Math.max(0,Math.min(20,Number(settings.max_managers||7))-count):0;
    const visualOrder=preview?[...fullOrder,...Array.from({length:openSeats},(_,i)=>'open-seat-'+i)]:fullOrder;
    const visualCount=visualOrder.length;
    const plannedTotal=preview?visualCount*rounds:total;
    const roundNumber=Math.min(rounds,Math.floor(completed/Math.max(1,count))+1);
    const next=nextManager(),available=programs().filter(p=>activeConfs().includes(p.conference_id)).length;
    const canStart=count>=2&&available>=total;
    const mode=['all','current','mine'].includes(draftRoundView)?draftRoundView:'all';
    const columns=mode==='mine'?visualOrder.filter(id=>id===me.id):visualOrder;
    const rows=mode==='current'?[roundNumber]:Array.from({length:rounds},(_,i)=>i+1);
    const draftPicks=new Map(picks().map(p=>[Number(p.overall),p]));
    const programIndex=new Map(programs().map(p=>[String(p.id),p]));
    const memberIndex=new Map(members().map(m=>[String(m.id),m]));
    const boardWidth='grid-template-columns:75px repeat('+Math.max(columns.length,1)+',minmax(154px,1fr));min-width:'+(75+columns.length*154)+'px';
    const headers=columns.map(id=>{
      const manager=memberIndex.get(id),vacant=id.startsWith('open-seat-');
      return '<div class="draft-board-manager '+(id===me.id?'mine':vacant?'vacant':'')+'"><span class="draft-board-avatar">'+avatar(manager||{display_name:'+'})+'</span><div><strong>'+escapeHTML(manager?.display_name||'Open seat')+'</strong><small>'+(vacant?'WAITING FOR MANAGER':id===me.id?'YOUR TEAM':'PICK POSITION '+(fullOrder.indexOf(id)+1))+'</small></div></div>';
    }).join('');
    const cells=rows.map(round=>{
      const slots=columns.map(id=>{
        const vacant=id.startsWith('open-seat-');
        const columnIndex=visualOrder.indexOf(id);
        const overall=(round-1)*visualCount+(round%2===1?columnIndex+1:visualCount-columnIndex);
        const pick=draftPicks.get(overall),program=programIndex.get(String(pick?.program_id||''));
        const onClock=status==='live'&&overall===completed+1;
        const mine=id===me.id;
        const state=program?'selected':onClock?'on-clock':vacant?'vacant':'open';
        return '<div class="draft-board-cell '+state+(mine?' my-cell':'')+'" '+(vacant?'':'data-pick="'+overall+'"')+'>'
          +'<div class="draft-cell-meta"><span>'+(preview?'PROJ. ':'')+'#'+overall+'</span>'+(onClock?'<strong class="draft-cell-live">ON CLOCK</strong>':program?'<span class="draft-cell-done">PICKED</span>':'')+'</div>'
          +(program?'<button type="button" class="draft-cell-program" data-act="open-program" data-id="'+escapeHTML(program.id)+'" title="View '+escapeHTML(program.name)+'">'+img(program)+'<span class="draft-cell-team"><strong>'+escapeHTML(program.name)+'</strong><small>'+escapeHTML(conf(program.conference_id))+'</small></span></button>'
            :onClock?'<div class="draft-cell-open"><strong>'+escapeHTML(memberIndex.get(id)?.display_name||'Manager')+'</strong><small>Making selection</small></div>'
            :'<div class="draft-cell-placeholder">'+(vacant?'Awaiting manager':'Open pick')+'</div>')
          +'</div>';
      }).join('');
      return '<div class="draft-board-round">ROUND '+round+'<span>'+(round%2===0?'←':'→')+'</span></div>'+slots;
    }).join('');
    const recent=[...picks()].reverse().slice(0,8);
    const nextSlots=preview?[]:Array.from({length:Math.min(6,Math.max(0,total-completed))},(_,i)=>{
      const overall=completed+i+1,r=Math.floor((overall-1)/Math.max(1,count)),local=(overall-1)%Math.max(1,count);
      const id=r%2===0?fullOrder[local]:fullOrder[count-1-local];
      return {overall,manager:memberIndex.get(id)};
    });
    const modeButton=(id,label)=>'<button type="button" data-act="draft-board-mode" data-mode="'+id+'" class="'+(mode===id?'active':'')+'">'+label+'</button>';
    return heading('INAUGURAL PROGRAM DRAFT','Draft Room','Every pick, every manager, one permanent roster.')
      +'<section class="draft-command">'
      +'<div class="draft-command-state"><span class="draft-state-tag '+(status==='live'?'live':'')+'"><i></i>'+escapeHTML(status==='live'?'LIVE DRAFT':status==='finished'?'DRAFT COMPLETE':status==='paused'?'PAUSED':'PRE-DRAFT')+'</span>'
      +'<h2>'+(status==='live'?'On the clock: '+escapeHTML(next?.display_name||'Manager'):status==='finished'?'The draft is complete':status==='paused'?'The draft is paused':'Ready to build your dynasty')+'</h2>'
      +'<p>'+completed+' of '+plannedTotal+(preview?' projected':'')+' picks <span>·</span> '+count+' registered <span>·</span> '+rounds+' rounds</p>'
      +'<div class="draft-command-progress"><span style="width:'+Math.min(100,100*completed/Math.max(1,plannedTotal))+'%"></span></div></div>'
      +'<div class="draft-command-right">'+(settings.draft_clock_seconds>0?'<div class="draft-clock-box"><span>DRAFT CLOCK</span><strong id="draft-clock">--:--</strong><small>Manual selections only</small></div>':'<div class="draft-command-count"><strong>'+Math.max(0,plannedTotal-completed)+'</strong><small>'+(preview?'PROJECTED PICKS':'PICKS REMAINING')+'</small></div>')+'</div>'
      +'<button class="btn draft-command-cta" data-act="tab" data-id="programs">'+(isMyTurn()?'Make your pick':'Browse programs')+' <span>→</span></button></section>'
      +(status==='pending'?'<div class="draft-readiness"><span class="'+(count>=2?'good':'')+'">'+(count>=2?'✓':'○')+' '+count+' registered managers</span><span class="'+(available>=plannedTotal?'good':'')+'">'+(available>=plannedTotal?'✓':'○')+' '+available+' eligible schools for '+plannedTotal+(preview?' projected':'')+' picks</span><strong>'+(canStart?'Draft pool ready':'Waiting for draft readiness')+'</strong></div>':'')
      +'<section class="panel draft-board-panel">'
      +'<div class="draft-board-toolbar"><div><h2>Draft board</h2><p>'+(preview?'Projected positions · '+openSeats+' manager seats available':'Snake format · '+rounds+' rounds · Live pick tracker')+'</p></div><div class="draft-board-switch" role="group" aria-label="Draft board view">'+modeButton('all','Full board')+modeButton('current','Current round')+modeButton('mine','My picks')+'</div></div>'
      +'<div class="draft-board-key"><span><i class="selected"></i> Selected</span><span><i class="on-clock"></i> On the clock</span><span><i class="mine"></i> Your column</span><small>Scroll horizontally to view every manager</small></div>'
      +'<div class="draft-board-scroll" tabindex="0" aria-label="Scrollable draft board"><div class="draft-board-grid" style="'+boardWidth+'"><div class="draft-board-corner">ROUND</div>'+headers+cells+'</div></div>'
      +'</section>'
      +'<div class="draft-recap-grid section-gap"><section class="panel">'+panelHeading('Recent picks','Latest selections')
      +(recent.length?recent.map(p=>{
        const team=programIndex.get(String(p.program_id)),manager=memberIndex.get(String(p.manager_id));
        return '<div class="draft-recap-item"><span class="draft-recap-position">'+p.overall+'</span>'+(team?img(team):'')+'<span class="grow"><strong>'+escapeHTML(team?.name||'School')+'</strong><small>'+escapeHTML(manager?.display_name||'Manager')+' · Round '+p.round+'</small></span></div>';
      }).join(''):empty('No picks yet','The first selection will appear here.'))+'</section>'
      +'<section class="panel">'+panelHeading('Upcoming picks','Next managers to select')
      +(nextSlots.length?nextSlots.map(item=>'<div class="draft-next-item"><span class="draft-recap-position">'+item.overall+'</span>'+avatar(item.manager||{display_name:'?'})+'<div class="grow"><strong>'+escapeHTML(item.manager?.display_name||'Manager')+'</strong><small>'+(item.overall===completed+1&&status==='live'?'On the clock':'Upcoming selection')+'</small></div></div>').join(''):empty(preview?'Awaiting managers':'Draft complete',preview?'Upcoming picks will appear once managers join.':''))+'</section></div>';
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
      return '<div class="trade-offer"><div class="trade-offer-head"><strong>'+escapeHTML(from?.display_name||'Manager')+' → '+escapeHTML(to?.display_name||'Manager')+'</strong><span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div><div class="trade-exchange"><div class="trade-exchange-side"><span>OFFERING</span><strong>'+escapeHTML(give.join(', ')||'No programs')+'</strong></div><span class="trade-exchange-arrow" aria-hidden="true">⇄</span><div class="trade-exchange-side"><span>REQUESTING</span><strong>'+escapeHTML(receive.join(', ')||'No programs')+'</strong></div></div>'+actions+'</div>';
    };
    return heading('', 'Trades')
      +(ready?'<section class="panel section-gap">'+panelHeading('Propose trade')+'<div class="form-row"><label for="trade-target">Trade with</label><select class="field" id="trade-target">'+others.map(u=>'<option value="'+escapeHTML(u.id)+'" '+(u.id===tradeTargetId?'selected':'')+'>'+escapeHTML(u.display_name)+'</option>').join('')+'</select></div><div class="trade-columns"><div><h3 class="subhead">YOU SEND <span id="trade-give-count">0 selected</span></h3>'+selections(mine,'trade-give')+'</div><div><h3 class="subhead">YOU RECEIVE <span id="trade-receive-count">0 selected</span></h3>'+selections(theirs,'trade-receive')+'</div></div><div class="trade-submit"><div id="trade-selection-summary">Select schools from both teams</div><button class="btn" data-act="trade-propose" disabled>Send trade offer</button></div></section>':
        '<section class="panel section-gap">'+empty(league.settings.trading_enabled?'Trading unavailable':'Trading disabled',league.settings.trading_enabled?'Trading opens after the initial draft.':'The commissioner has disabled new trades.')+'</section>')
      +'<section class="panel section-gap">'+panelHeading('Trade history')+(offers.length?offers.map(card).join(''):empty('No trades yet',''))+'</section>';
  }

  const scoringGroups=[
    ['Regular season and tournament wins',[['regular_win','Regular-season win'],['conference_tournament_win','Conference tournament win'],['quad_2_win','Quad 2 win bonus'],['quad_1_win','Quad 1 win bonus'],['quad_1a_extra','Extra Quad 1A win bonus']]],
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
      +'<p>Every regular-season, conference tournament and NCAA Tournament win can earn Q1, Q1A or Q2 bonuses. Q1A stacks on top of Q1. Before official NCAA NET is available, provisional quadrants use Bart Torvik T-Rank and each school’s actual home, away or neutral venue. Once complete NCAA NET is imported, all quadrant bonuses are recalculated automatically.</p>'
      +'<p>Appearance points are awarded once for NCAA seeding. Opening Round games use their own win value. The national championship bonus stacks with tournament wins.</p>'
      +'<p>Regular-season games earn their normal win points; conference tournament wins earn +2 and NCAA Tournament wins earn their configured postseason points. Those wins can additionally earn quadrant bonuses. There is no AP Poll or KenPom bonus.</p>'
      +'<p class="muted">Provisional T-Rank-based points can change. Completed archived seasons use official final NET rankings.</p></section>';
  }

  function leaguePage(){
    const scoring=standingsData?.season===season()?standingsData:null;
    const scoreIndex=new Map((scoring?.standings||[]).map(x=>[x.manager_id,x]));
    const users=members().slice();
    if(scoring)users.sort((a,b)=>(scoreIndex.get(b.id)?.points||0)-(scoreIndex.get(a.id)?.points||0)||a.display_name.localeCompare(b.display_name));
    const fmtPoints=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
    const rows=users.map(u=>{
      const manager=scoreIndex.get(u.id);
      const schools=owners().filter(o=>o.manager_id===u.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean);
      const schoolPreview=schools.length?'<span class="standings-mini-roster">'+schools.slice(0,5).map(p=>'<span title="'+escapeHTML(p.name)+'">'+img(p)+'</span>').join('')+(schools.length>5?'<span class="standings-roster-more">+'+(schools.length-5)+'</span>':'')+'</span>':'<span class="standings-roster-pending">Draft pending</span>';
      const points=manager&&schools.length?'<strong>'+fmtPoints(manager.points)+'</strong><small class="muted"> · '+manager.counted_programs+' counting</small>':
        schools.length?'<span class="pending-score">Loading</span>':'<span class="pending-score">—</span>';
      return '<tr class="standing-row'+(u.id===me.id?' is-mine':'')+'"><td><button class="standings-manager table-user" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'
        +avatar(u)+'<div><strong>'+escapeHTML(u.display_name)+'</strong><small>'+(u.id===me.id?'Your team':'View team profile')+'</small></div></button></td>'
        +'<td class="standing-school-cell">'+schoolPreview+'</td><td class="numerical">'+points+'</td></tr>';
    }).join('');
    const note=standingsError?'Unable to refresh standings: '+escapeHTML(standingsError):
      !scoring?'Calculating the current fantasy scores from verified games and awards...':
      !owners().length?'Managers earn points after drafting their schools.':
      scoring.quadrant_source==='torvik'?'Live fantasy points include provisional Q1/Q1A/Q2 bonuses using Bart Torvik T-Rank. NCAA NET will replace these calculations automatically.':
      scoring.quadrant_source==='pending'?'Live fantasy scores. Quadrant bonuses begin once complete T-Rank or NCAA NET rankings are available.':
      'Live scores reflect regular-season wins, NET quadrant bonuses and confirmed postseason awards.';
    return heading('SEASON '+escapeHTML(season()),'Standings','Dynasty standings for the current season.')
      +'<section class="panel standings-panel">'
      +panelHeading('League standings','Best '+Number(league.settings.scoring?.best_programs||8)+' programs count toward each manager’s total')
      +'<div class="standings-notice">'+note+'</div>'
      +'<div class="standings-table-wrap"><table class="standings-table"><thead><tr><th>MANAGER</th><th>ROSTERED SCHOOLS</th><th class="numerical">FANTASY POINTS</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'</section>';
  }

  function profileBack(){return '<button class="profile-back" data-act="tab" data-id="'+escapeHTML(current==='program-detail'?programBackPage:managerBackPage)+'">← Back</button>';}
  function programProfilePage(){
    const p=programs().find(p=>p.id===selectedProgramId)||(schoolLeaders?.directory||[]).find(p=>p.id===selectedProgramId);
    if(!p)return heading('', 'Program unavailable')+profileBack();
    const report=programResultCache[p.id]?.season===season()?programResultCache[p.id]:null;
    const record=report?.record;
    const owner=programOwned(p.id),manager=members().find(m=>m.id===owner?.manager_id);
    const selection=picks().find(x=>x.program_id===p.id);
    const history=report?.history?.seasons||[];
    const selected=selectedProgramSeason||season();
    const selectedStats=history.find(x=>x.season===selected);
    const currentStats=history.find(x=>x.season===season());
    const activity=(league.roster_transactions||[]).filter(x=>x.program_id===p.id).slice(0,8);
    const tradeHistory=(league.trade_items||[]).filter(x=>x.program_id===p.id).filter(item=>(league.trades||[]).some(t=>t.id===item.trade_id&&t.status==='accepted'));
    const ownedYears=(league.archived_rosters||[]).filter(x=>x.program_id===p.id);
    const pointText=x=>x?.points===null||x?.points===undefined?'—':Number(x.points).toLocaleString('en-US',{maximumFractionDigits:2});
    const maxKnownPoints=Math.max(1,...history.filter(item=>item.points!==null&&item.points!==undefined&&Number.isFinite(Number(item.points))).map(item=>Math.max(0,Number(item.points))));
    const rankLabel=row=>row?.rank!==null&&row?.rank!==undefined&&Number(row.rank)>0&&Number(row?.rank_total)>0&&row?.status!=='not_applicable'
      ?(row.rank_tied?'T-':'')+'#'+Number(row.rank)+' / '+Number(row.rank_total):'Unranked';
    const seasonRows=Array.from({length:Math.max(0,Number(season().slice(0,4))-2021+1)},(_,i)=>{
      const first=Number(season().slice(0,4))-i,label=first+'-'+String((first+1)%100).padStart(2,'0');
      const row=history.find(item=>item.season===label);
      return '<button class="program-season-card '+(selected===label?'active':'')+'" type="button" data-act="program-season" data-id="'+escapeHTML(label)+'" aria-pressed="'+(selected===label)+'">'
        +'<span>'+escapeHTML(label)+'</span><strong>'+pointText(row)+'</strong><small class="program-season-ranking">'+escapeHTML(rankLabel(row))+'</small><small>'+(row?.status==='partial'?'Live points':row?.status==='complete'?'Final points':row?.status==='not_applicable'?'No D-I record':'Awaiting data')+'</small>'
        +'<span class="program-season-meter" aria-hidden="true"><i style="width:'+(row?.points!==null&&row?.points!==undefined&&Number.isFinite(Number(row.points))?Math.min(100,Math.max(0,100*Number(row.points)/maxKnownPoints)):0)+'%"></i></span></button>';
    }).join('');
    const breakdown=selectedStats?.breakdown||[];
    const scoreDetails=breakdown.length
      ?'<section class="school-score-detail"><div class="school-score-detail-head"><div><span class="eyebrow">FANTASY SCORING</span><h3>Where every point came from</h3><p>Win bonuses stack with the game win points. Quadrant bonuses also count in the NCAA and conference tournaments.</p></div><strong>'+pointText(selectedStats)+' pts</strong></div>'
        +'<div class="school-score-components">'+breakdown.map(part=>
          '<div class="school-score-part '+(part.points?'earned':'no-points')+'"><div><strong>'+escapeHTML(part.label)+'</strong><small>'
            +Number(part.count||0)+' × '+Number(part.rate||0).toLocaleString('en-US',{maximumFractionDigits:2})+' points</small></div>'
            +'<b>'+(Number(part.points||0)>0?'+':'')+Number(part.points||0).toLocaleString('en-US',{maximumFractionDigits:2})+'</b></div>'
        ).join('')+'</div>'
        +'<div class="school-score-total"><strong>Total fantasy points</strong><strong>'+pointText(selectedStats)+'</strong></div>'
        +(selectedStats.quad_by_type?'<div class="school-score-quad-context">Quadrant wins by stage: Regular season '+Number(selectedStats.quad_by_type.regular?.q1||0)+' Q1 / '+Number(selectedStats.quad_by_type.regular?.q2||0)+' Q2 · Conference tournament '+Number(selectedStats.quad_by_type.conference?.q1||0)+' Q1 / '+Number(selectedStats.quad_by_type.conference?.q2||0)+' Q2 · NCAA Tournament '+Number(selectedStats.quad_by_type.ncaa?.q1||0)+' Q1 / '+Number(selectedStats.quad_by_type.ncaa?.q2||0)+' Q2</div>':'')
        +'</section>':'<div class="school-score-empty">No scoring components recorded for this year yet.</div>';
    const yearDetail=selectedStats?'<div class="program-season-expanded"><div class="program-season-detail-heading"><div><strong>'+escapeHTML(selectedStats.season)+'</strong><small>'+(selectedStats.status==='complete'?'Final points from verified archived results':selectedStats.status==='partial'?'Live season points, subject to updates':selectedStats.status==='not_applicable'?'No recorded Division I season':'Awaiting verified results')+'</small></div><div class="program-season-bigscore">'+pointText(selectedStats)+'</div></div>'
      +'<div class="program-season-rank-hero"><span>LEAGUE SEASON RANK</span><strong>'+escapeHTML(rankLabel(selectedStats))+'</strong><small>Against all eligible programs in this season</small></div>'
      +'<div class="program-season-facts"><div><span>W–L</span><strong>'+((selectedStats.games>0)?selectedStats.wins+'–'+selectedStats.losses:'—')+'</strong></div>'
      +'<div><span>Regular-season wins</span><strong>'+(selectedStats.games?selectedStats.regular_wins:'—')+'</strong></div>'
      +'<div><span>Q1 wins'+(selectedStats.quadrant_provisional?' (prelim)':'')+'</span><strong>'+(selectedStats.quadrant_source!=='pending'?selectedStats.q1:'Pending')+'</strong></div>'
      +'<div><span>Q2 wins'+(selectedStats.quadrant_provisional?' (prelim)':'')+'</span><strong>'+(selectedStats.quadrant_source!=='pending'?selectedStats.q2:'Pending')+'</strong></div></div>'
      +scoreDetails+'<p class="hint">'+(selectedStats.status==='complete'?'Final totals use all verified regular-season, conference tournament and NCAA Tournament results, with final NET bonuses.':'Current-season totals update as games, rankings and awards become available.')+'</p></div>'
      :'<div class="program-season-expanded"><p class="hint">Loading the program’s verified scoring history…</p></div>';
    const currentPoints=currentStats?.points!==null&&currentStats?.points!==undefined?pointText(currentStats):'—';
    const metricsYear=ratingYear(selected),metrics=ratingOf(p,metricsYear);
    const decimal=(n,d=1)=>n===null||n===undefined?'—':Number(n).toFixed(d);
    const analyticsContent=metrics?'<div class="program-metric-grid">'
      +'<div><span>NATIONAL T-RANK</span><strong>#'+metrics.rank+'</strong></div>'
      +'<div><span>BARTHAG</span><strong>'+decimal(metrics.barthag,3)+'</strong></div>'
      +'<div><span>ADJUSTED OFFENSE</span><strong>'+decimal(metrics.adj_o)+'</strong><small>'+(metrics.adj_o_rank?'#'+metrics.adj_o_rank+' nationally':'Pts / 100 poss')+'</small></div>'
      +'<div><span>ADJUSTED DEFENSE</span><strong>'+decimal(metrics.adj_d)+'</strong><small>'+(metrics.adj_d_rank?'#'+metrics.adj_d_rank+' nationally':'Pts / 100 poss')+'</small></div>'
      +'<div><span>WINS ABOVE BUBBLE</span><strong>'+decimal(metrics.wab)+'</strong></div>'
      +'<div><span>ADJUSTED TEMPO</span><strong>'+decimal(metrics.tempo)+'</strong></div></div>'
      :'<p class="hint">'+escapeHTML(ratingError[metricsYear]||(ratingLoading[metricsYear]?'Loading public T-Rank ratings…':'No verified T-Rank match for this season.'))+'</p>';
    const analytics='<section class="panel program-analytics-panel">'+panelHeading('Power ratings · '+escapeHTML(selected),'Bart Torvik T-Rank · provisional Q1/Q1A/Q2 source before NCAA NET')
      +analyticsContent+ratingExternalLinks()+'</section>';

    const recordText=record?.played?record.wins+'–'+record.losses:'—';
    const ownerButton=manager?'<button class="program-profile-owner-link" type="button" data-act="open-manager" data-id="'+escapeHTML(manager.id)+'">'+escapeHTML(manager.display_name)+' →</button>':'<span>Available to draft</span>';
    const games=report?.games||[];
    const gameHistory=games.length?games.slice().sort((a,b)=>b.game_date.localeCompare(a.game_date)).map(g=>resultGameRow(g,p.id)).join(''):empty('No game results yet','Recent games appear automatically as ESPN data arrives.');
    return profileBack()
      +'<section class="program-profile-header">'+img(p)+'<div class="grow"><span class="eyebrow">'+escapeHTML(conf(p.conference_id))+'</span><h1>'+escapeHTML(p.name)+'</h1><p>Explore six seasons of results, achievements, and dynasty ownership.</p></div>'
      +(owner?'<span class="program-profile-status rostered">Rostered</span>':'<span class="program-profile-status">Available</span>')+'</section>'
      +'<div class="program-profile-summary"><div><span>CURRENT OWNER</span><strong>'+ownerButton+'</strong></div>'
      +'<div><span>'+escapeHTML(season())+' POINTS</span><strong>'+currentPoints+'</strong><small>'+(currentStats?.status==='partial'?'Verified components only':'Season scoring pending')+'</small></div>'
      +'<div><span>SEASON RECORD</span><strong>'+recordText+'</strong></div>'
      +'<div><span>'+(report?.ranking_source==='torvik'?'T-RANK (PRELIM)':'NET RANK')+'</span><strong>'+(report?.net?'#'+report.net.net_rank:'—')+'</strong></div></div>'
      +analytics
       +'<section class="panel program-history-panel">'+panelHeading('Season-by-season performance','Select any season from 2021–22 onward')
      +'<div class="program-season-strip">'+seasonRows+'</div>'+yearDetail+'</section>'
      +'<div class="program-profile-bottom">'
      +'<section class="panel">'+panelHeading('Program information')
      +'<div class="profile-facts compact-profile-facts"><div><span>Conference</span><strong>'+escapeHTML(conf(p.conference_id))+'</strong></div>'
      +'<div><span>Original draft pick</span><strong>'+(selection?'#'+selection.overall+' · Round '+selection.round:'Undrafted')+'</strong></div>'
      +'<div><span>Previous ownership</span><strong>'+(ownedYears.length?ownedYears.length+' archived seasons':'No archived seasons')+'</strong></div>'
      +(report?.ranking_date?'<div><span>'+(report.ranking_source==='torvik'?'T-Rank imported':'NET updated')+'</span><strong>'+escapeHTML(report.ranking_date)+'</strong></div>':'')+'</div>'
      +(league.settings.waivers_enabled&&league.settings.draft_status==='finished'&&!owner?'<button class="btn small section-gap" data-act="tab" data-id="waivers">Request on waivers</button>':'')+'</section>'
      +'<section class="panel program-profile-details">'+panelHeading('Game log','Current season · '+games.length+' games')
      +'<details class="program-detail-disclosure"><summary>View all games <span>›</span></summary><div class="program-detail-entries">'+gameHistory+'</div></details></section></div>'
      +(report?.awards?.length?'<section class="panel section-gap">'+panelHeading('Verified achievements')
          +report.awards.map(a=>'<div class="history-row"><strong>'+escapeHTML(a.award_type.replaceAll('_',' '))+'</strong><span>'+escapeHTML(a.value)+' · '+escapeHTML(a.source_note)+'</span></div>').join('')+'</section>':'')
      +(activity.length||tradeHistory.length?'<details class="panel program-ownership-disclosure section-gap"><summary>Roster transactions & ownership history <span>'+String(activity.length+tradeHistory.length)+' entries</span></summary>'
        +activity.map(t=>'<div class="history-row"><strong>'+escapeHTML(t.action==='claim'?'Acquired':'Released')+'</strong><span>'+escapeHTML(t.season)+'</span></div>').join('')
        +tradeHistory.map(t=>'<div class="history-row"><strong>Traded</strong><span>'+escapeHTML(members().find(m=>m.id===t.from_manager_id)?.display_name||'Manager')+' → '+escapeHTML(members().find(m=>m.id===t.to_manager_id)?.display_name||'Manager')+'</span></div>').join('')+'</details>':'')
      +(report?.history_error?'<p class="hint section-gap">'+escapeHTML(report.history_error)+'</p>':'');
  }
  function managerProfilePage(){
    const u=members().find(m=>m.id===selectedManagerId);
    if(!u)return heading('', 'Manager unavailable')+profileBack();
    const roster=owners().filter(o=>o.manager_id===u.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const records=(league.season_records||[]).filter(x=>x.manager_id===u.id).sort((a,b)=>b.season.localeCompare(a.season));
    const titles=(league.archives||[]).filter(x=>x.champion_manager_id===u.id).length;
    const favorite=programs().find(p=>String(p.id)===String(u.favorite_program_id||''));
    const rows=roster.map(p=>'<button class="profile-roster-row" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span><span>›</span></button>').join('');
    return profileBack()+'<div class="profile-hero manager-hero">'+avatar(u)+'<div class="grow"><span class="eyebrow">DYNASTY MANAGER</span><h1>'+escapeHTML(u.display_name)+'</h1><div class="profile-subline">@'+escapeHTML(u.username)+(u.id===me.id?' · Your team':'')+(favorite?' · Favorite: '+escapeHTML(favorite.name):'')+'</div></div></div>'
      +'<div class="profile-stats"><div><span>OWNED PROGRAMS</span><strong>'+roster.length+'</strong></div><div><span>LEAGUE TITLES</span><strong>'+titles+'</strong></div><div><span>CURRENT POINTS</span><strong class="muted">Pending</strong></div></div>'
      +'<div class="profile-panels"><section class="panel">'+panelHeading('Current roster')+(rows||empty('No programs owned'))+'</section><section class="panel">'+panelHeading('Dynasty seasons')+(records.length?records.map(x=>{const saved=(league.archived_rosters||[]).filter(a=>a.season===x.season&&a.manager_id===u.id);return '<details class="archived-roster"><summary><strong>'+escapeHTML(x.season)+'</strong><span>'+x.programs_count+' schools · Points pending</span></summary><div class="archive-schools">'+(saved.map(a=>{const p=programs().find(p=>p.id===a.program_id);return p?'<button class="table-user" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</button>':'';}).join('')||'No programs archived')+'</div></details>';}).join(''):empty('No archived seasons'))+'</section></div>';
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
      +(enabled?'<section class="panel">'+panelHeading('Submit a waiver claim')+'<div class="form-row"><label for="waiver-program">Available program</label><select id="waiver-program" class="field">'+opts+'</select></div><div class="form-row"><label for="waiver-drop">Release program (optional if roster not full)</label><select id="waiver-drop" class="field">'+drop+'</select></div><button class="btn" data-act="waiver-claim" '+(!eligible.length?'disabled':'')+'>Submit claim</button><p class="hint section-gap">Claims are reviewed by the commissioner. Approvals are not automatic.</p></section>'
          +'<section class="panel section-gap">'+panelHeading('Release a program')+'<div class="form-row"><label for="waiver-release">Your roster</label><select id="waiver-release" class="field">'+mine.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('')+'</select></div><button class="btn secondary" data-act="waiver-drop" '+(!mine.length?'disabled':'')+'>Drop selected program</button></section>'
          :'<section class="panel">'+empty('Waivers are closed',league.settings.draft_status==='finished'?'The commissioner has not enabled waivers.':'Waivers begin after the inaugural draft.')+'</section>')
      +'<section class="panel section-gap">'+panelHeading('Your claims')+(claims.length?claims.map(c=>{const p=programs().find(p=>p.id===c.program_id);return '<div class="history-row"><div><strong>'+escapeHTML(p?.name||'Program')+'</strong><small>'+escapeHTML(c.status)+'</small></div>'+(c.status==='pending'?'<button class="btn small secondary" data-act="waiver-cancel" data-id="'+escapeHTML(c.id)+'">Cancel</button>':'')+'</div>';}).join(''):empty('No waiver claims'))+'</section>';
  }
  function commissionerPage(){
    if(me.role!=='commissioner')return '';
    const settings=league.settings;
    const locked=settings.draft_status!=='pending'||picks().length>0;
    const cap=Number(settings.max_managers||10);
    const sections=[['general','General','League settings'],['draft','Draft','Order and controls'],['programs','Programs','Eligible schools'],['data','Data','Scores and rankings'],['members','Members','Managers and invites'],['scoring','Scoring','Points and best ball'],['trades','Trades','Trade permissions'],['waivers','Waivers','Claims and review'],['seasons','Seasons','History and rollover']];
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
        +'</section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Best-ball lineup','Season scoring format')
        +'<div class="bestball-setting-row"><div><strong>Counting programs</strong><p>Only the highest-scoring programs on each manager’s roster count toward the annual standings. The others remain owned.</p></div><div class="bestball-input"><label for="bestball-count">Best of '+settings.rounds+'</label><input id="bestball-count" class="field" type="number" min="1" max="'+settings.rounds+'" step="1" value="'+Number(settings.scoring?.best_programs||8)+'"/></div></div>'
        +'<div class="button-row"><button class="btn" data-act="save-bestball">Save best-ball format</button></div>'
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
        +'<button class="btn" data-act="save-rounds" '+(locked?'disabled':'')+'>Save rounds</button>'
        +'<div class="form-row section-gap"><label for="clock-duration">Draft clock</label><select id="clock-duration" class="field">'+[[0,'Off'],[60,'1 minute'],[120,'2 minutes'],[180,'3 minutes'],[300,'5 minutes'],[600,'10 minutes'],[900,'15 minutes'],[1800,'30 minutes']].map(([seconds,label])=>'<option value="'+seconds+'" '+(settings.draft_clock_seconds===seconds?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'
        +'<div class="button-row"><button class="btn secondary" data-act="save-clock" '+(!['pending','paused'].includes(settings.draft_status)?'disabled':'')+'>Save clock</button></div>'
        +'<p class="hint section-gap">The countdown resets after each pick. Time running out does not automatically make a selection.</p></section>'
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
    }else if(adminSection==='data'){
      const runs=resultsStatus?.recent_runs||[];
      const latest=runs.find(x=>x.status==='ok');
      const failure=runs.find(x=>x.status==='error');
      const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'}),coverage=resultsStatus?.coverage;
      const progOptions=programs().filter(p=>activeConfs().includes(p.conference_id)).sort((a,b)=>a.name.localeCompare(b.name))
        .map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
      const awardOptions=[['conference_regular_champion','Conference regular-season champion'],['conference_tournament_champion','Conference tournament champion'],['ncaa_seed','NCAA Tournament seed'],['ncaa_wins','NCAA Tournament wins'],['national_champion','National champion'],['kenpom_final_rank','Final KenPom rank']];
      const archivedYears=resultsStatus?.historical||[];
      const historicalRows=archivedYears.map(h=>'<div class="data-run"><span>'+escapeHTML(h.season)+'</span><div><strong>'+Number(h.checked_dates||0)+' dates checked</strong><small>'+Number(h.primary_events||0)+' ESPN games · '+(h.net_teams>=350?'NET verified ('+h.net_teams+' teams)':'NET missing')+' · '+Number(h.award_count||0)+' achievements</small></div></div>').join('');
      body='<section class="panel setting-panel">'+panelHeading('Results pipeline','ESPN scoreboards · current season')
        +'<div class="data-kpis"><div><span>GAMES</span><strong>'+Number(resultsStatus?.game_count||0)+'</strong></div><div><span>VERIFIED DAYS</span><strong>'+(coverage?coverage.checked_dates:'—')+'</strong></div><div><span>MISSING DAYS</span><strong>'+(coverage?coverage.missing_dates:'—')+'</strong></div></div>'
        +(resultsError?'<p class="notice section-gap">'+escapeHTML(resultsError)+'</p>':'')
        +(failure?'<p class="data-error section-gap">Latest error: '+escapeHTML(failure.error_text)+'</p>':'')
        +'<label class="settings-toggle section-gap" for="data-auto"><div><strong>Automatic results collection</strong><span>Every 15 minutes during game hours, plus daily reconciliation.</span></div><input id="data-auto" type="checkbox" '+(resultsStatus?.auto_enabled!==false?'checked':'')+'/></label>'
        +'<div class="button-row section-gap"><button class="btn secondary" data-act="data-auto-save">Save automation setting</button></div>'
        +'<div class="form-row section-gap"><label for="data-date">Check specific game date</label><input class="field" id="data-date" type="date" value="'+escapeHTML(today)+'"/></div>'
        +'<div class="button-row"><button class="btn" data-act="data-sync">Import date</button><button class="btn secondary" data-act="data-backfill">Recheck past 7 days</button><button class="btn secondary" data-act="data-upcoming">Import next 3 days</button><button class="btn secondary" data-act="data-fill-missing">Repair missing dates</button><button class="btn secondary" data-act="data-ap-refresh">Sync AP Top 25</button><button class="btn ghost" data-act="data-health-refresh">Refresh status</button></div>'
        +'<p class="hint section-gap">Verified final game results feed fantasy scoring; ranking and achievement inputs determine their bonuses. Import errors are kept in the audit log.</p></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Historical seasons','2021–22 through 2025–26')
        +'<p class="hint">Historical games import across all five years every minute, independently of live scores. NET standings and verified achievements are required for complete fantasy totals.</p>'
        +(historicalRows||empty('Historical import has not started'))
        +'<div class="button-row section-gap"><button class="btn secondary" data-act="data-history-backfill">Import 8 historical dates</button></div>'
        +'<div class="form-row section-gap"><label for="history-net-season">Historical NET season</label><select class="field" id="history-net-season">'+['2025-26','2024-25','2023-24','2022-23','2021-22'].map(year=>'<option value="'+year+'">'+year+'</option>').join('')+'</select></div>'
        +'<button class="btn secondary" data-act="data-history-net">Import archived NET rankings</button></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Preliminary quadrant rankings',resultsStatus?.quadrant_source==='torvik'?'Bart Torvik T-Rank · '+escapeHTML(resultsStatus.quadrant_date||'') : resultsStatus?.quadrant_source==='net'?'Official NCAA NET active':'Awaiting T-Rank rankings')
        +'<p class="hint">Until official NCAA NET is available, T-Rank serves as the provisional ranking for Q1/Q1A/Q2 points. League standings recalculate automatically when verified NCAA NET replaces it. Historical seasons are unchanged.</p>'
        +'<div class="button-row section-gap"><button class="btn secondary" data-act="data-torvik-refresh" '+(resultsStatus?.quadrant_source==='net'?'disabled':'')+'>Sync preliminary T-Rank</button></div></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('NCAA NET rankings',resultsStatus?.net_date?'Latest: '+escapeHTML(resultsStatus.net_date)+' · '+resultsStatus.net_count+' teams':'No current-season NET rankings')
        +'<p class="hint">NCAA NET typically starts in December. For now, upload a verified list using ESPN team IDs. Each line should contain an ESPN team ID and its NET rank, separated by a comma. A current-season list of at least 350 teams is required. Previous-season rankings must not be imported.</p>'
        +'<div class="form-row section-gap"><label for="data-net-date">Snapshot date</label><input class="field" type="date" id="data-net-date" value="'+escapeHTML(today)+'"/></div>'
        +'<div class="form-row"><label for="data-net-csv">NET ranking rows (ESPN ID, rank)</label><textarea class="field data-csv" id="data-net-csv" rows="5" placeholder="57,4&#10;150,1"></textarea></div>'
        +'<div class="button-row"><button class="btn secondary" data-act="data-net-import">Import verified rankings</button><button class="btn secondary" data-act="data-net-fetch" '+(today<season().slice(0,4)+'-12-08'?'disabled':'')+'>Fetch NCAA NET</button></div></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Verified season achievements')
        +'<details class="data-award"><summary>Add a confirmed conference or postseason result</summary>'
        +'<div class="form-row section-gap"><label for="data-award-season">Season</label><select class="field" id="data-award-season">'+Array.from({length:Number(season().slice(0,4))-2021+1},(_,i)=>{const y=Number(season().slice(0,4))-i;const label=y+'-'+String((y+1)%100).padStart(2,'0');return '<option value="'+label+'">'+label+'</option>';}).join('')+'</select></div>'
        +'<div class="form-row"><label for="data-award-school">Program</label><select class="field" id="data-award-school">'+progOptions+'</select></div>'
        +'<div class="form-row"><label for="data-award-type">Achievement</label><select class="field" id="data-award-type">'+awardOptions.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></div>'
        +'<div class="form-row"><label for="data-award-value">Value (1 for titles, seed/rank for rankings)</label><input class="field" type="number" id="data-award-value" min="0" max="400" value="1"/></div>'
        +'<div class="form-row"><label for="data-award-source">Source or official reference</label><input class="field" id="data-award-source" placeholder="Official conference / NCAA bracket URL"/></div>'
        +'<button class="btn" data-act="data-award-save">Save verified achievement</button></details></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Import log')
        +(runs.length?runs.map(run=>'<div class="data-run"><span class="'+(run.status==='error'?'failed':'')+'">'+escapeHTML(run.status.toUpperCase())+'</span><div><strong>'+escapeHTML(run.target_date||'—')+'</strong><small>'+escapeHTML(run.job)+' · '+Number(run.matched||0)+' games, '+Number(run.changed||0)+' changed</small>'+(run.error_text?'<small class="data-error">'+escapeHTML(run.error_text)+'</small>':'')+'</div></div>').join(''):empty('No imports yet'))+'</section>';
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
        +'<p class="settings-hint">Best-ball format: top '+Number(r.best_programs||8)+' counting programs. Change that number in Commissioner → General.</p>'
        +scoringGroups.map(([title,fields])=>'<div class="section-gap"><h3 class="subhead">'+escapeHTML(title)+'</h3><div class="settings-grid">'
        +fields.map(([key,label])=>'<div class="form-row"><label for="score-'+key+'">'+escapeHTML(label)+'</label><input class="field" id="score-'+key+'" type="number" min="0" max="100" step="0.25" value="'+Number(r[key]||0)+'"/></div>').join('')+'</div></div>').join('')
        +'<p class="settings-hint">Q1A stacks with Q1. No KenPom or AP Poll points. Changing a scoring weight does not import game results.</p>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-scoring">Save scoring</button><button class="btn secondary" data-act="tab" data-id="scoring">View rules</button></div></section>';
    }else if(adminSection==='trades'){
      body='<section class="panel setting-panel">'+panelHeading('Trading')
        +'<label class="settings-toggle" for="trading-enabled"><div><strong>Allow program trades</strong><span>Managers can propose and accept trades after the initial draft.</span></div><input id="trading-enabled" type="checkbox" '+(settings.trading_enabled?'checked':'')+'/></label>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-trades">Save trading settings</button></div></section>';
    }else if(adminSection==='waivers'){
      const pending=(league.waiver_claims||[]).filter(c=>c.status==='pending');
      const pendingRows=pending.map(c=>{
        const u=members().find(m=>m.id===c.manager_id);
        const p=programs().find(p=>p.id===c.program_id);
        const drop=programs().find(p=>p.id===c.drop_program_id);
        return '<div class="claim-review"><div class="grow"><strong>'+escapeHTML(p?.name||'Program')+'</strong><small>'+escapeHTML(u?.display_name||'Manager')+(drop?' · Drops '+escapeHTML(drop.name):'')+'</small></div><div class="button-row"><button class="btn small" data-act="waiver-review" data-id="'+escapeHTML(c.id)+'" data-mode="approve">Approve</button><button class="btn small secondary" data-act="waiver-review" data-id="'+escapeHTML(c.id)+'" data-mode="deny">Deny</button></div></div>';
      }).join('');
      body='<section class="panel setting-panel">'+panelHeading('Waivers')
        +'<label class="settings-toggle" for="waivers-enabled"><div><strong>Enable waivers</strong><span>Managers can request unrostered schools after the inaugural draft. Claims require commissioner approval.</span></div><input id="waivers-enabled" type="checkbox" '+(settings.waivers_enabled?'checked':'')+'/></label>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-waivers">Save setting</button></div></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Pending claims',pending.length+' awaiting review')+(pendingRows||empty('No pending claims'))+'</section>';
    }else if(adminSection==='seasons'){
      const archives=league.archives||[];
      const options='<option value="">Not recorded</option>'+members().map(u=>'<option value="'+escapeHTML(u.id)+'">'+escapeHTML(u.display_name)+'</option>').join('');
      body='<section class="panel setting-panel">'+panelHeading('Current season')
        +'<div class="season-current"><strong>'+escapeHTML(season())+'</strong><span>'+owners().length+' programs · '+members().length+' managers</span></div>'
        +'<p class="hint section-gap">Archiving preserves each roster and creates the next season without another draft. Existing ownership and trades remain intact.</p>'
        +'<div class="button-row section-gap"><button class="btn danger" data-act="season-rollover" '+(settings.draft_status!=='finished'?'disabled':'')+'>Archive season & advance</button></div></section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Archived seasons')+(archives.length?archives.map(a=>'<div class="season-archive-item"><div class="grow"><strong>'+escapeHTML(a.season)+'</strong><small>Champion: '+escapeHTML(members().find(u=>u.id===a.champion_manager_id)?.display_name||'Not recorded')+'</small></div><select class="field season-champion-select" data-season="'+escapeHTML(a.season)+'">'+options.replace('<option value="'+escapeHTML(a.champion_manager_id||'')+'"','<option selected value="'+escapeHTML(a.champion_manager_id||'')+'"')+'</select><button class="btn small secondary" data-act="season-champion" data-id="'+escapeHTML(a.season)+'">Save</button></div>').join(''):empty('No archived seasons'))+'</section>';

    }
    return heading('', 'Commissioner')+'<div class="commissioner-layout">'+menu+'<div class="commissioner-body">'+body+'</div></div>';
  }
  async function action(button){
    const act=button.dataset.act,id=button.dataset.id;
    if(act==='settings-remove-photo'){avatarDraft='';const preview=root.querySelector('.settings-avatar-preview');if(preview)preview.innerHTML=avatar({...me,avatar_data:null});const hint=root.querySelector('#photo-hint');if(hint)hint.textContent='Profile photo will be removed when you save.';return;}
    if(act==='tab'){current=id;render();if(current==='programs')filterPrograms();if(current==='results')loadResults();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(act==='program-season'){selectedProgramSeason=id;render();return;}
    if(act==='rating-season'){ratingSeason=(Number(id)-1)+'-'+String(Number(id)%100).padStart(2,'0');render();filterRatings();return;}
    if(act==='rating-sort'){ratingSort=id;render();filterRatings();return;}
    if(act==='ratings-refresh'){delete ratingError[Number(id)];delete ratingCache[Number(id)];loadRatings(Number(id),true);render();return;}
    if(act==='school-mode'){programMode=id;render();if(id==='leaders'){if(!schoolLeaders)loadSchoolLeaders();else filterSchoolLeaders();}else if(id==='ratings')filterRatings();else filterPrograms();return;}
    if(act==='leaders-season'){leaderSeason=id;render();filterSchoolLeaders();return;}
    if(act==='directory-sort'){programSort=id;programShown=36;render();filterPrograms();return;}
    if(act==='open-program'){
      programBackPage=current==='program-detail'?programBackPage:current;
      selectedProgramId=id;selectedProgramSeason=programMode==='leaders'&&leaderSeason!=='all'?leaderSeason:season();current='program-detail';render();loadProgramResults(id);window.scrollTo({top:0});return;
    }
    if(act==='open-manager'){
      managerBackPage=current==='manager-detail'?managerBackPage:current;
      selectedManagerId=id;current='manager-detail';render();window.scrollTo({top:0});return;
    }
    if(act==='commish-section'){adminSection=id;render();if(id==='data')loadResults();return;}
    if(act==='load-programs'){programShown+=36;filterPrograms();return;}
    if(act==='directory-conference'){programConference=id;programLetter='all';programShown=36;render();filterPrograms();return;}
    if(act==='directory-ownership'){programOwnership=id;programShown=36;render();filterPrograms();return;}
    if(act==='directory-letter'){programLetter=id;programShown=36;render();filterPrograms();return;}
    if(act==='draft-history-toggle'){showAllDraft=!showAllDraft;render();return;}
    if(act==='draft-board-mode'){draftRoundView=button.dataset.mode;render();return;}
    if(act==='results-date'){resultsSelectedDay=button.dataset.date;resultsShown=40;loadResults();return;}
    if(act==='results-shift'){resultsSelectedDay=shiftResultsDay(resultsSelectedDay||resultsToday(),Number(button.dataset.dir));resultsShown=40;loadResults();return;}
    if(act==='results-today'){resultsSelectedDay=resultsToday();resultsShown=40;loadResults();return;}
    if(act==='results-scope'){resultsScope=button.dataset.scope;resultsShown=40;render();return;}
    if(act==='results-conference'){resultsConference=id;resultsShown=40;render();return;}
    if(act==='results-more'){resultsShown+=40;render();return;}

    if(act==='draft-round-change'){draftRoundView=id;render();return;}
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
      if(act==='results-import-day'){
        const result=await api('admin/data/sync',{date:resultsSelectedDay||resultsToday()});
        notice('Imported '+result.matched+' games from '+result.date+'.');
        await loadResults();busy=false;return;
      }
      if(act==='data-sync'){
        const data=await api('admin/data/sync',{date:v('#data-date')});
        notice('Imported '+data.matched+' games · '+data.changed+' updated.');
        await loadResults();
      }else if(act==='data-history-backfill'){
        const data=await api('admin/data/history-backfill',{days:8});
        const failed=(data.results||[]).filter(x=>!x.ok);
        notice('Checked '+(data.results||[]).length+' historical dates'+(failed.length?' · '+failed.length+' errors':''),failed.length>0);
        await loadResults();
      }else if(act==='data-history-net'){
        const data=await api('admin/data/history-net',{season:v('#history-net-season')});
        notice(data.duplicate?'Historical NET was already verified.':'Imported '+data.count+' historical NET rankings for '+data.season+'.');
        await loadResults();
      }else if(act==='data-backfill'){
        const result=await api('admin/data/backfill',{days:7});
        const failed=(result.days||[]).filter(x=>!x.ok);
        notice('Checked '+(result.days||[]).length+' dates'+(failed.length?' · '+failed.length+' failures':''),failed.length>0);
        await loadResults();
      }else if(act==='data-upcoming'){
        const result=await api('admin/data/upcoming',{});
        const failed=(result.days||[]).filter(x=>!x.ok);
        notice('Checked '+(result.days||[]).length+' upcoming dates'+(failed.length?' · '+failed.length+' failures':''),failed.length>0);
        await loadResults();
      }else if(act==='data-torvik-refresh'){
        const ranks=await api('admin/data/torvik-refresh',{});
        notice(ranks.skipped||'Imported '+ranks.matched+' provisional T-Rank schools.');
        standingsFetchedAt=0;schoolLeaders=null;programResultCache={};
        await loadResults();
      }else if(act==='data-ap-refresh'){
        const poll=await api('admin/data/ap-refresh',{});
        notice('Verified '+poll.count+' AP-ranked teams.');
        await loadResults();
      }else if(act==='data-fill-missing'){
        const result=await api('admin/data/fill-missing',{days:4});
        const failures=(result.days||[]).filter(x=>!x.ok);
        notice('Rechecked '+(result.days||[]).length+' missing dates'+(failures.length?' · '+failures.length+' failed':''),failures.length>0);
        await loadResults();
      }else if(act==='data-net-fetch'){
        const outcome=await api('admin/data/net-auto',{});
        notice('Saved '+outcome.count+' NCAA NET records.');await loadResults();
      }else if(act==='data-health-refresh'){await loadResults();notice('Data status refreshed.');
      }else if(act==='data-auto-save'){
        await api('admin/data/auto',{enabled:!!document.querySelector('#data-auto')?.checked});
        notice('Automatic collection setting saved.');await loadResults();
      }else if(act==='data-net-import'){
        const csv=v('#data-net-csv').trim();
        if(csv.split(/\r?\n/).filter(Boolean).length<350)throw new Error('Provide a full NET ranking list (at least 350 teams).');
        const outcome=await api('admin/data/net',{date:v('#data-net-date'),csv});
        notice('Saved '+outcome.count+' NET rankings.');await loadResults();
      }else if(act==='data-award-save'){
        await api('admin/data/award',{season:v('#data-award-season'),program_id:v('#data-award-school'),award_type:v('#data-award-type'),value:Number(v('#data-award-value')),source_note:v('#data-award-source')});
        notice('Verified achievement saved.');
      }else if(act==='refresh-results'){await loadResults();return;}
      if(act==='save-clock'){
        await api('admin/clock',{seconds:Number(v('#clock-duration'))});
        notice('Draft clock saved.');
      }else if(act==='save-waivers'){
        await api('admin/waiver-settings',{enabled:!!document.querySelector('#waivers-enabled')?.checked});
        notice('Waiver settings saved.');
      }else if(act==='season-rollover'){
        if(!window.confirm('Archive '+season()+' and start the next season? All teams keep the same programs. This cannot be undone.')){busy=false;return;}
        const result=await api('admin/season/rollover',{});
        selectedHistorySeason=result.archived;
        notice('Archived '+result.archived+'. The new season is '+result.current_season+'.');
      }else if(act==='season-champion'){
        const select=[...document.querySelectorAll('.season-champion-select')].find(el=>el.dataset.season===id);
        await api('admin/season/champion',{season:id,manager_id:select?.value||''});
        notice('Archived champion updated.');
      }else if(act==='team-drop'){
        if(!league.settings.waivers_enabled||league.settings.draft_status!=='finished')throw new Error('Waivers are not available.');
        const school=programs().find(p=>p.id===id);
        if(!school||programOwned(id)?.manager_id!==me.id)throw new Error('You do not own this program.');
        if(!window.confirm('Release '+school.name+' from your permanent roster? The program will become available to the league.')){busy=false;return;}
        await api('waiver/drop',{program_id:id});
        notice(school.name+' released.');
      }else if(act==='waiver-claim'){
        const programId=v('#waiver-program'),dropId=v('#waiver-drop');
        if(!programId)throw new Error('Choose an available school.');
        await api('waiver/claim',{program_id:programId,drop_program_id:dropId||null});
        notice('Waiver request submitted.');
      }else if(act==='waiver-cancel'){
        await api('waiver/cancel',{claim_id:id});notice('Claim cancelled.');
      }else if(act==='waiver-drop'){
        const programId=v('#waiver-release');
        if(!programId)throw new Error('Choose a school.');
        const school=programs().find(p=>p.id===programId);
        if(!window.confirm('Drop '+(school?.name||'this program')+' from your permanent roster?')){busy=false;return;}
        await api('waiver/drop',{program_id:programId});notice('Program released.');
      }else if(act==='waiver-review'){
        if(!window.confirm((button.dataset.mode==='approve'?'Approve':'Deny')+' this waiver claim?')){busy=false;return;}
        await api('admin/waiver/review',{claim_id:id,mode:button.dataset.mode});
        notice('Waiver claim reviewed.');
      }else if(act==='save-general'){
        await api('admin/general',{league_name:v('#league-name').trim(),max_managers:Number(v('#manager-limit')||league.settings.max_managers)});
        notice('General settings saved.');
      }else if(act==='save-bestball'){
        const count=Number(v('#bestball-count'));
        if(!Number.isInteger(count)||count<1||count>Number(league.settings.rounds))throw new Error('Select between 1 and '+league.settings.rounds+' counting programs.');
        await api('admin/bestball',{count});
        notice('Best-ball updated: top '+count+' programs count.');
      }else if(act==='save-scoring'){
        const scoring={};
        for(const key of Object.keys(scoreRules()))scoring[key]=key==='best_programs'?Number(scoreRules().best_programs):Number(v('#score-'+key));
        await api('admin/scoring-settings',{scoring});
        notice('Scoring weights saved.');
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
      if(type==='account-profile'){
        if(avatarDraft!==null)data.avatar_data=avatarDraft;
        const changed=await api('account/profile',data);
        avatarDraft=null;me=changed.user;
        await refresh(true);
        notice('Your team profile was updated.');
      }else if(type==='account-password'){
        if(data.new_password!==data.confirm_password)throw new Error('The two new passwords do not match.');
        await api('account/password',{current_password:data.current_password,new_password:data.new_password});
        form.reset();
        notice('Password updated. Other sessions have been signed out.');
      }else if(type==='program'){await api('admin/program',data);notice('Program added to pool.');await refresh(true);}
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
  root.addEventListener('change',async e=>{
    if(e.target?.id==='settings-photo-input'){
      const file=e.target.files?.[0];
      if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){
        notice('Choose a JPEG, PNG or WebP photo under 8 MB.',true);e.target.value='';return;
      }
      const url=URL.createObjectURL(file),image=new Image();
      try{
        await new Promise((resolve,reject)=>{
          image.onload=resolve;image.onerror=()=>reject(new Error('The image could not be opened.'));
          image.src=url;
        });
        const canvas=document.createElement('canvas'),size=192;
        canvas.width=size;canvas.height=size;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Your browser cannot resize profile images.');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
        const width=image.naturalWidth,height=image.naturalHeight,side=Math.min(width,height);
        ctx.drawImage(image,(width-side)/2,(height-side)/2,side,side,0,0,size,size);
        const encoded=canvas.toDataURL('image/jpeg',0.76);
        if(encoded.length>82000)throw new Error('Image is still too large after resizing.');
        avatarDraft=encoded;
        const preview=root.querySelector('.settings-avatar-preview');
        if(preview)preview.innerHTML=avatar({...me,avatar_data:encoded});
        const hint=root.querySelector('#photo-hint');
        if(hint)hint.textContent='New photo ready. Save your profile to publish it.';
        notice('Profile photo ready to save.');
      }catch(error){notice(String(error.message||error),true);}
      finally{URL.revokeObjectURL(url);e.target.value='';}
      return;
    }
    if(e.target?.id==='trade-target'){tradeTargetId=e.target.value;render();}
    if(e.target?.id==='program-conference'){programConference=e.target.value;programLetter='all';programShown=36;render();filterPrograms();}
    if(e.target?.id==='program-ownership'){programOwnership=e.target.value;programShown=36;render();filterPrograms();}
    if(e.target?.id==='directory-sort'){programSort=e.target.value;programShown=36;render();filterPrograms();}
    if(e.target?.id==='history-season'){selectedHistorySeason=e.target.value;render();}
    if(e.target?.id==='draft-round'){draftRoundView=e.target.value;render();}
    if(e.target?.id==='scoreboard-conference'){resultsConference=e.target.value;render();}
    if(e.target?.id==='scoreboard-date'){resultsSelectedDay=e.target.value;resultsShown=40;loadResults();}
    if(e.target?.matches?.('input[name="trade-give"], input[name="trade-receive"]'))updateTradeSelections();
  });
  root.addEventListener('input',e=>{
    if(e.target?.id==='daily-team-search'){
      resultsSearch=e.target.value;
      resultsShown=40;
      const caret=e.target.selectionStart;
      render();
      const field=root.querySelector('#daily-team-search');
      if(field){field.focus({preventScroll:true});if(caret!==null)field.setSelectionRange(caret,caret);}
      return;
    }
    if(e.target?.id==='leader-search'){leaderQuery=e.target.value;filterSchoolLeaders();return;}
    if(e.target?.id==='rating-search'){ratingQuery=e.target.value;filterRatings();return;}
    if(e.target?.id!=='program-search')return;
    programQuery=e.target.value;
    programShown=36;
    filterPrograms();
  });
  // Startup guard: a missing helper or failed initialization must not leave
  // the loading placeholder on screen indefinitely.
  const startupFailure=e=>{
    console.error('Boek Dynasty startup failed',e);
    root.innerHTML='<div class="auth-layout"><main class="auth-panel"><div class="auth-card"><div class="auth-section"><h1>Unable to open Boek Dynasty</h1><p class="auth-desc">The application encountered a startup error. Please reload to try again.</p><a class="btn" href="/">Reload site</a></div></div></main></div>';
  };
  try{
    setInterval(updateDraftClock,1000);
    Promise.resolve(boot()).catch(startupFailure);
  }catch(e){startupFailure(e);}
})();