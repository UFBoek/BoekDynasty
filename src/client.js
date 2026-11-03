(function startApp(){
  const root=document.querySelector('#app');
  const ICONS={home:'⌂',programs:'▦',draft:'▤',league:'♙',commissioner:'⚙'};
  const names={home:'Overview',programs:'Programs',draft:'Draft Room',league:'League',commissioner:'Commissioner'};
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
  let inviteLink='', busy=false, syncActive=false, refreshId=null,toastId=null;
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
  const programOwned=(id)=>picks().find(p=>p.program_id===id);
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
  const heading=(eyebrow,title,desc)=>'<div class="eyebrow">'+eyebrow+'</div><h1 class="headline">'+title+'</h1><p class="intro-text">'+desc+'</p>';
  const panelHeading=(title,subtitle,action='')=>'<div class="panel-head"><div><h2>'+title+'</h2><p>'+subtitle+'</p></div>'+action+'</div>';
  const empty=(title,desc)=>'<div class="empty"><strong>'+title+'</strong><span>'+desc+'</span></div>';
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
      const next=await api('state');
      me=next.user;league=next;appError='';
      if(!silent)current='home';render();
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
    }catch(e){renderAuth();}
    if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  function renderAuth(){
    const mode=status.needs_setup?'setup':authMode;
    const header=mode==='login'?'Welcome back':mode==='join'?'Claim your team':'Commissioner setup';
    const desc=mode==='login'?'Sign in once, and your account stays remembered on this device.':mode==='join'?'Use your invitation to create the account for your fantasy franchise.':'Create the first owner account and unlock league settings.';
    const form=mode==='login'?'<form data-form="login">'+input('Username','username','text','Your username')+input('Password','password','password','Your password')+'<button class="btn" type="submit">Sign in →</button></form>':
      mode==='join'?'<form data-form="join">'+input('Invitation code','code','text','Invitation code',selectedInvite)+input('Display / team name','display_name','text','Boek Basketball')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Create a password')+'<button class="btn" type="submit">Create team account →</button></form>':
      '<form data-form="setup">'+input('Commissioner setup code','code','password','Code from your setup message')+input('Team name','display_name','text','Commissioner team')+input('Username','username','text','Your login username')+input('Password (8+ characters)','password','password','Create a password')+'<button class="btn" type="submit">Create commissioner account →</button></form>';
    root.innerHTML='<div class="auth-layout"><section class="auth-brand"><div class="brand"><span class="brand-icon">★</span><div><div class="brand-title">BOEK <span>DYNASTY</span></div><div class="brand-sub">COLLEGE BASKETBALL FANTASY</div></div></div><div class="auth-pill">2026–27 FANTASY SEASON</div><h1>Every program.<br><span>One champion.</span></h1><p>Draft entire college basketball programs, build your dynasty, and chase the season-long crown. No player lineups. Just schools and results.</p></section><section class="auth-panel"><div class="auth-card"><span class="eyebrow">LEAGUE ACCESS</span><h2>'+header+'</h2><p>'+desc+'</p><div class="auth-top">'+(!status.needs_setup?'<button data-act="auth-mode" data-mode="login" class="'+(mode==='login'?'active':'')+'">Sign in</button><button data-act="auth-mode" data-mode="join" class="'+(mode==='join'?'active':'')+'">Join with invite</button>':'<button class="active" disabled>First-time setup</button>')+'</div>'+form+(appError?'<p style="color:#f59da5;margin-top:15px">'+escapeHTML(appError)+'</p>':'')+'<div class="auth-tip">Private league · Up to 10 managers · Secure persistent sign-in<br/>Add this website to your phone home screen after signing in.</div></div></section></div>';
  }
  function input(label,name,type,placeholder,value=''){
    return '<div class="form-row"><label for="'+name+'">'+label+'</label><input class="field" id="'+name+'" name="'+name+'" type="'+type+'" placeholder="'+escapeHTML(placeholder)+'" value="'+escapeHTML(value)+'" required autocomplete="'+(name==='password'?'current-password':'on')+'"/></div>';
  }
  function navButton(id){
    return '<button data-act="tab" data-id="'+id+'" class="'+(current===id?'active':'')+'"><span>'+ICONS[id]+'</span>'+names[id]+'</button>';
  }
  function sidebar(){
    return '<aside class="sidebar"><div class="brand"><div class="brand-icon">★</div><div><div class="brand-title">BOEK <span>DYNASTY</span></div><div class="brand-sub">COLLEGE BASKETBALL FANTASY</div></div></div><div><div class="nav-label">LEAGUE WORKSPACE</div><nav class="nav">'+['home','programs','draft','league',...(me.role==='commissioner'?['commissioner']:[])].map(navButton).join('')+'</nav></div><div class="side-foot"><span class="season-pill">2026–27 SEASON</span><div class="account-mini">'+avatar(me)+'<div><strong>'+escapeHTML(me.display_name)+'</strong><div class="muted tiny">'+(me.role==='commissioner'?'Commissioner':'League manager')+'</div></div></div><button data-act="logout" class="logout">Sign out →</button></div></aside>';
  }
  function render(){
    if(!me||!league)return renderAuth();
    const isAdmin=me.role==='commissioner';
    if(current==='commissioner'&&!isAdmin)current='home';
    const tabs=['home','programs','draft','league',...(isAdmin?['commissioner']:[])];
    root.innerHTML='<div class="shell">'+sidebar()+'<main class="main"><header class="topbar"><span class="title">BOEK DYNASTY <span class="sep">/</span> '+names[current]+'</span><div class="top-right"><span class="chip">2026–27</span><div class="avatar-small">'+escapeHTML(initials(me.display_name))+'</div></div></header><section class="content">'+({home:overview,programs:programsPage,draft:draftPage,league:leaguePage,commissioner:commissionerPage}[current]||overview)()+'</section></main></div><nav class="bottom">'+tabs.map(id=>'<button class="'+(current===id?'active':'')+'" data-act="tab" data-id="'+id+'"><span>'+ICONS[id]+'</span>'+names[id].replace(' Room','')+'</button>').join('')+'</nav>';
  }
  function overview(){
    const owned=picks().filter(p=>p.manager_id===me.id).map(p=>programs().find(t=>t.id===p.program_id)).filter(Boolean);
    const selectedCount=programs().filter(p=>activeConfs().includes(p.conference_id)).length;
    return heading('2026–27 / SEASON-LONG LEAGUE','Your basketball <em>dynasty.</em>','Every school you draft belongs to your team for the full season. Standings will update after we set the scoring system.')
      +'<div class="hero"><div class="hero-copy"><span class="hero-tag">THE WHOLE PROGRAM. THE WHOLE SEASON.</span><h2>'+escapeHTML(me.display_name)+'</h2><p>'+(league.settings.draft_status==='live'?'The program draft is live. Check whose turn is next and make your selections.':league.settings.draft_status==='finished'?'Draft complete. Your roster is set for the season.':'Your league is being assembled. Explore eligible conferences and follow league setup.')+'</p><div class="section-gap"><button class="btn" data-act="tab" data-id="draft">Go to draft room →</button></div></div><div class="hero-badge">★</div></div>'
      +'<div class="metrics"><div class="metric"><span class="m-label">YOUR PROGRAMS</span><strong>'+owned.length+'</strong><span class="m-foot">Drafted schools</span></div><div class="metric"><span class="m-label">LEAGUE MANAGERS</span><strong>'+members().length+' <span style="font-size:14px;color:#9babc0">/ 10</span></strong><span class="m-foot">Up to ten teams</span></div><div class="metric"><span class="m-label">ELIGIBLE PROGRAMS</span><strong>'+fmt(selectedCount)+'</strong><span class="m-foot">'+activeConfs().length+' conferences selected</span></div><div class="metric"><span class="m-label">SCORING SYSTEM</span><strong style="font-size:24px">Pending</strong><span class="m-foot">To be decided</span></div></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('Your programs','Schools you own in the season-long draft','<button class="link-button" data-act="tab" data-id="draft">Draft room →</button>')+(owned.length?owned.map(p=>'<div class="rowline">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+conf(p.conference_id)+'</small></div><span class="status draft">ROSTERED</span></div>').join(''):empty('No programs drafted yet','Your drafted schools will appear here.'))+'</section><section class="panel">'+panelHeading('League leaderboard','Season-long fantasy standings')+leaderboard()+'</section></div>';
  }
  function leaderboard(){
    return '<table class="table"><thead><tr><th>RANK</th><th>MANAGER</th><th class="last">PROGRAMS</th></tr></thead><tbody>'+members().map((u,i)=>'<tr><td class="pos">'+(i+1)+'</td><td><strong>'+escapeHTML(u.display_name)+'</strong>'+(u.id===me.id?' <span class="muted tiny">(you)</span>':'')+'</td><td class="last">'+picks().filter(p=>p.manager_id===u.id).length+'</td></tr>').join('')+'</tbody></table><div class="hint section-gap">Listed in draft order. Rankings and points begin after scoring is defined.</div>';
  }
  function programCard(p,canPick){
    const owned=programOwned(p.id);
    const owner=members().find(u=>u.id===owned?.manager_id);
    return '<div class="program-card" data-search="'+escapeHTML((p.name+' '+conf(p.conference_id)).toLowerCase())+'">'+img(p)+'<div class="grow"><strong>'+escapeHTML(p.name)+'</strong><small>'+conf(p.conference_id)+'</small></div>'+(owned?'<span class="status draft">'+escapeHTML(owner?.display_name||'Drafted')+'</span>':'<button class="btn small secondary" data-act="pick" data-id="'+escapeHTML(p.id)+'" '+(!canPick?'disabled title="Draft available on your turn"':'')+'>Draft</button>')+'</div>';
  }
  function programsPage(){
    const eligible=programs().filter(p=>activeConfs().includes(p.conference_id)).sort((a,b)=>a.name.localeCompare(b.name));
    const available=eligible.filter(p=>!programOwned(p.id)).length;
    return heading('PROGRAM DIRECTORY','Find your next <em>powerhouse.</em>','The commissioner controls eligible conferences. Every program can be drafted by only one manager.')
      +'<div class="controls"><div><h2>'+eligible.length+' eligible programs</h2><p class="hint">'+available+' currently undrafted</p></div><input class="field search" type="search" id="program-search" placeholder="Search programs or conferences..." aria-label="Search programs"/></div>'
      +(eligible.length?'<div class="program-grid">'+eligible.map(p=>programCard(p,isMyTurn())).join('')+'</div>':empty('Program pool is not loaded','Your commissioner can select conferences and import their schools in Commissioner settings.'))
      +'<p class="hint section-gap">Conference rosters are imported separately from ESPN and should be reviewed for current membership. No scoring rules have been set.</p>';
  }
  function draftPage(){
    const statusText=league.settings.draft_status;
    const n=nextManager();
    const total=draftTotal();
    const round=Math.floor(picks().length/Math.max(1,members().length))+1;
    const owner=members().find(m=>m.id===n?.id);
    return heading('DRAFT HEADQUARTERS','Build your <em>program empire.</em>','An exclusive, shared draft where managers select entire NCAA basketball teams.')
      +'<div class="draft-info"><div><span class="eyebrow">'+(statusText==='live'?'● DRAFT LIVE':statusText==='finished'?'✓ DRAFT COMPLETED':'● DRAFT NOT STARTED')+'</span><strong>'+(statusText==='live'?'On the clock: '+escapeHTML(owner?.display_name||''):(statusText==='finished'?'The board is complete':'Waiting for the commissioner'))+'</strong><p>'+picks().length+' of '+total+' picks made · '+members().length+' managers · '+league.settings.rounds+' rounds</p><div class="draft-progress"><div style="width:'+((picks().length/Math.max(1,total))*100)+'%"></div></div></div><span class="status '+(statusText==='live'?'':'wait')+'">'+(statusText==='live'?'LIVE':statusText.toUpperCase())+'</span></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('Draft board','Picks are saved live for everyone')+(picks().length?[...picks()].reverse().map(p=>{const t=programs().find(t=>t.id===p.program_id),m=members().find(m=>m.id===p.manager_id);return '<div class="rowline"><span class="pos">'+p.overall+'</span>'+(t?img(t):'')+'<div class="grow"><strong>'+escapeHTML(t?.name||'Program')+'</strong><small>'+escapeHTML(m?.display_name||'Manager')+' · Round '+p.round+'</small></div></div>'}).join(''):empty('No draft picks yet','The draft board fills when your commissioner starts the draft.'))+'</section><section class="panel">'+panelHeading('Draft order','Snake format, alternating each round')+order().map((id,i)=>{const u=members().find(m=>m.id===id);return u?'<div class="manager-card"><span class="pos">'+(i+1)+'</span>'+avatar(u)+'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>'+escapeHTML(u.username)+'</small></div>'+(id===me.id?'<span class="status">YOU</span>':'')+'</div>':''}).join('')+'<div class="notice section-gap">Draft picks are permanent until the commissioner resets the draft. No points are calculated yet.</div></section></div>'
      +(statusText==='live'?'<div class="button-row section-gap"><button class="btn" data-act="tab" data-id="programs">'+(isMyTurn()?'Make your pick →':'Browse eligible schools →')+'</button></div>':'');
  }
  function leaguePage(){
    return heading('YOUR FANTASY LEAGUE','The whole <em>league.</em>','Up to 10 managers. One collection of college basketball programs. One season-long champion.')
      +'<div class="metrics"><div class="metric"><span class="m-label">MANAGERS</span><strong>'+members().length+' / 10</strong><span class="m-foot">Registered team owners</span></div><div class="metric"><span class="m-label">CONFERENCES</span><strong>'+activeConfs().length+'</strong><span class="m-foot">Eligible for draft</span></div><div class="metric"><span class="m-label">DRAFT FORMAT</span><strong style="font-size:22px">Snake</strong><span class="m-foot">'+league.settings.rounds+' rounds</span></div><div class="metric"><span class="m-label">COMPETITION</span><strong style="font-size:22px">Season-long</strong><span class="m-foot">No head-to-head matchups</span></div></div>'
      +'<div class="grid2"><section class="panel">'+panelHeading('League members',members().length+' registered · '+(10-members().length)+' slots open')+members().map(u=>'<div class="manager-card">'+avatar(u)+'<div class="grow"><strong>'+escapeHTML(u.display_name)+'</strong><small>@'+escapeHTML(u.username)+'</small></div>'+(u.role==='commissioner'?'<span class="status wait">COMMISH</span>':'')+'</div>').join('')+'</section><section class="panel">'+panelHeading('Eligible conferences','Selected by your commissioner')+(activeConfs().length?activeConfs().map(id=>'<div class="rowline"><span class="grow"><strong>'+escapeHTML(conf(id))+'</strong></span><span class="right">'+programs().filter(p=>p.conference_id===id).length+' teams</span></div>').join(''):empty('No conferences selected','The commissioner will configure the eligible draft pool.'))+'</section></div>';
  }
  function commissionerPage(){
    if(me.role!=='commissioner')return '';
    const disabled=picks().length>0||league.settings.draft_status==='live'||league.settings.draft_status==='finished';
    const confs=conferenceGroups.map(group=>'<h3 class="subhead section-gap">'+group.name+'</h3><div class="conf-grid">'+group.ids.map(id=>'<label class="conf-item"><input type="checkbox" name="conference" value="'+id+'" '+(activeConfs().includes(id)?'checked':'')+' '+(disabled?'disabled':'')+'/><span>'+conf(id)+'</span><small class="muted">'+programs().filter(p=>p.conference_id===id).length+'</small></label>').join('')+'</div>').join('');
    return heading('COMMISSIONER CONTROL','Run the <em>league.</em>','Manage sign-ups, select eligible conferences and prepare the shared program draft.')
      +'<div class="grid2 section-gap"><section class="panel">'+panelHeading('Draft pool settings','Choose which conferences are available')+'<div class="notice">Conference membership has changed for 2026–27. Sync your chosen conferences, then review the schools before the draft.</div>'+confs+'<div class="form-row section-gap"><label>Rounds per manager</label><input class="field" id="rounds" type="number" min="1" max="20" value="'+league.settings.rounds+'" '+(disabled?'disabled':'')+'/></div><div class="button-row"><button class="btn" data-act="save-confs" '+(disabled?'disabled':'')+'>Save draft pool</button><button class="btn secondary" data-act="sync" '+(syncActive?'disabled':'')+'>Import selected programs</button></div><p class="hint section-gap">Program imports use an unofficial ESPN team endpoint and may need corrections. You can add missing teams manually below.</p></section>'
      +'<section class="panel">'+panelHeading('Member invitations','Invite up to 9 other managers')+'<p class="hint">'+members().length+' of 10 manager slots filled. Invitation codes expire after 7 days and can only be used once.</p><div class="button-row section-gap"><button class="btn" data-act="invite" '+(members().length>=10?'disabled':'')+'>Generate invite link</button></div>'+(inviteLink?'<div class="notice section-gap"><div style="overflow-wrap:anywhere">'+escapeHTML(inviteLink)+'</div><button class="btn small secondary section-gap" data-act="copy-invite">Copy invite link</button></div>':'')+'<hr style="border:0;border-top:1px solid #2c3951;margin:25px 0"/>'+panelHeading('Draft controls','Shared snake draft · all picks persist')+'<p class="hint">You can start after inviting everyone and importing enough eligible programs. Draft order follows signup order.</p><div class="button-row section-gap"><button class="btn" data-act="start" '+(league.settings.draft_status==='live'||league.settings.draft_status==='finished'?'disabled':'')+'>Start / resume draft</button><button class="btn secondary" data-act="pause" '+(league.settings.draft_status!=='live'?'disabled':'')+'>Pause draft</button><button class="btn danger" data-act="reset">Reset picks</button></div><hr style="border:0;border-top:1px solid #2c3951;margin:25px 0"/>'+panelHeading('Add a missing program','Manual corrections to the eligible pool')+'<form data-form="program">'+input('Program name','name','text','University or school name')+input('Abbreviation','abbr','text','e.g. UF')+'<div class="form-row"><label>Conference</label><select class="field" name="conference_id">'+activeConfs().map(id=>'<option value="'+id+'">'+conf(id)+'</option>').join('')+'</select></div><button class="btn secondary" type="submit">Add program</button></form></section></div>';
  }
  async function action(button){
    const act=button.dataset.act,id=button.dataset.id;
    if(act==='tab'){current=id;render();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(act==='auth-mode'){authMode=button.dataset.mode;renderAuth();return;}
    if(act==='logout'){await api('logout',{});me=null;league=null;inviteLink='';await loadPublic();renderAuth();return;}
    if(busy)return;
    busy=true;
    try{
      if(act==='save-confs'){
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
        notice('Signed in. Your device will remember this account.');
      }
    }catch(err){notice(err.message,true);}finally{busy=false;}
  });
  root.addEventListener('input',e=>{
    if(e.target?.id!=='program-search')return;
    const query=e.target.value.trim().toLowerCase();
    document.querySelectorAll('.program-card[data-search]').forEach(item=>{item.style.display=item.dataset.search.includes(query)?'':'none';});
  });
  boot();
})();