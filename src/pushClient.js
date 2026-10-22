import { acknowledgeReminderSnapshot, markReminderQueueError, queueReminderSnapshot, readReminderQueue } from './reminderQueue';
import { clearTaskSyncMarker, readValidTaskSnapshot } from './useLocalTasks';
import { toReminderSnapshot } from './reminders';

export const reminderBackendEnabled = import.meta.env.VITE_REMINDERS_ENABLED === 'true';
let flushing;

export async function queueLatestTaskReminders(options) {
    let saved;
    const state = await queueReminderSnapshot(() => {
        saved = readValidTaskSnapshot();
        if (!saved.ok) throw new Error(saved.error);
        return toReminderSnapshot(saved.tasks);
    }, options);
    // Only consume the marker after the IDB transaction is durable, and never
    // consume a marker or task write that appeared while that transaction ran.
    if (saved) clearTaskSyncMarker(saved.marker, saved.raw);
    return state;
}

export function notificationSupport() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (ios && !installed) return { supported: false, message: 'On iPhone or iPad, add Dreamie to your Home Screen in Safari, then open it there to enable notifications.' };
    const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    return { supported, message: supported ? '' : 'Notifications aren’t supported in this browser. Due dates still work here.' };
}

export async function getReminderConfig() {
    const response = await fetch('/api/reminders', { credentials: 'same-origin', cache: 'no-store' });
    const config = await response.json().catch(() => null);
    if (!response.ok || !config?.configured || typeof config.publicKey !== 'string') throw new Error('Closed-app notifications are not configured yet. Your due dates are saved on this device.');
    return config;
}

export function vapidKeyBytes(key) {
    const value = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4));
    return Uint8Array.from(value, character => character.charCodeAt(0));
}

export async function readyPushRegistration() {
    let timeout;
    try {
        return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => { timeout = window.setTimeout(() => reject(new Error('Offline setup is still finishing. Reopen the app and try enabling notifications again.')), 12000); }),
        ]);
    } finally { window.clearTimeout(timeout); }
}

export function flushReminderQueue() {
    if (flushing) return flushing;
    flushing = (async () => {
        if (!reminderBackendEnabled || !navigator.onLine) return;
        for (let attempt = 0; attempt < 5; attempt++) {
            let state = await readReminderQueue();
            let queued = state.pending;
            try {
                // An explicit unsubscribe is safe even when task bytes cannot be
                // read. Every other upload must first persist a fresh valid snapshot.
                if (queued?.action !== 'unsubscribe') {
                    state = await queueLatestTaskReminders();
                    queued = state.pending;
                }
                if (!queued) return;
                if (state.needsReconnect && queued.action !== 'unsubscribe') return;
                const response = await fetch('/api/reminders', {
                    method: queued.action === 'unsubscribe' ? 'DELETE' : queued.action === 'subscribe' ? 'POST' : 'PUT',
                    credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ revision: queued.revision, reminders: queued.reminders, subscription: queued.subscription }),
                });
                const result = await response.json().catch(() => null);
                if (response.status === 409 && result?.code === 'stale_revision') {
                    const current = await readReminderQueue();
                    if (current.pending?.revision !== queued.revision) continue;
                    const config = await getReminderConfig();
                    const options = { serverRevision: config.revision ?? 0, force: true, expectedRevision: queued.revision };
                    if (queued.action === 'unsubscribe') await queueReminderSnapshot([], { ...options, enabled: false });
                    else await queueLatestTaskReminders(options);
                    continue;
                }
                if (response.status === 401 || result?.code === 'subscription_owned') {
                    await markReminderQueueError('Reconnect notifications to renew this device’s registration.', { revision: queued.revision, needsReconnect: true });
                    return;
                }
                if (!response.ok || !result?.ok) throw new Error(result?.error || (response.status === 401 ? 'Reconnect notifications to renew this device’s registration.' : 'Reminder changes are waiting to sync. Try again when connected.'));
                await acknowledgeReminderSnapshot(queued.revision, result);
                if (result.pending) return;
            } catch (error) {
                if (queued) await markReminderQueueError(error.message || 'Reminder changes are waiting to sync.', { revision: queued.revision });
                return;
            }
        }
    })().finally(() => { flushing = null; });
    return flushing;
}
