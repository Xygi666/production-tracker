const CACHE_NAME = 'uchet2-cache-v3.2.4';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./backup.js','./work-schedule.js','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?undefined:caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request; if(req.method!=='GET'||!req.url.startsWith('http'))return;
  if(req.destination==='document'){
    event.respondWith(fetch(req).then(res=>{const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,clone));return res;}).catch(()=>caches.match('./index.html'))); return;
  }
  event.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{if(!res||res.status!==200||res.type==='opaque')return res;const clone=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,clone));return res;}).catch(()=>new Response('',{status:408,statusText:'Offline'}))));
});
self.addEventListener('message',e=>{ if(e.data?.type==='SKIP_WAITING') self.skipWaiting(); });
