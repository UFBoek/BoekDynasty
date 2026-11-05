// Stateless compatibility frontend: GitHub source + Supabase API, no D1.
const UPSTREAM='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api';
const LOGO_BYTES=Uint8Array.from(atob(BRAND_LOGO_BASE64),c=>c.charCodeAt(0));
const SECURE={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const HTML_HEADERS={...SECURE,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, must-revalidate','Content-Security-Policy':"default-src 'self'; img-src 'self' https://a.espncdn.com data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...SECURE,'Content-Type':'application/json','Cache-Control':'no-store'}});
// Host-only, first-party HTTP cookies survive iOS storage pruning more reliably
// than script-writeable localStorage. Tokens are never readable via document.cookie.
const REMEMBER_COOKIE='__Host-boek_remember';
const REMEMBER_SECONDS=90*24*60*60;
const rememberCookie=token=>REMEMBER_COOKIE+'='+encodeURIComponent(token)+'; Max-Age='+REMEMBER_SECONDS+'; Path=/; Secure; HttpOnly; SameSite=Lax';
const forgetCookie=()=>REMEMBER_COOKIE+'=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax';
const getRememberedToken=raw=>{
  const item=String(raw||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(REMEMBER_COOKIE+'='));
  if(!item)return '';
  try{
    const token=decodeURIComponent(item.slice(REMEMBER_COOKIE.length+1));
    return /^[A-Za-z0-9_-]{30,180}$/.test(token)?token:'';
  }catch{return '';}
};
export default {
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    try{
      if(path.startsWith('/api/')){
        if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
        if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)
          return json({error:'Invalid request origin.'},403);
        const route=path.slice(5);
        if(!route||route==='cron'||route.includes('..'))return json({error:'Not found.'},404);
        const headers=new Headers(request.headers);
        const rememberedToken=getRememberedToken(request.headers.get('Cookie'));
        // The cookie wins over a stale legacy bearer token when both exist.
        // We never forward raw cookies or browser-provided forwarding headers.
        for(const key of ['cookie','host','origin','content-length','cf-connecting-ip','cf-ray','cf-visitor','x-forwarded-for','x-real-ip','x-job-token'])
          headers.delete(key);
        if(rememberedToken&&!['login','join','setup'].includes(route))
          headers.set('Authorization','Bearer '+rememberedToken);
        const isSignIn=request.method==='POST'&&['login','join','setup'].includes(route);
        const loginBody=isSignIn?await request.clone().json().catch(()=>({})):null;
        const upstream=await fetch(UPSTREAM+'/'+route+url.search,{
          method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'
        });
        const forwarded=new Headers(SECURE);
        forwarded.set('Content-Type',upstream.headers.get('Content-Type')||'application/json');
        forwarded.set('Cache-Control','no-store');
        if(isSignIn&&upstream.ok){
          const payload=await upstream.json().catch(()=>null);
          if(!payload?.token||!payload?.user)
            return json({error:'Sign-in response was incomplete. Please try again.'},502);
          // On unchecked sign-in, explicitly remove any previously saved
          // remember-device cookie so sessionStorage is the only credential.
          forwarded.set('Set-Cookie',loginBody?.remember_device===false
            ?forgetCookie():rememberCookie(payload.token));
          return new Response(JSON.stringify(payload),{status:upstream.status,headers:forwarded});
        }
        if(route==='logout'&&upstream.ok){
          forwarded.set('Set-Cookie',forgetCookie());
        }else if(route==='state'&&upstream.status===401&&rememberedToken){
          forwarded.set('Set-Cookie',forgetCookie());
        }
        return new Response(upstream.body,{status:upstream.status,headers:forwarded});
      }
      if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed.'},405);
      if(path==='/'||path==='/index.html')return new Response(PAGE,{headers:HTML_HEADERS});
      if(path==='/app.js')return new Response(CLIENT,{headers:{...SECURE,'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, must-revalidate'}});
      if(path==='/style.css')return new Response(CSS,{headers:{...SECURE,'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-cache, must-revalidate'}});
      if(['/brand-logo.png','/icon.png','/apple-touch-icon.png','/favicon.ico'].includes(path))
        return new Response(LOGO_BYTES,{headers:{...SECURE,'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
      if(path==='/icon.svg'||path==='/favicon.svg')return Response.redirect(url.origin+'/icon.png',302);
      if(path==='/manifest.webmanifest')
        return json({id:'/',name:'Boek Dynasty',short_name:'Boek Dynasty',description:'College basketball fantasy by NCAA program',start_url:'/',display:'standalone',theme_color:'#f4f6fa',background_color:'#f4f6fa',icons:[{src:'/icon.png?v=3',sizes:'192x192',type:'image/png'}]});
      if(path==='/sw.js')return new Response(SW,{headers:{...SECURE,'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache, must-revalidate','Service-Worker-Allowed':'/'}});
      return json({error:'Not found.'},404);
    }catch(error){console.error('Boek proxy error',path,String(error));return json({error:'The service is temporarily unavailable.'},502);}
  }
};