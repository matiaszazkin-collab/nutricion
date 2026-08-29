/* Cachea la app para que abra sin conexión. Los datos viven en localStorage, no acá.

   Estrategia: el HTML se pide siempre a la red primero (así una versión nueva se ve
   apenas se sube, sin tener que desinstalar nada) y se cae al cache solo si no hay
   señal. Los iconos y el manifest, que no cambian, salen del cache directo. */
var CACHE = "ficha-nutricional-v8";
var ARCHIVOS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* cache:"reload" evita que el navegador entregue una copia vieja al instalar */
    return Promise.all(ARCHIVOS.map(function(u){
      return fetch(new Request(u, {cache:"reload"}))
        .then(function(r){ if(r && r.ok) return c.put(u, r); })
        .catch(function(){});
    }));
  }).catch(function(){}));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function esHTML(req){
  if(req.mode === "navigate") return true;
  var u = req.url.split("?")[0];
  return u.indexOf(".html") === u.length - 5 || u.charAt(u.length-1) === "/";
}

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;

  if(esHTML(e.request)){
    e.respondWith(
      fetch(e.request).then(function(res){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copia); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(hit){
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copia); }).catch(function(){});
        return res;
      }).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
