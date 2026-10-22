import { useSyncExternalStore } from 'react';

const eventName = 'dreamie-tasks-changed';
export const taskSyncMarkerKey = 'dreamie-reminder-dirty';
const syncMarkerEvent = 'dreamie-reminder-dirty';
let cachedRaw;
let cached = { tasks: [], error: '' };
let storageUnavailable = false;

function parseTasks(raw) {
    const tasks = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(tasks) || tasks.some(task => !task || typeof task.task !== 'string' || !['string', 'number'].includes(typeof task.id))) throw new Error('Invalid task data');
    return tasks;
}

export function readValidTaskSnapshot() {
    try {
        const raw = window.localStorage.getItem('todos');
        return { ok: true, tasks: parseTasks(raw), raw, marker: window.localStorage.getItem(taskSyncMarkerKey) };
    } catch {
        return { ok: false, error: 'Saved tasks cannot be read safely. Reminder sync is paused until they can be read again.' };
    }
}

export function readTaskSyncMarker() {
    try { return window.localStorage.getItem(taskSyncMarkerKey); }
    catch { return null; }
}

export function clearTaskSyncMarker(marker, expectedRaw) {
    if (!marker) return false;
    try {
        if (window.localStorage.getItem(taskSyncMarkerKey) !== marker ||
            (expectedRaw !== undefined && window.localStorage.getItem('todos') !== expectedRaw)) return false;
        window.localStorage.removeItem(taskSyncMarkerKey);
        window.dispatchEvent(new Event(syncMarkerEvent));
        return true;
    } catch { return false; }
}

export function subscribeTaskSyncMarker(listener) {
    const storageChanged = event => { if (event.key === taskSyncMarkerKey || event.key === null) listener(); };
    window.addEventListener(syncMarkerEvent, listener);
    window.addEventListener('storage', storageChanged);
    return () => {
        window.removeEventListener(syncMarkerEvent, listener);
        window.removeEventListener('storage', storageChanged);
    };
}

function read() {
    let raw;
    try { raw = window.localStorage.getItem('todos'); }
    catch {
        storageUnavailable = true;
        if (!cached.error) cached = { ...cached, error: 'Saved tasks are unavailable in this browser. Your stored data has been kept unchanged.' };
        return cached;
    }
    if (raw === cachedRaw && !storageUnavailable) return cached;
    storageUnavailable = false;
    cachedRaw = raw;
    try {
        const tasks = parseTasks(raw);
        cached = { tasks, error: '' };
    } catch {
        // Keep the original bytes intact instead of replacing damaged saved data.
        cached = { tasks: [], error: 'Saved tasks could not be read. Your stored data has been kept unchanged.' };
    }
    return cached;
}

function subscribe(listener) {
    const storageChanged = event => { if (event.key === 'todos' || event.key === null) listener(); };
    window.addEventListener(eventName, listener);
    window.addEventListener('storage', storageChanged);
    return () => {
        window.removeEventListener(eventName, listener);
        window.removeEventListener('storage', storageChanged);
    };
}

function updateTasks(transform) {
    const before = read();
    if (before.error) return { ok: false, error: before.error };
    try {
        const tasks = typeof transform === 'function' ? transform(before.tasks) : transform;
        const raw = JSON.stringify(tasks);
        parseTasks(raw);
        const marker = crypto.randomUUID();
        // Record the need to reconcile before deleting any task metadata. Replaying
        // this marker always reads the actual saved tasks, including after a failed write.
        window.localStorage.setItem(taskSyncMarkerKey, marker);
        window.dispatchEvent(new Event(syncMarkerEvent));
        window.localStorage.setItem('todos', raw);
        // Refresh after the write too, so another tab cannot consume the marker
        // between the write-ahead marker and the task bytes becoming visible.
        try { window.localStorage.setItem(taskSyncMarkerKey, marker); } catch { /* The write-ahead marker remains available. */ }
        cachedRaw = raw;
        cached = { tasks, error: '' };
        window.dispatchEvent(new Event(eventName));
        window.dispatchEvent(new Event(syncMarkerEvent));
        return { ok: true };
    } catch {
        return { ok: false, error: 'This browser could not save the change. Your saved tasks have been kept.' };
    }
}

export function useLocalTasks() {
    const snapshot = useSyncExternalStore(subscribe, read, read);
    return [snapshot.tasks, updateTasks, snapshot.error];
}
