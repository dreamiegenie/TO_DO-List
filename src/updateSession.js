import { useEffect } from 'react';

const storageKey = 'my-todos:update-session';
const providers = new Map();
let restored = {};

// This one-use checkpoint belongs only to an explicitly accepted app update.
try {
    const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null');
    window.sessionStorage.removeItem(storageKey);
    if (saved && Date.now() - saved.savedAt < 5 * 60 * 1000 && saved.values) restored = saved.values;
} catch {
    // Normal app use does not require session storage.
}

export function readUpdateSnapshot(key) {
    return restored[key];
}

export function useUpdateSnapshot(key, getSnapshot, enabled = true) {
    useEffect(() => { delete restored[key]; }, [key]);
    useEffect(() => {
        if (!enabled) return;
        providers.set(key, getSnapshot);
        return () => {
            if (providers.get(key) === getSnapshot) providers.delete(key);
        };
    }, [key, getSnapshot, enabled]);
}

export function saveUpdateSession() {
    try {
        const values = Object.fromEntries([...providers].map(([key, getSnapshot]) => [key, getSnapshot()]));
        window.sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), values }));
        return true;
    } catch {
        return false;
    }
}

export function clearUpdateSession() {
    try {
        window.sessionStorage.removeItem(storageKey);
    } catch {
        // There is no stored checkpoint to clean up when storage is unavailable.
    }
}
