/* ============================================================
   Service worker — États des lieux
   Stratégie :
   • Document HTML  → RÉSEAU D'ABORD (tu as toujours ta dernière
     version quand il y a du réseau), repli sur le cache hors-ligne.
   • Fichiers statiques (icônes, manifeste) → CACHE D'ABORD.
   • Polices Google (autre origine) → laissées au réseau ; hors-ligne,
     l'appli bascule automatiquement sur les polices système.

   Tu n'as PAS besoin de modifier ce fichier quand tu mets l'appli à
   jour : remplace simplement index.html à la même adresse.
   ============================================================ */
const CACHE = 'edl-app-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      // On tolère l'échec d'un fichier isolé (ex. icône absente) sans casser l'install.
      return Promise.all(CORE.map(function(url){
        return cache.add(new Request(url, {cache:'reload'})).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch(e){ return; }

  // Laisse passer tout ce qui n'est pas sur notre origine (polices, etc.)
  if(url.origin !== self.location.origin) return;

  var isDoc = req.mode === 'navigate' ||
              (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if(isDoc){
    // Réseau d'abord
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(m){ return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Statiques : cache d'abord, sinon réseau (et on met en cache au passage)
  event.respondWith(
    caches.match(req).then(function(m){
      return m || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){ return m; });
    })
  );
});
