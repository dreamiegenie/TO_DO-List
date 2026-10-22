const databaseName = 'dreamie-reminder-outbox';
const changeEvent = 'dreamie-reminder-queue';
let opening;
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(changeEvent) : null;
channel?.addEventListener('message', () => window.dispatchEvent(new Event(changeEvent)));

function openDatabase() {
    if (!opening) opening = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('state');
        request.onsuccess = () => {
            request.result.onversionchange = () => { request.result.close(); opening = null; };
            resolve(request.result);
        };
        request.onerror = () => { opening = null; reject(request.error); };
    });
    return opening;
}

export async function readReminderQueue() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction('state').objectStore('state').get('device');
        request.onsuccess = () => resolve(request.result ?? { enabled: false, revision: 0, pending: null });
        request.onerror = () => reject(request.error);
    });
}

async function changeQueue(update) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction('state', 'readwrite');
        const store = transaction.objectStore('state');
        const request = store.get('device');
        let result;
        let failure;
        request.onsuccess = () => {
            try {
                result = update(request.result ?? { enabled: false, revision: 0, pending: null });
                store.put(result, 'device');
            } catch (error) {
                failure = error;
                transaction.abort();
            }
        };
        transaction.oncomplete = () => {
            window.dispatchEvent(new Event(changeEvent));
            channel?.postMessage('changed');
            resolve(result);
        };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Reminder storage is unavailable.'));
    });
}

export function queueReminderSnapshot(snapshot, { enabled, subscription, subscribe = false, serverRevision = 0, force = false, expectedRevision } = {}) {
    return changeQueue(state => {
        // A rebase may wait for the server while another tab changes intent.
        if (expectedRevision !== undefined && state.pending?.revision !== expectedRevision) return state;
        // Resolve inside the serialized write transaction, rather than trusting a
        // React render that may predate another tab's most recent saved changes.
        const reminders = typeof snapshot === 'function' ? snapshot() : snapshot;
        const desiredEnabled = enabled ?? state.enabled;
        // Without opt-in there is nothing to upload. Retain any cancellation outbox.
        if (!desiredEnabled && !state.enabled && !state.pending && enabled === undefined) return state;
        const nextSubscription = subscription ?? state.subscription;
        const fingerprint = JSON.stringify({ enabled: desiredEnabled, reminders: desiredEnabled ? reminders : [] });
        if (!subscribe && !force && fingerprint === state.fingerprint && serverRevision <= state.revision) return state;
        const revision = Math.max(Date.now(), state.revision + 1, serverRevision + 1);
        const action = !desiredEnabled ? 'unsubscribe' : subscribe || state.pending?.action === 'subscribe' ? 'subscribe' : 'sync';
        return {
            ...state, enabled: desiredEnabled, subscription: nextSubscription, fingerprint, revision, error: '', serverPending: false,
            ...(subscribe || !desiredEnabled ? { needsReconnect: false } : {}),
            pending: { action, revision, reminders: desiredEnabled ? reminders : [], ...(desiredEnabled ? { subscription: nextSubscription } : {}) },
        };
    });
}

export function acknowledgeReminderSnapshot(revision, { pending = false } = {}) {
    return changeQueue(state => state.pending?.revision !== revision ? state : {
        ...state, error: '', serverPending: pending,
        // A queued cancellation remains durable after local tasks are permanently deleted.
        pending: pending ? state.pending : null,
        ...(!state.enabled && !pending ? { subscription: null } : {}),
    });
}

export function markReminderQueueError(message, { revision, needsReconnect = false } = {}) {
    return changeQueue(state => revision !== undefined && state.pending?.revision !== revision ? state : {
        ...state, error: message, ...(needsReconnect ? { needsReconnect: true } : {}),
    });
}

export function subscribeReminderQueue(listener) {
    window.addEventListener(changeEvent, listener);
    return () => window.removeEventListener(changeEvent, listener);
}
