const CACHE_NAME = '32g-gpt-tools-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './mp1.png',
  'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600&display=swap'
];

// 앱 만료 날짜 설정 (설치일로부터 60일)
const EXPIRATION_KEY = '32g-gpt-tools-expiration';
const EXPIRATION_DAYS = 60;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // 설치 시 만료 날짜 설정 (현재 날짜 + 60일)
        const installDate = new Date();
        const expirationDate = new Date(installDate);
        expirationDate.setDate(installDate.getDate() + EXPIRATION_DAYS);
        localStorage.setItem(EXPIRATION_KEY, expirationDate.toISOString());
        console.log('앱 만료 날짜 설정:', expirationDate.toLocaleDateString());
        
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // 만료 여부 확인
  const checkExpiration = () => {
    const expirationDateStr = localStorage.getItem(EXPIRATION_KEY);
    if (!expirationDateStr) return false; // 만료 날짜가 없으면 만료되지 않음
    
    const expirationDate = new Date(expirationDateStr);
    const currentDate = new Date();
    
    return currentDate > expirationDate; // 현재 날짜가 만료 날짜보다 크면 만료됨
  };
  
  // 만료된 경우 만료 페이지 반환
  if (checkExpiration() && event.request.mode === 'navigate') {
    const expiredResponse = new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>앱 만료됨</title>
        <style>
          body { font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; }
          h1 { color: #333; }
          p { color: #666; max-width: 600px; margin: 20px auto; }
          .container { background-color: #fff; border-radius: 15px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>앱 사용 기간이 만료되었습니다</h1>
          <p>이 앱은 설치 후 60일 동안만 사용할 수 있습니다. 계속 사용하시려면 앱을 재설치하거나 관리자에게 문의하세요.</p>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
    return event.respondWith(expiredResponse);
  }
  
  // 만료되지 않은 경우 정상 응답
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // 네트워크 요청이 성공하고, 유효한 응답인 경우에만 캐시에 저장
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});