import { useCallback, useEffect, useState } from 'react';
import { queueReminderSnapshot, readReminderQueue, subscribeReminderQueue } from './reminderQueue';
import { clearTaskSyncMarker, readTaskSyncMarker, subscribeTaskSyncMarker } from './useLocalTasks';
import { flushReminderQueue, getReminderConfig, notificationSupport, queueLatestTaskReminders, readyPushRegistration, reminderBackendEnabled, vapidKeyBytes } from './pushClient';

export function useReminders(tasks, { canSync = true } = {}) {
    const [state, setState] = useState({ enabled: false, pending: null });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [permission, setPermission] = useState(() => 'Notification' in window ? Notification.permission : 'default');
    const [localDirty, setLocalDirty] = useState(() => Boolean(readTaskSyncMarker()));
    const support = notificationSupport();

    const refresh = useCallback(async () => {
        try { setState(await readReminderQueue()); setLocalDirty(Boolean(readTaskSyncMarker())); }
        catch { setError('Reminder changes cannot be saved in this browser. Tasks and due dates still use local storage.'); }
    }, []);

    useEffect(() => {
        if (!reminderBackendEnabled) return;
        let active = true;
        const read = () => {
            if (active) setLocalDirty(Boolean(readTaskSyncMarker()));
            return readReminderQueue().then(value => { if (active) setState(value); }).catch(() => { if (active) setError('Reminder storage is unavailable in this browser.'); });
        };
        read();
        const unsubscribe = subscribeReminderQueue(read);
        const unsubscribeMarker = subscribeTaskSyncMarker(read);
        return () => { active = false; unsubscribe(); unsubscribeMarker(); };
    }, []);

    useEffect(() => {
        if (!reminderBackendEnabled) return;
        if (!canSync) {
            readReminderQueue().then(value => value.pending?.action === 'unsubscribe' ? flushReminderQueue() : undefined).catch(() => {});
            return;
        }
        queueLatestTaskReminders().then(() => flushReminderQueue()).catch(() => setError('Reminder changes could not be queued. Reopen the app online to retry.'));
    }, [tasks, canSync]);

    useEffect(() => {
        if (!reminderBackendEnabled) return;
        const sync = () => {
            if (document.visibilityState === 'hidden') return;
            if ('Notification' in window) setPermission(Notification.permission);
            if (canSync) queueLatestTaskReminders().then(() => flushReminderQueue()).catch(() => {});
            else readReminderQueue().then(value => value.pending?.action === 'unsubscribe' ? flushReminderQueue() : undefined).catch(() => {});
        };
        window.addEventListener('online', sync);
        window.addEventListener('focus', sync);
        document.addEventListener('visibilitychange', sync);
        // This retries network synchronization while open; the server schedules delivery.
        const retry = window.setInterval(sync, 30000);
        return () => {
            window.clearInterval(retry);
            window.removeEventListener('online', sync);
            window.removeEventListener('focus', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, [canSync]);

    async function enable() {
        if (!reminderBackendEnabled || !canSync || !support.supported || busy) return;
        setBusy(true); setError('');
        try {
            // Permission is requested directly from the explicit Enable button gesture.
            const granted = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
            setPermission(granted);
            if (granted !== 'granted') {
                setError(granted === 'denied' ? 'Notifications are blocked. You can change this in your browser or device notification settings.' : 'Notifications were not enabled. Your due dates are still saved.');
                return;
            }
            const config = await getReminderConfig();
            const registration = await readyPushRegistration();
            const current = await readReminderQueue();
            let subscription = await registration.pushManager.getSubscription();
            const key = vapidKeyBytes(config.publicKey);
            const existingKey = subscription?.options.applicationServerKey ? new Uint8Array(subscription.options.applicationServerKey) : null;
            if (subscription && (current.needsReconnect || (existingKey && (existingKey.length !== key.length || !Array.from(existingKey).every((value, i) => value === key[i]))))) {
                await subscription.unsubscribe(); subscription = null;
            }
            subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
            await queueLatestTaskReminders({
                enabled: true, subscription: subscription.toJSON(), subscribe: true, serverRevision: config.revision ?? 0,
            });
            await flushReminderQueue();
            await refresh();
        } catch (failure) { setError(failure.message || 'Notifications could not be enabled. Please try again.'); }
        finally { setBusy(false); }
    }

    async function disable() {
        if (!reminderBackendEnabled || busy) return;
        setBusy(true); setError('');
        try {
            const marker = readTaskSyncMarker();
            await queueReminderSnapshot([], { enabled: false });
            clearTaskSyncMarker(marker);
            const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
            const subscription = await registration?.pushManager?.getSubscription();
            await subscription?.unsubscribe().catch(() => {});
            await flushReminderQueue();
            await refresh();
        } catch (failure) { setError(failure.message || 'The unsubscribe change could not be saved. Please try again.'); }
        finally { setBusy(false); }
    }

    async function retry() {
        if (!reminderBackendEnabled || !canSync || busy) return;
        setBusy(true); setError('');
        try {
            const config = await getReminderConfig();
            await queueLatestTaskReminders({ serverRevision: config.revision ?? 0 });
            await flushReminderQueue(); await refresh();
        } catch (failure) { setError(failure.message || 'Reminder changes are still waiting to sync.'); }
        finally { setBusy(false); }
    }

    const pending = state.pending || (localDirty && state.enabled ? { action: 'sync', localOnly: true } : null);
    return {
        ...state,
        ...(!reminderBackendEnabled ? { enabled: false, pending: null, serverPending: false, needsReconnect: false } : { pending }),
        canSync, supported: support.supported, supportMessage: support.message, configured: reminderBackendEnabled,
        permission, busy, error: reminderBackendEnabled ? error || state.error : '', enable, disable, retry,
    };
}
