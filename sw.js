var CACHE='mg-v19';
var FILES=['./','index.html','app.js','acces.js','manifest.json','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','plan.js','ch1.js','ch2.js','ch3.js','ch4.js','ch5.js','ch6.js','ch7.js','ch8.js','ch9.js','ch10.js','ch11.js'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES)}));
  self.skipWaiting();
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET'){return}
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(function(r){
      var copy=r.clone();
      if(r.ok&&new URL(e.request.url).origin===location.origin){caches.open(CACHE).then(function(c){c.put(e.request,copy)})}
      return r;
    }).catch(function(){return caches.match(e.request).then(function(r){return r||caches.match('index.html')})})
  );
});
