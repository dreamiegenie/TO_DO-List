// Imported by the existing Workbox worker; its precache and update flow stay intact.
self.addEventListener('push', event => {
    let reminder;
    try { reminder = event.data?.json(); } catch { reminder = null; }
    const taskId = typeof reminder?.taskId === 'string' ? reminder.taskId.slice(0, 128) : '';
    const eventId = typeof reminder?.eventId === 'string' ? reminder.eventId.slice(0, 180) : taskId;
    const title = typeof reminder?.taskTitle === 'string' ? reminder.taskTitle.slice(0, 200) : '';
    // Safari requires every received push to display a native notification.
    // Server-side revision checks cancel superseded jobs before a push is sent.
    event.waitUntil(self.registration.showNotification('Dreamie To-Dos ♡', {
        body: title || 'Open Dreamie to check your scheduled reminder.',
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        tag: `dreamie-reminder:${eventId || 'notice'}`,
        renotify: false,
        data: { taskId, eventId, revision: reminder?.revision },
    }));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const taskId = typeof event.notification.data?.taskId === 'string' ? event.notification.data.taskId.slice(0, 128) : '';
    const destination = new URL('/', self.location.origin);
    if (taskId) destination.searchParams.set('task', taskId);
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
        if (existing) {
            if (taskId) existing.postMessage({ type: 'OPEN_TASK', taskId });
            await existing.focus();
        } else {
            await self.clients.openWindow(destination.href);
        }
    })());
});
