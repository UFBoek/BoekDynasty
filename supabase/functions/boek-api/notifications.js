import {allowedPushEndpoint,vapidKeys,deliverWebPush} from './push.js';

const now=()=>Math.floor(Date.now()/1000);
const utf8=new TextEncoder();
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const hash=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(value))));
const fail=(message,status=400)=>Response.json({error:message},{status});
const ok=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
const safeBody=(body)=>String(body||'').trim().slice(0,1200);
const category=kind=>kind.startsWith('trade_')?'trades':kind.startsWith('draft_')?'draft':kind==='announcement'?'announcements':null;
const categories=['trades','draft','announcements'];
const boolFields=['trades','draft','announcements','push_enabled','email_enabled'];
// Match the authoritative draft order in server.js: rounds 2 and 3 reverse,
// round 4 moves forward, then alternate for the remainder of the 3RR draft.
const reversedDraftRound=round=>round===2||(round>=3&&round%2===1);
const originalPickOwner=(slot,order)=>{
  if(slot<1||!order.length)return null;
  const round=Math.floor((slot-1)/order.length)+1,index=(slot-1)%order.length;
  return order[reversedDraftRound(round)?order.length-1-index:index]||null;
};
const EMAIL_ADDRESS=/^[^\s@<>]{1,64}@[^\s@<>]{1,150}\.[A-Za-z]{2,}$/;
const encode=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const emailConfig=()=>Boolean(Deno.env.get('RESEND_API_KEY')&&Deno.env.get('NOTIFICATION_EMAIL_FROM'));
async function sendEmail(to,subject,body,url){
  if(!emailConfig())return false;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
    Authorization:'Bearer '+Deno.env.get('RESEND_API_KEY'),'Content-Type':'application/json'
  },body:JSON.stringify({from:Deno.env.get('NOTIFICATION_EMAIL_FROM'),to:[to],subject,
    html:'<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>'+encode(subject)+'</h2><p>'+
      encode(body)+'</p><p><a href="'+encode(url)+'">Open CBB Dynasty</a></p></div>'}),signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error('Email provider HTTP '+res.status);
  return true;
}
export function createNotificationEngine(db){
  const getPrefs=async id=>(await db.prepare('SELECT trades,draft,announcements,push_enabled,email_enabled,email_address,email_verified_at FROM cbb_notification_preferences WHERE user_id=?')
    .bind(id).first())||{trades:true,draft:true,announcements:true,push_enabled:true,
      email_enabled:false,email_address:null,email_verified_at:null};
  const allMembers=async()=>(await db.prepare('SELECT id,display_name FROM users ORDER BY created_at,id').all()).results||[];
  const globalEnabled=async kind=>{
    const field=category(kind);
    if(!field)return true;
    const setting=(await db.prepare('SELECT value FROM settings WHERE key=?').bind('notify_'+field).first())?.value;
    return setting!=='0';
  };
  async function deliver(notificationId){
    const n=await db.prepare('SELECT id,user_id,kind,title,body,target FROM cbb_notifications WHERE id=?').bind(notificationId).first();
    if(!n)return false;
    const pref=await getPrefs(n.user_id),errors=[];
    if(pref.push_enabled){
      const devices=(await db.prepare('SELECT endpoint,p256dh,auth_secret FROM cbb_push_devices WHERE user_id=? LIMIT 8')
        .bind(n.user_id).all()).results||[];
      if(devices.length){
        try{
          const keys=await vapidKeys(db);
          const unread=(await db.prepare('SELECT count(*) AS n FROM cbb_notifications WHERE user_id=? AND read_at IS NULL')
            .bind(n.user_id).first())?.n||0;
          const payload={title:n.title,body:n.body,kind:n.kind,url:'/?notifications=1',tag:String(n.id),
            badge:Number(unread)};
          await Promise.all(devices.map(async device=>{
            try{
              await deliverWebPush(keys,device,payload);
              await db.prepare('UPDATE cbb_push_devices SET last_delivered_at=?,last_error=NULL WHERE endpoint=?')
                .bind(now(),device.endpoint).run();
            }catch(error){
              if([404,410].includes(error.status))await db.prepare('DELETE FROM cbb_push_devices WHERE endpoint=?').bind(device.endpoint).run();
              else{
                errors.push(String(error.message||error).slice(0,90));
                await db.prepare('UPDATE cbb_push_devices SET last_error=? WHERE endpoint=?')
                  .bind(String(error.message||error).slice(0,120),device.endpoint).run();
              }
            }
          }));
        }catch(error){errors.push(String(error.message||error).slice(0,90));}
      }
    }
    if(pref.email_enabled&&pref.email_address&&pref.email_verified_at&&emailConfig()){
      try{await sendEmail(pref.email_address,n.title,n.body,'https://boek-dynasty.fig-league-archive.workers.dev/');}
      catch(error){errors.push(String(error.message||error).slice(0,90));}
    }
    await db.prepare('UPDATE cbb_notification_outbox SET attempts=attempts+1,processed_at=?,last_error=? WHERE notification_id=?')
      .bind(errors.length?null:now(),errors.length?errors.join(' | ').slice(0,250):null,n.id).run();
    return !errors.length;
  }
  async function emit(userId,kind,title,body,target='notifications',referenceId=null){
    if(!await globalEnabled(kind))return null;
    const pref=await getPrefs(userId),group=category(kind);
    if(group&&!pref[group])return null;
    const result=await db.prepare('INSERT INTO cbb_notifications(user_id,kind,title,body,target,reference_id) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id')
      .bind(userId,kind,title.slice(0,140),safeBody(body),target,referenceId).first();
    if(!result?.id)return null;
    await db.prepare('INSERT INTO cbb_notification_outbox(notification_id) VALUES(?) ON CONFLICT DO NOTHING')
      .bind(result.id).run();
    await deliver(result.id);
    return result.id;
  }
  async function fanout(kind,title,body,excludeId=null,referenceId=null,target='notifications'){
    const members=await allMembers();
    return Promise.allSettled(members.filter(m=>m.id!==excludeId).map(m=>
      emit(m.id,kind,title,body,target,referenceId)));
  }
  async function flush(limit=10){
    const ids=(await db.prepare('SELECT notification_id FROM cbb_notification_outbox WHERE processed_at IS NULL AND attempts<5 ORDER BY notification_id LIMIT ?')
      .bind(Math.min(30,Math.max(1,Number(limit)||10))).all()).results||[];
    const results=await Promise.allSettled(ids.map(n=>deliver(n.notification_id)));
    return {examined:ids.length,delivered:results.filter(x=>x.status==='fulfilled'&&x.value===true).length};
  }
  async function onMutation(path,actor,body,response){
    if(!actor)return;
    const name=actor.display_name||'A manager';
    if(path==='trade/propose'){
      const id=(await response.clone().json())?.id||null;
      const recipient=String(body.to_manager_id||'');
      if(id&&recipient)await emit(recipient,'trade_offer','New trade offer',name+' sent you a trade offer.','trades','trade:'+id);
    }else if(path==='trade/respond'){
      const mode=String(body.mode||''),id=String(body.trade_id||'');
      const trade=await db.prepare('SELECT from_manager_id,to_manager_id FROM trades WHERE id=?').bind(id).first();
      if(trade&&trade.to_manager_id===actor.id)
        await emit(trade.from_manager_id,mode==='accept'?'trade_accepted':'trade_declined',
          mode==='accept'?'Trade accepted':'Trade declined',
          name+(mode==='accept'?' accepted':' declined')+' your trade offer.','trades',mode+':'+id);
      if(mode==='accept')await notifyCurrentPick('trade:'+id);
    }else if(path==='trade/cancel'){
      const id=String(body.trade_id||''),trade=await db.prepare('SELECT from_manager_id,to_manager_id FROM trades WHERE id=?').bind(id).first();
      if(trade&&trade.from_manager_id===actor.id)
        await emit(trade.to_manager_id,'trade_cancelled','Trade offer cancelled',name+' cancelled a trade offer.','trades','cancel:'+id);
    }else if(path==='draft/pick'){
      const overall=Number((await response.clone().json())?.overall||0);
      if(overall>0)await notifyCurrentPick('pick:'+overall);
    }else if(path==='admin/draft-control'&&body.mode==='start'){
      const count=Number((await db.prepare('SELECT count(*) AS n FROM picks').first())?.n||0);
      await fanout('draft_start','The draft is live',
        count?'The commissioner resumed the dynasty draft.':'The inaugural CBB Dynasty draft has started.',
        null,'start:'+count,'draft');
      await notifyCurrentPick('start:'+count);
    }
  }
  async function notifyCurrentPick(trigger){
    const rows=(await db.prepare("SELECT key,value FROM settings WHERE key IN ('draft_status','draft_order','rounds')").all()).results||[];
    const settings=Object.fromEntries(rows.map(r=>[r.key,r.value]));
    if(settings.draft_status==='finished'){
      await fanout('draft_finished','Draft complete','All inaugural dynasty draft selections are in.',null,'draft-finished','draft');
      return;
    }
    if(settings.draft_status!=='live')return;
    const picks=Number((await db.prepare('SELECT count(*) AS n FROM picks').first())?.n||0);
    const members=await allMembers();
    const saved=JSON.parse(settings.draft_order||'[]');
    const order=[...new Set([...saved.filter(id=>members.some(m=>m.id===id)),...members.map(m=>m.id)])];
    const rounds=Number(settings.rounds||0),total=order.length*rounds;
    if(!Number.isInteger(rounds)||rounds<1||order.length<2||picks>=total)return;
    const ownerFor=async slot=>{
      const changed=await db.prepare('SELECT owner_manager_id FROM draft_pick_owners WHERE overall=?').bind(slot).first();
      return changed?.owner_manager_id||originalPickOwner(slot,order);
    };
    const slot=picks+1,owner=await ownerFor(slot);
    if(!owner)return;
    // Unique (user_id,kind,reference_id) makes retries and scheduled checks safe.
    await emit(owner,'draft_turn',"You're on the clock!",'Pick #'+slot+' is yours. Make your program selection.','draft','turn:'+slot);
    const soonSlot=slot+1;
    if(soonSlot<=total){
      const soonOwner=await ownerFor(soonSlot);
      // Do not tell someone already on the clock that their consecutive pick is "up next".
      if(soonOwner&&soonOwner!==owner)
        await emit(soonOwner,'draft_soon',"You're up next!",'Pick #'+soonSlot+' is one pick away. Get ready to draft.','draft','soon:'+soonSlot);
    }
  }
  async function route(subpath,request,actor,original){
    const method=request.method;
    if(!actor)return fail('Sign in required.',401);
    const id=actor.id;
    const body=method==='POST'?await request.json().catch(()=>null):null;
    if(method==='GET'&&subpath==='notifications/inbox'){
      const [rows,pref,devices,keys]=await Promise.all([
        db.prepare('SELECT id,kind,title,body,target,created_at,read_at FROM cbb_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 90')
          .bind(id).all(),getPrefs(id),
        db.prepare('SELECT endpoint,created_at,last_delivered_at,last_error FROM cbb_push_devices WHERE user_id=? ORDER BY updated_at DESC').bind(id).all(),
        vapidKeys(db)
      ]);
      const notifications=rows.results||[];
      return ok({notifications,unread:notifications.filter(n=>!n.read_at).length,
        preferences:pref,devices:devices.results||[],public_key:keys.public_key,
        email_available:emailConfig()});
    }
    if(method==='POST'&&subpath==='notifications/read'){
      const selected=body?.id;
      if(selected==='all'){
        await db.prepare('UPDATE cbb_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').bind(now(),id).run();
      }else if(typeof selected==='string'&&/^[0-9a-f-]{36}$/i.test(selected)){
        await db.prepare('UPDATE cbb_notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL')
          .bind(now(),selected,id).run();
      }else return fail('Choose a valid notification.');
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/preferences'){
      if(!body||typeof body!=='object'||boolFields.some(key=>typeof body[key]!=='boolean'))
        return fail('Invalid notification preferences.');
      await db.prepare(`INSERT INTO cbb_notification_preferences(user_id,trades,draft,announcements,push_enabled,email_enabled)
        VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET trades=excluded.trades,draft=excluded.draft,
        announcements=excluded.announcements,push_enabled=excluded.push_enabled,email_enabled=excluded.email_enabled`)
        .bind(id,...boolFields.map(k=>body[k])).run();
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/subscribe'){
      const sub=body?.subscription,endpoint=String(sub?.endpoint||'');
      const keys=sub?.keys||{};
      if(!allowedPushEndpoint(endpoint)||!/^[A-Za-z0-9_-]{80,110}$/.test(String(keys.p256dh||''))||
        !/^[A-Za-z0-9_-]{20,32}$/.test(String(keys.auth||'')))
        return fail('Invalid browser push subscription.');
      await db.prepare(`INSERT INTO cbb_push_devices(endpoint,user_id,p256dh,auth_secret,user_agent,updated_at)
        VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,
        auth_secret=excluded.auth_secret,user_agent=excluded.user_agent,updated_at=excluded.updated_at,last_error=NULL`)
        .bind(endpoint,id,keys.p256dh,keys.auth,String(body.user_agent||'').slice(0,180),now()).run();
      await db.prepare(`DELETE FROM cbb_push_devices WHERE endpoint IN
        (SELECT endpoint FROM cbb_push_devices WHERE user_id=? ORDER BY updated_at DESC OFFSET 6)`).bind(id).run();
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/unsubscribe'){
      const endpoint=String(body?.endpoint||'');
      if(!allowedPushEndpoint(endpoint))return fail('Invalid subscription.');
      await db.prepare('DELETE FROM cbb_push_devices WHERE user_id=? AND endpoint=?').bind(id,endpoint).run();
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/test'){
      await emit(id,'test','CBB Dynasty test notification','Push notifications are ready for this device.','notifications',crypto.randomUUID());
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/email/request'){
      if(!emailConfig())return fail('Email delivery needs a verified sender and an email provider configured by the site administrator.',503);
      const email=String(body?.email||'').trim().toLowerCase();
      if(!EMAIL_ADDRESS.test(email)||email.length>190)return fail('Enter a valid email address.');
      const existing=await db.prepare('SELECT expires_at FROM cbb_notification_email_verification WHERE user_id=?').bind(id).first();
      if(existing&&Number(existing.expires_at)>now()+840)return fail('A verification link was just sent. Check your inbox.',429);
      const token=crypto.randomUUID()+crypto.randomUUID().replace(/-/g,'');
      await db.prepare(`INSERT INTO cbb_notification_email_verification(user_id,email,token_hash,expires_at)
        VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,token_hash=excluded.token_hash,
        expires_at=excluded.expires_at`).bind(id,email,await hash(token),now()+900).run();
      const url='https://boek-dynasty.fig-league-archive.workers.dev/?verify_email='+encodeURIComponent(token);
      await sendEmail(email,'Verify your CBB Dynasty notification email',
        'Confirm this address to receive optional league notifications. Link expires in 15 minutes.',url);
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='notifications/email/verify'){
      const token=String(body?.token||'');
      if(!/^[0-9a-f-]{68,80}$/i.test(token))return fail('Invalid email verification token.');
      const verified=await db.prepare('SELECT email FROM cbb_notification_email_verification WHERE user_id=? AND token_hash=? AND expires_at>?')
        .bind(id,await hash(token),now()).first();
      if(!verified)return fail('Verification link expired or invalid.',409);
      await db.transaction(async tx=>{
        await tx.prepare(`INSERT INTO cbb_notification_preferences(user_id,email_address,email_verified_at,email_enabled)
          VALUES(?,?,?,true) ON CONFLICT(user_id) DO UPDATE SET email_address=excluded.email_address,
          email_verified_at=excluded.email_verified_at,email_enabled=true`).bind(id,verified.email,now()).run();
        await tx.prepare('DELETE FROM cbb_notification_email_verification WHERE user_id=?').bind(id).run();
      });
      return ok({ok:true});
    }
    if(method==='GET'&&subpath==='admin/notifications'){
      if(actor.role!=='commissioner')return fail('Commissioner only.',403);
      const [devices,unread,total,announcements,delivery]=await Promise.all([
        db.prepare(`SELECT u.id,u.display_name,
          (SELECT count(*)::integer FROM cbb_push_devices d WHERE d.user_id=u.id) AS devices,
          COALESCE(p.push_enabled,true) AS push_enabled,
          COALESCE(p.trades,true) AS trades,
          COALESCE(p.draft,true) AS draft,
          COALESCE(p.announcements,true) AS announcements,
          (COALESCE(p.email_enabled,false) AND p.email_verified_at IS NOT NULL) AS email_active
          FROM users u LEFT JOIN cbb_notification_preferences p ON p.user_id=u.id
          ORDER BY lower(u.display_name),u.id`).all(),
        db.prepare('SELECT count(*) AS n FROM cbb_notifications WHERE read_at IS NULL').first(),
        db.prepare('SELECT count(*) AS n FROM cbb_notifications').first(),
        db.prepare("SELECT title,body,reference_id,created_at,count(*)::integer AS recipients FROM cbb_notifications WHERE kind='announcement' GROUP BY title,body,reference_id,created_at ORDER BY created_at DESC LIMIT 12").all(),
        db.prepare('SELECT count(*) AS n FROM cbb_notification_outbox WHERE processed_at IS NULL AND attempts<5').first()
      ]);
      const settings=(await db.prepare("SELECT key,value FROM settings WHERE key IN ('notify_trades','notify_draft','notify_announcements')").all()).results||[];
      return ok({devices:devices.results||[],unread:Number(unread?.n||0),total:Number(total?.n||0),
        announcements:announcements.results||[],pending_delivery:Number(delivery?.n||0),
        settings:Object.fromEntries(categories.map(k=>[k,settings.find(s=>s.key==='notify_'+k)?.value!=='0'])),
        email_available:emailConfig()});
    }
    if(method==='POST'&&subpath==='admin/notifications/settings'){
      if(actor.role!=='commissioner')return fail('Commissioner only.',403);
      if(!body||categories.some(k=>typeof body[k]!=='boolean'))return fail('Invalid league notification settings.');
      await db.batch(categories.map(k=>db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind('notify_'+k,body[k]?'1':'0')));
      return ok({ok:true});
    }
    if(method==='POST'&&subpath==='admin/notifications/announce'){
      if(actor.role!=='commissioner')return fail('Commissioner only.',403);
      const title=String(body?.title||'').trim(),message=String(body?.message||'').trim();
      if(title.length<3||title.length>90||message.length<4||message.length>650)return fail('Enter a title (3–90 characters) and message (4–650 characters).');
      const sent=(await db.prepare("SELECT count(distinct reference_id)::integer AS n FROM cbb_notifications WHERE kind='announcement' AND created_at>?")
        .bind(now()-86400).first())?.n||0;
      if(Number(sent)>=8)return fail('Announcement limit reached (8 per 24 hours).',429);
      const members=await allMembers(),recipient=String(body?.recipient||'all');
      if(recipient!=='all'&&!members.some(m=>m.id===recipient))
        return fail('Choose a registered manager or everyone.',400);
      const recipients=recipient==='all'?members:members.filter(m=>m.id===recipient);
      const reference='announce:'+crypto.randomUUID();
      const results=await Promise.allSettled(recipients.map(m=>emit(m.id,'announcement',title,message,'notifications',reference)));
      return ok({ok:true,recipients:results.filter(r=>r.status==='fulfilled'&&r.value).length});
    }
    if(method==='POST'&&subpath==='admin/notifications/retry'){
      if(actor.role!=='commissioner')return fail('Commissioner only.',403);
      return ok({ok:true,...await flush(20)});
    }
    return fail('Unknown notification route.',404);
  }
  return {route,emit,fanout,flush,onMutation,reconcileDraft:notifyCurrentPick};
}
