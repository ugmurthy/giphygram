
// SW Version
const version = '1.20';

// static cache - App shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];
console.log('Ver: ',version);
console.log('Static assets :', appAssets);

// SW install
//
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(`static-${version}`)
            .then(cache => cache.addAll(appAssets))
    );
})

// SW Activate
//
self.addEventListener( 'activate', e=> {
    // clean static cache
    let cleaned = caches.keys().then( keys => {
        keys.forEach( key => {
            if ( key !== `static-${version}` && key.match('static-') ) {
                return caches.delete(key);
            }
        });
    });
    e.waitUntil(cleaned);

});

// static cache strategy - cache with network fall back
const staticCache = (req,cacheName=`static-${version}`) => {

    return caches.match(req).then( cachedRes => {
        
        // return cached response if found
        if (cachedRes) return cachedRes;

        // fall back to network
        return fetch(req).then (networkRes => {

            // update caches with new response
            caches.open(cacheName)
                .then( cache => cache.put( req, networkRes ));

            // return clone of network response
            return networkRes.clone();
    });
    });
};

// network with cache fallback
const fallbackCache = (req) => {
    
    // Try network
    return fetch(req).then( networkRes => {
    
        // check res is OK, else go to cache
        if (!networkRes.ok) throw 'Fetch Error';

        // update cache
        caches.open(`static-${version}`)
            .then(cache => cache.put(req,networkRes));

        // return clone of responce
        return networkRes.clone(); 
    })
    // try cache
    .catch(err => caches.match(req));


};

// clean old Giphys from the 'giphy' cache
const cleanGiphyCache = (giphys) => { // giphys an array of urls

    caches.open('giphy').then( cache => {
        
        // get all cache entries
        cache.keys().then( keys => {
            
            // loop entries (requests)
            keys.forEach( key => {
                
                // if entry is NOT part of current giphys, delete it
                if (!giphys.includes(key.url) ) cache.delete(key);
            });
        });
    });
}
// SW fetch
self.addEventListener('fetch', e=> {
    
     // App Shell
     if (e.request.url.match(location.origin) ) {
        e.respondWith( staticCache(e.request) );

     // Gihpy API
     } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')) {
        e.respondWith( fallbackCache(e.request))

     // Giphy media
     } else if (e.request.url.match('giphy.com/media')) {
        e.respondWith( staticCache(e.request,'giphy'))
     }
});

self.addEventListener('message', e=> {
    
    // identify the message
    if ( e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})
