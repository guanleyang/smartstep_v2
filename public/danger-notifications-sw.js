// Notification display only. No caching, polling, token storage or background push.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./?view=alerts',self.registration.scope);
  if(target.origin!==self.location.origin)return;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    for(const client of windows)if(client.url.startsWith(self.registration.scope)){
      client.postMessage({type:'smartstep-open-alerts'});return client.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
