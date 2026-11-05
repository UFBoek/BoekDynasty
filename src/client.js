(function startApp(){
  const root=document.querySelector('#app');
  // Same-origin Workers use first-party HttpOnly session cookies. The hosted
  // GitHub Pages build uses persistent bearer storage for remembered sessions
  // because its Supabase API is on a different origin.
  const TOKEN_KEY='boek_dynasty_session';
  const readTokenFrom=(kind)=>{
    try{return (kind==='local'?localStorage:sessionStorage).getItem(TOKEN_KEY)||'';}catch{return '';}
  };
  const clearStoredTokens=()=>{
    for(const kind of ['local','session']){
      try{(kind==='local'?localStorage:sessionStorage).removeItem(TOKEN_KEY);}catch(e){}
    }
  };
  let bearerToken=readTokenFrom('session')||readTokenFrom('local');
  const saveSignedInToken=(token,rememberDevice)=>{
    clearStoredTokens();
    bearerToken=token;
    if(rememberDevice&&typeof API_BASE!=='undefined'){
      // The GitHub Pages build cannot use the same-origin Cloudflare cookie.
      try{localStorage.setItem(TOKEN_KEY,token);}catch(e){}
    }else if(!rememberDevice){
      try{sessionStorage.setItem(TOKEN_KEY,token);}catch(e){}
    }
  };
  const forgetSignedInToken=()=>{bearerToken='';clearStoredTokens();};
  const ICONS={home:'⌂',team:'♙',programs:'▦',draft:'▤',trades:'⇄',league:'▥',commissioner:'⚙',more:'⋯'};
  const iconSVG=(name)=>{
    const paths={
      home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      team:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
      programs:'<path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h1m4 0h1M9 16h1m4 0h1"/>',
      draft:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
      'draft-order':'<path d="M4 19h16M4 12l3-3 4 3 4-3 5 3M4 5h16"/>',
      league:'<path d="M4 20h16M7 17v-5h3v5m2 0V5h3v12m2 0V9h3v8"/>',
      results:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4m-4 4h6m3-5h2m-2 4h2"/>',
      trades:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
      scoring:'<path d="M4 4h16v16H4zM8 10h8M8 14h5"/>',
      commissioner:'<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="5"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.5 1.5 0 0 0 .3 1.7l.1.1-1.8 1.8-.1-.1a1.5 1.5 0 0 0-1.7-.3l-.2.1a1.5 1.5 0 0 0-.9 1.4V20H9v-.3a1.5 1.5 0 0 0-.9-1.4l-.2-.1a1.5 1.5 0 0 0-1.7.3l-.1.1-1.8-1.8.1-.1A1.5 1.5 0 0 0 4.7 15l-.1-.2a1.5 1.5 0 0 0-1.4-.9H3v-3.8h.2a1.5 1.5 0 0 0 1.4-.9l.1-.2a1.5 1.5 0 0 0-.3-1.7l-.1-.1 1.8-1.8.1.1a1.5 1.5 0 0 0 1.7.3l.2-.1A1.5 1.5 0 0 0 9 4.3V4h6v.3a1.5 1.5 0 0 0 .9 1.4l.2.1a1.5 1.5 0 0 0 1.7-.3l.1-.1 1.8 1.8-.1.1a1.5 1.5 0 0 0-.3 1.7l.1.2a1.5 1.5 0 0 0 1.4.9h.2v3.8h-.2a1.5 1.5 0 0 0-1.4.9Z"/>' ,
      notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
      more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.more)+'</svg>';
  };
  const names={notifications:'Notifications',home:'League Overview',team:'My Team',programs:'Programs',draft:'Draft',trades:'Trades',league:'Standings',scoring:'Scoring',commissioner:'Commissioner',settings:'My Settings',more:'More','draft-order':'Draft Order',waivers:'Waivers',history:'Dynasty history',results:'Results','program-detail':'Program','manager-detail':'Manager'};
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
  let overviewGames=[],overviewGamesDay='',overviewGamesFetchedAt=0,overviewGamesLoading=false,overviewGamesError='',overviewRankingSource='pending';
  let avatarDraft=null;
  let inviteLink='', passwordResetReceipt=null, busy=false, syncActive=false, refreshId=null,toastId=null,tradeTargetId='',importError='',autoImportAttempted=false;
  let adminSection='general',draftOrderPreview=[];
  let raceState={phase:'idle',id:'',order:[],progress:{},run:0};
  let raceFrame=0;
  let activitySnapshot=null,activityLoading=false,activityError='',activityRange='7d',activityMemberFilter='all',activityFetchedAt=0;
  let activityLastPage='',activityLastPing=0;
  let notificationSnapshot=null,notificationLoading=false,notificationFetchedAt=0,notificationError='';
  let notificationAdmin=null,notificationAdminLoading=false,notificationAdminFetchedAt=0,notificationAdminError='';
  let pushDeviceActive=false,pushDeviceChecking=false;

  let poolDraftConfs=null,poolDraftSchools=null,poolDirty=false;
  let poolQuery='',poolConferenceFilter='all',poolScope='all',poolShown=70;
  let programQuery='',programConference='all',programOwnership='all',programShown=36,programLetter='all',programSort='name',showAllDraft=false,lastAutoPoll=0;
  let programMode='directory',leaderSeason='all',schoolLeaders=null,schoolLeadersLoading=false,schoolLeadersError='',leaderQuery='';
  let ratingSeason='',ratingSort='rank',ratingQuery='',ratingCache={},ratingLoading={},ratingError={};
  let leaderConference='all',leaderOwnership='all',leaderOrder='points',leaderShown=40;
  let ratingConference='all',ratingOwnership='all',ratingShown=40;
  let selectedProgramId='',selectedManagerId='',programBackPage='programs',managerBackPage='league',selectedHistorySeason='',selectedProgramSeason='',draftRoundView='all';
  let programBackScroll=0,managerBackScroll=0;
  let programProfileTab='overview';
  let draftQuery='',draftConference='all',draftSort='power',draftScope='all',draftShown=30,draftSelectedProgram='';
  let draftWatchlist=[],draftWatchlistOwner='',draftQueueExpanded=true,draftCompareExpanded=false,draftQueueDragging='';
  let draftQueueVersion=0,draftQueueDirty=false,draftQueueSaving=false,draftQueueRetryTimer=null,draftQueueSyncError=false;
  let appError='';
  let globalSearchOpen=false,globalSearchQuery='',pendingUiRefresh=false;
  let resultsStatus=null,resultsGames=[],resultsError='',resultsLoading=false,programResultCache={},resultsSeason='',netImportError='';
  let integritySnapshot=null,integrityLoading=false,integrityError='',integrityFetchedAt=0,scoringAudit=null;
  let programScheduleCache={},programScheduleLoading={},programScheduleError={},programScheduleView='all';
  let resultsSelectedDay='',resultsConference='all',resultsScope='league',resultsAP=[],resultsAPAsOf=null,resultsAPSource='',resultsFetchedAt=0,resultsRequest=0;
  let resultsLoadedDay='';
  let resultsSearch='',resultsShown=40,resultsStatusFilter='all',resultsNetDate=null,resultsRecordNote='',resultsQuadNote='',resultsRankingSource='pending',resultsRankingDate=null;
  const escapeHTML=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials=(s)=>String(s||'??').trim().split(/\s+/).map(v=>v[0]).slice(0,2).join('').toUpperCase();
  const fmt=(v)=>Number(v||0).toLocaleString('en-US');
  const conf=(id)=>conferenceNames[String(id)]||'Conference';
  const v=(sel)=>document.querySelector(sel)?.value||'';
  const programs=()=>league?.programs||[];
  const members=()=>league?.users||[];
  const activeConfs=()=>league?.settings?.conferences||[];
  const includedSchools=()=>league?.settings?.included_programs||[];
  const excludedSchools=()=>league?.settings?.excluded_programs||[];
  const programEligible=p=>!!p&&!excludedSchools().includes(String(p.id))&&
    (activeConfs().includes(String(p.conference_id))||includedSchools().includes(String(p.id)));
  const eligiblePrograms=()=>programs().filter(programEligible);
  const eligibleConferenceIds=()=>[...new Set(eligiblePrograms().map(p=>String(p.conference_id)))];
  function initPoolDraft(){
    if(poolDraftConfs!==null&&poolDraftSchools!==null)return;
    poolDraftConfs=new Set(activeConfs().map(String));
    poolDraftSchools=new Set(eligiblePrograms().map(p=>String(p.id)));
    poolDirty=false;
  }
  function resetPoolDraft(){
    poolDraftConfs=null;poolDraftSchools=null;poolDirty=false;
    initPoolDraft();
  }
  const poolVisible=()=>{
    initPoolDraft();
    const search=poolQuery.trim().toLowerCase();
    return programs().filter(p=>
      (poolConferenceFilter==='all'||String(p.conference_id)===poolConferenceFilter)&&
      (poolScope==='all'||(poolScope==='included')===poolDraftSchools.has(String(p.id)))&&
      (!search||(p.name+' '+(p.abbr||'')+' '+conf(p.conference_id)).toLowerCase().includes(search))
    ).sort((a,b)=>a.name.localeCompare(b.name));
  };
  function poolSchoolRows(){
    const matching=poolVisible();
    const rows=matching.slice(0,poolShown).map(p=>{
      const selected=poolDraftSchools.has(String(p.id));
      return '<button type="button" class="pool-school '+(selected?'is-selected':'')+'" data-act="pool-school" data-id="'+escapeHTML(p.id)+'" aria-pressed="'+selected+'">'
        +'<span class="pool-check" aria-hidden="true">'+(selected?'✓':'')+'</span>'+img(p)
        +'<span class="pool-school-name"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span>'
        +'<span class="pool-school-status">'+(selected?'Included':'Not included')+'</span></button>';
    }).join('');
    return (rows||empty('No matching schools','Try changing the search or filters.'))
      +(matching.length>poolShown?'<button class="btn secondary pool-load" type="button" data-act="pool-more">Show more · '+(matching.length-poolShown)+' remaining</button>':'')
      +'<p class="pool-list-count">Showing '+Math.min(matching.length,poolShown)+' of '+matching.length+' matching programs</p>';
  }
  function updatePoolList(){
    const list=root.querySelector('#pool-school-results');
    if(list)list.innerHTML=poolSchoolRows();
    const counter=root.querySelector('#pool-selected-count');
    if(counter)counter.textContent=poolDraftSchools.size+' selected';
    const state=root.querySelector('#pool-save-state');
    if(state)state.textContent=poolDirty?'Unsaved changes':'All changes saved';
  }
  function renderPoolPreservingScroll(){
    const previous=root.querySelector('#pool-school-results')?.scrollTop||0;
    render();
    const next=root.querySelector('#pool-school-results');
    if(next)next.scrollTop=previous;
  }
  const picks=()=>league?.picks||[];
  const owners=()=>league?.ownership||[];
  const programOwned=(id)=>owners().find(p=>p.program_id===id);
  const myPrograms=()=>owners().filter(o=>o.manager_id===me?.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean);
  const season=()=>league?.season||'2026-27';
  const order=()=>league?.draft_order||members().map(x=>x.id);
  const originalDraftOwner=(slot,arr=order())=>{
    if(!arr.length||slot<1)return null;
    const i=slot-1,round=Math.floor(i/arr.length),pos=i%arr.length;
    return arr[round%2===0?pos:arr.length-1-pos]||null;
  };
  const draftOwnerOverrides=()=>new Map((league?.draft_pick_owners||[]).map(p=>[Number(p.overall),p.owner_manager_id]));
  const draftOwner=(slot,arr=order())=>draftOwnerOverrides().get(Number(slot))||originalDraftOwner(slot,arr);
  const futureDraftPicks=id=>Array.from({length:Math.max(0,draftTotal()-picks().length)},
    (_,i)=>picks().length+i+1).filter(slot=>draftOwner(slot)===id);
  const draftPickText=slot=>'Round '+(Math.floor((slot-1)/Math.max(1,order().length))+1)+' · #'+slot;
  const nextManager=()=>{
    const arr=order();
    if(!arr.length)return null;
    const idx=picks().length;
    const round=Math.floor(idx/arr.length);
    if(round>=Number(league.settings.rounds))return null;
    const chosen=draftOwner(idx+1,arr);
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
    const res=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',
      headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(bearerToken?{Authorization:'Bearer '+bearerToken}:{})},
      body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});
    const parsed=await res.json().catch(()=>({error:'Server returned an invalid response.'}));
    if(!res.ok){
      if(res.status===401&&path==='state')forgetSignedInToken();
      const error=new Error(parsed.error||'Request failed.');
      error.status=res.status;error.payload=parsed;
      throw error;
    }
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
    'unc asheville bulldogs':'unc asheville','nc st wolfpack':'n c st',
    'utep miners':'utep','utsa roadrunners':'utsa','fgcu eagles':'fgcu',
    'ualbany great danes':'albany','sam houston bearkats':'sam houston st',
    'pennsylvania quakers':'penn','uic flames':'illinois chicago',
    'long island sharks':'liu','long island sharks':'liu',
    'ut martin skyhawks':'tennessee martin','loyola maryland greyhounds':'loyola md',
    'mcneese cowboys':'mcneese st','nicholls colonels':'nicholls st',
    'se louisiana lions':'southeastern louisiana','grambling tigers':'grambling st',
    'app st mountaineers':'appalachian st','ul monroe warhawks':'louisiana monroe',
    'hawai i rainbow warriors':'hawaii','iu indianapolis jaguars':'iu indy',
    'omaha mavericks':'nebraska omaha',
    'california baptist lancers':'cal baptist','south carolina upstate spartans':'usc upstate',
    'kansas city roos':'umkc','florida international panthers':'fiu',
    'lsu new orleans privateers':'new orleans',
    'texas a and m corpus christi islanders':'texas a and m corpus chris'
  };
  function ratingOf(program,year){
    const entries=ratingCache[year]?.teams;
    if(!program||!Array.isArray(entries))return null;
    const key=ratingName(program.name),explicit=ratingAliases[key]||'';
    if(explicit){
      const found=entries.find(x=>ratingName(x.team)===explicit);
      return found||null;
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
      if(Number(payload.season)!==year)throw Error('The ratings source returned a different season. Refusing to display mismatched T-Rank data.');
      if(!Array.isArray(payload.teams)||payload.teams.length<330)throw Error('Published ratings are incomplete.');
      ratingCache[year]=payload;
    }catch(e){ratingError[year]=e.message;}
    finally{delete ratingLoading[year];if(current==='programs'&&programMode==='ratings'||current==='program-detail'||current==='draft')render();}
  }
  const ratingExternalLinks=(year=ratingYear(season()))=>'<div class="rating-source-links">'
    +'<a href="https://barttorvik.com/trank.php?year='+year+'" target="_blank" rel="noopener noreferrer">Bart Torvik '+(year-1)+'-'+String(year%100).padStart(2,'0')+' ↗</a>'
    +'<a href="https://barttorvik.com/'+year+'_team_results.csv" target="_blank" rel="noopener noreferrer">Verify season data ↗</a>'
    +'<a href="https://evanmiya.com/" target="_blank" rel="noopener noreferrer">EvanMiya ↗</a>'
    +'<a href="https://kenpom.com/" target="_blank" rel="noopener noreferrer">KenPom ↗</a></div>';
  const stateFingerprint=(user,state)=>JSON.stringify([
    user,state?.season,state?.settings,state?.users,state?.programs,state?.ownership,
    state?.picks,state?.draft_order,state?.trades,state?.trade_items,
    state?.waiver_claims,state?.roster_transactions,state?.archives,state?.season_records
  ]);
  async function refresh(silent=false){
    try{
      // Keep checked trade selections when the 12-second poll updates the page.
      const chosen=silent&&!busy&&current==='trades'
        ?[...document.querySelectorAll('.trade-choice input:checked')].map(el=>el.name+':'+el.value):[];
      // Avoid dismissing the mobile keyboard every time the league auto-refreshes.
      const editing=silent&&!busy&&document.activeElement&&
        /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      const previousFingerprint=stateFingerprint(me,league);
      const previousRaceId=officialRace()?.id||'';
      const next=await api('state');
      const changed=previousFingerprint!==stateFingerprint(next.user,next);
      const oldScoringState=league?JSON.stringify([league.season,league.settings?.scoring,league.ownership]):'';
      const newScoringState=JSON.stringify([next.season,next.settings?.scoring,next.ownership]);
      if(oldScoringState!==newScoringState)standingsFetchedAt=0;
      me=next.user;league=next;appError='';
      reconcileDraftQueue();
      if(!silent)current='home';
      if(editing&&changed)pendingUiRefresh=true;
      if(!editing){
        if(!silent||changed||pendingUiRefresh){
          pendingUiRefresh=false;
          render();if(current==='programs')filterPrograms();
          if(current==='program-detail')loadProgramResults(selectedProgramId);
        }
        if(current==='draft-order'&&officialRace()?.id&&officialRace().id!==previousRaceId)
          startDraftRacePlayback(true);
        if(current==='draft-order'&&!officialRace()&&raceState.id){
          if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(raceFrame);
          raceState={phase:'idle',id:'',order:[],progress:{},run:raceState.run+1};render();
        }
        if(current==='results'&&Date.now()-resultsFetchedAt>55000&&!resultsLoading)loadResults();
        if(current==='home'&&(overviewGamesDay!==resultsToday()||Date.now()-overviewGamesFetchedAt>90000)&&!overviewGamesLoading)loadOverviewGames();
        if(['home','league','team','manager-detail'].includes(current)&&Date.now()-standingsFetchedAt>=60000&&!standingsLoading)loadStandings();
      }
      if(chosen.length){
        document.querySelectorAll('.trade-choice input').forEach(el=>{el.checked=chosen.includes(el.name+':'+el.value);});
        updateTradeSelections();
      }
    }catch(e){
      if(String(e.message).includes('Sign in required')){
        me=null;league=null;forgetSignedInToken();
        await loadPublic();renderAuth();
      }
      else if(!silent){notice(e.message,true);}
    }
  }
  async function loadPublic(){
    try{status=await api('status');authMode=status.needs_setup?'setup':selectedInvite?'join':'login';}catch(e){appError=e.message;}
  }

  // A low-volume, first-party presence pulse. A page view is only recorded when
  // the route/commissioner section actually changes, not on normal redraws.
  function pingActivity(force=false){
    if(!me||document.hidden)return;
    const context=current==='commissioner'?adminSection:'';
    const key=current+'|'+context;
    const navigation=activityLastPage!==key,now=Date.now();
    if(!force&&!navigation&&now-activityLastPing<55000)return;
    activityLastPage=key;activityLastPing=now;
    api('activity/ping',{page:current,context,navigation}).catch(()=>{});
  }
  async function loadActivity(force=false){
    if(!me||me.role!=='commissioner'||activityLoading)return;
    if(!force&&activitySnapshot&&Date.now()-activityFetchedAt<25000)return;
    activityLoading=true;activityError='';
    try{
      const data=await api('admin/activity?range='+activityRange);
      if(!Array.isArray(data.members)||!Array.isArray(data.events))throw Error('Invalid activity response.');
      activitySnapshot=data;activityFetchedAt=Date.now();
    }catch(e){activityError=e.message;activityFetchedAt=Date.now();}
    finally{
      activityLoading=false;
      if(current==='commissioner'&&adminSection==='activity')render();
    }
  }
  const activityAgo=(seconds,now=Date.now()/1000)=>{
    if(!Number(seconds))return 'Not seen yet';
    const delta=Math.max(0,Math.floor(now-Number(seconds)));
    if(delta<60)return 'Just now';
    if(delta<3600)return Math.floor(delta/60)+'m ago';
    if(delta<86400)return Math.floor(delta/3600)+'h ago';
    if(delta<604800)return Math.floor(delta/86400)+'d ago';
    return new Date(Number(seconds)*1000).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };
  async function loadNotifications(force=false){
    if(!me||notificationLoading||(!force&&Date.now()-notificationFetchedAt<30000))return;
    notificationLoading=true;
    try{
      const previous=Number(notificationSnapshot?.unread||0);
      notificationSnapshot=await api('notifications/inbox');
      notificationFetchedAt=Date.now();notificationError='';
      if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
        navigator.serviceWorker.ready.then(reg=>reg.pushManager?.getSubscription())
          .then(subscription=>{const active=!!subscription;if(active!==pushDeviceActive){pushDeviceActive=active;if(current==='notifications')render();}})
          .catch(()=>{});
      }
      if(typeof navigator!=='undefined'&&'setAppBadge' in navigator){
        const unread=Number(notificationSnapshot.unread||0);
        (unread?navigator.setAppBadge(unread):navigator.clearAppBadge?.())?.catch?.(()=>{});
      }
      if(current==='notifications'||previous!==Number(notificationSnapshot.unread||0)){
        const focused=document.activeElement;
        if(!focused||!['INPUT','SELECT','TEXTAREA'].includes(focused.tagName))render();
      }
    }catch(error){notificationError=String(error.message||error);notificationFetchedAt=Date.now();}
    finally{notificationLoading=false;}
  }
  async function verifyPendingNotificationEmail(){
    const token=new URLSearchParams(location.search).get('verify_email');
    if(!token||!me)return;
    try{
      await api('notifications/email/verify',{token});
      notice('Your notification email is verified.');
      current='notifications';loadNotifications(true);render();
    }catch(error){notice(String(error.message||error),true);}
    finally{
      const next=new URL(location.href);next.searchParams.delete('verify_email');
      if(typeof history!=='undefined')history.replaceState({},'',next.pathname+next.search+next.hash);
    }
  }
  async function loadNotificationAdmin(force=false){
    if(me?.role!=='commissioner'||notificationAdminLoading||
       (!force&&Date.now()-notificationAdminFetchedAt<30000))return;
    notificationAdminLoading=true;
    try{
      notificationAdmin=await api('admin/notifications');notificationAdminFetchedAt=Date.now();notificationAdminError='';
    }catch(error){notificationAdminError=String(error.message||error);notificationAdminFetchedAt=Date.now();}
    finally{
      notificationAdminLoading=false;
      if(current==='commissioner'&&adminSection==='notifications')render();
    }
  }
  const notificationTime=when=>new Date(Number(when)*1000).toLocaleString('en-US',
    {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  function notificationsPage(){
    const data=notificationSnapshot,prefs=data?.preferences||{},items=data?.notifications||[];
    const unread=Number(data?.unread||0),deviceCount=data?.devices?.length||0;
    const ios=typeof navigator!=='undefined'&&/iPad|iPhone|iPod/i.test(navigator.userAgent||'');
    const standalone=!!(typeof window!=='undefined'&&(window.matchMedia?.('(display-mode: standalone)')?.matches||
      navigator?.standalone));
    const pushSupported=typeof navigator!=='undefined'&&'serviceWorker' in navigator&&
      typeof window!=='undefined'&&'PushManager' in window&&'Notification' in window&&(!ios||standalone);
    const permission=typeof Notification!=='undefined'?Notification.permission:'unsupported';
    const toggle=(field,title,sub)=>'<label class="notification-preference"><div><strong>'+title+'</strong><span>'+sub+
      '</span></div><input type="checkbox" id="notification-pref-'+field+'" '+(prefs[field]!==false?'checked':'')+'/></label>';
    const list=items.map(n=>'<article class="notification-item '+(!n.read_at?'unread':'')+'">'
      +'<span class="notification-event-mark">'+(n.kind.startsWith('trade_')?'⇄':
        n.kind.startsWith('draft_')?'▤':n.kind==='announcement'?'✦':'✓')+'</span>'
      +'<div class="notification-item-copy"><div><strong>'+escapeHTML(n.title)+'</strong>'+
      (!n.read_at?'<span class="notification-new-dot" aria-label="Unread"></span>':'')+'</div>'
      +'<p>'+escapeHTML(n.body)+'</p><small>'+escapeHTML(notificationTime(n.created_at))+'</small></div>'
      +'<button class="btn small secondary" type="button" data-act="notification-open" data-id="'+escapeHTML(n.id)+
        '" data-target="'+escapeHTML(n.target||'notifications')+'">'+(n.read_at?'Open':'View')+'</button></article>').join('');
    const deviceMessage=!pushSupported?(ios&&!standalone?
      'On iPhone, use Share → Add to Home Screen, then open the installed app to enable alerts.':
      'This browser does not support push notifications. In-app alerts remain available.'):
      permission==='denied'?'Notifications are blocked in browser settings. Enable them there and return here.':
      pushDeviceActive?'Push enabled on this device. Alerts can arrive when the app is closed.':
      'Turn on notifications for important league events on this device.';
    return heading('LEAGUE ALERTS','Notifications','Draft picks, trades, and commissioner messages in one place.')
      +'<div class="notification-overview"><div><strong>'+unread+'</strong><span>Unread alerts</span></div>'
      +'<div><strong>'+deviceCount+'</strong><span>Registered devices</span></div>'
      +'<div><strong>'+items.length+'</strong><span>Recent notifications</span></div></div>'
      +'<section class="panel notification-permissions">'+panelHeading('Push notifications','Phone lock-screen and desktop alerts')
      +'<p class="hint">'+escapeHTML(deviceMessage)+'</p><div class="button-row section-gap">'
      +(pushSupported&&!pushDeviceActive?'<button class="btn" type="button" data-act="notifications-enable-push" '+(permission==='denied'?'disabled':'')+'>Enable on this device</button>':'')
      +(pushSupported&&pushDeviceActive?'<button class="btn secondary" type="button" data-act="notifications-disable-push">Disable this device</button>':'')
      +(pushSupported&&pushDeviceActive?'<button class="btn secondary" type="button" data-act="notifications-test">Send test alert</button>':'')
      +'</div></section>'
      +'<section class="panel section-gap notification-preferences">'+panelHeading('Your notification settings','Choose which league events notify you')
      +toggle('trades','Trade offers and responses','New offers, acceptances, declines and cancellations')
      +toggle('draft','Draft alerts','Draft start, on the clock, two picks away and completion')
      +toggle('announcements','Commissioner announcements','League updates from your commissioner')
      +toggle('push_enabled','Browser push delivery','Show alerts on devices you have enabled')
      +'<div class="notification-email-option"><div><strong>Email alerts</strong><p>'+
      (data?.email_available?'Optional notifications after confirming your email address.':
        'Email delivery is not configured yet. Your commissioner must connect an email provider and verified sender domain.')+
      '</p></div>'
      +(data?.email_available?'<label class="notification-email-toggle">Email alerts <input type="checkbox" id="notification-pref-email_enabled" '+(prefs.email_enabled?'checked':'')+' '+(!prefs.email_verified_at?'disabled':'')+'/></label>':
        '<span class="notification-unavailable">Not configured</span>')+'</div>'
      +(data?.email_available?'<div class="notification-email-form"><input class="field" id="notification-email" type="email" autocomplete="email" placeholder="you@example.com" value="'+escapeHTML(prefs.email_address||'')+'"/>'
        +'<button class="btn secondary" type="button" data-act="notifications-email-request">'+(prefs.email_verified_at?'Change email':'Verify email')+'</button></div>'
        +(prefs.email_verified_at?'<p class="notification-verified">Verified email address</p>':''):'')
      +'<div class="button-row section-gap"><button class="btn" data-act="notifications-save-prefs" type="button">Save preferences</button></div></section>'
      +'<section class="panel section-gap notification-inbox">'+panelHeading('Inbox',unread+' unread')
      +(unread?'<div class="notification-inbox-toolbar"><button class="btn small secondary" type="button" data-act="notifications-read-all">Mark all read</button></div>':'')
      +(notificationError?'<p class="notice">'+escapeHTML(notificationError)+'</p>':'')
      +(list?'<div class="notification-list">'+list+'</div>':
        empty(notificationLoading?'Loading notifications':'All caught up','New league alerts appear here, even if you have not enabled push.'))+'</section>';
  }

  function activityMonitorPage(){
    const d=activitySnapshot,s=d?.summary||{},now=d?.now||Math.floor(Date.now()/1000);
    const members=d?.members||[];
    const events=(d?.events||[]).filter(e=>activityMemberFilter==='all'||e.user_id===activityMemberFilter);
    const counts=[['Online now',s.active||0,'Seen in past 5 minutes'],['Visited today',s.visited_today||0,'Seen in past 24 hours'],
      ['Page views',s.views||0,'During selected period'],['Actions',s.actions||0,'Successful changes']];
    const dateText=ts=>new Date(Number(ts)*1000).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const toolbar='<div class="activity-toolbar"><label>Time period<select class="field" id="activity-range">'
      +[['24h','Past 24 hours'],['7d','Past 7 days'],['30d','Past 30 days']].map(([v,t])=>'<option value="'+v+'" '+(activityRange===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'
      +'<label>Manager<select class="field" id="activity-member"><option value="all">All managers</option>'
      +members.map(m=>'<option value="'+escapeHTML(m.id)+'" '+(activityMemberFilter===m.id?'selected':'')+'>'+escapeHTML(m.display_name)+'</option>').join('')+'</select></label>'
      +'<button class="btn secondary" data-act="activity-refresh" type="button" '+(activityLoading?'disabled':'')+'>↻ Refresh</button></div>';
    if(!d)return '<section class="panel setting-panel">'+panelHeading('Activity monitor','Manager presence, page visits and league actions')+toolbar+
      (activityError?'<div class="notice">'+escapeHTML(activityError)+'</div>':'<div class="activity-loading">Loading activity…</div>')+'</section>';
    const cards='<div class="activity-metrics">'+counts.map(([label,value,foot])=>
      '<div class="activity-metric"><span>'+label+'</span><strong>'+Number(value).toLocaleString()+'</strong><small>'+foot+'</small></div>').join('')+'</div>';
    const memberCards=members.map(m=>{
      const online=Number(m.last_seen||0)>=now-300;
      const recent=Number(m.last_seen||0)>=now-86400;
      const pill=online?'Online':recent?'Recently active':'Offline';
      return '<div class="activity-manager"><span class="activity-avatar">'+escapeHTML(initials(m.display_name))+'</span><div class="activity-manager-main"><strong>'+escapeHTML(m.display_name)+'</strong><small>@'+escapeHTML(m.username)+' · '+(m.last_page?escapeHTML(names[m.last_page]||m.last_page)+(m.last_context?' / '+escapeHTML(m.last_context):''):'No page visits yet')+'</small></div>'
        +'<div class="activity-manager-meta"><span class="activity-presence '+(online?'online':recent?'recent':'')+'"><i></i>'+pill+'</span><small>'+activityAgo(m.last_seen,now)+'</small>'
        +'<small>'+Number(m.page_views||0)+' views · '+Number(m.actions||0)+' actions</small></div></div>';
    }).join('');
    const eventList=events.map(e=>{
      const label=e.kind==='page'?'Visited '+e.label:e.label;
      return '<div class="activity-event"><span class="activity-event-icon '+e.kind+'">'+(e.kind==='page'?'◉':e.kind==='login'?'↪':'✓')+'</span>'
        +'<div class="activity-event-main"><strong>'+escapeHTML(e.display_name)+'</strong><span>'+escapeHTML(label)+'</span></div>'
        +'<time title="'+escapeHTML(new Date(Number(e.created_at)*1000).toLocaleString())+'">'+dateText(e.created_at)+'</time></div>';
    }).join('');
    return '<section class="panel setting-panel activity-intro">'+panelHeading('Activity monitor','Track who is using the site and what changes they make.')
      +'<p class="activity-privacy">Only commissioners can see this. Last seen updates while the site is visible; page views record navigation and actions record successful updates. Passwords, IP addresses and draft-queue contents are never logged.</p>'
      +toolbar+cards+'</section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Manager activity',members.length+' registered accounts')
      +'<div class="activity-member-list">'+memberCards+'</div></section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Recent activity',events.length+' events shown · newest first')
      +(activityError?'<p class="hint">'+escapeHTML(activityError)+'</p>':'')
      +(eventList?'<div class="activity-feed">'+eventList+'</div>':empty('No recorded activity yet','New visits and changes will appear as members use the site.'))+'</section>';
  }

  function startPolling(){
    if(refreshId)return;
    lastAutoPoll=Date.now();
    refreshId=setInterval(()=>{
      pingActivity();
      if(me&&!document.hidden&&Date.now()-notificationFetchedAt>30000)loadNotifications();
      if(!me||busy||syncActive||current==='commissioner'||current==='settings'||document.hidden)return;
      const onMobile=window.matchMedia?.('(max-width: 850px)').matches||false;
      const interval=current==='draft-order'&&!officialRace()?6000:onMobile&&league?.settings?.draft_status!=='live'?30000:12000;
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
      const next=await api('state'); me=next.user;league=next;reconcileDraftQueue();
      if(new URLSearchParams(location.search).has('notifications'))current='notifications';
      render();loadNotifications(true);verifyPendingNotificationEmail();
      startPolling();
      if(me?.role==='commissioner')autoImportPrograms();
    }catch(e){renderAuth();}
    if('serviceWorker' in navigator){
      const base=typeof SITE_BASE!=='undefined'?SITE_BASE:'/';
      navigator.serviceWorker.register(base+'sw.js',{scope:base}).catch(error=>
        console.warn('Push service worker registration unavailable:',String(error)));
      navigator.serviceWorker.addEventListener?.('message',event=>{
        if(event.data?.type==='open-notifications'&&me){current='notifications';render();loadNotifications(true);}
      });
    }
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
    const rememberControl='<label class="auth-remember-option"><input type="checkbox" name="remember_device" value="yes" checked />'
      +'<span class="auth-remember-copy"><strong>Remember this device</strong><small>Stay signed in for up to 90 days on this browser.</small></span></label>';
    const form=mode==='login'?'<form data-form="login">'+input('Username','username','text','Username')+input('Password','password','password','Your password')+rememberControl+'<button class="btn" type="submit">Sign in</button></form>':
      mode==='join'?'<form data-form="join">'+input('Invitation code','code','text','Invitation code',selectedInvite)+input('Display / team name','display_name','text','Team name')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Password')+rememberControl+'<button class="btn" type="submit">Create account</button></form>':
      '<form data-form="setup">'+input('Commissioner setup code','code','password','Setup code')+input('Team name','display_name','text','Team name')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Create a password')+rememberControl+'<button class="btn" type="submit">Create commissioner account</button></form>';
    root.innerHTML='<div class="auth-layout"><main class="auth-panel"><div class="auth-card"><div class="auth-logo"><span class="brand-icon brand-image"><img src="/brand-logo.png?v=3" alt="Boek Dynasty logo" width="43" height="43"></span><div><div class="brand-title">'+escapeHTML(status.league_name||'Boek Dynasty')+'</div><div class="auth-season">COLLEGE BASKETBALL · 2026–27</div></div></div><div class="auth-section"><h1>'+header+'</h1>'+(desc?'<p class="auth-desc">'+desc+'</p>':'')+(!status.needs_setup?'<div class="auth-top"><button data-act="auth-mode" data-mode="login" class="'+(mode==='login'?'active':'')+'">Sign in</button><button data-act="auth-mode" data-mode="join" class="'+(mode==='join'?'active':'')+'">Join with invite</button></div>':'')+form+(appError?'<p class="auth-error">'+escapeHTML(appError)+'</p>':'')+'</div></div></main></div>';
  }
  function input(label,name,type,placeholder,value=''){
    return '<div class="form-row"><label for="'+name+'">'+label+'</label><input class="field" id="'+name+'" name="'+name+'" type="'+type+'" placeholder="'+escapeHTML(placeholder)+'" value="'+escapeHTML(value)+'" required autocomplete="'+(name==='password'?'current-password':'on')+'"/></div>';
  }
  const liveResultsCount=()=>resultsLoadedDay===resultsToday()?
    resultsGames.filter(g=>g.status==='live').length:
    overviewGamesDay===resultsToday()?overviewGames.filter(g=>g.status==='live').length:0;
  const draftIsLive=()=>league?.settings?.draft_status==='live';
  const globalPages=[
    ['home','League Overview','Scores, rosters and league activity'],['team','My Team','My roster and transactions'],
    ['results','Results','Daily scores and schedules'],['programs','Schools','Directory and historical scoring'],
    ['draft','Draft Room','Draft board and priority queue'],['league','Standings','Season fantasy rankings'],
    ['trades','Trades','Offers and completed trades'],['scoring','Scoring Rules','How points are calculated'],
    ['settings','My Settings','Profile and account preferences']
  ];
  function globalSearchResults(){
    const q=globalSearchQuery.trim().toLowerCase();
    const pages=globalPages.filter(([id,title,desc])=>q?(title+' '+desc).toLowerCase().includes(q):['home','team','results','programs','draft'].includes(id)).slice(0,6);
    const people=members().filter(u=>q?(u.display_name+' '+(u.username||'')).toLowerCase().includes(q):u.id===me?.id).slice(0,4);
    const mine=new Set(owners().filter(o=>o.manager_id===me?.id).map(o=>String(o.program_id)));
    const schools=programs().filter(p=>q?(p.name+' '+(p.abbr||'')+' '+conf(p.conference_id)).toLowerCase().includes(q):mine.has(String(p.id)))
      .sort((a,b)=>Number(mine.has(String(b.id)))-Number(mine.has(String(a.id)))||
        Number(programEligible(b))-Number(programEligible(a))||a.name.localeCompare(b.name)).slice(0,8);
    const group=(title,rows)=>rows.length?'<div class="global-search-section"><h3>'+title+'</h3>'+rows.join('')+'</div>':'';
    const pageRows=pages.map(([id,title,desc])=>'<button class="global-search-result" type="button" data-act="tab" data-id="'+id+'"><span class="global-search-result-icon">'+iconSVG(id)+'</span><span class="grow"><strong>'+escapeHTML(title)+'</strong><small>'+escapeHTML(desc)+'</small></span><span class="global-search-arrow">↵</span></button>');
    const peopleRows=people.map(u=>'<button class="global-search-result" type="button" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'+avatar(u)+'<span class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>League manager'+(u.id===me.id?' · You':'')+'</small></span><span class="global-search-arrow">›</span></button>');
    const schoolRows=schools.map(p=>{
      const owned=programOwned(p.id),manager=members().find(u=>u.id===owned?.manager_id);
      const label=(owned?(manager?.display_name||'Rostered')+' · ':'')+conf(p.conference_id)+(!programEligible(p)?' · Outside draft pool':'');
      return '<button class="global-search-result" type="button" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(label)+'</small></span><span class="global-search-arrow">›</span></button>';
    });
    return group('PAGES',pageRows)+group('MANAGERS',peopleRows)+group('SCHOOLS',schoolRows)||
      '<div class="global-search-empty"><strong>No results</strong><p>Try a school, manager, or page name.</p></div>';
  }
  const globalSearchDialog=()=>'<div class="global-search-layer"><button class="global-search-backdrop" type="button" data-act="search-close" aria-label="Close search"></button>'
    +'<section class="global-search-dialog" role="dialog" aria-modal="true" aria-labelledby="global-search-heading"><div class="global-search-head"><h2 id="global-search-heading">Search the league</h2><button type="button" class="global-search-close" data-act="search-close" aria-label="Close search">×</button></div>'
    +'<label class="global-search-input-wrap">'+iconSVG('search')+'<input id="global-search-input" type="search" autocomplete="off" spellcheck="false" aria-label="Search the league" placeholder="Find a school, manager, or page..." value="'+escapeHTML(globalSearchQuery)+'"/></label>'
    +'<div id="global-search-list" class="global-search-list">'+globalSearchResults()+'</div><div class="global-search-foot"><span>Enter to open</span><span><kbd>Esc</kbd> to close</span></div></section></div>';
  function toggleGlobalSearch(open){
    globalSearchOpen=open;
    root.querySelector('.global-search-layer')?.remove();
    if(open){
      globalSearchQuery='';
      root.insertAdjacentHTML('beforeend',globalSearchDialog());
      root.querySelector('#global-search-input')?.focus({preventScroll:true});
    }else{
      root.querySelector('.global-search-trigger')?.focus({preventScroll:true});
    }
  }
  function navButton(id){
    const live=id==='draft'&&draftIsLive()||id==='results'&&liveResultsCount()>0;
    const pending=id==='notifications'?Number(notificationSnapshot?.unread||0):id==='trades'?(league?.trades||[]).filter(t=>t.status==='pending'&&t.to_manager_id===me?.id).length:0;
    const active=current===id||current==='program-detail'&&id==='programs'||current==='manager-detail'&&id==='league';
    return '<button type="button" data-act="tab" data-id="'+id+'" class="'+(active?'active':'')+(live?' has-live':'')+'" '+(active?'aria-current="page"':'')+'>'+iconSVG(id)+'<span>'+names[id]+'</span>'+(live?'<i class="nav-live-indicator" aria-hidden="true"></i>':'')+(pending?'<span class="nav-unread" aria-label="'+pending+' pending trade offers">'+Math.min(99,pending)+'</span>':'')+'</button>';
  }
  function sidebar(){
    return '<aside class="sidebar"><div class="brand"><div class="brand-icon brand-image"><img src="/brand-logo.png?v=3" alt="Boek Dynasty logo" width="43" height="43"></div><div><div class="brand-title">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+'</div></div></div><div><div class="nav-label">LEAGUE HUB</div><nav class="nav">'+['home','team','results','league','programs','draft'].map(navButton).join('')+'</nav><div class="nav-label nav-label-secondary">MANAGEMENT</div><nav class="nav">'+['trades','notifications','scoring','settings',...(me.role==='commissioner'?['commissioner']:[])].map(navButton).join('')+'</nav></div><div class="side-foot"><span class="season-pill">'+escapeHTML(season())+' SEASON</span><div class="account-mini">'+avatar(me)+'<div><strong>'+escapeHTML(me.display_name)+'</strong><div class="muted tiny">'+(me.role==='commissioner'?'Commissioner':'League manager')+'</div></div></div><button data-act="logout" class="logout">Sign out</button></div></aside>';
  }
  function render(){
    if(!me||!league)return renderAuth();
    if(['home','league','team','manager-detail'].includes(current)&&!standingsLoading&&Date.now()-standingsFetchedAt>=60000)loadStandings();
    // The overview previews today's games without requiring a visit to Results.
    if(current==='home'&&!overviewGamesLoading&&
      (overviewGamesDay!==resultsToday()||Date.now()-overviewGamesFetchedAt>90000))loadOverviewGames();
    if(current==='programs'&&programMode==='ratings')loadRatings(ratingYear(ratingSeason||season()));
    if(current==='program-detail'){
      loadRatings(ratingYear(selectedProgramSeason||season()));
      if(selectedProgramId&&!programScheduleCache[selectedProgramId]&&!programScheduleLoading[selectedProgramId]&&
        !programScheduleError[selectedProgramId])loadProgramSchedule(selectedProgramId);
    }
    if(current==='draft'){
      loadRatings(ratingYear(season()));
      if(!schoolLeaders&&!schoolLeadersLoading&&!schoolLeadersError)loadSchoolLeaders();
    }
    const isAdmin=me.role==='commissioner';
    if(current==='commissioner'&&!isAdmin)current='home';
    pingActivity();
    if(current==='commissioner'&&adminSection==='activity'&&!activityLoading&&(!activityFetchedAt||Date.now()-activityFetchedAt>60000))loadActivity();
    if(current==='notifications'&&!notificationLoading&&(!notificationFetchedAt||Date.now()-notificationFetchedAt>45000))loadNotifications();
    if(current==='commissioner'&&adminSection==='notifications'&&!notificationAdminLoading&&(!notificationAdminFetchedAt||Date.now()-notificationAdminFetchedAt>45000))loadNotificationAdmin();
    if(current==='commissioner'&&adminSection==='data'&&!integrityLoading&&(!integrityFetchedAt||Date.now()-integrityFetchedAt>60000))loadIntegrity();
    const tabs=['home','team','results','programs','draft','more'];
    const mobileLabels={home:'League',team:'My Team',results:'Results',programs:'Schools',draft:'Draft',more:'More'};
    const activeMobile=(['trades','notifications','commissioner','waivers','history','scoring','settings','draft-order'].includes(current))?'more':current==='program-detail'?'programs':current==='manager-detail'?'league':current;
    const liveGames=liveResultsCount(),liveDraft=draftIsLive();
    const pendingTradeOffers=(league.trades||[]).filter(t=>t.status==='pending'&&t.to_manager_id===me.id).length;
    const eventLink=liveDraft?'<button type="button" class="topbar-event is-live" data-act="tab" data-id="draft"><span class="topbar-event-dot" aria-hidden="true"></span><span>Draft live</span></button>':
      liveGames?'<button type="button" class="topbar-event is-live" data-act="tab" data-id="results"><span class="topbar-event-dot" aria-hidden="true"></span><span>'+liveGames+' live game'+(liveGames===1?'':'s')+'</span></button>':'';
    const oldDraftBoard=current==='draft'?root.querySelector('.draft-board-scroll'):null;
    const draftBoardPosition=oldDraftBoard?[oldDraftBoard.scrollLeft,oldDraftBoard.scrollTop]:null;
    const oldQueueList=current==='draft'?root.querySelector('.draft-queue-list'):null;
    const queueScrollPosition=oldQueueList?.scrollTop||0;
    const unreadNotifications=Math.min(99,Number(notificationSnapshot?.unread||0));
    const notificationBell='<button type="button" class="topbar-bell" data-act="tab" data-id="notifications" title="Notifications" aria-label="Notifications'+(unreadNotifications?', '+unreadNotifications+' unread':'')+'">'+iconSVG('notifications')
      +(unreadNotifications?'<span class="notification-bell-count">'+unreadNotifications+'</span>':'')+'</button>';
    root.innerHTML='<div class="shell">'+sidebar()+'<main class="main"><header class="topbar"><div class="topbar-heading"><img class="topbar-logo" src="/brand-logo.png?v=3" alt="" width="30" height="30"><span class="title"><span class="topbar-league">'+escapeHTML(league.settings.league_name||'Boek Dynasty')+'</span><span class="sep">/</span><span class="topbar-page">'+(names[current]||'Profile')+'</span></span></div><div class="top-right">'+eventLink+notificationBell+'<button type="button" class="global-search-trigger" data-act="search-open" title="Search schools, managers and pages (⌘K)" aria-label="Search the league">'+iconSVG('search')+'<span>Search</span><kbd>⌘K</kbd></button><span class="chip">'+escapeHTML(season())+'</span><button class="header-account-avatar" type="button" title="Edit my profile" data-act="tab" data-id="settings">'+avatar(me)+'</button></div></header><section class="content">'+({home:overview,programs:programsPage,draft:draftPage,trades:tradesPage,notifications:notificationsPage,league:leaguePage,team:myTeamPage,scoring:scoringPage,commissioner:commissionerPage,settings:settingsPage,more:morePage,'draft-order':draftOrderPage,'program-detail':programProfilePage,'manager-detail':managerProfilePage,waivers:waiversPage,history:historyPage,results:resultsPage}[current]||overview)()+'</section></main></div><nav class="bottom" aria-label="Mobile navigation">'+tabs.map(id=>'<button type="button" class="'+(activeMobile===id?'active':'')+((id==='draft'&&liveDraft||id==='results'&&liveGames)?' has-live':'')+'" data-act="tab" data-id="'+id+'" '+(activeMobile===id?'aria-current="page"':'')+' aria-label="'+names[id]+(id==='results'&&liveGames?', '+liveGames+' live games':'')+'">'+iconSVG(id)+'<span>'+mobileLabels[id]+'</span>'+((id==='draft'&&liveDraft||id==='results'&&liveGames)?'<i class="nav-live-indicator" aria-hidden="true"></i>':'')+(id==='more'&&(pendingTradeOffers||unreadNotifications)?'<span class="bottom-unread">'+Math.min(99,pendingTradeOffers+unreadNotifications)+'</span>':'')+'</button>').join('')+'</nav>'+(globalSearchOpen?globalSearchDialog():'');
    if(current==='programs'&&programMode==='leaders')filterSchoolLeaders();
    if(current==='programs'&&programMode==='ratings')filterRatings();
    if(current==='draft'){
      filterDraftPool();
      const draftBoard=root.querySelector('.draft-board-scroll');
      if(draftBoard&&draftBoardPosition){draftBoard.scrollLeft=draftBoardPosition[0];draftBoard.scrollTop=draftBoardPosition[1];}
      const queueList=root.querySelector('.draft-queue-list');
      if(queueList)queueList.scrollTop=queueScrollPosition;
    }
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
  async function loadOverviewGames(){
    if(!me||overviewGamesLoading)return;
    const today=resultsToday();
    if(overviewGamesDay===today&&Date.now()-overviewGamesFetchedAt<90000)return;
    overviewGamesLoading=true;
    try{
      const response=await api('data/games?date='+encodeURIComponent(today));
      if(today!==resultsToday())return; // Ignore a request that crossed midnight ET.
      overviewGames=Array.isArray(response.games)?response.games:[];
      overviewRankingSource=response.ranking_source||'pending';
      overviewGamesDay=today;
      overviewGamesError='';
    }catch(e){
      overviewGames=[];
      overviewGamesDay=today;
      overviewGamesError='Today’s games are temporarily unavailable.';
    }finally{
      overviewGamesFetchedAt=Date.now();
      overviewGamesLoading=false;
      if(current==='home')render();
    }
  }
  async function loadIntegrity(force=false){
    if(!me||me.role!=='commissioner'||integrityLoading)return;
    if(!force&&integrityFetchedAt&&Date.now()-integrityFetchedAt<60000)return;
    integrityLoading=true;integrityError='';
    try{integritySnapshot=await api('data/integrity');integrityFetchedAt=Date.now();}
    catch(e){integrityError=String(e.message||e);integrityFetchedAt=Date.now();}
    finally{integrityLoading=false;if(current==='commissioner'&&adminSection==='data')render();}
  }
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
  async function loadProgramSchedule(id,force=false){
    if(!me||!id||programScheduleLoading[id])return;
    const cached=programScheduleCache[id];
    if(!force&&cached?.season===season()&&Date.now()-(cached.fetchedAt||0)<1800000)return;
    programScheduleLoading[id]=true;
    delete programScheduleError[id];
    try{
      const data=await api('data/schedule?id='+encodeURIComponent(id));
      if(data.season!==season()||!Array.isArray(data.games))throw Error('Schedule returned invalid season data.');
      programScheduleCache[id]={...data,fetchedAt:Date.now()};
    }catch(e){programScheduleError[id]=String(e.message||e);}
    finally{
      delete programScheduleLoading[id];
      if(current==='program-detail'&&String(selectedProgramId)===String(id))render();
    }
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

  // Quadrant value is a potential win bonus, separate from the base win points.
  // Home and away opponent rankings already incorporate venue in the API.
  const quadWinBonus=(quad,q1a)=>{
    const rules=league?.settings?.scoring||{};
    return quad===1?Number((q1a?rules.quad_1a_win:rules.quad_1_win)||0):
      quad===2?Number(rules.quad_2_win||0):0;
  };
  const quadLabel=(quad,q1a)=>Number.isInteger(quad)&&quad>=1&&quad<=4?
    'Q'+quad+(quad===1&&q1a?'A':''):'Q TBD';
  const quadBonusText=(quad,q1a)=>{
    const bonus=quadWinBonus(quad,q1a);
    return bonus>0?'+'+bonus.toLocaleString('en-US',{maximumFractionDigits:2}):'';
  };
  const quadMeaning=(quad,q1a,preliminary)=>{
    const amount=quadBonusText(quad,q1a);
    return quadLabel(quad,q1a)+(amount?' · '+amount+' bonus if won':' · no quadrant bonus')+
      (preliminary?' · provisional T-Rank':'');
  };
  const dailyQuad=(quad,q1a)=>{
    if(!Number.isInteger(quad)||quad<1||quad>4)
      return '<span class="daily-quad pending" title="No complete current-season ranking source">Q pending</span>';
    const bonus=quadBonusText(quad,q1a);
    return '<span class="daily-quad q'+quad+(resultsRankingSource==='torvik'?' preliminary':'')+
      '" title="'+escapeHTML(quadMeaning(quad,q1a,resultsRankingSource==='torvik'))+'">'+
      quadLabel(quad,q1a)+(bonus?'<small class="daily-quad-value">'+bonus+'</small>':'')+'</span>';
  };
  // Pure matchers: shared eligibility logic for scoreboard scopes and status toggles.
  const activeDraftQueueIds=()=>{
    const drafted=new Set([...owners().map(o=>String(o.program_id)),
      ...picks().map(p=>String(p.program_id))]);
    return new Set(draftWatchlist.map(String).filter(id=>!drafted.has(id)));
  };
  const matchScoreboardScope=(g,scope,enrolled,owned,watched,pollRanks)=>{
    const home=String(g.home_id),away=String(g.away_id);
    if(scope==='mine')return owned.has(home)||owned.has(away);
    if(scope==='queue')return watched.has(home)||watched.has(away);
    if(scope==='top25')return pollRanks.has(home)||pollRanks.has(away);
    if(scope==='league')return enrolled.has(home)||enrolled.has(away);
    return true;
  };
  const matchScoreboardStatus=(g,filter)=>filter==='all'||
    filter==='live'&&g.status==='live'||
    filter==='final'&&g.status==='final'||
    filter==='upcoming'&&g.status==='scheduled';
  const isScoreboardMatch=(g,ids)=>ids.has(String(g.home_id))||ids.has(String(g.away_id));
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
    const watched=!mine&&isScoreboardMatch(g,activeDraftQueueIds());
    const selectedLeague=rostered.length>0;
    const isNeutral=Number(g.neutral_site)===1;
    const at= isNeutral?'Neutral site':'At '+escapeHTML(g.home_name||'home school');
    const special=g.tournament_tag==='ncaa'?'NCAA TOURNAMENT':g.tournament_tag==='conference'?'CONFERENCE TOURNAMENT':'';
    const link=/^\d+$/.test(String(g.game_id||''))?'https://www.espn.com/mens-college-basketball/game/_/gameId/'+g.game_id:null;
    return '<article class="daily-game-card '+(live?'is-live':'')+(mine?' is-my-game':'')+(watched?' is-watched':'')+'" data-search="'+
      escapeHTML((String(g.home_name||'')+' '+String(g.away_name||'')+' '+String(g.home_id)+' '+String(g.away_id)).toLowerCase())+'">'
      +'<div class="daily-card-status"><strong class="'+(live?'live':'')+'">'+(live?'<i class="daily-live-dot"></i>':'')+escapeHTML(status)+'</strong>'
      +(special?'<span class="daily-card-tourney">'+special+'</span>':'')
      +(mine?'<span class="daily-card-mine">MY TEAM</span>':watched?'<span class="daily-card-queue">MY QUEUE</span>':selectedLeague?'<span class="daily-card-league">ROSTERED</span>':'')
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
    const enrolled=new Set(eligiblePrograms().map(p=>String(p.id)));
    const owned=new Set(owners().filter(o=>o.manager_id===me?.id).map(o=>String(o.program_id)));
    const watched=activeDraftQueueIds();
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
    const query=resultsSearch.trim().toLowerCase();
    const scoped=all.filter(g=>{
      const homeConf=String(g.home_conference_id||''),awayConf=String(g.away_conference_id||'');
      return matchScoreboardScope(g,resultsScope,enrolled,owned,watched,pollRanks)&&
        (resultsConference==='all'||homeConf===resultsConference||awayConf===resultsConference)&&
        (!query||((g.home_name||'')+' '+(g.away_name||'')).toLowerCase().includes(query));
    });
    const statusCounts={live:0,upcoming:0,final:0};
    for(const g of scoped){
      if(g.status==='live')statusCounts.live++;
      if(g.status==='scheduled')statusCounts.upcoming++;
      if(g.status==='final')statusCounts.final++;
    }
    const priority={live:0,scheduled:1,final:2,postponed:3,cancelled:4};
    const list=scoped.filter(g=>matchScoreboardStatus(g,resultsStatusFilter))
      .sort((a,b)=>(priority[a.status]??5)-(priority[b.status]??5)||
        Number(isScoreboardMatch(b,owned))-Number(isScoreboardMatch(a,owned))||
        Number(isScoreboardMatch(b,watched))-Number(isScoreboardMatch(a,watched))||
        String(a.start_utc||'').localeCompare(String(b.start_utc||'')));
    const visible=list.slice(0,resultsShown);
    const totalFinal=statusCounts.final,totalLive=statusCounts.live;
    const statusButton=(id,label,count)=>'<button type="button" data-act="results-status" data-id="'+id+
      '" class="'+(resultsStatusFilter===id?'active':'')+'" aria-pressed="'+(resultsStatusFilter===id)+'">'+
      label+(count!==undefined?'<span>'+count+'</span>':'')+'</button>';
    const clearable=resultsScope!=='league'||resultsStatusFilter!=='all'||resultsConference!=='all'||!!query;
    const conferenceOptions=eligibleConferenceIds().sort((a,b)=>conf(a).localeCompare(conf(b)));
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
        scopeButton('league','League schools')+scopeButton('mine','My roster')+scopeButton('queue','★ My queue')+scopeButton('all','All D-I')+scopeButton('top25','AP Top 25')+
        '</div><div class="daily-tools"><label class="daily-search"><span aria-hidden="true">⌕</span><input id="daily-team-search" type="search" autocomplete="off" placeholder="Find a school" aria-label="Search daily games by school" value="'+escapeHTML(resultsSearch)+'"/></label>'
      +'<input type="date" id="scoreboard-date" class="field daily-picker" aria-label="Jump to a date" value="'+escapeHTML(day)+'" />'
      +'<button type="button" class="daily-today" data-act="results-today">Today</button></div></div>'
      +'<div class="daily-status-filter"><div class="daily-status-filters" role="group" aria-label="Filter by game status">'+
        statusButton('all','All',scoped.length)+statusButton('live','Live',statusCounts.live)+
        statusButton('upcoming','Upcoming',statusCounts.upcoming)+statusButton('final','Final',statusCounts.final)+
        '</div>'+(clearable?'<button type="button" class="daily-clear-filter" data-act="results-clear-filters">Clear filters</button>':'')+'</div>'
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
          (resultsScope==='mine'?'Draft a school to see its matchups here.':
            resultsScope==='queue'?'Add schools to your draft queue to follow their games here.':
            'Try another date, conference or school search.')+'</p>'+ 
          (resultsScope==='queue'?'<button class="btn small secondary" data-act="tab" data-id="draft">Open draft queue</button>':'')+
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
    const eligible=eligiblePrograms()
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
    const groups=[
      ['Your account',[['settings','Profile & settings','Team name, photo, colors and password'],['notifications','Notifications','Inbox, push alerts and preferences']]],
      ['League information',[['league','Standings','Current fantasy scores'],['draft-order','Draft order','Horse race and selection positions'],['scoring','Scoring rules','Point values explained'],['history','Dynasty history','Past seasons and champions']]],
      ['League tools',[['trades','Trades','Offers and completed deals'],['waivers','Waivers','Claim or release programs'],['results','Daily results','Scores and schedules']]]
    ];
    if(me.role==='commissioner')groups.push(['Administration',[['commissioner','Commissioner settings','League setup and manager controls']]]);
    return heading('ACCOUNT & TOOLS','More','Find league information and account controls.')
      +'<div class="more-groups">'+groups.map(([group,items])=>
        '<section class="panel more-menu more-menu-section"><h2 class="more-group-title">'+escapeHTML(group)+'</h2>'
        +items.map(([id,title,description])=>
          '<button type="button" class="more-menu-item" data-act="tab" data-id="'+id+'"><span class="more-menu-icon">'+iconSVG(id)+'</span><span class="grow"><strong>'+escapeHTML(title)+'</strong><small>'+escapeHTML(description)+'</small></span><span class="more-chevron">›</span></button>'
        ).join('')+'</section>').join('')+'</div>'
      +'<section class="panel more-account section-gap"><div>'+avatar(me)+'<div class="grow"><strong>'+escapeHTML(me.display_name)+'</strong><small>@'+escapeHTML(me.username)+'</small></div></div><button class="btn secondary" data-act="logout">Sign out</button></section>';
  }


  const officialRace=()=>league?.settings?.draft_race||null;
  const raceTotalMs=race=>Number(race?.duration_ms||9400)
    +Math.max(0,(race?.order?.length||1)-1)*Number(race?.stagger_ms||460);

  // Every manager replays the exact same server-persisted timeline.
  // Animation does not select the winner: it reveals the saved order.
  function startDraftRacePlayback(syncToLive=false){
    const race=officialRace();
    if(!race||!Array.isArray(race.order)||!race.order.length)return;
    if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(raceFrame);
    const run=raceState.run+1;
    raceState={phase:'playing',id:race.id,order:race.order.slice(),
      progress:Object.fromEntries(race.order.map(id=>[String(id),0])),run};
    const elapsedBeforeStart=syncToLive?Math.max(0,Date.now()-Number(race.started_at)*1000):0;
    const total=raceTotalMs(race);
    if(elapsedBeforeStart>=total){
      raceState.phase='complete';render();return;
    }
    render();
    const begin=performance.now();
    const duration=Number(race.duration_ms||9400),stagger=Number(race.stagger_ms||460);
    const tick=now=>{
      if(raceState.run!==run||officialRace()?.id!==race.id)return;
      const elapsed=elapsedBeforeStart+now-begin;
      for(const [position,id] of race.order.entries()){
        const target=duration+position*stagger;
        const fraction=Math.min(1,Math.max(0,elapsed/target));
        const sway=Math.sin(elapsed/520+position*2.4)*4.5*Math.sin(Math.PI*fraction);
        const value=elapsed>=target?100:Math.min(97,Math.max(0,96*fraction+sway));
        raceState.progress[String(id)]=value;
        if(current==='draft-order'){
          const horse=root.querySelector('[data-race-runner="'+CSS.escape(String(id))+'"] .race-horse');
          if(horse)horse.style.left=value+'%';
          const row=horse?.closest('.race-runner');
          if(row)row.classList.toggle('race-finished',value>=100);
        }
      }
      if(elapsed>=total){
        raceState.phase='complete';
        if(current==='draft-order')render();
        return;
      }
      if(current==='draft-order')raceFrame=requestAnimationFrame(tick);
      else raceState.phase='complete';
    };
    raceFrame=requestAnimationFrame(tick);
  }
  function draftOrderPage(){
    const all=members(),userById=new Map(all.map(u=>[String(u.id),u]));
    const race=officialRace();
    const locked=league.settings.draft_status!=='pending'||picks().length>0;
    const playing=!!race&&raceState.phase==='playing'&&raceState.id===race.id;
    const finished=!!race&&!playing;
    const raceOrder=race?.order||[];
    const lanes=(race?.lanes||all.map(u=>u.id)).map(id=>userById.get(String(id))).filter(Boolean);
    const row=(id,index)=>{
      const u=userById.get(String(id));
      return u?'<div class="race-result-row"><span class="race-result-rank">'+(index+1)+'</span>'
        +avatar(u)+'<span class="race-result-name">'+escapeHTML(u.display_name)+'</span>'
        +(index===0?'<span class="race-result-first">1st pick</span>':'')+'</div>':'';
    };
    const track=lanes.map((u,index)=>{
      const progress=race?(playing?Number(raceState.progress[String(u.id)]||0):100):0;
      const tint=/^#[0-9a-fA-F]{6}$/.test(u.accent_color||'')?u.accent_color:'#d9611e';
      return '<div class="race-runner" data-race-runner="'+escapeHTML(u.id)+'" style="--race-accent:'+tint+'">'
        +'<div class="race-runner-label"><span class="race-lane-number">'+String(index+1).padStart(2,'0')+'</span>'
        +avatar(u)+'<strong>'+escapeHTML(u.display_name)+'</strong></div>'
        +'<div class="race-track"><span class="race-track-finish" aria-hidden="true"></span>'
        +'<span class="race-horse" style="left:'+progress+'%" aria-hidden="true">🐎</span></div></div>';
    }).join('');
    const canRun=me.role==='commissioner'&&!race&&!locked&&all.length>=2;
    return heading('LEAGUE TOOLS','Draft Order','The official first-round draft order, revealed on the racetrack.')
      +'<section class="panel draft-race-panel"><div class="race-panel-head"><div>'
      +'<span class="race-section-kicker">DRAFT ORDER REVEAL</span>'
      +'<h2>The manager horse race</h2>'
      +'<p>'+(race?'The official draft order has been finalized. Every manager can watch the same race again.':
        'The commissioner sets the draft order in Draft settings and starts one race to reveal it to the league.')+'</p>'
      +'</div><div class="race-odds"><strong>'+(race?'FINAL':'READY')+'</strong>'
      +'<span>'+(race?'Official order saved':all.length+' managers on the track')+'</span></div></div>'
      +'<div class="race-toolbar">'
      +(race?'<button type="button" class="btn race-start-button" data-act="race-replay">'
        +(playing?'Restart replay':'Replay race')+'</button>'
        :me.role==='commissioner'?'<button type="button" class="btn race-start-button" data-act="race-start" '
          +(canRun?'':'disabled')+'>Run race</button>'
        :'<span class="race-wait-message">Waiting for the commissioner to run the race.</span>')
      +'<span class="race-mode-caption">'+(playing?'Racing to the finish…':race?'Race complete · order locked':
         'All registered managers will see the same race and finish.')+'</span></div>'
      +'<div class="race-course" aria-label="Draft order horse race"><div class="race-course-header">'
      +'<strong>THE TRACK</strong><span>FINISH <span aria-hidden="true">🏁</span></span></div>'
      +(track||empty('Waiting for managers','Registered managers appear here automatically.'))+'</div>'
      +(finished?'<div class="race-finish-card"><div class="race-finish-heading">'
        +'<span class="race-section-kicker">OFFICIAL RESULTS</span><h3>Photo finish</h3></div>'
        +'<div class="race-results-grid">'+raceOrder.map(row).join('')+'</div>'
        +'<p class="hint">The race reveals the commissioner-set draft order. This is the official first-round order.</p></div>':'')
      +'</section>'
      +(race?'<section class="panel race-saved-panel section-gap">'+panelHeading('Official snake draft order',
        'First-round picks follow this order. Round two reverses it.')
        +'<div class="race-results-grid">'+raceOrder.map(row).join('')+'</div>'
        +'<p class="hint section-gap">Saved for every manager. Only the commissioner can reset this race in Draft settings, before the draft begins.</p>'
        +'</section>'
      :'<section class="panel race-saved-panel section-gap">'
        +panelHeading('Awaiting official draft order','The draft order appears here once the commissioner runs the race.')
        +(me.role==='commissioner'?
          '<button class="btn secondary" data-act="race-settings">Configure draft order</button>':'')
        +'</section>');
  }

  function overviewScoreboard(){
    const today=resultsToday(),isReady=overviewGamesDay===today;
    const eligible=new Set(eligiblePrograms().map(p=>String(p.id)));
    const mine=new Set(owners().filter(o=>o.manager_id===me.id).map(o=>String(o.program_id)));
    const watched=activeDraftQueueIds();
    const games=(isReady?overviewGames:[]).filter(g=>
      eligible.has(String(g.home_id))||eligible.has(String(g.away_id))||
      mine.has(String(g.home_id))||mine.has(String(g.away_id)));
    const statusPriority={live:0,scheduled:1,final:2,postponed:3,cancelled:4};
    const isMine=g=>mine.has(String(g.home_id))||mine.has(String(g.away_id));
    const isWatched=g=>watched.has(String(g.home_id))||watched.has(String(g.away_id));
    games.sort((a,b)=>Number(isMine(b))-Number(isMine(a))||
      Number(isWatched(b))-Number(isWatched(a))||
      (statusPriority[a.status]??5)-(statusPriority[b.status]??5)||
      String(a.start_utc||'').localeCompare(String(b.start_utc||'')));
    const fixtures=games.slice(0,4);
    const formatTime=g=>{
      if(g.status==='live')return 'LIVE';
      if(g.status==='final')return 'FINAL';
      if(g.status==='postponed')return 'POSTPONED';
      if(g.status==='cancelled')return 'CANCELLED';
      return g.start_utc?new Date(g.start_utc).toLocaleTimeString('en-US',{
        timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}):'TIME TBD';
    };
    const school=(id,name,score,hasScore,quad,q1a)=>
      '<span class="overview-game-school">'+scoreboardLogo(id)+
      '<strong>'+escapeHTML(name||'Unknown school')+'</strong>'+
      '<span class="overview-quad-value" title="'+escapeHTML(quadMeaning(quad,q1a,overviewRankingSource==='torvik'))+'">'+
      quadLabel(quad,q1a)+(quadBonusText(quad,q1a)?' '+quadBonusText(quad,q1a):'')+'</span>'+
      '<b>'+((hasScore&&score!==null&&score!==undefined)?escapeHTML(String(score)):'–')+'</b></span>';
    const cards=fixtures.map(g=>{
      const hasScore=g.status==='final'||g.status==='live';
      return '<button type="button" class="overview-game-card'+(g.status==='live'?' is-live':'')+
        (isMine(g)?' is-mine':isWatched(g)?' is-watched':'')+'" data-act="overview-today-results" aria-label="Open today’s results for '+
        escapeHTML((g.away_name||'Away')+' at '+(g.home_name||'Home'))+'">'+
        '<span class="overview-game-heading"><span class="overview-game-status">'+
        (g.status==='live'?'<i aria-hidden="true"></i>':'')+escapeHTML(formatTime(g))+'</span>'+
        (isMine(g)?'<span class="overview-game-my-tag">MY ROSTER</span>':
          isWatched(g)?'<span class="overview-game-queue-tag">IN QUEUE</span>':'')+'</span>'+
        school(g.away_id,g.away_name,g.away_score,hasScore,g.away_quad,g.away_q1a)+
        school(g.home_id,g.home_name,g.home_score,hasScore,g.home_quad,g.home_q1a)+
        '<span class="overview-game-link">View game day <span aria-hidden="true">›</span></span></button>';
    }).join('');
    const count=games.length;
    const body=overviewGamesLoading&&!isReady?
      '<div class="overview-games-placeholder">Loading today’s matchups…</div>':
      overviewGamesError&&!isReady?'<div class="overview-games-placeholder">'+escapeHTML(overviewGamesError)+'</div>':
      fixtures.length?'<div class="overview-game-grid">'+cards+'</div>':
      '<div class="overview-games-placeholder">No league-school games scheduled today. Browse the full scoreboard for other matchups.</div>';
    return '<section class="panel overview-scoreboard">'+
      panelHeading('Today’s games',formatResultsDay(today,{weekday:'long',month:'short',day:'numeric'})+
      (count?' · '+count+' league matchups':''),
      (watched.size?'<button class="btn small ghost" type="button" data-act="results-track-queue">My queue games</button>':'')+
      '<button class="btn small ghost" type="button" data-act="overview-today-results">Full scoreboard</button>')+
      body+'</section>';
  }
  function overview(){
    const users=members(),state=league.settings.draft_status;
    const allOwners=owners(),hasRosters=allOwners.length>0;
    const programIndex=new Map(programs().map(p=>[String(p.id),p]));
    const memberIndex=new Map(users.map(u=>[String(u.id),u]));
    const labelOf=id=>programIndex.get(String(id))?.name||'Program';
    const personOf=id=>memberIndex.get(String(id))?.display_name||'Manager';
    const seasonScores=standingsData?.season===season()?standingsData:null;
    const scoreIndex=new Map((seasonScores?.standings||[]).map(x=>[String(x.manager_id),x]));
    const standings=users.map(u=>({u,score:scoreIndex.get(String(u.id))?.points||0}))
      .sort((a,b)=>b.score-a.score||a.u.display_name.localeCompare(b.u.display_name));
    const scoreText=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
    const eventItems=[
      ...(league.trades||[]).filter(t=>t.status==='accepted').map(t=>({
        when:Number(t.resolved_at||t.offered_at||0),type:'trade',title:'Trade completed',
        detail:personOf(t.from_manager_id)+' and '+personOf(t.to_manager_id)+' exchanged programs'
      })),
      ...(league.roster_transactions||[]).map(t=>({
        when:Number(t.created_at||0),type:'waiver',title:t.action==='claim'?'Program acquired':'Program released',
        detail:personOf(t.manager_id)+' · '+labelOf(t.program_id)
      })),
      ...picks().map(p=>({
        when:Number(p.picked_at||0),type:'draft',title:'Round '+(Number(p.round)||'?')+' pick',
        detail:personOf(p.manager_id)+' selected '+labelOf(p.program_id)
      }))
    ].sort((a,b)=>b.when-a.when).slice(0,5);
    const teams=users.map(u=>{
      const owned=allOwners.filter(o=>String(o.manager_id)===String(u.id))
        .map(o=>programIndex.get(String(o.program_id))).filter(Boolean);
      const points=scoreIndex.get(String(u.id))?.points;
      return '<button type="button" class="league-team-tile overview-team-tile'+(u.id===me.id?' is-mine':'')+'" data-act="open-manager" data-id="'+escapeHTML(u.id)+'" aria-label="View '+escapeHTML(u.display_name)+' roster">'
        +'<span class="league-tile-top">'+avatar(u)+'<span class="grow"><strong>'+escapeHTML(u.display_name)+(u.id===me.id?'<em class="team-self-pill">YOU</em>':'')+'</strong>'
        +'<small>'+(hasRosters&&seasonScores&&owned.length?scoreText(points)+' pts · ':'')+
          (owned.length?owned.length+' program'+(owned.length===1?'':'s'):'Awaiting draft')+'</small></span>'
        +'<span class="league-tile-arrow" aria-hidden="true">›</span></span>'
        +(owned.length?'<span class="league-logo-strip">'+owned.map(p=>
          '<span class="league-logo-holder" title="'+escapeHTML(p.name)+'">'+img(p)+'</span>').join('')+'</span>'
          :'<span class="league-tile-pending">No schools selected yet</span>')
        +'</button>';
    }).join('');
    const statusLabel=state==='live'?'Draft in progress':state==='paused'?'Draft paused':
      state==='finished'?'Season underway':'Getting ready for the draft';
    const statusSub=state==='live'&&nextManager()?'Picking now: '+escapeHTML(nextManager().display_name):
      state==='pending'?'Build your draft board before selections begin':
      state==='paused'?'Selections are temporarily on hold':
      'Teams keep their schools from year to year';
    const openTrades=(league.trades||[]).filter(t=>t.status==='pending'&&t.to_manager_id===me.id).length;
    const nextAction=state==='pending'||state==='live'||state==='paused'
      ?{page:'draft',label:state==='live'?'Open the draft room':'Prepare your draft queue',description:'Review programs and organize your picks.'}
      :openTrades?{page:'trades',label:'Review trade offers',description:openTrades+' offer'+(openTrades===1?' needs':'s need')+' your response.'}
      :{page:'team',label:'Manage your team',description:'View your permanent programs and season performance.'};
    const standingsPanel=hasRosters&&seasonScores
      ?'<section class="panel overview-standings">'+panelHeading('League standings','Current season','<button type="button" class="overview-text-link" data-act="tab" data-id="league">Full standings ›</button>')
        +'<div class="overview-standings-list">'+standings.slice(0,Math.min(5,users.length)).map(({u,score},index)=>
          '<button type="button" class="overview-standing-row'+(u.id===me.id?' is-mine':'')+'" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'
          +'<span class="overview-standing-rank">'+(index+1)+'</span>'+avatar(u)
          +'<strong>'+escapeHTML(u.display_name)+'</strong><span>'+scoreText(score)+'</span></button>').join('')+'</div>'
        +'<div class="overview-aside-note">Best '+Number(league.settings.scoring?.best_programs||8)+' programs count each season.</div></section>'
      :'<section class="panel overview-quick-panel">'+panelHeading('Quick access',state==='pending'?'Prepare for the season':'Your league tools')
        +'<div class="overview-next-step"><span class="overview-next-step-icon">'+iconSVG(nextAction.page)+'</span>'
        +'<strong>'+escapeHTML(nextAction.label)+'</strong><p>'+escapeHTML(nextAction.description)+'</p>'
        +'<button type="button" class="btn" data-act="tab" data-id="'+nextAction.page+'">Continue <span aria-hidden="true">›</span></button></div>'
        +'<div class="overview-quick-links"><button type="button" data-act="tab" data-id="programs">Browse schools <span aria-hidden="true">›</span></button>'
        +'<button type="button" data-act="tab" data-id="scoring">Scoring rules <span aria-hidden="true">›</span></button></div></section>';
    return '<header class="overview-head"><div><span class="overview-kicker">'+escapeHTML(season())+' · COLLEGE BASKETBALL DYNASTY</span>'
      +'<h1>League Overview</h1><p>Scores, schools, and league activity in one place.</p></div>'
      +'<div class="overview-head-actions"><button type="button" class="btn secondary" data-act="tab" data-id="team">My team</button>'
      +'<button type="button" class="btn" data-act="tab" data-id="results">View results</button></div></header>'
      +'<section class="overview-status overview-status-hub overview-status-clean" aria-label="League status">'
      +'<span class="overview-status-dot '+(state==='live'?'live':'')+'" aria-hidden="true"></span>'
      +'<span class="overview-status-copy"><strong>'+statusLabel+'</strong><small>'+statusSub+'</small></span>'
      +'<span class="overview-status-meta">'+users.length+' / '+Number(league.settings.max_managers)+' managers</span>'
      +(state==='live'&&isMyTurn()?'<button type="button" class="btn small" data-act="tab" data-id="draft">Your turn ›</button>':'')
      +'</section>'
      +(syncActive?'<p class="standings-notice">Importing selected programs…</p>':'')
      +'<div class="overview-main-grid">'+overviewScoreboard()+standingsPanel+'</div>'
      +'<div class="overview-lower-grid"><section class="panel overview-teams-panel">'
      +panelHeading('League teams','Select a manager to see their roster','<button type="button" class="overview-text-link" data-act="tab" data-id="league">View standings ›</button>')
      +'<div class="league-teams-grid">'+(teams||empty('No managers yet'))+'</div></section>'
      +'<section class="panel overview-activity-panel">'+panelHeading('Recent activity','Draft picks and completed moves')
      +(eventItems.length?'<div class="overview-activity-list">'+eventItems.map(e=>
        '<div class="overview-activity-item activity-'+e.type+'"><span class="overview-activity-marker" aria-hidden="true"></span>'
        +'<span><strong>'+escapeHTML(e.title)+'</strong><small>'+escapeHTML(e.detail)+'</small></span>'
        +(e.when>0?'<time class="overview-activity-date">'+escapeHTML(new Date(e.when*1000).toLocaleDateString('en-US',{month:'short',day:'numeric'}))+'</time>':'')
        +'</div>').join('')+'</div>'
        :'<div class="overview-activity-empty"><span>League moves will appear here after the first selection.</span>'
        +'<button type="button" class="overview-text-link" data-act="tab" data-id="draft">Visit draft room ›</button></div>')
      +'</section></div>';
  }
  function myTeamPage(){
    const owned=myPrograms().sort((a,b)=>a.name.localeCompare(b.name));
    const draftFinished=league.settings.draft_status==='finished';
    const canTrade=league.settings.trading_enabled;
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
      const give=tradeAssetNames(t.id,me.id);
      const receive=items.filter(x=>x.to_manager_id===me.id).map(x=>getName(x.program_id))
        .concat((league.draft_pick_trade_items||[]).filter(x=>x.trade_id===t.id&&x.to_manager_id===me.id).map(x=>'Pick #'+x.overall));
      const actions=t.status==='pending'
        ?(incoming&&canTrade?'<button class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept</button><button class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button>':
          !incoming?'<button class="btn small secondary" data-act="trade-cancel" data-id="'+escapeHTML(t.id)+'">Cancel offer</button>':'')
        :'';
      return '<div class="team-offer"><div class="team-offer-head"><strong>'+escapeHTML(incoming?'Incoming from ':'Sent to ')+escapeHTML(other?.display_name||'Manager')+'</strong><span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div>'
        +'<div class="team-offer-detail"><span>You send</span><strong>'+escapeHTML(give.join(', ')||'No assets')+'</strong></div>'
        +'<div class="team-offer-detail"><span>You receive</span><strong>'+escapeHTML(receive.join(', ')||'No assets')+'</strong></div>'
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
      +'<div class="team-stat"><span>LEAGUE TITLES</span><strong>'+titles+'</strong><small>Dynasty championships</small></div>'
      +'<div class="team-stat team-season-score"><span>SEASON POINTS</span><strong>'+(standingsData?.season===season()?Number(standingsData.standings?.find(x=>x.manager_id===me.id)?.points||0).toLocaleString('en-US',{maximumFractionDigits:2}):'—')+'</strong><small>Best '+bestCount+' programs</small></div></div>'
      +'<div class="team-actions">'
      +(canTrade?'<button class="btn" data-act="tab" data-id="trades">Propose a trade</button>':
        !draftFinished?'<button class="btn" data-act="tab" data-id="draft">Open draft room</button>':'')
      +(canWaive?'<button class="btn secondary" data-act="tab" data-id="waivers">Manage waivers</button>':'')
      +'<button class="btn secondary" data-act="tab" data-id="programs">Browse schools</button>'
      +'<button class="btn ghost" data-act="tab" data-id="settings">Edit profile</button></div>'
      +'<div class="team-layout"><section class="panel team-roster-panel">'+panelHeading('Your programs',owned.length+' permanently owned schools','<button class="btn small ghost" data-act="tab" data-id="programs">Browse schools</button>')
      +(owned.length?'<div class="team-program-grid">'+roster+'</div>':empty('Your roster is ready to build','Once the draft begins, your selected schools will appear here with their logos and season records.'))
      +(owned.length&&!standingsData?'<p class="team-footnote">Season points appear above once live standings finish loading.</p>':'')+'</section>'
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
    finally{standingsLoading=false;if(['home','league','team','manager-detail'].includes(current)&&!globalSearchOpen)render();}
  }
  async function loadSchoolLeaders(){
    if(!me||schoolLeadersLoading)return;
    schoolLeadersLoading=true;schoolLeadersError='';
    if(current==='programs'&&programMode==='leaders')render();
    try{schoolLeaders=await api('data/leaders');}
    catch(e){schoolLeadersError=e.message;}
    finally{
      schoolLeadersLoading=false;
      if(current==='programs'&&programMode==='leaders'){render();filterSchoolLeaders();}
      else if(current==='draft'&&document.activeElement?.id!=='draft-pool-search')render();
    }
  }

  // Ranked views share one compact, accessible filter and paging behavior.
  const rankingNumber=(value,places=0)=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':
    Number(value).toLocaleString('en-US',{minimumFractionDigits:places,maximumFractionDigits:places});
  const rankingSearchText=p=>(p.name+' '+(p.abbr||'')+' '+conf(p.conference_id)).toLowerCase();
  function rankingEligible(p,conference,scope){
    if(conference!=='all'&&String(p.conference_id)!==String(conference))return false;
    const owned=programOwned(p.id);
    if(scope==='available')return !owned;
    if(scope==='owned')return !!owned;
    if(scope==='mine')return String(owned?.manager_id||'')===String(me?.id||'');
    return true;
  }
  function rankingSeasonNav(pairs,action,active,label){
    return '<div class="rank-periods" role="group" aria-label="'+escapeHTML(label)+'">'
      +pairs.map(([id,text])=>'<button type="button" data-act="'+action+'" data-id="'+escapeHTML(id)+'" class="'+(String(active)===String(id)?'active':'')+'" aria-pressed="'+(String(active)===String(id))+'">'+escapeHTML(text)+'</button>').join('')+'</div>';
  }
  function rankingTools(kind,query,conference,scope){
    const prefix=kind==='leaders'?'leader':'rating';
    const scopeButtons=[['all','All'],['mine','My roster'],['owned','Rostered'],['available','Available']]
      .map(([id,label])=>'<button type="button" data-act="'+prefix+'-scope" data-id="'+id+'" class="'+(scope===id?'active':'')+'" aria-pressed="'+(scope===id)+'">'+label+'</button>').join('');
    const conferences=eligibleConferenceIds().sort((a,b)=>conf(a).localeCompare(conf(b)))
      .map(id=>'<option value="'+escapeHTML(id)+'" '+(String(conference)===String(id)?'selected':'')+'>'+escapeHTML(conf(id))+'</option>').join('');
    return '<div class="rank-tools" role="search">'
      +'<label class="rank-search"><span class="rank-search-icon" aria-hidden="true">⌕</span><input id="'+prefix+'-search" type="search" value="'+escapeHTML(query)+'" placeholder="Search schools..." autocomplete="off" aria-label="Search ranked schools" /></label>'
      +'<label class="rank-conference-select"><span class="sr-only">Conference</span><select id="'+prefix+'-conference" aria-label="Filter by conference"><option value="all">All conferences</option>'+conferences+'</select></label>'
      +'<div class="rank-scope" role="group" aria-label="Filter by roster status">'+scopeButtons+'</div>'
      +'</div>';
  }
  function rankingFeatured(rows,kind,label,valueOf){
    if(!rows.length)return '';
    return '<div class="rank-featured" data-featured="'+kind+'">'
      +'<div class="rank-featured-label"><span>LEADING PROGRAMS</span><small>'+escapeHTML(label)+'</small></div>'
      +'<div class="rank-featured-grid">'+rows.slice(0,3).map((row,index)=>{
        const p=row.p,value=valueOf(row);
        return '<button type="button" class="rank-featured-card" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'
          +'<span class="rank-featured-position">'+String(index+1).padStart(2,'0')+'</span>'
          +img(p)
          +'<span class="rank-featured-identity"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span>'
          +'<span class="rank-featured-stat"><strong>'+escapeHTML(value)+'</strong><small>'+escapeHTML(label)+'</small></span>'
          +'</button>';
      }).join('')+'</div></div>';
  }
  function filterRankingDisplay(kind){
    const isLeader=kind==='leaders',query=(isLeader?leaderQuery:ratingQuery).trim().toLowerCase();
    const limit=isLeader?leaderShown:ratingShown;
    let found=0,visible=0;
    const visibility=new Map();
    root.querySelectorAll('.rank-data-row[data-ranking="'+kind+'"]').forEach(row=>{
      const match=row.dataset.search.includes(query);
      if(match)found++;
      const show=match&&found<=limit;
      if(show)visible++;
      visibility.set(row.dataset.program,show);
      row.hidden=!show;
    });
    root.querySelectorAll('.rank-mobile-row[data-ranking="'+kind+'"]').forEach(row=>{
      row.hidden=!visibility.get(row.dataset.program);
    });
    const count=root.querySelector('#'+(isLeader?'leader':'rating')+'-count');
    if(count)count.textContent=found>visible?visible+' of '+found+' schools':found+' '+(found===1?'school':'schools');
    const more=root.querySelector('#'+(isLeader?'leader':'rating')+'-more');
    if(more){more.hidden=found<=limit;const detail=more.querySelector('small');if(detail)detail.textContent=(found-visible)+' more';}
    const emptyBlock=root.querySelector('#'+(isLeader?'leader':'rating')+'-empty');
    if(emptyBlock)emptyBlock.hidden=found>0;
    const featured=root.querySelector('[data-featured="'+kind+'"]');
    if(featured)featured.hidden=!!query;
  }
  function schoolLeadersPage(){
    const all=schoolLeaders,years=all?.seasons||[];
    const period=leaderSeason==='all'?'all':years.includes(leaderSeason)?leaderSeason:'all';
    const seasonNav=rankingSeasonNav([['all','All-time'],...years.slice().reverse().map(y=>[y,y])],'leaders-season',period,'Fantasy scoring season');
    const header='<div class="rank-heading"><div><span class="rank-kicker">PROGRAM RANKINGS · DYNASTY POINTS</span><h2>Historical leaders</h2>'
      +'<p>Compare every eligible program across seasons, from 2021–22 onward.</p></div>'
      +'<div class="rank-heading-mark"><span>VIEWING</span><strong>'+escapeHTML(period==='all'?'All-time':period)+'</strong><small>Fantasy points</small></div></div>';
    if(!all)return '<section class="panel ranking-dashboard school-leaders-shell">'+header+seasonNav
      +(schoolLeadersError?empty('Rankings unavailable',escapeHTML(schoolLeadersError))+'<button class="btn secondary small" data-act="leaders-retry">Try again</button>'
        :empty('Preparing historical rankings','Collecting school records and scoring totals.'))+'</section>';
    const byId=new Map();
    for(const item of all.rows||[]){
      const id=String(item.program_id),history=byId.get(id)||new Map();
      history.set(item.season,item);byId.set(id,history);
    }
    const entries=(all.directory||[]).filter(p=>rankingEligible(p,leaderConference,leaderOwnership)).map(p=>{
      const history=byId.get(String(p.id))||new Map();
      const values=years.map(y=>history.get(y)?.points??null);
      const known=values.filter(x=>x!==null);
      const total=known.length?known.reduce((sum,x)=>sum+Number(x),0):null;
      return {p,history,values,total,selected:period==='all'?total:(history.get(period)?.points??null)};
    });
    const byPoints=entries.slice().sort((a,b)=>(b.selected??-1)-(a.selected??-1)||a.p.name.localeCompare(b.p.name));
    let previous,rank=0;
    const ranks=new Map();
    byPoints.forEach((row,i)=>{
      if(row.selected!==previous){rank=i+1;previous=row.selected;}
      ranks.set(String(row.p.id),rank);
    });
    const rows=(leaderOrder==='name'?entries.sort((a,b)=>a.p.name.localeCompare(b.p.name)):byPoints);
    const format=value=>rankingNumber(value,2).replace(/\.00$/,'');
    const previewYears=[...new Set([...(period==='all'?[]:[period]),...years.slice(-3).reverse()])].slice(0,4);
    const thYears=years.slice().map(y=>'<th class="rank-year-cell '+(period===y?'active':'')+'"><button type="button" data-act="leaders-season" data-id="'+escapeHTML(y)+'" title="Rank by '+escapeHTML(y)+'">'+escapeHTML(y.slice(2))+'</button></th>').join('');
    const table=rows.map(row=>{
      const p=row.p,rank=ranks.get(String(p.id)),rankText=row.selected===null?'—':(byPoints.some(x=>x!==row&&x.selected===row.selected)?'T-':'')+'#'+rank;
      return '<tr class="rank-data-row school-leader-row" data-ranking="leaders" data-program="'+escapeHTML(p.id)+'" data-search="'+escapeHTML(rankingSearchText(p))+'">'
        +'<td class="rank-position-cell"><span class="rank-position '+(rank<=3?'is-top':'')+'">'+rankText+'</span></td>'
        +'<td class="rank-school-cell"><button type="button" class="school-leader-school" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span></button></td>'
        +'<td class="school-leader-points"><strong>'+format(row.selected)+'</strong><small>PTS</small></td>'
        +row.values.map((x,i)=>'<td class="rank-year-cell '+(years[i]===period?'active':'')+'">'+format(x)+'</td>').join('')
        +'</tr>';
    }).join('');
    const cards=rows.map(row=>{
      const p=row.p,rank=ranks.get(String(p.id)),value=format(row.selected);
      return '<article class="rank-mobile-row" data-ranking="leaders" data-program="'+escapeHTML(p.id)+'" data-search="'+escapeHTML(rankingSearchText(p))+'">'
        +'<button class="rank-mobile-main" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'
        +'<span class="rank-mobile-index">'+(row.selected===null?'—':'#'+rank)+'</span>'+img(p)
        +'<span class="rank-mobile-name"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span>'
        +'<span class="rank-mobile-primary"><strong>'+value+'</strong><small>PTS</small></span><span class="rank-mobile-chevron">›</span></button>'
        +'<div class="rank-mini-years">'+previewYears.map(y=>'<div class="'+(y===period?'active':'')+'"><span>'+escapeHTML(y.slice(2))+'</span><strong>'+format(row.history.get(y)?.points??null)+'</strong></div>').join('')+'</div></article>';
    }).join('');
    const notes=all.archive_complete?'Archived seasons are verified. Current-season totals are live and may change.':
      'Scores reflect available verified results; unfinished historical imports may change totals.';
    return '<section class="panel ranking-dashboard school-leaders-shell">'+header+seasonNav
      +'<div class="rank-summary-line"><span class="rank-data-indicator"><i></i> '+(period===season()?'LIVE SEASON':'SEASON RECORDS')+'</span><span>'+entries.length+' eligible schools in this view</span><span>Ranked by '+(period==='all'?'career total':period+' points')+'</span></div>'
      +rankingTools('leaders',leaderQuery,leaderConference,leaderOwnership)
      +'<div class="rank-toolbar-bottom"><div class="rank-order" role="group" aria-label="Sort historical leaderboard">'
      +[['points','Most points'],['name','A–Z']].map(([id,label])=>'<button type="button" data-act="leaders-sort" data-id="'+id+'" class="'+(leaderOrder===id?'active':'')+'">'+label+'</button>').join('')+'</div>'
      +'<span class="rank-count" id="leader-count">'+entries.length+' schools</span></div>'
      +'<div class="rank-table-container school-leader-table-wrap"><table class="school-leader-table rank-table">'
      +'<thead><tr><th class="rank-position-cell">RANK</th><th class="rank-school-cell">SCHOOL</th><th class="rank-primary-head">'+escapeHTML(period==='all'?'CAREER PTS':'SEASON PTS')+'</th>'+thYears+'</tr></thead><tbody>'+table+'</tbody></table></div>'
      +'<div class="rank-mobile-list">'+cards+'</div>'
      +'<div id="leader-empty" class="rank-empty" hidden>No schools match your search. Try a different name or conference.</div>'
      +'<div class="rank-load"><button id="leader-more" type="button" data-act="leaders-more" class="rank-load-button" hidden>Show more schools <small></small></button></div>'
      +'<div class="rank-footnote">'+escapeHTML(notes)+' <button type="button" data-act="school-mode" data-id="ratings">Compare power ratings ›</button></div></section>';
  }
  function filterSchoolLeaders(){filterRankingDisplay('leaders');}
  function ratingsPage(){
    const year=ratingYear(ratingSeason||season()),data=ratingCache[year];
    const years=Array.from({length:6},(_,i)=>ratingYear(season())-i).filter(y=>y>=2022&&y<=2027);
    const seasons=rankingSeasonNav(years.map(y=>[String(y),(y-1)+'-'+String(y%100).padStart(2,'0')]),'rating-season',String(year),'T-Rank season');
    const isCurrent=year===ratingYear(season());
    const heading='<div class="rank-heading"><div><span class="rank-kicker">PROGRAM RANKINGS · ADVANCED ANALYTICS</span><h2>Power ratings</h2>'
      +'<p>Explore Bart Torvik’s national efficiency rankings, offense, defense and team strength.</p></div>'
      +'<div class="rank-heading-mark"><span>'+(isCurrent?'CURRENT SEASON':'ARCHIVED SEASON')+'</span><strong>'+(year-1)+'-'+String(year%100).padStart(2,'0')+'</strong><small>Torvik '+year+' ratings</small></div></div>';
    const source='<div class="rank-source-line"><span class="rank-source-mark"><i></i> '+(isCurrent?'CURRENT '+(year-1)+'-'+String(year%100).padStart(2,'0')+' T-RANK':'HISTORICAL '+(year-1)+'-'+String(year%100).padStart(2,'0')+' T-RANK')+'</span>'
      +'<span>'+(isCurrent?'These are the 2026–27 national ratings, not 2025–26. Used for provisional Q1/Q1A/Q2 bonuses until official NCAA NET is available.':'Historical ratings are only for comparison; archived fantasy scores use the verified NCAA NET for that season.')+'</span>'
      +(!isCurrent?'<button type="button" class="rank-current-season-button" data-act="ratings-current">View current '+escapeHTML(season())+' ratings ›</button>':'')+'</div>';
    if(!data)return '<section class="panel ranking-dashboard ratings-shell">'+heading+seasons+source
      +(ratingError[year]?empty('T-Rank unavailable',escapeHTML(ratingError[year]))+'<button class="btn secondary small" data-act="ratings-refresh" data-id="'+year+'">Try again</button>'
        :empty('Loading power ratings','Retrieving published national rankings and efficiency numbers.'))+'</section>';
    const metrics={
      rank:(a,b)=>(a.r?.rank??999)-(b.r?.rank??999),
      offense:(a,b)=>(a.r?.adj_o_rank??999)-(b.r?.adj_o_rank??999),
      defense:(a,b)=>(a.r?.adj_d_rank??999)-(b.r?.adj_d_rank??999),
      power:(a,b)=>(b.r?.barthag??-1)-(a.r?.barthag??-1),
      wab:(a,b)=>(b.r?.wab??-999)-(a.r?.wab??-999),
      tempo:(a,b)=>(b.r?.tempo??-1)-(a.r?.tempo??-1)
    };
    const sortNames={rank:'Overall rank',offense:'Offensive efficiency',defense:'Defensive efficiency',power:'Barthag',wab:'Wins above bubble',tempo:'Adjusted tempo'};
    const entries=eligiblePrograms().filter(p=>rankingEligible(p,ratingConference,ratingOwnership))
      .map(p=>({p,r:ratingOf(p,year)}));
    const rows=entries.sort((a,b)=>(metrics[ratingSort]||metrics.rank)(a,b)||a.p.name.localeCompare(b.p.name));
    const valid=rows.filter(row=>row.r),dec=(x,n=1)=>rankingNumber(x,n);
    const featureValue=row=>ratingSort==='offense'?dec(row.r?.adj_o):ratingSort==='defense'?dec(row.r?.adj_d):
      ratingSort==='power'?dec(row.r?.barthag,3):ratingSort==='wab'?dec(row.r?.wab):
      ratingSort==='tempo'?dec(row.r?.tempo):'#'+(row.r?.rank??'—');
    const metricOptions=[['rank','Overall'],['offense','Offense'],['defense','Defense'],['power','Barthag'],['wab','WAB'],['tempo','Tempo']];
    const sortTabs=metricOptions.map(([id,label])=>'<button type="button" data-act="rating-sort" data-id="'+id+'" aria-pressed="'+(ratingSort===id)+'" class="'+(ratingSort===id?'active':'')+'">'+label+'</button>').join('');
    const table=rows.map(({p,r})=>
      '<tr class="rank-data-row rating-school-row" data-ranking="ratings" data-program="'+escapeHTML(p.id)+'" data-search="'+escapeHTML(rankingSearchText(p))+'">'
      +'<td class="rank-position-cell"><span class="rank-position '+(r?.rank<=25?'is-top':'')+'">'+(r?'#'+r.rank:'—')+'</span></td>'
      +'<td class="rank-school-cell"><button type="button" class="school-leader-school" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span></button></td>'
      +'<td class="rating-power"><strong>'+dec(r?.barthag,3)+'</strong></td>'
      +'<td class="rating-numeric"><strong>'+dec(r?.adj_o)+'</strong><small>'+(r?.adj_o_rank?'#'+r.adj_o_rank+' nationally':'—')+'</small></td>'
      +'<td class="rating-numeric"><strong>'+dec(r?.adj_d)+'</strong><small>'+(r?.adj_d_rank?'#'+r.adj_d_rank+' nationally':'—')+'</small></td>'
      +'<td class="rating-numeric">'+dec(r?.wab)+'</td><td class="rating-numeric">'+dec(r?.tempo)+'</td></tr>').join('');
    const cards=rows.map(({p,r})=>
      '<article class="rank-mobile-row" data-ranking="ratings" data-program="'+escapeHTML(p.id)+'" data-search="'+escapeHTML(rankingSearchText(p))+'">'
      +'<button class="rank-mobile-main" type="button" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'
      +'<span class="rank-mobile-index">'+(r?'#'+r.rank:'—')+'</span>'+img(p)
      +'<span class="rank-mobile-name"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span>'
      +'<span class="rank-mobile-primary"><strong>'+featureValue({r})+'</strong><small>'+escapeHTML((sortNames[ratingSort]||'Overall').toUpperCase())+'</small></span><span class="rank-mobile-chevron">›</span></button>'
      +'<div class="rank-mobile-metrics"><div><span>OFFENSE</span><strong>'+dec(r?.adj_o)+'</strong></div>'
      +'<div><span>DEFENSE</span><strong>'+dec(r?.adj_d)+'</strong></div>'
      +'<div><span>WAB</span><strong>'+dec(r?.wab)+'</strong></div>'
      +'<div><span>TEMPO</span><strong>'+dec(r?.tempo)+'</strong></div></div></article>').join('');
    return '<section class="panel ranking-dashboard ratings-shell">'+heading+seasons+source
      +'<div class="rank-summary-line"><span class="rank-data-indicator"><i></i> '+escapeHTML(data.source||'BART TORVIK')+' · '+(year-1)+'-'+String(year%100).padStart(2,'0')+'</span><span>'+valid.length+' matched / '+entries.length+' eligible</span>'
      +'<span>Source checked '+escapeHTML(new Date(data.fetched_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}))+'</span></div>'
      +rankingFeatured(valid.slice(0,3),'ratings',sortNames[ratingSort]||'National T-Rank',featureValue)
      +rankingTools('ratings',ratingQuery,ratingConference,ratingOwnership)
      +'<div class="rank-toolbar-bottom"><div class="rank-order rank-rating-order" role="group" aria-label="Sort power ratings">'+sortTabs+'</div>'
      +'<span class="rank-count" id="rating-count">'+entries.length+' schools</span></div>'
      +'<div class="rank-table-container ratings-table-wrap"><table class="ratings-table rank-table"><thead><tr><th class="rank-position-cell">NATL RANK</th><th class="rank-school-cell">SCHOOL</th>'
      +'<th title="Probability-based power rating">BARTHAG</th><th title="Adjusted points scored per 100 possessions">OFFENSE</th>'
      +'<th title="Adjusted points allowed per 100 possessions, lower is better">DEFENSE</th><th title="Wins above bubble">WAB</th>'
      +'<th title="Adjusted possessions per game">TEMPO</th></tr></thead><tbody>'+table+'</tbody></table></div>'
      +'<div class="rank-mobile-list">'+cards+'</div>'
      +'<div id="rating-empty" class="rank-empty" hidden>No schools match your filters. Try a different search or conference.</div>'
      +'<div class="rank-load"><button id="rating-more" type="button" data-act="ratings-more" class="rank-load-button" hidden>Show more schools <small></small></button></div>'
      +'<div class="rank-footnote"><span><strong>Reading the stats:</strong> Higher Barthag and offense are better. Lower defensive efficiency is better. The rank shown is national, even when sorted by another metric.</span>'
      +ratingExternalLinks(year)+'</div></section>';
  }
  function filterRatings(){filterRankingDisplay('ratings');}
  function programsPage(){
    const nav='<div class="school-view-tabs" role="group" aria-label="Schools sections">'
      +[['directory','School directory'],['leaders','Historical leaders'],['ratings','Power ratings']].map(([id,label])=>'<button type="button" data-act="school-mode" data-id="'+id+'" class="'+(programMode===id?'active':'')+'" aria-pressed="'+(programMode===id)+'">'+escapeHTML(label)+'</button>').join('')+'</div>';
    if(programMode==='leaders')return heading('COLLEGE BASKETBALL','Schools','Browse programs or compare historical fantasy scoring across all Division I schools.')+nav+schoolLeadersPage();
    if(programMode==='ratings')return heading('COLLEGE BASKETBALL','Schools','Compare eligible programs using T-Rank efficiency ratings.')+nav+ratingsPage();
    const eligible=eligiblePrograms();
    const available=eligible.filter(p=>!programOwned(p.id)).length;
    const sorters={
      name:(a,b)=>a.name.localeCompare(b.name),
      conference:(a,b)=>conf(a.conference_id).localeCompare(conf(b.conference_id))||a.name.localeCompare(b.name),
      availability:(a,b)=>Number(!!programOwned(a.id))-Number(!!programOwned(b.id))||a.name.localeCompare(b.name)
    };
    eligible.sort(sorters[programSort]||sorters.name);
    const chip=(value,label)=>'<button class="'+(programConference===value?'active':'')+'" data-act="directory-conference" data-id="'+escapeHTML(value)+'" type="button" aria-pressed="'+(programConference===value)+'">'+escapeHTML(label)+'</button>';
    const conferenceChips=chip('all','All conferences')+eligibleConferenceIds().sort((a,b)=>conf(a).localeCompare(conf(b))).map(id=>chip(id,conf(id))).join('');
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
      +'</div>'
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

  /* Draft room: in-place selection desk and the original server-authoritative snake order.
     Brand accents are presentation only, never a draft ranking or eligibility source. */
  const DRAFT_BRANDS={
    'alabama':'#9e1b32','auburn':'#0c2340','arkansas':'#9d2235','arizona st':'#8c1d40','arizona state':'#8c1d40','arizona':'#ab0520',
    'baylor':'#154734','boise st':'#0033a0','boise state':'#0033a0','butler':'#13294b','byu':'#002e5d','brigham young':'#002e5d',
    'california baptist':'#002554','california':'#003262','clemson':'#af4a00','colorado st':'#1e4d2b','colorado state':'#1e4d2b',
    'colorado':'#393522','creighton':'#005ca9','cincinnati':'#e00122','dayton':'#d50032','depaul':'#005eb8',
    'duke':'#003087','duquesne':'#041e42','florida atlantic':'#003366','florida gulf coast':'#005a3c',
    'florida international':'#081e3f','florida st':'#782f40','florida state':'#782f40','florida':'#0021a5',
    'george mason':'#006633','george washington':'#002f6c','georgetown':'#041e42','georgia tech':'#003057',
    'georgia':'#ba0c2f','gonzaga':'#002967','houston christian':'#00205b','houston':'#c8102e',
    'illinois chicago':'#b40021','illinois':'#13294b','indiana':'#990000','iowa st':'#c8102e',
    'iowa state':'#c8102e','iowa':'#151515','kansas st':'#512888','kansas state':'#512888',
    'kansas':'#0051ba','kentucky':'#0033a0','louisville':'#ad0000','loyola chicago':'#922247',
    'lsu':'#461d7c','marquette':'#003366','maryland':'#e21833','memphis':'#2a5dba',
    'miami':'#005030','michigan st':'#18453b','michigan state':'#18453b','michigan':'#00274c',
    'mississippi st':'#660000','mississippi state':'#660000','mississippi':'#9d2235','ole miss':'#9d2235',
    'missouri':'#151515','nebraska':'#d00000','north carolina st':'#cc0000','north carolina state':'#cc0000',
    'nc st':'#cc0000','north carolina':'#2974aa','notre dame':'#0c2340','northwestern':'#4e2a84',
    'oklahoma st':'#c94d14','oklahoma state':'#c94d14','oklahoma':'#841617','ohio st':'#ba0c2f','ohio state':'#ba0c2f',
    'oregon st':'#c44511','oregon state':'#c44511','oregon':'#154733','penn st':'#041e42','penn state':'#041e42',
    'pittsburgh':'#003594','pitt':'#003594','providence':'#151515','purdue':'#28251f',
    'rutgers':'#cc0033','saint john':'#d71920','st john':'#d71920','saint joseph':'#9e1b32',
    'saint louis':'#003da5','san diego st':'#a6192e','san diego state':'#a6192e',
    'seton hall':'#004488','smu':'#0033a0','south carolina':'#73000a','stanford':'#8c1515',
    'syracuse':'#d44500','tcu':'#4d1979','temple':'#9e1b34','tennessee':'#c94f00',
    'texas a and m':'#500000','texas a&m':'#500000','texas christian':'#4d1979',
    'texas tech':'#cc0000','texas st':'#501214','texas state':'#501214','texas':'#bf5700',
    'tulane':'#006747','tulsa':'#002d72','ucla':'#2774ae','ucf':'#171b1e',
    'uconn':'#000e2f','connecticut':'#000e2f','unc':'#2974aa','usc upstate':'#006747',
    'usc':'#990000','utah st':'#0f2439','utah state':'#0f2439','utah':'#cc0000',
    'vanderbilt':'#6a5c35','villanova':'#00205b','virginia tech':'#630031','virginia':'#232d4b',
    'vcu':'#242424','wake forest':'#5a4b35','washington st':'#981e32','washington state':'#981e32',
    'washington':'#4b2e83','west virginia':'#002855','wichita st':'#1a1a1a','wichita state':'#151515',
    'wisconsin':'#c5050c','xavier':'#0c2340'
  };
  const DRAFT_CONFERENCE_FALLBACK={
    '23':'#1f598f','2':'#193f7b','7':'#3d5d8a','8':'#163753','4':'#265e50','21':'#5a306d',
    '3':'#214c8d','44':'#3b587a','18':'#314f8b','29':'#185877','62':'#31516e'
  };
  function draftBrand(p){
    const name=String(p?.name||'').toLowerCase().replace(/&/g,' and ').replace(/\./g,'').replace(/\s+/g,' ').trim();
    const matched=Object.keys(DRAFT_BRANDS).filter(prefix=>name===prefix||name.startsWith(prefix+' '))
      .sort((a,b)=>b.length-a.length)[0];
    return matched?DRAFT_BRANDS[matched]:(DRAFT_CONFERENCE_FALLBACK[String(p?.conference_id)]||'#344967');
  }
  const draftStyle=p=>' style="--draft-brand:'+draftBrand(p)+'"';
  const draftQueueKey=()=>me?'boek_dynasty_draft_queue_'+String(me.id):'';
  const draftQueueMigratedKey=()=>draftQueueKey()+'_account_synced_v1';
  const normalizeDraftQueue=rows=>Array.isArray(rows)
    ?[...new Set(rows.filter(id=>typeof id==='string'||typeof id==='number').map(String))].slice(0,120):[];
  function writeLocalDraftQueue(){
    if(!me)return;
    try{localStorage.setItem(draftQueueKey(),JSON.stringify(draftWatchlist));}catch(e){}
  }
  function prepareDraftQueue(){
    if(!me||draftWatchlistOwner===String(me.id))return;
    draftWatchlistOwner=String(me.id);
    draftQueueVersion=0;draftQueueDirty=false;draftQueueSaving=false;draftQueueSyncError=false;
    if(draftQueueRetryTimer){clearTimeout(draftQueueRetryTimer);draftQueueRetryTimer=null;}
    try{draftWatchlist=normalizeDraftQueue(JSON.parse(localStorage.getItem(draftQueueKey())||'[]'));}
    catch(e){draftWatchlist=[];}
  }
  function wasDraftQueueMigrated(){
    try{return localStorage.getItem(draftQueueMigratedKey())==='1';}catch(e){return false;}
  }
  function markDraftQueueMigrated(){
    try{localStorage.setItem(draftQueueMigratedKey(),'1');}catch(e){}
  }
  // Bring browser-only lists into account storage once, preserving the server's
  // established order and appending any missing mobile-only choices.
  function reconcileDraftQueue(){
    if(!me||!league)return;
    prepareDraftQueue();
    const remote=normalizeDraftQueue(league.draft_queue?.items);
    const version=Number(league.draft_queue?.version)||0;
    // Ignore an older poll response or a server read while local edits save.
    if(draftQueueDirty||draftQueueSaving||version<draftQueueVersion)return;
    if(!wasDraftQueueMigrated()&&draftWatchlist.length){
      const merged=normalizeDraftQueue([...remote,...draftWatchlist]);
      draftQueueVersion=version;
      if(merged.some((id,i)=>remote[i]!==id)||merged.length!==remote.length){
        draftWatchlist=merged;
        storeDraftQueue();
        return;
      }
    }
    markDraftQueueMigrated();
    draftWatchlist=remote;
    draftQueueVersion=version;
    writeLocalDraftQueue();
    updateDraftQueueSyncStatus();
  }
  const draftQueueSyncMessage=()=>draftQueueSyncError?'Sync delayed · retrying':
    draftQueueDirty||draftQueueSaving?'Syncing changes…':
    draftQueueVersion>0?'Saved to account':'Waiting for first sync';
  function updateDraftQueueSyncStatus(){
    const status=root.querySelector('.draft-queue-sync');
    if(!status)return;
    status.textContent=draftQueueSyncMessage();
    status.classList.toggle('has-error',draftQueueSyncError);
  }
  function storeDraftQueue(){
    writeLocalDraftQueue();
    draftQueueDirty=true;
    updateDraftQueueSyncStatus();
    if(draftQueueRetryTimer)clearTimeout(draftQueueRetryTimer);
    draftQueueRetryTimer=setTimeout(flushDraftQueue,180);
  }
  async function flushDraftQueue(){
    draftQueueRetryTimer=null;
    if(!me||!draftQueueDirty||draftQueueSaving)return;
    const owner=draftWatchlistOwner,local=draftWatchlist.slice(),version=draftQueueVersion;
    draftQueueSaving=true;draftQueueDirty=false;
    updateDraftQueueSyncStatus();
    let retryDelay=180;
    try{
      const saved=await api('draft/queue',{program_ids:local,version});
      if(owner!==draftWatchlistOwner)return;
      draftQueueVersion=Number(saved.version)||version+1;
      draftQueueSyncError=false;
      markDraftQueueMigrated();
    }catch(error){
      if(owner!==draftWatchlistOwner)return;
      draftQueueDirty=true;
      if(error.status===409&&error.payload?.draft_queue){
        const remote=normalizeDraftQueue(error.payload.draft_queue.items);
        draftQueueVersion=Number(error.payload.draft_queue.version)||0;
        draftQueueSyncError=false;
        // Never discard either device's selections after a simultaneous edit.
        draftWatchlist=normalizeDraftQueue([...draftWatchlist,...remote]);
        writeLocalDraftQueue();
      }else{
        retryDelay=12000;
        draftQueueSyncError=true;
        notice('Queue saved on this device, but account sync failed. Retrying.',true);
      }
    }finally{
      draftQueueSaving=false;
      updateDraftQueueSyncStatus();
      if(owner===draftWatchlistOwner&&draftQueueDirty&&!draftQueueRetryTimer)
        draftQueueRetryTimer=setTimeout(flushDraftQueue,retryDelay);
    }
  }
  // A queue is priority ordered: index zero is the manager's first choice.
  // Keep the existing per-manager storage key so old shortlists migrate intact.
  function moveDraftQueue(id,delta){
    prepareDraftQueue();
    const from=draftWatchlist.indexOf(String(id)),to=from+delta;
    if(from<0||to<0||to>=draftWatchlist.length)return false;
    [draftWatchlist[from],draftWatchlist[to]]=[draftWatchlist[to],draftWatchlist[from]];
    storeDraftQueue();render();
    const moved=root.querySelector('.draft-queue-row[data-queue-id="'+String(id)+'"]');
    const control=moved?.querySelector('[data-act="draft-queue-'+(delta<0?'up':'down')+'"]');
    if(control&&!control.disabled)control.focus({preventScroll:true});
    return true;
  }
  function insertDraftQueue(id,targetId,after=false){
    prepareDraftQueue();
    id=String(id);targetId=String(targetId);
    if(id===targetId||!draftWatchlist.includes(id)||!draftWatchlist.includes(targetId))return false;
    const oldIndex=draftWatchlist.indexOf(id),old=draftWatchlist.slice();
    draftWatchlist.splice(oldIndex,1);
    const dest=draftWatchlist.indexOf(targetId)+(after?1:0);
    draftWatchlist.splice(dest,0,id);
    if(draftWatchlist.every((v,i)=>v===old[i]))return false;
    storeDraftQueue();render();return true;
  }
  // Uses verified fantasy points from the same school-leader feed as profiles.
  // The current unfinished season is excluded; missing seasons are not zero-filled.
  function draftHistoricalIndex(){
    const years=(schoolLeaders?.seasons||[]).filter(y=>y<season()).slice(-5);
    const yearSet=new Set(years),groups=new Map();
    for(const row of schoolLeaders?.rows||[]){
      if(!yearSet.has(row.season)||row.points===null||row.points===undefined||
        !Number.isFinite(Number(row.points)))continue;
      const id=String(row.program_id),scores=groups.get(id)||new Map();
      scores.set(row.season,Number(row.points));
      groups.set(id,scores);
    }
    const byId=new Map();
    for(const [id,scores] of groups){
      const values=years.filter(y=>scores.has(y)).map(y=>scores.get(y));
      if(!values.length)continue;
      const avg=values.reduce((sum,n)=>sum+n,0)/values.length;
      const best=Math.max(...values);
      const recent=years.slice(-3).filter(y=>scores.has(y)).map(y=>scores.get(y));
      byId.set(id,{avg,best,count:values.length,totalYears:years.length,
        recentAvg:recent.length?recent.reduce((sum,n)=>sum+n,0)/recent.length:null,
        eligibleForSort:values.length>=3});
    }
    return {years,byId};
  }
  const historicalPointLabel=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:1});
  function draftSelectionOrder(slot,managers){return draftOwner(slot,managers)||'';}
  function draftAvailable(){
    const drafted=new Set(picks().map(p=>String(p.program_id)));
    return eligiblePrograms().filter(p=>!drafted.has(String(p.id))&&!programOwned(p.id));
  }
  function filterDraftPool(){
    if(current!=='draft')return;
    const query=draftQuery.trim().toLowerCase(),cards=[...root.querySelectorAll('.draft-pool-card')];
    let total=0,visible=0;
    for(const card of cards){
      const matches=card.dataset.search.includes(query)
        &&(draftConference==='all'||card.dataset.conference===draftConference)
        &&(draftScope!=='queue'||card.dataset.queued==='1');
      if(matches)total++;
      const show=matches&&total<=draftShown;
      card.hidden=!show;if(show)visible++;
    }
    const counter=root.querySelector('#draft-pool-count');
    if(counter)counter.textContent=total===visible?total+' programs':visible+' of '+total+' programs';
    const load=root.querySelector('#draft-pool-more');
    if(load){load.hidden=total<=draftShown;load.textContent='Show '+Math.min(30,total-visible)+' more programs';}
    const blank=root.querySelector('#draft-pool-empty');
    if(blank)blank.hidden=total>0;
  }
  function draftPage(){
    prepareDraftQueue();
    const settings=league.settings,fullOrder=order(),managerCount=fullOrder.length;
    const status=settings.draft_status,rounds=Number(settings.rounds||0),completed=picks().length,total=draftTotal();
    const draftLive=status==='live',draftDone=status==='finished'||(total>0&&completed>=total);
    const yourTurn=draftLive&&nextManager()?.id===me.id;
    const openSeats=status==='pending'&&managerCount<2
      ?Math.max(0,Math.min(20,Number(settings.max_managers||7))-managerCount):0;
    const preview=!!openSeats,visualOrder=preview?[...fullOrder,...Array.from({length:openSeats},(_,i)=>'open-seat-'+i)]:fullOrder;
    const visualCount=visualOrder.length,plannedTotal=preview?visualCount*rounds:total;
    const activePick=draftDone?total:Math.min(total||1,completed+1);
    const activeRound=Math.max(1,Math.min(rounds,Math.floor(completed/Math.max(1,managerCount))+1));
    const next=nextManager(),managerIndex=new Map(members().map(m=>[String(m.id),m]));
    const programIndex=new Map(programs().map(p=>[String(p.id),p]));
    const pickMap=new Map(picks().map(p=>[Number(p.overall),p]));
    const pickedIds=new Set(picks().map(p=>String(p.program_id)));
    const available=draftAvailable();
    const availableIds=new Set(available.map(p=>String(p.id)));
    // Other managers' selections remove programs from your priority queue,
    // without changing the relative order of your remaining choices.
    const keptQueue=draftWatchlist.filter(id=>availableIds.has(id)||!programIndex.has(id));
    if(keptQueue.length!==draftWatchlist.length){
      draftWatchlist=keptQueue;storeDraftQueue();
    }
    const usedQueue=draftWatchlist.filter(id=>availableIds.has(id));
    const queuePosition=new Map(usedQueue.map((id,i)=>[id,i+1]));
    if(draftSelectedProgram&&!availableIds.has(String(draftSelectedProgram)))draftSelectedProgram='';
    const chosen=available.find(p=>String(p.id)===String(draftSelectedProgram));
    const nextMine=draftLive||status==='paused'||status==='pending'
      ?Array.from({length:Math.max(0,total-completed)},(_,i)=>i+completed+1)
        .find(slot=>draftSelectionOrder(slot,fullOrder)===me.id)||null:null;
    const myPicks=picks().filter(p=>p.manager_id===me.id).slice().sort((a,b)=>Number(b.overall)-Number(a.overall));
    const myFuturePicks=futureDraftPicks(me.id);
    const metricsYear=ratingYear(season());
    const historyIndex=draftHistoricalIndex();
    const historyOf=p=>p?historyIndex.byId.get(String(p.id)):null;
    const ratingInfo=p=>ratingOf(p,metricsYear);
    const programRank=p=>ratingInfo(p)?.rank??null;
    const sorted=available.slice().sort((a,b)=>{
      if(draftScope==='queue')return (queuePosition.get(String(a.id))??999)-(queuePosition.get(String(b.id))??999)||a.name.localeCompare(b.name);
      if(draftSort==='history'){
        const ah=historyOf(a),bh=historyOf(b);
        const av=ah?.eligibleForSort?ah.avg:-1,bv=bh?.eligibleForSort?bh.avg:-1;
        return bv-av||(programRank(a)??999)-(programRank(b)??999)||a.name.localeCompare(b.name);
      }
      if(draftSort==='conference')return conf(a.conference_id).localeCompare(conf(b.conference_id))||a.name.localeCompare(b.name);
      if(draftSort==='name')return a.name.localeCompare(b.name);
      const ra=programRank(a),rb=programRank(b);
      return (ra??999)-(rb??999)||a.name.localeCompare(b.name);
    });
    const roundLabel=activeRound+' / '+rounds;
    const phase=status==='live'?'LIVE DRAFT':status==='paused'?'DRAFT PAUSED':status==='finished'?'DRAFT COMPLETE':'DRAFT PREVIEW';
    const headline=yourTurn?"You're on the clock":draftLive?'On the clock':status==='paused'?'The draft is paused':
      draftDone?'The inaugural draft is complete':'Your dynasty starts here';
    const clock=settings.draft_clock_seconds>0&&draftLive
      ?'<div class="draft-live-clock"><span>DRAFT CLOCK</span><strong id="draft-clock">--:--</strong><small>No automatic picks</small></div>':'';
    const upNext=Array.from({length:Math.min(5,Math.max(0,total-completed))},(_,i)=>{
      const slot=completed+i+1,id=draftSelectionOrder(slot,fullOrder),manager=managerIndex.get(id);
      return '<div class="draft-upcoming-pill '+(i===0?'active':'')+(id===me.id?' mine':'')+'"><span>#'+slot+'</span>'
        +avatar(manager||{display_name:'?'})+'<strong>'+escapeHTML(manager?.display_name||'Open manager')+'</strong></div>';
    }).join('');
    const hero='<section class="draft-live-hero '+(yourTurn?'my-turn':'')+'">'
      +'<div class="draft-live-main"><span class="draft-live-status"><i></i>'+phase+'</span>'
      +'<h2>'+escapeHTML(headline)+'</h2>'
      +'<div class="draft-live-manager">'+(draftLive&&next?avatar(next):'')
      +'<div><strong>'+(draftLive?escapeHTML(next?.display_name||'Waiting for manager'):draftDone?'All picks are in':status==='paused'?'Waiting for commissioner':'Awaiting draft start')+'</strong>'
      +'<span>'+(draftLive?'Round '+roundLabel+' · Overall pick #'+activePick:
         draftDone?completed+' programs selected':completed+' of '+plannedTotal+' projected selections')+'</span></div></div>'
      +'</div><div class="draft-live-right"><div class="draft-live-stat"><span>'+(yourTurn?'YOUR PICK':'YOUR NEXT PICK')+'</span><strong>'+(nextMine?'#'+nextMine:'—')+'</strong><small>'+(nextMine?(yourTurn?'Make your selection now':'Your next selection'):'No picks remaining')+'</small></div>'
      +'<div class="draft-live-stat"><span>PROGRESS</span><strong>'+completed+' <em>/ '+plannedTotal+'</em></strong><small>'+Math.max(0,plannedTotal-completed)+' picks remaining</small></div>'
      +clock
      +(settings.trading_enabled&&status!=='finished'?'<button type="button" class="draft-trade-quick" data-act="tab" data-id="trades">⇄ Trade picks <span>›</span></button>':'')
      +'<button type="button" class="draft-live-cta" data-act="draft-jump-pool">'+(yourTurn?'Choose your program':'Browse available programs')+' <span>›</span></button></div>'
      +'<div class="draft-live-progress"><span style="width:'+Math.min(100,100*completed/Math.max(1,plannedTotal))+'%"></span></div>'
      +'</section>';
    const pickInventory='<section class="panel draft-pick-inventory" aria-label="Your unused draft picks">'
      +'<div class="draft-pick-inventory-title"><div><span class="draft-section-overline">YOUR DRAFT CAPITAL</span><h2>Upcoming picks</h2>'
      +'<p>Selections stay in their original snake slots, even when they change hands.</p></div>'
      +'<button class="btn small secondary" type="button" data-act="tab" data-id="trades">Trade a pick ›</button></div>'
      +(myFuturePicks.length?'<div class="draft-owned-slot-grid">'+myFuturePicks.map(slot=>{
        const acquired=originalDraftOwner(slot)!==me.id;
        return '<div class="draft-owned-slot'+(acquired?' acquired':'')+'"><strong>#'+slot+'</strong><span>R'+(Math.floor((slot-1)/Math.max(1,managerCount))+1)+'</span>'
          +'<small>'+(acquired?'Acquired':'Original')+'</small></div>';
      }).join('')+'</div>':'<p class="draft-owned-none">You have no unused picks. You can still trade for one.</p>')+'</section>';
    const incomingOffers=settings.trading_enabled?(league.trades||[]).filter(t=>t.status==='pending'&&t.to_manager_id===me.id):[];
    const tradeInbox=incomingOffers.length?'<section class="draft-trade-inbox panel" aria-label="Incoming trade offers">'
      +'<div class="draft-inbox-head"><div><span class="draft-section-overline">LIVE TRADE DESK</span><h2>'
      +incomingOffers.length+' incoming offer'+(incomingOffers.length===1?'':'s')+'</h2></div>'
      +'<button type="button" class="btn small secondary" data-act="tab" data-id="trades">All trades ›</button></div>'
      +incomingOffers.slice(0,3).map(t=>{
        const from=managerIndex.get(String(t.from_manager_id));
        const theySend=tradeAssetNames(t.id,t.from_manager_id),youSend=tradeAssetNames(t.id,me.id);
        return '<div class="draft-inbox-offer"><div class="draft-inbox-from">'+avatar(from||{display_name:'?'})
          +'<span><strong>'+escapeHTML(from?.display_name||'Manager')+' sent an offer</strong>'
          +'<small>Receive: '+escapeHTML(theySend.join(' · ')||'No assets')+'</small>'
          +'<small>Give: '+escapeHTML(youSend.join(' · ')||'No assets')+'</small></span></div>'
          +'<div class="draft-inbox-actions"><button type="button" class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept</button>'
          +'<button type="button" class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button></div></div>';
      }).join('')+'</section>':'';
    const tracker='<div class="draft-pick-ticker"><div class="draft-pick-ticker-label"><strong>NEXT PICKS</strong><small>Snake order</small></div>'
      +'<div class="draft-pick-ticker-scroll">'+(upNext||'<span class="draft-no-upcoming">Draft order will appear here when the draft opens.</span>')+'</div></div>';
    const ready=status==='pending'?'<div class="draft-readiness draft-readiness-v2">'
      +'<span class="'+(managerCount>=2?'good':'')+'">'+(managerCount>=2?'✓':'○')+' '+managerCount+' managers registered</span>'
      +'<span class="'+(eligiblePrograms().length>=total?'good':'')+'">'
      +(eligiblePrograms().length>=total?'✓':'○')
      +' '+eligiblePrograms().length+' eligible programs</span>'
      +'<strong>'+(managerCount>=2&&available.length>=total?'Ready for commissioner to start':'Waiting for draft setup')+'</strong></div>':'';
    const confOptions=eligibleConferenceIds().sort((a,b)=>conf(a).localeCompare(conf(b)))
      .map(id=>'<option value="'+escapeHTML(id)+'" '+(draftConference===id?'selected':'')+'>'+escapeHTML(conf(id))+'</option>').join('');
    const sortButton=(id,label)=>'<button type="button" data-act="draft-pool-sort" data-id="'+id+'" aria-pressed="'+(draftSort===id)+'" class="'+(draftSort===id?'active':'')+'">'+label+'</button>';
    const queueLabel=usedQueue.length?usedQueue.length+' in priority order':'Queue is empty';
    const historyStatus=schoolLeaders?
      (historyIndex.years.length+' completed seasons · historical fantasy points; 3+ seasons required for sorting'):
      schoolLeadersError?'Historical fantasy points unavailable':
      'Loading historical fantasy points…';
    const compareMetric=(value,digits=1)=>value!==null&&value!==undefined&&
      Number.isFinite(Number(value))?Number(value).toFixed(digits):'—';
    const compareCards=usedQueue.slice(0,4).map((id,i)=>{
      const p=programIndex.get(id);
      if(!p)return '';
      const rating=ratingInfo(p),rank=rating?.rank,history=historyOf(p);
      const metric=(label,value)=>'<div><span>'+label+'</span><strong>'+escapeHTML(String(value))+'</strong></div>';
      return '<article class="draft-compare-card" '+draftStyle(p)+'>'
        +'<div class="draft-compare-top"><span class="draft-compare-priority">#'+(i+1)+' PRIORITY</span>'
        +'<span class="draft-compare-rank">'+(rank?'T-Rank #'+rank:'T-Rank pending')+'</span></div>'
        +'<button type="button" class="draft-compare-school" data-act="draft-select" data-id="'+escapeHTML(id)+'">'
        +'<span class="draft-compare-logo">'+img(p)+'</span><span><strong>'+escapeHTML(p.name)+'</strong>'
        +'<small>'+escapeHTML(conf(p.conference_id))+'</small></span></button>'
        +'<div class="draft-compare-metrics">'+metric('OFFENSE',compareMetric(rating?.adj_o))
        +metric('DEFENSE',compareMetric(rating?.adj_d))
        +metric('WAB',compareMetric(rating?.wab))+'</div>'
        +'<div class="draft-compare-history">'+(history?.eligibleForSort?
          '<span><b>'+historicalPointLabel(history.avg)+'</b> avg pts / season</span><span><b>'+historicalPointLabel(history.best)+'</b> best season</span>':
          '<span>'+(history?'Limited history: '+history.count+' season'+(history.count===1?'':'s'):
            schoolLeaders?'No archived score':'History loading…')+'</span>')+'</div>'
        +'<div class="draft-compare-actions"><button type="button" data-act="draft-select" data-id="'+escapeHTML(id)+'">Preview ›</button>'
        +(i===0?'<span>Top choice</span>':'')
        +'</div></article>';
    }).join('');
    const cards=sorted.map(p=>{
      const rank=programRank(p),history=historyOf(p),queueNumber=queuePosition.get(String(p.id)),queued=!!queueNumber;
      const selected=chosen?.id===p.id;
      return '<article class="draft-pool-card '+(selected?'selected':'')+'" '+draftStyle(p)
        +' data-program="'+escapeHTML(p.id)+'" data-search="'+escapeHTML((p.name+' '+p.abbr+' '+conf(p.conference_id)).toLowerCase())+'" data-conference="'+escapeHTML(p.conference_id)+'" data-queued="'+(queued?'1':'0')+'">'
        +'<button type="button" class="draft-pool-open" data-act="draft-select" data-id="'+escapeHTML(p.id)+'" title="Select '+escapeHTML(p.name)+'">'
        +'<span class="draft-pool-logo">'+img(p)+'</span><span class="draft-pool-info"><strong>'+escapeHTML(p.name)+'</strong>'
        +'<small>'+escapeHTML(conf(p.conference_id))+'</small>'
        +(history?'<span class="draft-pool-history'+(history.eligibleForSort?'':' limited')+'">'+
          (history.eligibleForSort?'5Y AVG '+historicalPointLabel(history.avg)+' pts · '+history.count+'/'+history.totalYears+' seasons':'History: '+history.count+' season'+(history.count===1?'':'s'))+
          '</span>':'')+'</span>'
        +'<span class="draft-pool-stat"><strong>'+(rank?'#'+rank:'—')+'</strong><small>T-RANK</small></span>'
        +'<span class="draft-pool-arrow">›</span></button>'
        +'<button type="button" class="draft-pool-queue '+(queued?'added':'')+'" data-act="draft-queue-toggle" data-id="'+escapeHTML(p.id)+'" aria-label="'+(queued?'Remove ':'Add ')+escapeHTML(p.name)+(queued?' from':' to')+' draft queue'+(queued?', priority '+queueNumber:'')+'" aria-pressed="'+queued+'" title="'+(queued?'Priority #'+queueNumber+' in your queue':'Add to end of your queue')+'">'
        +(queued?'<span>★</span><small>'+queueNumber+'</small>':'☆')+'</button>'
        +'</article>';
    }).join('');
    const pool='<section id="draft-pool-section" class="panel draft-pool-panel">'
      +'<div class="draft-section-heading"><div><span class="draft-section-overline">YOUR DRAFT DESK</span><h2>Available programs</h2>'
      +'<p>Star schools to add them to the end of your draft queue. Preview and confirm a school when it is your pick.</p></div><strong class="draft-available-count">'+available.length+' <span>LEFT</span></strong></div>'
      +'<div class="draft-pool-toolbar"><label class="draft-pool-search"><span aria-hidden="true">⌕</span>'
      +'<input type="search" id="draft-pool-search" aria-label="Find an available school" placeholder="Search schools or conferences..." autocomplete="off" value="'+escapeHTML(draftQuery)+'"/></label>'
      +'<label class="draft-pool-conference"><span class="sr-only">Filter by conference</span><select id="draft-pool-conference" aria-label="Draft pool conference"><option value="all">All conferences</option>'+confOptions+'</select></label>'
      +'<div class="draft-pool-tabs" role="group" aria-label="Sort available schools">'+sortButton('power','T-Rank')+sortButton('history','5Y Points')+sortButton('name','A–Z')+sortButton('conference','Conference')+'</div></div>'
      +'<div class="draft-pool-history-note"><span>'+escapeHTML(historyStatus)+'</span>'+
        (schoolLeadersError?'<button type="button" data-act="draft-history-retry">Retry history</button>':'')+'</div>'
      +'<div class="draft-pool-subbar"><div class="draft-pool-scope"><button type="button" data-act="draft-pool-scope" data-id="all" class="'+(draftScope==='all'?'active':'')+'">All available</button>'
      +'<button type="button" data-act="draft-pool-scope" data-id="queue" class="'+(draftScope==='queue'?'active':'')+'">★ My queue <span>'+usedQueue.length+'</span></button></div>'
      +'<button type="button" class="draft-queue-shortcut" data-act="draft-jump-queue">Reorder queue ↗</button>'
      +'<span id="draft-pool-count">'+available.length+' programs</span></div>'
      +'<div class="draft-pool-grid">'+cards+'</div>'
      +'<div class="draft-pool-empty" id="draft-pool-empty" hidden>No matching schools. Try another search or show all available.</div>'
      +'<div class="draft-pool-bottom"><button id="draft-pool-more" type="button" data-act="draft-pool-more" hidden>Show more programs</button></div>'
      +'</section>';
    const selectedRank=chosen?programRank(chosen):null;
    const selectedHistory=chosen?historyOf(chosen):null;
    const selectedView=chosen?'<div class="draft-selection-preview">'
      +'<div class="draft-selection-team" '+draftStyle(chosen)+'><div class="draft-selection-team-art">'+img(chosen)+'</div>'
      +'<div class="draft-selection-team-info"><span>SELECTED PROGRAM</span><h3>'+escapeHTML(chosen.name)+'</h3>'
      +'<p>'+escapeHTML(conf(chosen.conference_id))+(selectedRank?' · National T-Rank #'+selectedRank:'')+'</p></div></div>'
      +'<div class="draft-selection-facts"><div><span>STATUS</span><strong>Available</strong></div><div><span>YOUR PICK</span><strong>'+(nextMine?'#'+nextMine:'—')+'</strong></div></div>'
      +(selectedHistory?'<div class="draft-history-snapshot"><span>HISTORICAL FANTASY</span><strong>'+historicalPointLabel(selectedHistory.avg)+' avg pts</strong><strong>'+historicalPointLabel(selectedHistory.best)+' peak</strong><small>'+selectedHistory.count+'/'+selectedHistory.totalYears+' seasons</small></div>':'')
      +(yourTurn?'<p class="draft-selection-explainer">Your selection is permanent for the dynasty. Confirm to add this program to your roster.</p>'
        :'<p class="draft-selection-explainer">Save this school to your draft queue. Only the manager on the clock can submit the next pick.</p>')
      +'<button type="button" class="draft-confirm-action" data-act="draft-confirm" data-id="'+escapeHTML(chosen.id)+'" '+(!yourTurn?'disabled':'')+'>'
      +(yourTurn?'Confirm pick: '+escapeHTML(chosen.name):'Waiting for your turn')+' <span>›</span></button>'
      +'<div class="draft-preview-actions"><button type="button" data-act="draft-queue-toggle" data-id="'+escapeHTML(chosen.id)+'">'
      +(queuePosition.has(String(chosen.id))?'★ Remove from queue (#'+queuePosition.get(String(chosen.id))+')':'☆ Add to draft queue')+'</button>'
      +'<button type="button" data-act="open-program" data-id="'+escapeHTML(chosen.id)+'">View school details ›</button></div>'
      +'<button type="button" class="draft-selection-clear" data-act="draft-clear-selection">Change selection</button></div>'
      :'<div class="draft-selection-idle"><div class="draft-idle-mark">+</div><strong>'+(yourTurn?'Your selection is waiting':'Scout your next pick')+'</strong>'
      +'<p>Tap a program to preview its details. '+(yourTurn?'Confirm it here when you are ready.':'Build an ordered draft queue while other managers pick.')+'</p></div>';
    const queueItems=usedQueue.map((id,i)=>{
      const p=programIndex.get(id),rank=p?programRank(p):null,history=historyOf(p);
      if(!p)return '';
      const first=i===0,last=i===usedQueue.length-1;
      return '<div class="draft-queue-row '+(first?'top-priority':'')+(chosen?.id===p.id?' is-selected':'')+'" data-queue-id="'+escapeHTML(id)+'" '+draftStyle(p)+'>'
        +'<span class="draft-queue-position" aria-label="Priority '+(i+1)+'">'+(i+1)+'</span>'
        +'<span class="draft-queue-grip" data-id="'+escapeHTML(id)+'" draggable="true" title="Drag to reorder '+escapeHTML(p.name)+'" aria-hidden="true">⠿</span>'
        +'<button type="button" class="draft-queue-team" data-act="draft-select" data-id="'+escapeHTML(id)+'" title="Preview '+escapeHTML(p.name)+'">'
        +'<span class="draft-queue-icon">'+img(p)+'</span><span class="draft-queue-info"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+(rank?' · T-Rank #'+rank:'')+
        (history?.eligibleForSort?' · 5Y '+historicalPointLabel(history.avg)+' pts':'')+'</small></span>'
        +'<span class="draft-queue-pick">Preview ›</span></button>'
        +'<div class="draft-queue-controls"><button type="button" data-act="draft-queue-up" data-id="'+escapeHTML(id)+'" '+(first?'disabled':'')+' aria-label="Move '+escapeHTML(p.name)+' up in draft queue" title="Move up">↑</button>'
        +'<button type="button" data-act="draft-queue-down" data-id="'+escapeHTML(id)+'" '+(last?'disabled':'')+' aria-label="Move '+escapeHTML(p.name)+' down in draft queue" title="Move down">↓</button>'
        +'<button type="button" class="draft-queue-remove" data-act="draft-queue-toggle" data-id="'+escapeHTML(id)+'" aria-label="Remove '+escapeHTML(p.name)+' from draft queue" title="Remove from queue">×</button></div></div>';
    }).join('');
    const queueManager='<section class="panel draft-queue-manager" id="draft-queue-section" aria-label="My ordered draft queue">'
      +'<div class="draft-queue-manager-head"><div class="draft-queue-title"><span class="draft-section-overline">YOUR PRIORITY LIST</span><h2>My draft queue <span>'+usedQueue.length+'</span></h2>'
      +'<p>Put your top choice at #1. Drag on desktop or use the arrow buttons on mobile. Your priority order syncs across signed-in devices. No automatic picks.</p></div>'
      +'<div class="draft-queue-header-actions"><button type="button" data-act="draft-jump-pool" class="draft-queue-find">+ Add schools</button>'
      +(usedQueue.length?'<button type="button" class="draft-queue-games" data-act="results-track-queue">Track games</button>':'')
      +(usedQueue.length>1?'<button type="button" data-act="draft-compare-toggle" class="draft-compare-toggle" aria-expanded="'+draftCompareExpanded+'">'+(draftCompareExpanded?'Hide comparison':'Compare top 4')+'</button>':'')
      +(usedQueue.length?'<button type="button" data-act="draft-queue-collapse" class="draft-queue-collapse" aria-expanded="'+draftQueueExpanded+'">'+(draftQueueExpanded?'Collapse':'Expand queue')+'</button>':'')+'</div></div>'
      +(usedQueue.length
        ?'<div class="draft-queue-topline"><span>FIRST CHOICE</span><strong>#1 '+escapeHTML(programIndex.get(usedQueue[0])?.name||'School')+'</strong><span>'+escapeHTML(queueLabel)+'</span></div>'
          +(draftCompareExpanded&&usedQueue.length>1?'<div class="draft-compare-section"><div class="draft-compare-heading"><strong>Compare your top '+Math.min(4,usedQueue.length)+' choices</strong><span>Current T-Rank + 5-year fantasy history</span></div><div class="draft-compare-grid">'+compareCards+'</div><small>Fantasy averages use archived scoring, not projections. Higher WAB and offense are better; lower defensive efficiency is better.</small></div>':'')
          +(draftQueueExpanded?'<div class="draft-queue-list" aria-label="Draft priority order">'+queueItems+'</div>':'')
        :'<div class="draft-queue-empty"><span class="draft-queue-empty-icon">☆</span><div><strong>Start your queue</strong><p>Tap the star on any available school to add it here. Rearrange your picks whenever you like.</p></div>'
          +'<button type="button" data-act="draft-jump-pool">Browse available schools ›</button></div>')
      +'<div class="draft-queue-sync" role="status" aria-live="polite">'+escapeHTML(draftQueueSyncMessage())+'</div>'
      +'</section>';
    const myPickList=myPicks.slice(0,4).map(p=>{
      const school=programIndex.get(String(p.program_id));
      return school?'<div class="draft-my-pick" '+draftStyle(school) +'><span class="draft-mini-logo">'+img(school)+'</span><span><strong>'+escapeHTML(school.name)+'</strong><small>Round '+p.round+' · Pick #'+p.overall+'</small></span></div>':'';
    }).join('');
    const sidebar='<aside class="draft-pick-aside"><section class="panel draft-pick-desk">'
      +'<div class="draft-side-title"><span>SELECTION DESK</span><strong>'+(yourTurn?'YOU ARE ON THE CLOCK':'Preview and queue')+'</strong></div>'
      +selectedView+'</section>'
      +'<section class="panel draft-my-picks-panel"><div class="draft-side-title"><span>MY DRAFT</span><strong>'+myPicks.length+' / '+rounds+' programs</strong></div>'
      +(myPickList||'<p class="draft-side-empty">Your selected programs will appear here as the draft progresses.</p>')
      +'</section></aside>';
    const boardMode=['all','current','mine'].includes(draftRoundView)?draftRoundView:'all';
    const boardColumns=visualOrder;
    const boardRows=boardMode==='current'?[activeRound]:Array.from({length:rounds},(_,i)=>i+1)
      .filter(r=>boardMode!=='mine'||Array.from({length:managerCount},(_,i)=>(r-1)*managerCount+i+1)
        .some(slot=>draftOwner(slot)===me.id));
    const boardWidth='grid-template-columns:72px repeat('+Math.max(1,boardColumns.length)+',minmax(163px,1fr));min-width:'+(72+Math.max(1,boardColumns.length)*163)+'px';
    const boardHeaders=boardColumns.map(id=>{
      const member=managerIndex.get(id),vacant=id.startsWith('open-seat-');
      const selection=visualOrder.indexOf(id)+1;
      return '<div class="draft-board-manager '+(id===me.id?'mine':vacant?'vacant':'')+'">'
        +'<span class="draft-board-avatar">'+avatar(member||{display_name:'+'})+'</span><div><strong>'+escapeHTML(member?.display_name||'Open seat')+'</strong>'
        +'<small>'+(id===me.id?'YOUR COLUMN':vacant?'UNCLAIMED':'DRAFT POSITION '+selection)+'</small></div></div>';
    }).join('');
    const boardCells=boardRows.map(round=>{
      const slots=boardColumns.map(id=>{
        const vacant=id.startsWith('open-seat-'),pos=visualOrder.indexOf(id);
        const overall=(round-1)*Math.max(1,visualCount)+(round%2===1?pos+1:visualCount-pos);
        const picked=pickMap.get(overall),p=programIndex.get(String(picked?.program_id||''));
        const slotOwner=draftOwner(overall,visualOrder),holder=managerIndex.get(slotOwner);
        const traded=!vacant&&slotOwner&&slotOwner!==id;
        const onClock=draftLive&&overall===activePick,mine=slotOwner===me.id;
        const state=p?'selected':onClock?'on-clock':vacant?'vacant':'open';
        return '<div class="draft-board-cell '+state+(mine?' my-cell':'')+'"'+(p?draftStyle(p):'')+' data-pick="'+overall+'" '+(onClock?'id="draft-current-slot"':'')+'>'
          +'<div class="draft-cell-meta"><span>#'+overall+'</span>'+(onClock?'<strong class="draft-cell-live">ON THE CLOCK</strong>':p?'<span class="draft-cell-done">LOCKED</span>':'')+'</div>'
          +(traded?'<div class="draft-pick-owner-label">⇄ '+escapeHTML(holder?.display_name||'Traded pick')+'</div>':'')
          +(p?'<button type="button" class="draft-cell-program" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'
            +'<span class="draft-cell-logo">'+img(p)+'</span><span class="draft-cell-team"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span></button>'
            :onClock?'<button type="button" class="draft-cell-open '+(mine?'take-pick':'')+'" data-act="draft-jump-pool">'
              +'<strong>'+(mine?'Your pick is live':'Awaiting pick')+'</strong><small>'+(mine?'Choose a school ›':escapeHTML(holder?.display_name||'Manager')+' is selecting')+'</small></button>'
            :'<div class="draft-cell-placeholder">'+(vacant?'Open seat':'AVAILABLE PICK')+'</div>')
          +'</div>';
      }).join('');
      return '<div class="draft-board-round '+(round===activeRound?'current':'')+'"><strong>R'+round+'</strong><span>'+(round%2===0?'←':'→')+'</span></div>'+slots;
    }).join('');
    const boardTab=(id,label)=>'<button type="button" data-act="draft-board-mode" data-mode="'+id+'" class="'+(boardMode===id?'active':'')+'" aria-pressed="'+(boardMode===id)+'">'+label+'</button>';
    const board='<section class="panel draft-board-panel draft-v2-board" id="draft-board-section">'
      +'<div class="draft-board-toolbar"><div><span class="draft-section-overline">THE FULL LEAGUE</span><h2>Snake draft board</h2>'
      +'<p>Every snake slot stays in its original position. Traded picks show their current owner.</p></div>'
      +'<div class="draft-board-switch" role="group" aria-label="Draft board view">'+boardTab('all','Full board')+boardTab('current','Current round')+boardTab('mine','My rounds')+'</div></div>'
      +'<div class="draft-board-key"><span><i class="selected"></i> Picked programs</span><span><i class="on-clock"></i> On the clock</span>'
      +'<span><i class="mine"></i> My draft column</span><button type="button" data-act="draft-follow-live">Jump to current round ↗</button></div>'
      +'<div class="draft-board-scroll" tabindex="0" aria-label="Scrollable snake draft board"><div class="draft-board-grid" style="'+boardWidth+'">'
      +'<div class="draft-board-corner">ROUND</div>'+boardHeaders+boardCells+'</div></div>'
      +'<div class="draft-board-footer"><span>Rounds alternate direction to maintain the original snake order.</span>'
      +'<span>'+completed+' / '+plannedTotal+' picks made</span></div></section>';
    const recent=picks().slice(-6).reverse().map(p=>{
      const school=programIndex.get(String(p.program_id)),member=managerIndex.get(String(p.manager_id));
      return school?'<button type="button" class="draft-recent-card" data-act="open-program" data-id="'+escapeHTML(school.id)+'" '+draftStyle(school)+'>'
        +'<span class="draft-recent-logo">'+img(school)+'</span><span><small>PICK #'+p.overall+' · ROUND '+p.round+'</small>'
        +'<strong>'+escapeHTML(school.name)+'</strong><small>'+escapeHTML(member?.display_name||'Manager')+'</small></span></button>':'';
    }).join('');
    const foot='<section class="draft-recent-section"><div><span class="draft-section-overline">JUST OFF THE BOARD</span><h2>Recent selections</h2></div>'
      +(recent?'<div class="draft-recent-grid">'+recent+'</div>':'<p>No picks yet. Your dynasty draft history begins here.</p>')+'</section>';
    const sheet=chosen?'<div class="draft-selection-sheet" role="dialog" aria-modal="true" aria-label="Selected draft program">'
      +'<div class="draft-selection-sheet-scrim"><button type="button" data-act="draft-clear-selection" aria-label="Close selection"> </button></div>'
      +'<div class="draft-selection-sheet-content"><button type="button" class="draft-sheet-close" data-act="draft-clear-selection" aria-label="Close selection">×</button>'
      +selectedView+'</div></div>':'';
    return heading('INAUGURAL PROGRAM SNAKE DRAFT','Draft Room','Track live selections, trade picks and manage your scouting queue.')
      +'<div class="draft-v2">'+hero+tracker+tradeInbox+pickInventory+ready+queueManager
      +'<div class="draft-workspace">'+pool+sidebar+'</div>'+board+foot+'</div>'+sheet;
  }

  function updateTradeSelections(){
    const count=side=>document.querySelectorAll('input[name="trade-'+side+'"]:checked,input[name="trade-'+side+'-pick"]:checked').length;
    const give=count('give'),receive=count('receive');
    const giveLabel=document.querySelector('#trade-give-count'),receiveLabel=document.querySelector('#trade-receive-count');
    const summary=document.querySelector('#trade-selection-summary'),submit=document.querySelector('[data-act="trade-propose"]');
    if(giveLabel)giveLabel.textContent=give+' selected';
    if(receiveLabel)receiveLabel.textContent=receive+' selected';
    if(summary)summary.textContent=give&&receive?give+' sent · '+receive+' requested':'Select at least one asset on each side';
    if(submit)submit.disabled=!give||!receive;
  }
  function tradeAssetNames(tradeId,fromId){
    const schools=(league.trade_items||[]).filter(x=>x.trade_id===tradeId&&x.from_manager_id===fromId)
      .map(x=>programs().find(p=>p.id===x.program_id)?.name||'Program');
    const slots=(league.draft_pick_trade_items||[]).filter(x=>x.trade_id===tradeId&&x.from_manager_id===fromId)
      .map(x=>'Pick #'+x.overall+' (R'+(Math.floor((Number(x.overall)-1)/Math.max(1,order().length))+1)+')');
    return [...schools,...slots];
  }
  function tradesPage(){
    const status=league.settings.draft_status,ready=league.settings.trading_enabled;
    const allowPicks=ready&&status!=='finished'&&order().length>=2&&
      Array.isArray(league.settings.draft_order)&&league.settings.draft_order.length===members().length;
    const others=members().filter(u=>u.id!==me.id);
    const recipient=others.find(u=>u.id===tradeTargetId)||others[0];
    tradeTargetId=recipient?.id||'';
    const mine=myPrograms().sort((a,b)=>a.name.localeCompare(b.name));
    const theirs=owners().filter(o=>o.manager_id===tradeTargetId)
      .map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const selections=(schools,ownerId,side)=>{
      const slots=allowPicks?futureDraftPicks(ownerId):[];
      const pickOptions=slots.map(slot=>{
        const from=originalDraftOwner(slot),original=members().find(m=>m.id===from);
        return '<label class="trade-choice trade-pick-choice"><input type="checkbox" name="trade-'+side+'-pick" value="'+slot+'"/>'
          +'<span class="trade-pick-icon">#'+slot+'</span><span><strong>'+escapeHTML(draftPickText(slot))+'</strong><small>'
          +(from!==ownerId?'From '+escapeHTML(original?.display_name||'another manager'):'Original pick')+'</small></span></label>';
      }).join('');
      const schoolOptions=schools.map(p=>'<label class="trade-choice"><input type="checkbox" name="trade-'+side+'" value="'+escapeHTML(p.id)+'"/>'
        +img(p)+'<span>'+escapeHTML(p.name)+'</span></label>').join('');
      return '<div class="trade-assets">'
        +(allowPicks?'<div class="trade-asset-group"><h4>Unused draft picks <span>'+slots.length+'</span></h4>'
          +(pickOptions?'<div class="trade-pick-list">'+pickOptions+'</div>':'<p class="trade-assets-empty">No unused picks</p>')+'</div>':'')
        +'<div class="trade-asset-group"><h4>Rostered programs <span>'+schools.length+'</span></h4>'
        +(schoolOptions?'<div class="trade-program-list">'+schoolOptions+'</div>':'<p class="trade-assets-empty">No drafted schools yet</p>')+'</div></div>';
    };
    const offers=(league.trades||[]).slice().sort((a,b)=>
      Number(b.status==='pending')-Number(a.status==='pending')||Number(b.offered_at||0)-Number(a.offered_at||0));
    const card=t=>{
      const from=members().find(m=>m.id===t.from_manager_id),to=members().find(m=>m.id===t.to_manager_id);
      const give=tradeAssetNames(t.id,t.from_manager_id),receive=tradeAssetNames(t.id,t.to_manager_id);
      const actions=t.status==='pending'&&ready?(t.to_manager_id===me.id?
        '<div class="button-row section-gap"><button class="btn small" data-act="trade-accept" data-id="'+escapeHTML(t.id)+'">Accept trade</button><button class="btn small secondary" data-act="trade-decline" data-id="'+escapeHTML(t.id)+'">Decline</button></div>':
        t.from_manager_id===me.id?'<div class="button-row section-gap"><button class="btn small ghost" data-act="trade-cancel" data-id="'+escapeHTML(t.id)+'">Cancel offer</button></div>':''):'';
      return '<article class="trade-offer"><div class="trade-offer-head"><strong>'+escapeHTML(from?.display_name||'Manager')+' → '+escapeHTML(to?.display_name||'Manager')+'</strong>'
        +'<span class="status '+(t.status==='pending'?'wait':'')+'">'+escapeHTML(t.status.toUpperCase())+'</span></div>'
        +'<div class="trade-exchange"><div class="trade-exchange-side"><span>SENDING</span><strong>'+escapeHTML(give.join(' · ')||'No assets')+'</strong></div>'
        +'<span class="trade-exchange-arrow" aria-hidden="true">⇄</span><div class="trade-exchange-side"><span>RECEIVING</span><strong>'+escapeHTML(receive.join(' · ')||'No assets')+'</strong></div></div>'+actions+'</article>';
    };
    const incoming=offers.filter(t=>t.status==='pending'&&t.to_manager_id===me.id).length;
    return heading('DYNASTY TRANSACTIONS','Trades','Exchange future draft picks and rostered programs with other managers.')
      +'<section class="trade-overview-strip"><div><strong>'+incoming+'</strong><span>Incoming offers</span></div>'
      +'<div><strong>'+futureDraftPicks(me.id).length+'</strong><span>Remaining picks</span></div>'
      +'<div><strong>'+offers.filter(t=>t.status==='accepted').length+'</strong><span>Accepted trades</span></div></section>'
      +(ready?'<section class="panel trade-builder">'+panelHeading('Build a trade','Mix draft picks and schools in the same offer')
        +'<div class="form-row"><label for="trade-target">Trade with</label><select class="field" id="trade-target">'
        +others.map(u=>'<option value="'+escapeHTML(u.id)+'" '+(u.id===tradeTargetId?'selected':'')+'>'+escapeHTML(u.display_name)+'</option>').join('')
        +'</select></div>'
        +(!allowPicks&&status!=='finished'?'<p class="trade-note">Pick trading opens when the commissioner saves the final draft order.</p>':'')
        +'<div class="trade-columns"><div><h3 class="subhead">YOU SEND <span id="trade-give-count">0 selected</span></h3>'
        +selections(mine,me.id,'give')+'</div><div><h3 class="subhead">YOU RECEIVE <span id="trade-receive-count">0 selected</span></h3>'
        +selections(theirs,tradeTargetId,'receive')+'</div></div>'
        +'<div class="trade-submit"><div id="trade-selection-summary">Select at least one asset from each side</div>'
        +'<button class="btn" data-act="trade-propose" disabled>Send trade offer</button></div>'
        +'<p class="trade-footnote">The recipient must accept before anything transfers. Live draft picks move instantly on acceptance; used picks are ineligible.</p></section>':
        '<section class="panel section-gap">'+empty('Trading disabled','The commissioner has paused new trades.')+'</section>')
      +'<section class="panel section-gap trade-history">'+panelHeading('League trade activity',offers.length+' offers')
      +(offers.length?offers.map(card).join(''):empty('No trades yet','Pending and completed offers will appear here.'))+'</section>';
  }

  const scoringGroups=[
    ['Regular season and tournament wins',[['regular_win','Regular-season win'],['conference_tournament_win','Conference tournament win'],['quad_2_win','Quad 2 win bonus'],['quad_1_win','Quad 1 win'],['quad_1a_win','Quad 1A win']]],
    ['Conference championships',[['conference_regular_title','Regular-season champion'],['conference_tournament_title','Tournament champion']]],
    ['NCAA Tournament seeding',Array.from({length:16},(_,i)=>['ncaa_seed_'+(i+1),'Seed #'+(i+1)])],
    ['NCAA Tournament wins',[['ncaa_tournament_win','Tournament win'],['ncaa_opening_round_win','Opening Round win'],['national_championship','National champion bonus']]],
    ['PAC-12 & MID-MAJOR BONUSES',[['ncaa_at_large_bid','NCAA at-large bid'],['ncaa_upset_per_seed','NCAA upset bonus per seed line']]]
  ];
  const scoreRules=()=>league?.settings?.scoring||{};
  function scoringPage(){
    const r=scoreRules(),count=Number(r.best_programs||8);
    return heading('', 'Scoring')
      +'<section class="panel scoring-lead"><div><span class="eyebrow">SEASON-LONG BEST BALL</span><h2>Best '+count+' programs count</h2><p>Every program remains owned year after year. Only the highest-scoring '+count+' programs on each roster contribute to the annual standings.</p></div><strong>'+count+'</strong></section>'
      +'<div class="scoring-grid">'+scoringGroups.map(([title,fields])=>'<section class="panel scoring-panel'+(title==='NCAA Tournament seeding'?' scoring-panel-seeding':'')+'">'+panelHeading(escapeHTML(title))
      +(title==='NCAA Tournament seeding'?'<div class="seed-scale-grid">':'')
      +fields.map(([key,label])=>'<div class="score-row"><span>'+escapeHTML(label)+'</span><strong>+'+Number(r[key]||0).toLocaleString('en-US',{maximumFractionDigits:2})+'</strong></div>').join('')
      +(title==='NCAA Tournament seeding'?'</div><p class="hint section-gap">Each seed receives its own appearance bonus once per NCAA Tournament.</p>':'')
      +(title==='PAC-12 & MID-MAJOR BONUSES'?'<p class="hint section-gap">Applies to every eligible non-Power school, including individually selected programs and Pac-12 schools, <strong>excluding Gonzaga</strong>. The at-large bonus is awarded for an NCAA bid without winning the conference tournament (+5 per selection), after automatic bids are verified. Upset points are earned only by beating a better-seeded NCAA opponent (+1 per seed line, no cap). Both stack with normal tournament and quadrant points.</p>':'')+'</section>').join('')+'</div>'
      +'<section class="panel section-gap scoring-panel">'+panelHeading('Rules and notes')
      +'<p>Every regular-season, conference tournament and NCAA Tournament win can earn Q1, Q1A or Q2 bonuses. Q1A is a separate +2.5 win category and does not stack with Q1. Before official NCAA NET is available, provisional quadrants use Bart Torvik T-Rank and each school’s actual home, away or neutral venue. Once complete NCAA NET is imported, all quadrant bonuses are recalculated automatically.</p>'
      +'<p>Appearance points are awarded once for NCAA seeding. Opening Round games use their own win value. The national championship bonus stacks with tournament wins. See the dedicated Pac-12 &amp; Mid-Major Bonuses section for at-large and upset eligibility.</p>'
      +'<p>Regular-season games earn their normal win points; conference tournament wins earn +2 and NCAA Tournament wins earn their configured postseason points. Those wins can additionally earn quadrant bonuses. There is no AP Poll or KenPom bonus.</p>'
      +'<p class="muted">Provisional T-Rank-based points can change. Completed archived seasons use official final NET rankings.</p></section>';
  }

  function leaguePage(){
    const scoring=standingsData?.season===season()?standingsData:null;
    const scoreIndex=new Map((scoring?.standings||[]).map(x=>[x.manager_id,x]));
    const users=members().slice();
    if(scoring)users.sort((a,b)=>(scoreIndex.get(b.id)?.points||0)-(scoreIndex.get(a.id)?.points||0)||a.display_name.localeCompare(b.display_name));
    const fmtPoints=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
    const rows=users.map((u,index)=>{
      const manager=scoreIndex.get(u.id);
      const schools=owners().filter(o=>o.manager_id===u.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean);
      const schoolPreview=schools.length?'<span class="standings-mini-roster">'+schools.slice(0,5).map(p=>'<span title="'+escapeHTML(p.name)+'">'+img(p)+'</span>').join('')+(schools.length>5?'<span class="standings-roster-more">+'+(schools.length-5)+'</span>':'')+'</span>':'<span class="standings-roster-pending">Draft pending</span>';
      const points=manager&&schools.length?'<strong>'+fmtPoints(manager.points)+'</strong><small class="muted"> · '+manager.counted_programs+' counting</small>':
        schools.length?'<span class="pending-score">Loading</span>':'<span class="pending-score">—</span>';
      return '<tr class="standing-row'+(u.id===me.id?' is-mine':'')+'"><td><button class="standings-manager table-user" data-act="open-manager" data-id="'+escapeHTML(u.id)+'">'
        +(scoring&&owners().length?'<span class="standings-position-index">#'+String(1+users.findIndex(x=>Number(scoreIndex.get(x.id)?.points||0)===Number(scoreIndex.get(u.id)?.points||0)))+'</span>':'')
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

  function profileBack(){return '<button class="profile-back" data-act="profile-back">← Back</button>';}
  function programSeasonSchedule(p){
    const data=programScheduleCache[String(p.id)];
    const loading=!!programScheduleLoading[p.id],error=programScheduleError[p.id];
    const all=data?.season===season()?data.games:[];
    const upcoming=all.filter(g=>g.status==='scheduled'||g.status==='live');
    const complete=all.filter(g=>g.status==='final');
    const shown=programScheduleView==='upcoming'?upcoming:programScheduleView==='completed'?complete:all;
    const tab=(id,label,n)=>'<button type="button" data-act="schedule-view" data-id="'+id+'"'+
      ' class="'+(programScheduleView===id?'active':'')+'" aria-pressed="'+(programScheduleView===id)+'">'+
      label+' <span>'+n+'</span></button>';
    const date=g=>g.start_utc?new Date(g.start_utc).toLocaleDateString('en-US',{
      timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}):g.game_date;
    const time=g=>g.start_utc?new Date(g.start_utc).toLocaleTimeString('en-US',{
      timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}):'TBD';
    const rows=shown.map(g=>{
      const ownHome=String(g.home_id)===String(p.id);
      const ownScore=ownHome?g.home_score:g.away_score,oppScore=ownHome?g.away_score:g.home_score;
      const opponent=programs().find(x=>String(x.id)===String(g.opponent_id));
      const score=g.status==='final'&&ownScore!==null&&oppScore!==null
        ?(Number(ownScore)>Number(oppScore)?'W ':Number(ownScore)<Number(oppScore)?'L ':'T ')+ownScore+'–'+oppScore:
        g.status==='live'?'LIVE '+(ownScore??'–')+'–'+(oppScore??'–'):
        g.status==='scheduled'?time(g):String(g.status||'TBD').toUpperCase();
      const quad=quadLabel(g.quad,g.q1a),bonus=quadBonusText(g.quad,g.q1a);
      const venue=g.venue==='neutral'?'Neutral':g.venue==='away'?'Away':'Home';
      const note=(g.conference_game?'Conference':'Nonconference')+(Number(g.season_type)===1?' · Exhibition':'');
      const hasLink=/^\d+$/.test(String(g.game_id||''));
      return '<div class="program-schedule-row '+(g.status==='final'?'is-completed':g.status==='live'?'is-live':'')+'">'+
        '<time>'+escapeHTML(date(g))+'</time>'+
        '<span class="program-schedule-venue">'+escapeHTML(venue)+'</span>'+
        '<span class="program-schedule-opponent">'+scoreboardLogo(g.opponent_id)+
          '<span><strong>'+escapeHTML(g.opponent_name||'Opponent TBD')+'</strong><small>'+escapeHTML(note)+'</small></span></span>'+
        '<span class="program-schedule-quad" title="'+escapeHTML(quadMeaning(g.quad,g.q1a,data?.rankings_source==='torvik'))+'">'+
          quad+(bonus?'<small>'+bonus+'</small>':'')+'</span>'+
        '<span class="program-schedule-result">'+escapeHTML(score)+'</span>'+
        (hasLink?'<a class="program-schedule-link" href="https://www.espn.com/mens-college-basketball/game/_/gameId/'+
          escapeHTML(g.game_id)+'" target="_blank" rel="noopener noreferrer" aria-label="Game details">↗</a>':'')+
        '</div>';
    }).join('');
    const message=error||data?.source_error?
      'ESPN team schedule is temporarily unavailable. Only previously imported games may be shown.':
      data?.source==='ESPN published schedule'?
        'Published ESPN schedule combined with verified results. Unannounced tournament matchups are added when confirmed.':
        'Only imported fixtures are available. Published future games will appear when the team schedule is available.';
    return '<section id="program-schedule" class="panel program-full-schedule">'+
      '<div class="program-schedule-heading"><div><span class="eyebrow">COMPLETE PUBLISHED SLATE</span><h2>'+
      escapeHTML(season())+' Schedule</h2><p>Every announced matchup, venue and potential quadrant win bonus</p></div>'+
      '<button type="button" class="btn small secondary" data-act="schedule-retry" data-id="'+escapeHTML(p.id)+'">'+
        (loading?'Loading…':'↻ Refresh schedule')+'</button></div>'+
      '<div class="program-schedule-tabs" role="group" aria-label="Schedule game filters">'+
      tab('all','All',all.length)+tab('upcoming','Upcoming',upcoming.length)+
      tab('completed','Completed',complete.length)+'</div>'+
      (rows?'<div class="program-schedule-list">'+rows+'</div>':
        '<div class="program-schedule-placeholder">'+escapeHTML(loading?'Loading published 2026–27 schedule…':
          error||'No games match this filter.')+'</div>')+
      '<p class="program-schedule-note">'+escapeHTML(message)+
      (data?.rankings_source==='torvik'?' Quadrants are provisional until official NCAA NET is published.':
        data?.rankings_source==='pending'?' Quadrants will appear when team rankings are available.':'')+
      ' Bonus points are earned only for wins.</p></section>';
  }
  function programProfilePage(){
    const p=programs().find(x=>String(x.id)===String(selectedProgramId))||
      (schoolLeaders?.directory||[]).find(x=>String(x.id)===String(selectedProgramId));
    if(!p)return heading('', 'Program unavailable')+profileBack();

    const report=programResultCache[p.id]?.season===season()?programResultCache[p.id]:null;
    const history=report?.history?.seasons||[];
    const selected=selectedProgramSeason||season();
    const selectedStats=history.find(x=>x.season===selected);
    const currentStats=history.find(x=>x.season===season());
    const owner=programOwned(p.id);
    const manager=members().find(m=>m.id===owner?.manager_id);
    const selection=picks().find(x=>x.program_id===p.id);
    const games=(report?.games||[]).slice().sort((a,b)=>String(b.game_date).localeCompare(String(a.game_date)));
    const activity=(league.roster_transactions||[]).filter(x=>x.program_id===p.id).slice(0,8);
    const trades=(league.trade_items||[]).filter(x=>x.program_id===p.id).filter(item=>
      (league.trades||[]).some(t=>t.id===item.trade_id&&t.status==='accepted'));
    const points=x=>x?.points===null||x?.points===undefined?'—':
      Number(x.points).toLocaleString('en-US',{maximumFractionDigits:2});
    const rank=x=>x?.rank>0&&x?.rank_total>0&&x?.status!=='not_applicable'
      ?(x.rank_tied?'T-':'')+'#'+Number(x.rank)+' / '+Number(x.rank_total):'—';
    const record=x=>x?.games>0?x.wins+'–'+x.losses:'—';
    const labelStat=(name,value)=>'<div class="pp-mini-stat"><span>'+escapeHTML(name)+'</span><strong>'+
      escapeHTML(value)+'</strong></div>';
    const rankValue=report?.net?.net_rank?'#'+report.net.net_rank:'—';
    const currentRecord=report?.record?.played?report.record.wins+'–'+report.record.losses:record(currentStats);
    const ratingLabel=report?.ranking_source==='torvik'?'T-Rank (prelim)':'NET rank';
    const state=programProfileTab==='schedule'||programProfileTab==='history'||programProfileTab==='ratings'
      ?programProfileTab:'overview';
    const tabs=[['overview','Overview'],['schedule','Schedule'],['history','History'],['ratings','Ratings']];
    const tabNav='<nav id="program-profile-navigation" class="pp-tabs" role="tablist" aria-label="Program profile sections">'+
      tabs.map(([id,name])=>'<button type="button" role="tab" id="pp-tab-'+id+'" aria-controls="pp-content" aria-selected="'+
      (state===id)+'" class="'+(state===id?'active':'')+'" data-act="program-profile-tab" data-id="'+id+'">'+
      name+'</button>').join('')+'</nav>';

    const earned=(currentStats?.breakdown||[]).filter(item=>Number(item.points||0)>0);
    const shortBreakdown=earned.length?earned.slice(0,6).map(item=>
      '<div class="pp-breakdown-row"><span>'+escapeHTML(item.label)+'</span><strong>+'+
      Number(item.points||0).toLocaleString('en-US',{maximumFractionDigits:2})+'</strong></div>').join(''):
      '<p class="pp-empty-copy">No fantasy points have been recorded yet.</p>';
    const recent=games.length?games.slice(0,5).map(g=>resultGameRow(g,p.id)).join(''):
      '<p class="pp-empty-copy">Results will appear here when games are completed.</p>';

    const overview='<div class="pp-overview-grid">'+
      '<section class="panel pp-section pp-scoring"><div class="pp-section-head"><div><h2>Fantasy scoring</h2>'+
      '<p>'+escapeHTML(season())+' season · '+(currentStats?.status==='partial'?'Live totals':currentStats?.status==='complete'?'Final totals':'Verified results')+'</p></div>'+
      '<strong class="pp-section-points">'+points(currentStats)+' <small>pts</small></strong></div>'+
      '<div class="pp-fact-strip pp-fact-four">'+
      labelStat('Regular wins',currentStats?.games?currentStats.regular_wins:'—')+
      labelStat('Q1 wins',currentStats?.quadrant_source==='pending'?'Pending':currentStats?.q1??'—')+
      labelStat('Q1A wins',currentStats?.quadrant_source==='pending'?'Pending':currentStats?.q1a??'—')+
      labelStat('Q2 wins',currentStats?.quadrant_source==='pending'?'Pending':currentStats?.q2??'—')+
      '</div><div class="pp-list-title">POINTS BY CATEGORY</div><div class="pp-breakdown">'+shortBreakdown+'</div>'+
      '<button type="button" class="pp-text-action" data-act="program-show-history">Full scoring breakdown <span aria-hidden="true">›</span></button>'+
      '</section>'+
      '<section class="panel pp-section pp-recent"><div class="pp-section-head"><div><h2>Recent results</h2><p>Latest completed and recorded games</p></div>'+
      '<button type="button" class="pp-text-action" data-act="program-profile-tab" data-id="schedule">All games ›</button></div>'+
      '<div class="pp-recent-list">'+recent+'</div></section></div>'+
      '<div class="pp-overview-foot"><span>'+escapeHTML(conf(p.conference_id))+'</span>'+
      '<span>'+(selection?'Draft pick #'+selection.overall+' · Round '+selection.round:'Undrafted')+'</span>'+
      (report?.ranking_date?'<span>'+escapeHTML(ratingLabel)+' updated '+escapeHTML(report.ranking_date)+'</span>':'')+
      '</div>';

    const firstYear=Number(season().slice(0,4));
    const rows=Array.from({length:Math.max(1,firstYear-2021+1)},(_,i)=>{
      const year=firstYear-i,yearLabel=year+'-'+String((year+1)%100).padStart(2,'0');
      const data=history.find(x=>x.season===yearLabel);
      const chosen=selected===yearLabel;
      return '<button type="button" class="pp-history-row'+(chosen?' active':'')+'" data-act="program-season" data-id="'+
        escapeHTML(yearLabel)+'" aria-pressed="'+chosen+'" aria-label="View '+escapeHTML(yearLabel)+' season">'+
        '<strong>'+escapeHTML(yearLabel)+'</strong><span class="pp-history-record">'+escapeHTML(record(data))+'</span>'+
        '<span class="pp-history-rank">'+escapeHTML(rank(data))+'</span><strong class="pp-history-points">'+
        points(data)+' <small>pts</small></strong></button>';
    }).join('');
    const items=selectedStats?.breakdown||[];
    const fullBreakdown=items.length?items.map(item=>
      '<div class="pp-breakdown-row"><span><strong>'+escapeHTML(item.label)+'</strong>'+
      '<small>'+Number(item.count||0)+' × '+Number(item.rate||0).toLocaleString('en-US',{maximumFractionDigits:2})+' pts</small></span>'+
      '<strong class="'+(Number(item.points||0)>0?'is-earned':'')+'">'+
      (Number(item.points||0)>0?'+':'')+Number(item.points||0).toLocaleString('en-US',{maximumFractionDigits:2})+
      '</strong></div>').join(''):'<p class="pp-empty-copy">No scoring details are available for this season yet.</p>';
    const historyDetail='<section class="panel pp-section pp-history-detail"><div class="pp-section-head">'+
      '<div><h2>'+escapeHTML(selected)+' breakdown</h2><p>'+
      (selectedStats?.status==='complete'?'Final verified results':selectedStats?.status==='partial'?'Live totals may change':'Recorded fantasy scoring')+
      '</p></div><strong class="pp-section-points">'+points(selectedStats)+' <small>pts</small></strong></div>'+
      '<div class="pp-history-compact"><span>National league rank <strong>'+escapeHTML(rank(selectedStats))+'</strong></span>'+
      '<button type="button" class="pp-text-action" data-act="view-historical-rank" data-season="'+escapeHTML(selected)+
      '">View rankings ›</button></div>'+
      '<div class="pp-fact-strip pp-fact-four">'+
      labelStat('Regular wins',selectedStats?.games?selectedStats.regular_wins:'—')+
      labelStat('Q1 wins',selectedStats?.quadrant_source==='pending'?'Pending':selectedStats?.q1??'—')+
      labelStat('Q1A wins',selectedStats?.quadrant_source==='pending'?'Pending':selectedStats?.q1a??'—')+
      labelStat('Q2 wins',selectedStats?.quadrant_source==='pending'?'Pending':selectedStats?.q2??'—')+
      '</div><div class="pp-list-title">COMPLETE POINT BREAKDOWN</div><div class="pp-breakdown pp-breakdown-full">'+
      fullBreakdown+'</div>'+
      (selectedStats?.quadrant_provisional?'<p class="pp-data-note">Quadrant totals are provisional pending official NCAA NET rankings.</p>':'')+
      '</section>';
    const transactions=activity.map(t=>'<div class="pp-history-event"><strong>'+
      escapeHTML(t.action==='claim'?'Acquired':'Released')+'</strong><span>'+escapeHTML(t.season)+'</span></div>').join('')+
      trades.map(t=>'<div class="pp-history-event"><strong>Traded</strong><span>'+
      escapeHTML(members().find(m=>m.id===t.from_manager_id)?.display_name||'Manager')+' → '+
      escapeHTML(members().find(m=>m.id===t.to_manager_id)?.display_name||'Manager')+'</span></div>').join('');
    const extra='<div class="pp-history-extra">'+
      (report?.awards?.length?'<details class="panel pp-disclosure"><summary>Verified achievements <span>'+report.awards.length+' ›</span></summary>'+
      report.awards.map(a=>'<div class="pp-history-event"><strong>'+escapeHTML(a.award_type.replaceAll('_',' '))+
      '</strong><span>'+escapeHTML(a.value)+' · '+escapeHTML(a.source_note)+'</span></div>').join('')+'</details>':'')+
      (transactions?'<details class="panel pp-disclosure"><summary>Ownership & transactions <span>'+
      (activity.length+trades.length)+' ›</span></summary>'+transactions+'</details>':'')+
      '</div>';
    const historical='<section class="panel pp-section pp-history-list"><div class="pp-section-head"><div>'+
      '<h2>Season history</h2><p>Select a year to see its complete scoring details</p></div></div>'+
      '<div class="pp-history-head"><span>SEASON</span><span class="pp-history-record">RECORD</span>'+
      '<span class="pp-history-rank">RANK</span><span>POINTS</span></div>'+
      '<div class="pp-history-rows">'+rows+'</div></section>'+historyDetail+extra+
      (report?.history_error?'<p class="pp-data-note">'+escapeHTML(report.history_error)+'</p>':'');

    const metricsYear=ratingYear(selected),metrics=ratingOf(p,metricsYear);
    const decimal=(value,d=1)=>value===null||value===undefined?'—':Number(value).toFixed(d);
    const ratingCard=(title,value,note='')=>'<div class="pp-rating-card"><span>'+escapeHTML(title)+'</span>'+
      '<strong>'+escapeHTML(value)+'</strong>'+(note?'<small>'+escapeHTML(note)+'</small>':'')+'</div>';
    const ratings='<section class="panel pp-section pp-ratings"><div class="pp-section-head"><div>'+
      '<h2>Power ratings</h2><p>Bart Torvik T-Rank · '+escapeHTML(selected)+'</p></div></div>'+
      '<div class="pp-rating-seasons">'+Array.from({length:Math.max(1,firstYear-2021+1)},(_,i)=>{
        const year=firstYear-i,label=year+'-'+String((year+1)%100).padStart(2,'0');
        return '<button type="button" data-act="program-season" data-id="'+escapeHTML(label)+'" class="'+
          (label===selected?'active':'')+'" aria-pressed="'+(label===selected)+'">'+escapeHTML(label)+'</button>';
      }).join('')+'</div>'+
      (metrics?'<div class="pp-ratings-grid">'+
        ratingCard('National T-Rank','#'+metrics.rank)+
        ratingCard('Barthag',decimal(metrics.barthag,3))+
        ratingCard('Adjusted offense',decimal(metrics.adj_o),metrics.adj_o_rank?'#'+metrics.adj_o_rank+' nationally':'Points / 100 possessions')+
        ratingCard('Adjusted defense',decimal(metrics.adj_d),metrics.adj_d_rank?'#'+metrics.adj_d_rank+' nationally':'Points / 100 possessions')+
        ratingCard('Wins above bubble',decimal(metrics.wab))+
        ratingCard('Adjusted tempo',decimal(metrics.tempo))+
        '</div>':'<p class="pp-empty-copy">'+escapeHTML(ratingError[metricsYear]||
          (ratingLoading[metricsYear]?'Loading verified T-Rank ratings…':'No verified T-Rank data for this season.'))+'</p>')+
      '<div class="pp-rating-links">'+ratingExternalLinks(metricsYear)+
      '<button class="pp-text-action" type="button" data-act="view-ratings" data-season="'+escapeHTML(selected)+
      '">Compare all programs ›</button></div></section>';

    const panel=state==='schedule'?programSeasonSchedule(p):
      state==='history'?historical:state==='ratings'?ratings:overview;
    const ownerMarkup=manager?'<button type="button" class="program-profile-owner-link" data-act="open-manager" data-id="'+
      escapeHTML(manager.id)+'">'+escapeHTML(manager.display_name)+' ›</button>':
      '<span>Unowned</span>';
    return '<div class="pp-page">'+profileBack()+
      '<header class="pp-hero">'+
      '<div class="pp-identity">'+img(p)+'<div class="pp-identity-text"><span class="pp-conference">'+
      escapeHTML(conf(p.conference_id))+'</span><h1>'+escapeHTML(p.name)+'</h1>'+
      '<div class="pp-owner">Dynasty owner: '+ownerMarkup+'</div></div></div>'+
      '<span class="pp-status '+(owner?'is-rostered':'is-available')+'">'+
      (owner?'Rostered':'Available')+'</span></header>'+
      '<div class="pp-statbar">'+
      '<div><span>'+escapeHTML(season())+' POINTS</span><strong>'+points(currentStats)+'</strong></div>'+
      '<div><span>PROGRAM RANK</span><strong>'+escapeHTML(rank(currentStats))+'</strong></div>'+
      '<div><span>SEASON RECORD</span><strong>'+escapeHTML(currentRecord)+'</strong></div>'+
      '<div><span>'+escapeHTML(ratingLabel.toUpperCase())+'</span><strong>'+escapeHTML(rankValue)+'</strong></div>'+
      '</div>'+tabNav+
      '<div id="pp-content" class="pp-content" role="tabpanel" aria-labelledby="pp-tab-'+state+'">'+panel+'</div>'+
      '</div>';
  }
  function managerProfilePage(){
    const u=members().find(m=>m.id===selectedManagerId);
    if(!u)return heading('', 'Manager unavailable')+profileBack();
    const roster=owners().filter(o=>o.manager_id===u.id).map(o=>programs().find(p=>p.id===o.program_id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const records=(league.season_records||[]).filter(x=>x.manager_id===u.id).sort((a,b)=>b.season.localeCompare(a.season));
    const titles=(league.archives||[]).filter(x=>x.champion_manager_id===u.id).length;
    const favorite=programs().find(p=>String(p.id)===String(u.favorite_program_id||''));
    const scoring=standingsData?.season===season()?standingsData:null;
    const managerScore=scoring?.standings?.find(x=>String(x.manager_id)===String(u.id));
    const livePoints=managerScore&&roster.length?Number(managerScore.points||0).toLocaleString('en-US',{maximumFractionDigits:2}):'—';
    const ranking=(scoring?.standings||[]).slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0));
    const liveRank=managerScore&&roster.length?'#'+(1+ranking.findIndex(x=>Number(x.points||0)===Number(managerScore.points||0))):'—';
    const rows=roster.map(p=>'<button class="profile-roster-row" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+img(p)+'<span class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(conf(p.conference_id))+'</small></span><span>›</span></button>').join('');
    return profileBack()+'<div class="profile-hero manager-hero">'+avatar(u)+'<div class="grow"><span class="eyebrow">DYNASTY MANAGER</span><h1>'+escapeHTML(u.display_name)+'</h1><div class="profile-subline">@'+escapeHTML(u.username)+(u.id===me.id?' · Your team':'')+(favorite?' · Favorite: '+escapeHTML(favorite.name):'')+'</div></div></div>'
      +'<div class="profile-stats"><div><span>OWNED PROGRAMS</span><strong>'+roster.length+'</strong></div><div><span>SEASON POINTS</span><strong>'+livePoints+'</strong></div><div><span>LEAGUE RANK</span><strong>'+liveRank+'</strong></div><div><span>LEAGUE TITLES</span><strong>'+titles+'</strong></div></div>'
      +'<div class="profile-panels"><section class="panel">'+panelHeading('Current roster',roster.length+' permanently owned program'+(roster.length===1?'':'s'))+(rows||empty('No programs owned'))+'</section><section class="panel">'+panelHeading('Dynasty seasons')+(records.length?records.map(x=>{const saved=(league.archived_rosters||[]).filter(a=>a.season===x.season&&a.manager_id===u.id);return '<details class="archived-roster"><summary><strong>'+escapeHTML(x.season)+'</strong><span>'+x.programs_count+' schools · '+(x.fantasy_points==null?'Score unavailable':Number(x.fantasy_points).toLocaleString('en-US',{maximumFractionDigits:2})+' pts')+'</span></summary><div class="archive-schools">'+(saved.map(a=>{const p=programs().find(p=>p.id===a.program_id);return p?'<button class="table-user" data-act="open-program" data-id="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</button>':'';}).join('')||'No programs archived')+'</div></details>';}).join(''):empty('No archived seasons'))+'</section></div>';
  }
  function historyPage(){
    const archives=league.archives||[];
    const chosen=archives.find(a=>a.season===selectedHistorySeason)||archives[0];
    if(chosen)selectedHistorySeason=chosen.season;
    const entries=chosen?(league.season_records||[]).filter(r=>r.season===chosen.season):[];
    const historyRows=entries.map(r=>{
      const m=members().find(u=>u.id===r.manager_id);
      return '<button class="history-team" data-act="open-manager" data-id="'+escapeHTML(r.manager_id)+'"><strong>'+escapeHTML(m?.display_name||'Manager')+'</strong><span>'+r.programs_count+' programs</span><span>'+(r.fantasy_points==null?'Score unavailable':Number(r.fantasy_points).toLocaleString('en-US',{maximumFractionDigits:2})+' pts')+'</span></button>';
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
    const eligible=eligiblePrograms().filter(p=>!programOwned(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
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
  function backendHealthPanel(){
    const scan=integritySnapshot?.latest,metrics=scan?.metrics||{},issues=scan?.issues||[];
    const label=scan?.severity||'pending',at=scan?.scanned_at?new Date(scan.scanned_at).toLocaleString():'Not yet scanned';
    const issueRows=issues.map(x=>'<div class="data-run"><span class="failed">'+Number(x.count||0)+'</span><div><strong>'+escapeHTML(x.message||x.code)+'</strong><small>'+escapeHTML(x.code||'')+'</small></div></div>').join('');
    const revisionRows=(integritySnapshot?.revisions||[]).slice(0,6).map(x=>{
      const manager=members().find(u=>u.id===x.actor_id);
      return '<div class="data-run"><span>RULES</span><div><strong>'+escapeHTML(manager?.display_name||'Commissioner')+'</strong><small>'+escapeHTML(new Date(x.changed_at).toLocaleString())+' · Revision #'+Number(x.id||0)+'</small></div></div>';
    }).join('');
    const scanRows=(integritySnapshot?.history||[]).slice(0,6).map(x=>'<div class="data-run"><span>'+escapeHTML(x.severity)+'</span><div><strong>'+escapeHTML(new Date(x.scanned_at).toLocaleString())+'</strong><small>'+Number(x.critical_count||0)+' critical · '+Number(x.warning_count||0)+' warnings</small></div></div>').join('');
    const score=scoringAudit?'<p class="hint section-gap">'+(scoringAudit.valid?'Scoring verification passed':'Scoring exceptions detected')+' · '+Number(scoringAudit.program_seasons||0)+' program-seasons checked · '+(scoringAudit.invalid||[]).length+' invalid entries.</p>':'';
    return '<section class="panel setting-panel backend-center">'+panelHeading('Backend control center','Hourly integrity checks · commissioner only')+
      '<div class="backend-summary"><div><span class="backend-severity '+escapeHTML(label)+'">'+escapeHTML(label.toUpperCase())+'</span><p class="hint">Last scan: '+escapeHTML(at)+'</p></div>'+
      '<div class="backend-severity-metrics"><strong>'+Number(scan?.critical_count||0)+'</strong><small>Critical</small><strong>'+Number(scan?.warning_count||0)+'</strong><small>Warnings</small></div></div>'+
      '<div class="data-kpis"><div><span>ALL GAMES</span><strong>'+Number(metrics.game_count||0).toLocaleString()+'</strong></div><div><span>STALLED JOBS</span><strong>'+Number(metrics.stalled_jobs||0)+'</strong></div><div><span>FAILED / 24H</span><strong>'+Number(metrics.failed_24h||0)+'</strong></div></div>'+
      (integrityError?'<p class="data-error section-gap">'+escapeHTML(integrityError)+'</p>':'')+
      (issueRows?'<div class="backend-issues section-gap">'+issueRows+'</div>':'<p class="hint section-gap">No outstanding integrity exceptions.</p>')+
      '<div class="button-row section-gap"><button class="btn" data-act="data-integrity-scan">Run integrity scan</button><button class="btn secondary" data-act="data-repair-interrupted">Retry interrupted imports</button><button class="btn secondary" data-act="data-verify-scoring">Verify scoring totals</button></div>'+
      '<p class="hint section-gap">Scans do not modify game scores. Recovery retries up to two dates, with cooldowns and logged outcomes. Scoring verification recalculates using the shared scoring engine and never changes rules.</p>'+
      score+
      '<details class="section-gap"><summary>Scan history</summary>'+(scanRows||'<p class="hint">No scans.</p>')+'</details>'+
      '<details class="section-gap"><summary>Scoring rule changes</summary>'+(revisionRows||'<p class="hint">No revisions recorded yet.</p>')+'</details>'+
      '</section>';
  }
  function notificationAdminPage(){
    const d=notificationAdmin||{},cfg=d.settings||{};
    const controls=[['trades','Trade alerts','Offers, acceptances and declines'],['draft','Draft alerts','Draft start, on-clock and soon-up notifications'],['announcements','Commissioner announcements','League-wide messages']];
    const opts=controls.map(([key,title,detail])=>'<label class="notification-admin-toggle"><span><strong>'+title+'</strong><small>'+detail+'</small></span>'
      +'<input id="admin-notification-'+key+'" type="checkbox" '+(cfg[key]!==false?'checked':'')+'/></label>').join('');
    const recipientOptions=members().map(m=>'<option value="'+escapeHTML(m.id)+'">'+escapeHTML(m.display_name)+'</option>').join('');
    const stats=(d.devices||[]).map(m=>'<div class="notification-device-person"><span><strong>'+escapeHTML(m.display_name)+'</strong><small>'
      +Number(m.devices||0)+' opted-in device(s)</small></span><span class="'+(Number(m.devices||0)?'notification-device-on':'notification-device-off')+'">'
      +(Number(m.devices||0)?'Enabled':'Not enrolled')+'</span></div>').join('');
    const recent=(d.announcements||[]).map(a=>'<div class="notification-admin-announcement"><strong>'+escapeHTML(a.title)+'</strong><small>'
      +escapeHTML(notificationTime(a.created_at))+' · '+Number(a.recipients||0)+' recipients</small><p>'+escapeHTML(a.body)+'</p></div>').join('');
    return '<section class="panel setting-panel notification-admin-panel">'+panelHeading('Notification Center','Control league alerts and send messages')
      +'<div class="notification-admin-metrics">'
      +[['Sent',d.total||0],['Unread',d.unread||0],['Pending delivery',d.pending_delivery||0],
        ['Push devices',(d.devices||[]).reduce((a,b)=>a+Number(b.devices||0),0)]].map(([label,value])=>
          '<div><strong>'+Number(value).toLocaleString()+'</strong><span>'+label+'</span></div>').join('')+'</div>'
      +(notificationAdminError?'<p class="notice">'+escapeHTML(notificationAdminError)+'</p>':'')
      +'<div class="button-row section-gap"><button class="btn small secondary" data-act="notification-admin-refresh">Refresh</button>'
      +'<button class="btn small secondary" data-act="notifications-test">Send test to me</button>'
      +'<button class="btn small ghost" data-act="notification-admin-retry">Retry pending</button></div></section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Send an announcement','Push to opted-in devices and every selected manager\'s inbox')
      +'<div class="form-row"><label for="notification-recipient">Send to</label><select class="field" id="notification-recipient">'
      +'<option value="all">Everyone in the league</option>'+recipientOptions+'</select></div>'
      +'<div class="form-row"><label for="notification-announcement-title">Title</label>'
      +'<input class="field" id="notification-announcement-title" maxlength="90" placeholder="League announcement" /></div>'
      +'<div class="form-row"><label for="notification-announcement-message">Message</label>'
      +'<textarea class="field" id="notification-announcement-message" rows="4" maxlength="650" placeholder="Write your update…"></textarea></div>'
      +'<button class="btn" type="button" data-act="notification-admin-send">Send announcement</button>'
      +'<p class="hint section-gap">A maximum of eight announcements can be sent every 24 hours.</p></section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Automatic notifications','League-wide event switches')+opts
      +'<div class="button-row section-gap"><button class="btn secondary" data-act="notification-admin-save">Save settings</button></div></section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Delivery and manager devices')
      +'<p class="hint">Push: each manager opts in independently. Email: '+(d.email_available?'Provider connected':
        'Not configured. A verified sender and RESEND_API_KEY/NOTIFICATION_EMAIL_FROM Supabase secrets are required.')+'</p>'
      +'<div class="notification-device-list">'+(stats||'<p class="hint">Loading device registrations…</p>')+'</div></section>'
      +'<section class="panel setting-panel section-gap">'+panelHeading('Recent announcements')
      +(recent||'<p class="hint">No announcements sent yet.</p>')+'</section>';
  }
  function commissionerPage(){
    if(me.role!=='commissioner')return '';
    const settings=league.settings;
    const locked=settings.draft_status!=='pending'||picks().length>0;
    const cap=Number(settings.max_managers||10);
    const sections=[['general','General','League identity'],['programs','Programs','Eligibility & selection'],['draft','Draft','Rounds & order'],['scoring','Scoring','Point values'],['members','Members','Accounts & invites'],['activity','Activity','Visits & actions'],['notifications','Notifications','Broadcasts & delivery'],['data','Data','Results & imports'],['trades','Trades','Permissions'],['waivers','Waivers','Claims'],['seasons','Seasons','Rollover']];
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
      const orderLocked=locked||!!settings.draft_race;
      const rows=draftOrderPreview.map((id,index)=>{
        const person=members().find(u=>u.id===id);
        return '<div class="draft-order-row"><span class="draft-order-number">'+(index+1)+'</span>'+avatar(person)+'<strong class="grow">'+escapeHTML(person.display_name)+'</strong>'
          +(orderLocked?'':'<span class="draft-order-buttons"><button data-act="move-draft" data-index="'+index+'" data-dir="-1" '+(index===0?'disabled':'')+' aria-label="Move '+escapeHTML(person.display_name)+' up">↑</button><button data-act="move-draft" data-index="'+index+'" data-dir="1" '+(index===draftOrderPreview.length-1?'disabled':'')+' aria-label="Move '+escapeHTML(person.display_name)+' down">↓</button></span>')
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
        +(orderLocked?'':'<div class="button-row section-gap"><button class="btn secondary" data-act="shuffle-draft" '+(members().length<2?'disabled':'')+'>Shuffle</button><button class="btn ghost" data-act="signup-draft">Signup order</button><button class="btn" data-act="save-draft-order" '+(members().length<2?'disabled':'')+'>Save order</button></div>')+'</section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Race controls',settings.draft_race?'The official order is locked':'Set the order above before starting the race')
        +(settings.draft_race?'<p class="hint">The result is saved for every manager. You can reset the race before the draft starts, which also restores signup order.</p>'
          +'<div class="button-row section-gap"><button class="btn danger" data-act="race-reset" '+(locked?'disabled':'')+'>Reset race</button></div>':
          '<p class="hint">Once you run the race, this becomes the official first-round order and cannot be changed without resetting.</p>'
          +'<div class="button-row section-gap"><button class="btn secondary" data-act="tab" data-id="draft-order">Open race</button></div>')
        +'</section>'
        +'<section class="panel setting-panel section-gap">'+panelHeading('Draft controls')+'<div class="button-row">'
        +'<button class="btn" data-act="start" '+(settings.draft_status==='live'||settings.draft_status==='finished'?'disabled':'')+'>Start / resume</button>'
        +'<button class="btn secondary" data-act="pause" '+(settings.draft_status!=='live'?'disabled':'')+'>Pause draft</button>'
        +'<button class="btn danger" data-act="reset" '+(settings.draft_status==='finished'?'disabled':'')+'>Reset picks</button>'
        +'</div></section>';
    }else if(adminSection==='programs'){
      initPoolDraft();
      const total=programs().length,selected=poolDraftSchools.size,required=members().length*Number(settings.rounds);
      const conferenceRows=conferenceGroups.map(group=>'<div class="pool-conference-group"><h3>'+escapeHTML(group.name)+'</h3>'+
        group.ids.map(id=>{
          const all=programs().filter(p=>String(p.conference_id)===id);
          const count=all.filter(p=>poolDraftSchools.has(String(p.id))).length;
          const active=poolDraftConfs.has(id);
          return '<button type="button" class="pool-conference '+(active?'is-selected':'')+'" data-act="pool-conf" data-id="'+id+'" aria-pressed="'+active+'" '+(locked?'disabled':'')+'>'
            +'<span class="pool-check" aria-hidden="true">'+(active?'✓':'')+'</span><span class="pool-conf-name">'+escapeHTML(conf(id))+'</span>'
            +'<span class="pool-conf-count">'+count+'/'+all.length+'</span></button>';
        }).join('')+'</div>').join('');
      const filterOptions=[...new Set(programs().map(p=>String(p.conference_id)))].sort((a,b)=>conf(a).localeCompare(conf(b)))
        .map(id=>'<option value="'+id+'" '+(poolConferenceFilter===id?'selected':'')+'>'+escapeHTML(conf(id))+'</option>').join('');
      const scopeButtons=[['all','All schools'],['included','Included'],['excluded','Not included']]
        .map(([id,label])=>'<button type="button" data-act="pool-scope" data-id="'+id+'" class="'+(poolScope===id?'active':'')+'" aria-pressed="'+(poolScope===id)+'">'+label+'</button>').join('');
      body='<div class="pool-intro"><div><span class="pool-kicker">DRAFT POOL BUILDER</span><h2>Choose eligible programs</h2>'
        +'<p>Start with conferences, then fine-tune individual schools. Changes affect the draft pool, school directory, and historical rankings.</p></div>'
        +'<div class="pool-stat"><strong>'+selected+'</strong><span>of '+total+' programs selected</span></div></div>'
        +(locked?'<div class="pool-lock-note">The inaugural draft has started. Program eligibility is locked to protect existing picks and dynasty rosters.</div>':'')
        +'<div class="pool-editor">'
        +'<section class="panel pool-conferences">'+panelHeading('Conferences','Select an entire conference with one click')
        +'<div class="pool-quick-actions"><button type="button" class="btn small secondary" data-act="pool-major" '+(locked?'disabled':'')+'>Major conferences</button>'
        +'<button type="button" class="btn small ghost" data-act="pool-all-confs" '+(locked?'disabled':'')+'>Select all</button></div>'
        +conferenceRows+'</section>'
        +'<section class="panel pool-schools">'+panelHeading('Individual schools','Override conference selections one school at a time')
        +'<div class="pool-search-tools"><label class="pool-search"><span aria-hidden="true">⌕</span><input type="search" id="pool-search" value="'+escapeHTML(poolQuery)+'" placeholder="Search any Division I school..." autocomplete="off" aria-label="Find a school" /></label>'
        +'<select id="pool-conf-filter" class="field" aria-label="Filter schools by conference"><option value="all">All conferences</option>'+filterOptions+'</select></div>'
        +'<div class="pool-scope" role="group" aria-label="Program selection filter">'+scopeButtons+'</div>'
        +(!locked?'<div class="pool-bulk"><span>Matching schools</span><button type="button" data-act="pool-add-visible">Include all</button><button type="button" data-act="pool-remove-visible">Exclude all</button></div>':'')
        +'<div class="pool-school-list '+(locked?'is-locked':'')+'" id="pool-school-results">'+poolSchoolRows()+'</div></section></div>'
        +'<div class="pool-footer"><div><strong id="pool-selected-count">'+selected+' selected</strong><small id="pool-save-state">'+(poolDirty?'Unsaved changes':'All changes saved')+'</small>'
        +(selected<required?'<small class="pool-warning">Need at least '+required+' programs for a full '+settings.rounds+'-round draft.</small>':'')+'</div>'
        +'<div class="pool-footer-actions"><button type="button" class="btn ghost" data-act="pool-reset" '+(locked||!poolDirty?'disabled':'')+'>Reset</button>'
        +'<button type="button" class="btn" data-act="save-pool" '+(locked||!poolDirty?'disabled':'')+'>Save eligible programs</button></div></div>'
        +(importError?'<p class="notice section-gap">'+escapeHTML(importError)+'</p>':'')
        +'<details class="panel pool-advanced"><summary>Advanced: add a custom school or resync conference data</summary><div class="pool-advanced-content">'
        +'<p>All '+total+' verified 2026–27 schools are already listed above. Only use these tools for corrections or new schools.</p>'
        +'<form data-form="program">'+input('Program name','name','text','School name')+input('Abbreviation','abbr','text','e.g. UF')
        +'<div class="form-row"><label for="conference_id">Conference</label><select class="field" id="conference_id" name="conference_id">'
        +Object.keys(conferenceNames).sort((a,b)=>conf(a).localeCompare(conf(b))).map(id=>'<option value="'+id+'">'+escapeHTML(conf(id))+'</option>').join('')+'</select></div>'
        +'<button class="btn secondary" type="submit" '+(locked?'disabled':'')+'>Add custom school</button></form>'
        +'<div class="button-row section-gap"><button class="btn secondary" data-act="sync" '+(locked||syncActive?'disabled':'')+'>Resync enabled conferences</button></div></div></details>';
    }else if(adminSection==='data'){
      const runs=resultsStatus?.recent_runs||[];
      const latest=runs.find(x=>x.status==='ok');
      const failure=runs.find(x=>x.status==='error');
      const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'}),coverage=resultsStatus?.coverage;
      const progOptions=eligiblePrograms().sort((a,b)=>a.name.localeCompare(b.name))
        .map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
      const awardOptions=[['conference_regular_champion','Conference regular-season champion'],['conference_tournament_champion','Conference tournament champion'],['ncaa_seed','NCAA Tournament seed'],['ncaa_wins','NCAA Tournament wins'],['national_champion','National champion'],['kenpom_final_rank','Final KenPom rank']];
      const archivedYears=resultsStatus?.historical||[];
      const historicalRows=archivedYears.map(h=>'<div class="data-run"><span>'+escapeHTML(h.season)+'</span><div><strong>'+Number(h.checked_dates||0)+' dates checked</strong><small>'+Number(h.primary_events||0)+' ESPN games · '+(h.net_teams>=350?'NET verified ('+h.net_teams+' teams)':'NET missing')+' · '+Number(h.award_count||0)+' achievements</small></div></div>').join('');
      body=backendHealthPanel()+'<section class="panel setting-panel section-gap">'+panelHeading('Results pipeline','ESPN scoreboards · current season')
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
    }else if(adminSection==='activity'){
      body=activityMonitorPage();
    }else if(adminSection==='members'){
      body='<section class="panel setting-panel">'+panelHeading('Account management',members().length+' / '+cap+' accounts')
        +'<p class="hint">Usernames are visible to the commissioner. Passwords are securely hashed and cannot be viewed. Reset a manager to create a new temporary password and sign out their existing devices.</p>'
        +members().map(u=>'<div class="manager-card account-manager-row">'+avatar(u)
        +'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>@'+escapeHTML(u.username)+'</small></div>'
        +(u.role==='manager'?'<button class="btn small secondary" type="button" data-act="admin-reset-member-password" data-id="'+escapeHTML(u.id)+'">Reset password</button>':
          '<span class="status wait">COMMISSIONER</span>')+'</div>').join('')
        +(passwordResetReceipt?'<div class="account-reset-receipt" role="status">'
          +'<strong>Temporary password for @'+escapeHTML(passwordResetReceipt.username)+'</strong>'
          +'<p>Copy and share privately with '+escapeHTML(passwordResetReceipt.display_name)+'. Their previous password and all existing sessions are now invalid. This password cannot be retrieved again after you dismiss it or leave this page.</p>'
          +'<div class="account-reset-credential"><code>'+escapeHTML(passwordResetReceipt.temporary_password)+'</code></div>'
          +'<div class="button-row"><button class="btn small" type="button" data-act="copy-reset-password">Copy password</button>'
          +'<button class="btn small secondary" type="button" data-act="dismiss-reset-password">Dismiss</button></div>'
          +'</div>':'')
        +'<p class="hint section-gap">Managers can set their own permanent password in My Settings after signing in with the temporary password.</p>'
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
        +'<p class="settings-hint">Q1A is its own +2.5 win category, separate from +1.5 Q1 wins. The PAC-12 &amp; MID-MAJOR BONUSES section covers every eligible non-Power school, including individually added teams; Gonzaga is excluded. No KenPom or AP Poll points. Changing a scoring weight does not import game results.</p>'
        +'<div class="button-row section-gap"><button class="btn" data-act="save-scoring">Save scoring</button><button class="btn secondary" data-act="tab" data-id="scoring">View rules</button></div></section>';
    }else if(adminSection==='notifications'){
      body=notificationAdminPage();
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
    return heading('COMMISSIONER CONSOLE','League settings','Make changes to your league from one organized workspace.')
      +'<div class="commissioner-overview"><div><span>CURRENT SEASON</span><strong>'+escapeHTML(season())+'</strong></div>'
      +'<div><span>LEAGUE MEMBERS</span><strong>'+members().length+' / '+cap+'</strong></div>'
      +'<div><span>ELIGIBLE PROGRAMS</span><strong>'+eligiblePrograms().length+'</strong></div>'
      +'<div><span>DRAFT STATUS</span><strong class="admin-draft-state">'+escapeHTML(settings.draft_status)+'</strong></div></div>'
      +'<div class="commissioner-layout">'+menu+'<div class="commissioner-body">'+body+'</div></div>';
  }
  async function action(button){
    const act=button.dataset.act,id=button.dataset.id;
    if(act==='notifications-enable-push'){
      try{
        if(!('serviceWorker' in navigator)||typeof Notification==='undefined'||!('PushManager' in window))
          throw new Error('Push notifications are not supported by this browser.');
        // Required user gesture: prompt before any other awaited network operation.
        const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
        if(permission!=='granted')throw new Error('Allow notifications in your device settings to enable alerts.');
        const base=typeof SITE_BASE!=='undefined'?SITE_BASE:'/';
        const reg=await navigator.serviceWorker.register(base+'sw.js',{scope:base});
        const config=notificationSnapshot||await api('notifications/inbox');
        if(!config.public_key)throw new Error('Push configuration is temporarily unavailable.');
        const raw=config.public_key.replace(/-/g,'+').replace(/_/g,'/');
        const bytes=Uint8Array.from(atob(raw+'='.repeat((4-raw.length%4)%4)),x=>x.charCodeAt(0));
        let subscription=await reg.pushManager.getSubscription();
        if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
        await api('notifications/subscribe',{subscription:subscription.toJSON(),user_agent:navigator.userAgent});
        pushDeviceActive=true;await loadNotifications(true);render();
        notice('Push notifications enabled on this device.');
      }catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notifications-disable-push'){
      try{
        const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();
        if(subscription){
          await api('notifications/unsubscribe',{endpoint:subscription.endpoint});
          await subscription.unsubscribe();
        }
        pushDeviceActive=false;await loadNotifications(true);render();
        notice('Push alerts disabled on this device.');
      }catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notifications-test'){
      try{await api('notifications/test',{});notice('Test alert sent. Check your notifications.');loadNotifications(true);}
      catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notifications-read-all'){
      try{await api('notifications/read',{id:'all'});await loadNotifications(true);}
      catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notification-open'){
      try{
        await api('notifications/read',{id});
        const allowed=['trades','draft','notifications'];
        current=allowed.includes(button.dataset.target)?button.dataset.target:'notifications';
        await loadNotifications(true);render();
      }catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notifications-save-prefs'){
      const next={};
      for(const key of ['trades','draft','announcements','push_enabled','email_enabled']){
        const input=document.querySelector('#notification-pref-'+key);
        next[key]=input?!!input.checked:!!notificationSnapshot?.preferences?.[key];
      }
      try{await api('notifications/preferences',next);await loadNotifications(true);notice('Notification preferences saved.');}
      catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='notifications-email-request'){
      try{
        await api('notifications/email/request',{email:v('#notification-email')});
        notice('Verification email sent. Open the link to activate email alerts.');
      }catch(error){notice(String(error.message||error),true);}
      return;
    }
    if(act==='race-replay'){startDraftRacePlayback(false);return;}
    if(act==='race-settings'){adminSection='draft';current='commissioner';render();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(act==='activity-refresh'){loadActivity(true);return;}
    if(act==='notification-admin-refresh'){loadNotificationAdmin(true);return;}
    if(act==='notification-admin-retry'){
      try{const d=await api('admin/notifications/retry',{});notice('Retried '+Number(d.examined||0)+' deliveries.');await loadNotificationAdmin(true);}
      catch(e){notice(String(e.message||e),true);}return;
    }
    if(act==='notification-admin-save'){
      const values={};
      for(const k of ['trades','draft','announcements'])values[k]=!!document.querySelector('#admin-notification-'+k)?.checked;
      try{await api('admin/notifications/settings',values);await loadNotificationAdmin(true);notice('Notification settings saved.');}
      catch(e){notice(String(e.message||e),true);}return;
    }
    if(act==='notification-admin-send'){
      const title=v('#notification-announcement-title').trim(),message=v('#notification-announcement-message').trim();
      const recipient=v('#notification-recipient')||'all';
      if(title.length<3||message.length<4){notice('Enter a title and message.',true);return;}
      const who=recipient==='all'?'all '+members().length+' managers':
        (members().find(m=>m.id===recipient)?.display_name||'this manager');
      if(!window.confirm('Send this announcement to '+who+'?'))return;
      try{
        const r=await api('admin/notifications/announce',{title,message,recipient});
        notice('Sent to '+Number(r.recipients||0)+' inboxes.');await Promise.all([loadNotificationAdmin(true),loadNotifications(true)]);
      }catch(e){notice(String(e.message||e),true);}return;
    }
    if(act==='search-open'){toggleGlobalSearch(true);return;}
    if(act==='search-close'){toggleGlobalSearch(false);return;}
    if(act==='settings-remove-photo'){avatarDraft='';const preview=root.querySelector('.settings-avatar-preview');if(preview)preview.innerHTML=avatar({...me,avatar_data:null});const hint=root.querySelector('#photo-hint');if(hint)hint.textContent='Profile photo will be removed when you save.';return;}
    if(act==='results-track-queue'){
      resultsSelectedDay=resultsToday();resultsScope='queue';resultsConference='all';resultsStatusFilter='all';
      resultsSearch='';resultsShown=40;current='results';render();loadResults();
      window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(act==='overview-today-results'){
      resultsSelectedDay=resultsToday();resultsScope='league';resultsSearch='';resultsStatusFilter='all';resultsShown=40;
      current='results';render();loadResults();window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(act==='profile-back'){
      const to=current==='program-detail'?programBackPage:managerBackPage;
      const restore=current==='program-detail'?programBackScroll:managerBackScroll;
      current=to;render();if(to==='programs')filterPrograms();
      requestAnimationFrame(()=>window.scrollTo({top:restore,behavior:'auto'}));
      return;
    }
    if(act==='tab'){
      if(id==='notifications')loadNotifications(true);
      globalSearchOpen=false;globalSearchQuery='';
      if(id==='programs'&&current!=='programs')ratingSeason=season();
      current=id;render();if(current==='programs')filterPrograms();if(current==='results')loadResults();
      if(current==='draft-order'&&officialRace()&&raceState.id!==officialRace().id&&Date.now()-officialRace().started_at*1000<raceTotalMs(officialRace()))startDraftRacePlayback(true);
      window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(act==='program-profile-tab'){programProfileTab=id;render();root.querySelector('#program-profile-navigation')?.scrollIntoView({block:'start',behavior:'auto'});return;}
    if(act==='program-show-history'){selectedProgramSeason=season();programProfileTab='history';render();root.querySelector('#program-profile-navigation')?.scrollIntoView({block:'start',behavior:'auto'});return;}
    if(act==='program-season'){selectedProgramSeason=id;render();return;}
    if(act==='schedule-view'){programScheduleView=id;render();return;}
    if(act==='schedule-retry'){loadProgramSchedule(id,true);return;}
    if(act==='view-ratings'){
      ratingSeason=button.dataset.season||season();programMode='ratings';current='programs';render();window.scrollTo({top:0});return;
    }
    if(act==='view-historical-rank'){
      leaderSeason=button.dataset.season||season();programMode='leaders';current='programs';render();
      if(!schoolLeaders)loadSchoolLeaders();window.scrollTo({top:0});return;
    }
    if(act==='ratings-current'){ratingSeason=season();ratingShown=40;render();return;}
    if(act==='rating-season'){ratingSeason=(Number(id)-1)+'-'+String(Number(id)%100).padStart(2,'0');ratingShown=40;render();return;}
    if(act==='rating-sort'){ratingSort=id;ratingShown=40;render();return;}
    if(act==='ratings-refresh'){delete ratingError[Number(id)];delete ratingCache[Number(id)];loadRatings(Number(id),true);render();return;}
    if(act==='school-mode'){
      if(id==='ratings'&&programMode!=='ratings')ratingSeason=season();
      programMode=id;render();if(id==='leaders'&&!schoolLeaders)loadSchoolLeaders();else if(id==='directory')filterPrograms();return;
    }
    if(act==='leaders-season'){leaderSeason=id;leaderShown=40;render();return;}
    if(act==='leaders-retry'){schoolLeaders=null;schoolLeadersError='';loadSchoolLeaders();return;}
    if(act==='leaders-more'){leaderShown+=40;filterSchoolLeaders();return;}
    if(act==='ratings-more'){ratingShown+=40;filterRatings();return;}
    if(act==='leaders-sort'){leaderOrder=id;leaderShown=40;render();return;}
    if(act==='leader-scope'){leaderOwnership=id;leaderShown=40;render();return;}
    if(act==='rating-scope'){ratingOwnership=id;ratingShown=40;render();return;}
    if(act==='directory-sort'){programSort=id;programShown=36;render();filterPrograms();return;}
    if(act==='open-program'){
      globalSearchOpen=false;globalSearchQuery='';
      if(current!=='program-detail'){programBackPage=current;programBackScroll=window.scrollY;}
      if(String(selectedProgramId)!==String(id)){programScheduleView='all';programProfileTab='overview';}
      selectedProgramId=id;selectedProgramSeason=programMode==='leaders'&&leaderSeason!=='all'?leaderSeason:
        programMode==='ratings'?(ratingSeason||season()):season();current='program-detail';render();
      loadProgramResults(id);loadProgramSchedule(id);window.scrollTo({top:0});return;
    }
    if(act==='open-manager'){
      globalSearchOpen=false;globalSearchQuery='';
      if(current!=='manager-detail'){managerBackPage=current;managerBackScroll=window.scrollY;}
      selectedManagerId=id;current='manager-detail';render();window.scrollTo({top:0});return;
    }
    if(act==='commish-section'){
      if(adminSection==='programs'&&id!=='programs'&&poolDirty&&!window.confirm('Leave without saving your program selections?'))return;
      if(adminSection==='programs'&&id!=='programs')resetPoolDraft();
      if(id!==adminSection)passwordResetReceipt=null;
      adminSection=id;render();if(id==='data'){loadResults();loadIntegrity();}if(id==='activity')loadActivity();return;
    }
    if(act==='pool-conf'||act==='pool-major'||act==='pool-all-confs'){
      initPoolDraft();if(league.settings.draft_status!=='pending'||picks().length)return;
      const targets=act==='pool-conf'?[id]:act==='pool-major'?conferenceGroups[0].ids:Object.keys(conferenceNames);
      const turnOn=act==='pool-conf'?!poolDraftConfs.has(id):true;
      for(const confId of targets){
        if(turnOn)poolDraftConfs.add(confId);else poolDraftConfs.delete(confId);
        programs().filter(p=>String(p.conference_id)===confId).forEach(p=>{
          if(turnOn)poolDraftSchools.add(String(p.id));else poolDraftSchools.delete(String(p.id));
        });
      }
      poolDirty=true;render();return;
    }
    if(act==='pool-school'){
      initPoolDraft();if(league.settings.draft_status!=='pending'||picks().length)return;
      if(poolDraftSchools.has(id))poolDraftSchools.delete(id);else poolDraftSchools.add(id);
      poolDirty=true;renderPoolPreservingScroll();return;
    }
    if(act==='pool-scope'){poolScope=id;poolShown=70;render();return;}
    if(act==='pool-more'){poolShown+=70;updatePoolList();return;}
    if(act==='pool-add-visible'||act==='pool-remove-visible'){
      initPoolDraft();if(league.settings.draft_status!=='pending'||picks().length)return;
      poolVisible().forEach(p=>{
        if(act==='pool-add-visible')poolDraftSchools.add(String(p.id));else poolDraftSchools.delete(String(p.id));
      });
      poolDirty=true;render();return;
    }
    if(act==='pool-reset'){resetPoolDraft();render();return;}
    if(act==='load-programs'){programShown+=36;filterPrograms();return;}
    if(act==='directory-conference'){programConference=id;programLetter='all';programShown=36;render();filterPrograms();return;}
    if(act==='directory-ownership'){programOwnership=id;programShown=36;render();filterPrograms();return;}
    if(act==='directory-letter'){programLetter=id;programShown=36;render();filterPrograms();return;}
    if(act==='draft-history-retry'){schoolLeadersError='';schoolLeaders=null;loadSchoolLeaders();return;}
    if(act==='draft-pool-sort'){draftSort=id;draftShown=30;render();return;}
    if(act==='draft-pool-scope'){draftScope=id;draftShown=30;render();root.querySelector('#draft-pool-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(act==='draft-pool-more'){draftShown+=30;filterDraftPool();return;}
    if(act==='draft-queue-up'||act==='draft-queue-down'){
      moveDraftQueue(id,act==='draft-queue-up'?-1:1);return;
    }
    if(act==='draft-compare-toggle'){draftCompareExpanded=!draftCompareExpanded;render();return;}
    if(act==='draft-queue-collapse'){draftQueueExpanded=!draftQueueExpanded;render();return;}
    if(act==='draft-jump-queue'){
      draftQueueExpanded=true;render();
      root.querySelector('#draft-queue-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
    if(act==='draft-jump-pool'){root.querySelector('#draft-pool-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(act==='draft-follow-live'){draftRoundView='current';render();root.querySelector('#draft-board-section')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(act==='draft-select'){
      if(!draftAvailable().some(p=>String(p.id)===String(id))){notice('That program is no longer available.',true);await refresh(true);return;}
      draftSelectedProgram=String(id);render();
      if(!(window.matchMedia?.('(max-width:850px)').matches))root.querySelector('.draft-pick-desk')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      return;
    }
    if(act==='draft-clear-selection'){draftSelectedProgram='';render();return;}
    if(act==='draft-queue-toggle'){
      prepareDraftQueue();
      const programId=String(id),index=draftWatchlist.indexOf(programId);
      if(index>=0)draftWatchlist.splice(index,1);
      else if(draftAvailable().some(p=>String(p.id)===programId)){
        if(draftWatchlist.length>=120){notice('The draft queue holds up to 120 schools.',true);return;}
        const wasEmpty=draftWatchlist.length===0;
        draftWatchlist.push(programId);
        if(wasEmpty)draftQueueExpanded=true;
      }
      draftWatchlist=draftWatchlist.slice(0,120);
      storeDraftQueue();render();return;
    }
    if(act==='draft-history-toggle'){showAllDraft=!showAllDraft;render();return;}
    if(act==='draft-board-mode'){draftRoundView=button.dataset.mode;render();return;}
    if(act==='results-date'){resultsSelectedDay=button.dataset.date;resultsShown=40;loadResults();return;}
    if(act==='results-shift'){resultsSelectedDay=shiftResultsDay(resultsSelectedDay||resultsToday(),Number(button.dataset.dir));resultsShown=40;loadResults();return;}
    if(act==='results-today'){resultsSelectedDay=resultsToday();resultsShown=40;loadResults();return;}
    if(act==='results-scope'){resultsScope=button.dataset.scope;resultsShown=40;render();return;}
    if(act==='results-status'){resultsStatusFilter=id;resultsShown=40;render();return;}
    if(act==='results-clear-filters'){
      resultsScope='league';resultsStatusFilter='all';resultsConference='all';resultsSearch='';resultsShown=40;
      render();return;
    }
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
    if(act==='logout'){passwordResetReceipt=null;await api('logout',{});forgetSignedInToken();me=null;league=null;inviteLink='';await loadPublic();renderAuth();return;}
    if(busy)return;
    busy=true;
    try{
      if(act==='results-import-day'){
        const result=await api('admin/data/sync',{date:resultsSelectedDay||resultsToday()});
        notice('Imported '+result.matched+' games from '+result.date+'.');
        await loadResults();busy=false;return;
      }
      if(act==='data-integrity-scan'){
        const result=await api('admin/data/integrity-scan',{});
        notice('Scan complete · '+Number(result.report?.critical_count||0)+' critical, '+Number(result.report?.warning_count||0)+' warnings.');
        await loadIntegrity(true);
      }else if(act==='data-repair-interrupted'){
        if(!window.confirm('Retry up to two interrupted ESPN import dates and keep an audit trail?')){busy=false;return;}
        const result=await api('admin/data/repair-interrupted',{});
        const failed=(result.results||[]).filter(x=>!x.ok);
        notice('Retried '+Number(result.attempted||0)+' dates'+(failed.length?' · '+failed.length+' errors':''),failed.length>0);
        await Promise.all([loadResults(),loadIntegrity(true)]);
      }else if(act==='data-verify-scoring'){
        scoringAudit=await api('admin/data/verify-scoring',{});
        notice(scoringAudit.valid?'Scoring verification passed.':'Scoring verification found exceptions.',!scoringAudit.valid);
        render();
      }else if(act==='data-sync'){
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
      }else if(act==='data-health-refresh'){await Promise.all([loadResults(),loadIntegrity(true)]);notice('Data status refreshed.');
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
      }else if(act==='race-start'){
        if(me.role!=='commissioner')throw new Error('Only the commissioner can start the race.');
        if(!window.confirm('Start the official race now? The current commissioner-set draft order will become final and all managers can replay it.')){busy=false;return;}
        await api('admin/race/run',{});
        notice('Race started. The draft order is now final.');
      }else if(act==='race-reset'){
        if(me.role!=='commissioner')throw new Error('Commissioner access required.');
        if(!window.confirm('Reset the official race and restore signup order? All managers will lose the current replay. This is only allowed before drafting begins.')){busy=false;return;}
        await api('admin/race/reset',{});
        if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(raceFrame);
        raceState={phase:'idle',id:'',order:[],progress:{},run:raceState.run+1};
        draftOrderPreview=[];
        notice('Race reset. You can configure and run a new official race.');
      }else if(act==='save-draft-order'){
        await api('admin/draft-order',{order:draftOrderPreview});
        notice('Draft order saved.');
      }else if(act==='save-rounds'){
        await api('admin/settings',{rounds:Number(v('#rounds')),conferences:activeConfs()});
        notice('Draft rounds saved.');
      }else if(act==='trade-propose'){
        const give_ids=[...document.querySelectorAll('input[name="trade-give"]:checked')].map(x=>x.value);
        const receive_ids=[...document.querySelectorAll('input[name="trade-receive"]:checked')].map(x=>x.value);
        const give_picks=[...document.querySelectorAll('input[name="trade-give-pick"]:checked')].map(x=>Number(x.value));
        const receive_picks=[...document.querySelectorAll('input[name="trade-receive-pick"]:checked')].map(x=>Number(x.value));
        if(!(give_ids.length+give_picks.length)||!(receive_ids.length+receive_picks.length))
          throw Error('Select at least one asset from both teams.');
        if(!window.confirm('Send this offer? The other manager must accept before picks or programs move.')){busy=false;return;}
        await api('trade/propose',{to_manager_id:tradeTargetId,give_ids,receive_ids,give_picks,receive_picks});
        notice('Trade offer sent.');
      }else if(act==='trade-accept'){
        if(!window.confirm('Accept this trade? All included draft picks and programs will transfer immediately.')){busy=false;return;}
        await api('trade/respond',{trade_id:id,mode:'accept'});notice('Trade accepted. Pick and program ownership updated.');
      }else if(act==='trade-decline'){
        await api('trade/respond',{trade_id:id,mode:'decline'});notice('Trade declined.');
      }else if(act==='trade-cancel'){
        await api('trade/cancel',{trade_id:id});notice('Trade offer cancelled.');
      }else if(act==='save-pool'){
        initPoolDraft();
        if(!poolDraftSchools.size)throw new Error('Select at least one program.');
        const conferences=[...poolDraftConfs];
        const included=programs().filter(p=>poolDraftSchools.has(String(p.id))&&!poolDraftConfs.has(String(p.conference_id))).map(p=>String(p.id));
        const excluded=programs().filter(p=>!poolDraftSchools.has(String(p.id))&&poolDraftConfs.has(String(p.conference_id))).map(p=>String(p.id));
        await api('admin/settings',{conferences,included_programs:included,excluded_programs:excluded,rounds:league.settings.rounds});
        poolDraftConfs=null;poolDraftSchools=null;poolDirty=false;
        schoolLeaders=null;programResultCache={};standingsFetchedAt=0;notice('Eligible program pool saved.');
      }else if(act==='admin-reset-member-password'){
        if(me.role!=='commissioner')throw new Error('Commissioner access required.');
        const target=members().find(u=>String(u.id)===String(id));
        if(!target||target.role!=='manager')throw new Error('Select a manager account.');
        if(!window.confirm('Reset @'+target.username+'? Their current password will stop working and all their devices will be signed out.'))return;
        passwordResetReceipt=null;
        const result=await api('admin/member/reset-password',{manager_id:String(target.id)});
        passwordResetReceipt={username:result.username,display_name:result.display_name,temporary_password:result.temporary_password};
        render();
        notice('Temporary password generated for @'+result.username+'. Copy it before leaving this page.');
        return;
      }else if(act==='copy-reset-password'){
        if(!passwordResetReceipt)throw new Error('No temporary password is available. Reset the manager again.');
        await navigator.clipboard.writeText(passwordResetReceipt.temporary_password);
        notice('Temporary password copied. Share it privately.');
        return;
      }else if(act==='dismiss-reset-password'){
        passwordResetReceipt=null;render();return;
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
      }else if(act==='draft-confirm'){
        const programId=String(id),school=draftAvailable().find(p=>String(p.id)===programId);
        if(draftSelectedProgram!==programId||!school)throw Error('Select an available program again.');
        if(!isMyTurn())throw Error('It is not currently your draft pick. Refresh the draft room.');
        await api('draft/pick',{program_id:programId});
        draftSelectedProgram='';
        draftWatchlist=draftWatchlist.filter(saved=>saved!==programId);
        storeDraftQueue();
        notice('Pick confirmed: '+school.name+' is yours.');
        current='draft';
      }else if(act==='pick'){
        if(!window.confirm('Draft this program? The selection is permanent until commissioner reset.')){busy=false;return;}
        await api('draft/pick',{program_id:id});notice('Program drafted successfully.');
        draftSelectedProgram='';
        current='draft';
      }else if(act==='sync'){
        const selected=activeConfs().slice();
        if(!selected.length)throw Error('No enabled conferences to resync.');
        if(!window.confirm('Import programs for '+selected.length+' conferences? This may take several moments.')){busy=false;return;}
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
  // HTML drag and drop is available on desktop; large, native ↑/↓ buttons
  // provide reliable reorder controls for touch devices and keyboard users.
  const clearDraftDragMarkers=()=>{
    root.querySelectorAll('.draft-queue-row.dragging, .draft-queue-row.drop-before, .draft-queue-row.drop-after')
      .forEach(row=>row.classList.remove('dragging','drop-before','drop-after'));
  };
  const clearDraftDropMarkers=()=>{
    root.querySelectorAll('.draft-queue-row.drop-before, .draft-queue-row.drop-after')
      .forEach(row=>row.classList.remove('drop-before','drop-after'));
  };
  root.addEventListener('dragstart',e=>{
    const handle=e.target.closest?.('.draft-queue-grip');
    if(!handle||current!=='draft')return;
    const id=String(handle.dataset.id);
    if(!draftWatchlist.includes(id)){e.preventDefault();return;}
    draftQueueDragging=id;
    if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}
    handle.closest('.draft-queue-row')?.classList.add('dragging');
  });
  root.addEventListener('dragover',e=>{
    if(!draftQueueDragging)return;
    const row=e.target.closest?.('.draft-queue-row');
    if(!row)return;
    e.preventDefault();
    if(e.dataTransfer)e.dataTransfer.dropEffect='move';
    clearDraftDropMarkers();
    const mid=row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;
    row.classList.add(e.clientY<mid?'drop-before':'drop-after');
  });
  root.addEventListener('drop',e=>{
    if(!draftQueueDragging)return;
    e.preventDefault();
    const row=e.target.closest?.('.draft-queue-row');
    const source=draftQueueDragging;draftQueueDragging='';
    if(!row){clearDraftDragMarkers();return;}
    const box=row.getBoundingClientRect();
    const after=e.clientY>=box.top+box.height/2;
    if(!insertDraftQueue(source,row.dataset.queueId,after))clearDraftDragMarkers();
  });
  root.addEventListener('dragend',()=>{
    draftQueueDragging='';clearDraftDragMarkers();
  });
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&draftSelectedProgram&&current==='draft'){
      draftSelectedProgram='';render();
    }
  });
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden){pingActivity(true);loadNotifications(true);}});
  document.addEventListener?.('keydown',e=>{
    if(!me||!league)return;
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')||e.target?.isContentEditable;
    if(((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')||(!typing&&!globalSearchOpen&&e.key==='/')){
      e.preventDefault();toggleGlobalSearch(true);return;
    }
    if(globalSearchOpen&&e.key==='Escape'){e.preventDefault();toggleGlobalSearch(false);return;}
    if(globalSearchOpen&&e.key==='ArrowDown'&&e.target?.id==='global-search-input'){
      e.preventDefault();root.querySelector('.global-search-result')?.focus();return;
    }
    if(globalSearchOpen&&(e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target?.closest?.('.global-search-result')){
      const buttons=[...root.querySelectorAll('.global-search-result')];
      const index=buttons.indexOf(e.target.closest('.global-search-result'));
      const next=Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)));
      if(buttons[next]){e.preventDefault();buttons[next].focus();}
      return;
    }
    if(globalSearchOpen&&e.key==='Enter'&&e.target?.id==='global-search-input'){
      e.preventDefault();root.querySelector('.global-search-result')?.click();return;
    }
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
      }else if(type==='program'){await api('admin/program',data);poolDraftConfs=null;poolDraftSchools=null;poolDirty=false;notice('Program added to pool.');await refresh(true);}
      else{
        data.remember_device=!!form.querySelector('[name="remember_device"]')?.checked;
        const res=await api(type==='login'?'login':type==='join'?'join':'setup',data);
        if(!res.token)throw new Error('Unable to establish a session. Try signing in again.');
        saveSignedInToken(res.token,data.remember_device);
        selectedInvite='';
        if(location.search&&!new URLSearchParams(location.search).has('verify_email'))history.replaceState({},'',location.pathname);
        me=res.user;await refresh();
        startPolling();
        notice(data.remember_device?'Signed in. This device will be remembered.':'Signed in for this browser session.');
        if(me?.role==='commissioner')autoImportPrograms();
        loadNotifications(true);verifyPendingNotificationEmail();
      }
    }catch(err){notice(err.message,true);}finally{busy=false;}
  });
  root.addEventListener('change',async e=>{
    if(e.target?.id==='activity-range'){activityRange=e.target.value;activitySnapshot=null;activityFetchedAt=0;render();return;}
    if(e.target?.id==='activity-member'){activityMemberFilter=e.target.value;render();return;}
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
    if(e.target?.id==='pool-conf-filter'){poolConferenceFilter=e.target.value;poolShown=70;render();return;}
    if(e.target?.id==='trade-target'){tradeTargetId=e.target.value;render();}
    if(e.target?.id==='program-conference'){programConference=e.target.value;programLetter='all';programShown=36;render();filterPrograms();}
    if(e.target?.id==='program-ownership'){programOwnership=e.target.value;programShown=36;render();filterPrograms();}
    if(e.target?.id==='directory-sort'){programSort=e.target.value;programShown=36;render();filterPrograms();}
    if(e.target?.id==='leader-conference'){leaderConference=e.target.value;leaderShown=40;render();return;}
    if(e.target?.id==='rating-conference'){ratingConference=e.target.value;ratingShown=40;render();return;}
    if(e.target?.id==='history-season'){selectedHistorySeason=e.target.value;render();}
    if(e.target?.id==='draft-round'){draftRoundView=e.target.value;render();}
    if(e.target?.id==='draft-pool-conference'){draftConference=e.target.value;draftShown=30;filterDraftPool();}
    if(e.target?.id==='scoreboard-conference'){resultsConference=e.target.value;render();}
    if(e.target?.id==='scoreboard-date'){resultsSelectedDay=e.target.value;resultsShown=40;loadResults();}
    if(e.target?.matches?.('input[name="trade-give"], input[name="trade-receive"], input[name="trade-give-pick"], input[name="trade-receive-pick"]'))updateTradeSelections();
  });
  root.addEventListener('input',e=>{
    if(e.target?.id==='global-search-input'){globalSearchQuery=e.target.value;const list=root.querySelector('#global-search-list');if(list)list.innerHTML=globalSearchResults();return;}
    if(e.target?.id==='pool-search'){
      poolQuery=e.target.value;poolShown=70;updatePoolList();return;
    }
    if(e.target?.id==='daily-team-search'){
      resultsSearch=e.target.value;
      resultsShown=40;
      const caret=e.target.selectionStart;
      render();
      const field=root.querySelector('#daily-team-search');
      if(field){field.focus({preventScroll:true});if(caret!==null)field.setSelectionRange(caret,caret);}
      return;
    }
    if(e.target?.id==='leader-search'){leaderQuery=e.target.value;leaderShown=40;filterSchoolLeaders();return;}
    if(e.target?.id==='rating-search'){ratingQuery=e.target.value;ratingShown=40;filterRatings();return;}
    if(e.target?.id==='draft-pool-search'){draftQuery=e.target.value;draftShown=30;filterDraftPool();return;}
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