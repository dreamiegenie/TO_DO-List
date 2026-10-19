import { useEffect, useRef, useState } from 'react';
import { clearUpdateSession, saveUpdateSession } from './updateSession';

export function PWAStatus() {
    const [updateReady, setUpdateReady] = useState(false);
    const [message, setMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const registrationRef = useRef(null);
    const newerController = useRef(false);

    useEffect(() => {
        if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
        let cancelled = false;
        let installing;
        let registration;
        let interval;
        const hadController = Boolean(navigator.serviceWorker.controller);
        const showUpdate = () => {
            if (!cancelled) setUpdateReady(true);
        };
        const workerChanged = () => {
            if (installing?.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        };
        const updateFound = () => {
            installing?.removeEventListener('statechange', workerChanged);
            installing = registration.installing;
            installing?.addEventListener('statechange', workerChanged);
        };
        const controllerChanged = () => {
            // Another tab must never force this tab to reload or discard its work.
            if (hadController) {
                newerController.current = true;
                showUpdate();
            }
        };
        const checkForUpdate = () => {
            if (!navigator.onLine || document.visibilityState === 'hidden') return;
            if (registration?.waiting || newerController.current) showUpdate();
            registration?.update().catch(() => {});
        };
        const offline = () => setMessage('You’re offline. Your tasks and notes still work here ♡');
        const online = () => {
            setMessage('Back online ♡');
            checkForUpdate();
        };

        navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        document.addEventListener('visibilitychange', checkForUpdate);
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
            if (cancelled) return;
            registration = reg;
            registrationRef.current = reg;
            reg.addEventListener('updatefound', updateFound);
            updateFound();
            if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
            interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
            navigator.serviceWorker.ready.then(() => {
                if (!cancelled && !hadController && !reg.waiting) setMessage('Ready to use offline ♡');
            });
        }).catch(() => {
            if (!cancelled) setMessage('Offline setup didn’t finish. Reconnect and reload to try again.');
        });

        return () => {
            cancelled = true;
            window.clearInterval(interval);
            installing?.removeEventListener('statechange', workerChanged);
            registration?.removeEventListener('updatefound', updateFound);
            navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged);
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
            document.removeEventListener('visibilitychange', checkForUpdate);
        };
    }, []);

    useEffect(() => {
        if (!message) return;
        const timeout = window.setTimeout(() => setMessage(''), 5000);
        return () => window.clearTimeout(timeout);
    }, [message]);

    async function updateApp() {
        if (!saveUpdateSession()) {
            setMessage('Save your edits, then close and reopen the app to update.');
            return;
        }
        setIsUpdating(true);
        try {
            const waiting = registrationRef.current?.waiting;
            if (waiting) {
                await new Promise((resolve, reject) => {
                    const timeout = window.setTimeout(() => {
                        waiting.removeEventListener('statechange', changed);
                        reject(new Error('Update activation timed out'));
                    }, 15000);
                    function changed() {
                        if (waiting.state === 'activated') {
                            window.clearTimeout(timeout);
                            waiting.removeEventListener('statechange', changed);
                            resolve();
                        } else if (waiting.state === 'redundant') {
                            window.clearTimeout(timeout);
                            waiting.removeEventListener('statechange', changed);
                            reject(new Error('Update could not activate'));
                        }
                    }
                    waiting.addEventListener('statechange', changed);
                    waiting.postMessage({ type: 'SKIP_WAITING' });
                });
            }
            if (!saveUpdateSession()) {
                clearUpdateSession();
                setIsUpdating(false);
                setMessage('Save your edits, then close and reopen the app to update.');
                return;
            }
            window.location.reload();
        } catch {
            clearUpdateSession();
            setIsUpdating(false);
            setMessage('The update didn’t finish. You can try again when you’re ready.');
        }
    }

    if (!updateReady && !message) return null;

    return (
        <aside aria-label="App status" role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-2xl border border-[#E8A7C0] bg-[#FFF4F8] p-3 font-body text-sm text-[#823B56] shadow-lg shadow-[#B77996]/20 dark:border-night-border dark:bg-night-card dark:text-night-soft-ink dark:shadow-night-shadow/40">
            <p>{message || 'A new version is ready. Reload when you’re ready ♡'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                {updateReady && <button type="button" disabled={isUpdating} onClick={updateApp} className="min-h-9 cursor-pointer rounded-xl border border-[#D493AE] bg-[#F4A7C1]/35 px-3 py-1 font-semibold disabled:opacity-60 dark:border-night-control-border dark:bg-night-soft dark:text-night-soft-ink">{isUpdating ? 'Updating…' : 'Reload app'}</button>}
                <button type="button" disabled={isUpdating} onClick={() => { setUpdateReady(false); setMessage(''); }} className="min-h-9 cursor-pointer rounded-xl px-3 py-1 hover:bg-[#F4A7C1]/25 disabled:opacity-60 dark:hover:bg-night-hover">{updateReady ? 'Later' : 'Dismiss'}</button>
            </div>
        </aside>
    );
}
