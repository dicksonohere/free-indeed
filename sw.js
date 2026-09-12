/* =====================================================================
   FREE INDEED — service worker

   ⚠️  BUMP THE CACHE NAME BELOW ON EVERY BUILD THAT CHANGES index.html.
       fi-v1  →  fi-v2  →  fi-v3  →  ...

       The phone keeps its own copy of index.html so the app opens with no
       network. Until this name changes, the phone never takes the new page,
       however good the upload was. One character here is the whole update.

   On activate, every cache whose name is not the current one is deleted.
   ===================================================================== */

var CACHE = 'fi-v1';
var FILES = ['./', './index.html'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(FILES);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.map(function(n){
        if(n !== CACHE) return caches.delete(n);
        return null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch(err){ return; }
  if(url.origin !== self.location.origin) return;

  /* Opening the app: serve the kept page, and fetch a fresh one behind it. */
  if(req.mode === 'navigate'){
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match('./index.html').then(function(hit){
          var live = fetch(req).then(function(res){
            if(res && res.ok) c.put('./index.html', res.clone());
            return res;
          }).catch(function(){ return hit; });
          return hit || live;
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(req).then(function(hit){
        if(hit){
          fetch(req).then(function(res){
            if(res && res.ok) c.put(req, res.clone());
          }).catch(function(){});
          return hit;
        }
        return fetch(req).then(function(res){
          if(res && res.ok && url.origin === self.location.origin) c.put(req, res.clone());
          return res;
        }).catch(function(){ return hit; });
      });
    })
  );
});
