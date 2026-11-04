// Stateless compatibility frontend: GitHub source + Supabase API, no D1.
const UPSTREAM='https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api';
const LOGO_BYTES=Uint8Array.from(atob(BRAND_LOGO_BASE64),c=>c.charCodeAt(0));
const SECURE={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const HTML_HEADERS={...SECURE,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, must-revalidate','Content-Security-Policy':"default-src 'self'; img-src 'self' https://a.espncdn.com data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...SECURE,'Content-Type':'application/json','Cache-Control':'no-store'}});
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
        for(const key of ['cookie','host','origin','content-length','cf-connecting-ip','cf-ray','cf-visitor','x-forwarded-for','x-real-ip','x-job-token'])
          headers.delete(key);
        const upstream=await fetch(UPSTREAM+'/'+route+url.search,{
          method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'
        });
        const forwarded=new Headers(SECURE);
        forwarded.set('Content-Type',upstream.headers.get('Content-Type')||'application/json');
        forwarded.set('Cache-Control','no-store');
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
      if(path==='/sw.js')return new Response("self.addEventListener('install',e=>{self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())})",{headers:{...SECURE,'Content-Type':'application/javascript','Cache-Control':'no-store'}});
      return json({error:'Not found.'},404);
    }catch(error){console.error('Boek proxy error',path,String(error));return json({error:'The service is temporarily unavailable.'},502);}
  }
};