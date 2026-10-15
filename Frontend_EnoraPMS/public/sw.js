self.addEventListener('fetch', function(event) {
  // Passa as requisições para a rede para que o PWA pareça estar a funcionar
  event.respondWith(fetch(event.request));
});