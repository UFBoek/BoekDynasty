/* CBB Dynasty Web Push Service Worker. Only displays explicitly user-visible push events. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let message={};
  try{message=event.data?event.data.json():{};}catch{message={};}
  const title=String(message.title||'CBB Dynasty').slice(0,140);
  const body=String(message.body||'You have a new league notification.').slice(0,1000);
  const icon=new URL('icon.png',self.registration.scope).href;
  const opts={body,icon,badge:icon,tag:String(message.tag||'league'),
    data:{url:'?notifications=1'},renotify:false};
  event.waitUntil((async()=>{
    await self.registration.showNotification(title,opts);
    if(Number.isInteger(message.badge)&&message.badge>=0&&'setAppBadge' in self.navigator){
      try{await self.navigator.setAppBadge(message.badge);}catch{}
    }
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'?notifications=1',self.registration.scope);
  // Do not open destinations supplied by a push provider outside this site's origin.
  if(target.origin!==self.location.origin)return;
  event.waitUntil((async()=>{
    const open=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of open){
      if(new URL(client.url).origin===target.origin){
        client.postMessage({type:'open-notifications'});
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
