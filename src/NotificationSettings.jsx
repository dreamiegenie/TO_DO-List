export function NotificationSettings({ notifications }) {
    const { enabled, supported, supportMessage, configured, permission, pending, serverPending, busy, error, enable, disable, retry, needsReconnect, canSync = true } = notifications;
    const buttonClass = 'min-h-10 cursor-pointer rounded-xl border border-[#D493AE] bg-[#F4A7C1]/35 px-3 py-2 font-body text-sm font-semibold text-[#823B56] disabled:cursor-default disabled:opacity-60 dark:border-night-control-border dark:bg-night-soft dark:text-night-soft-ink';
    return (
        <section aria-label="Reminder notifications" className="mb-4 min-w-0 rounded-xl border border-[#E8B4C9] bg-[#FFF0F5] p-3 font-body text-xs text-[#A3637C] dark:border-night-border dark:bg-night-soft dark:text-night-muted">
            <h3 className="font-mali text-sm font-semibold dark:text-night-accent">Reminder notifications</h3>
            <p className="mt-1 wrap-anywhere">
                {!supported ? supportMessage : !configured ? 'Due dates are saved on this device. Closed-app notifications will be available after notification setup is complete.' : permission === 'denied' ? 'Notifications are blocked. Allow them in your browser or device settings to enable reminders.' : enabled ? 'Notifications are enabled for this device.' : 'Enable notifications to receive scheduled reminders when the app is closed.'}
            </p>
            {pending && <p role="status" className="mt-2 font-semibold wrap-anywhere">{serverPending ? 'Saved on the server; delivery scheduling is waiting to retry.' : 'Reminder changes are waiting to sync. Reopen this app online to finish. A previously scheduled reminder may still arrive until cancellation syncs.'}</p>}
            {error && <p role="alert" className="mt-2 wrap-anywhere">{error}</p>}
            {!canSync && <p role="status" className="mt-2 wrap-anywhere">Reminder synchronization is paused while saved tasks are unavailable. You can still turn notifications off.</p>}
            <div className="mt-2 flex flex-wrap gap-2">
                {enabled ? <button type="button" disabled={busy} onClick={disable} className={buttonClass}>Turn off notifications</button> : <button type="button" disabled={busy || !canSync || !configured || !supported || permission === 'denied'} onClick={enable} className={buttonClass}>Enable notifications</button>}
                {pending && configured && <button type="button" disabled={busy || !canSync} onClick={retry} className={buttonClass}>Retry sync</button>}
                {enabled && needsReconnect && <button type="button" disabled={busy || !canSync || !supported || permission === 'denied'} onClick={enable} className={buttonClass}>Reconnect notifications</button>}
            </div>
            {configured && <p className="mt-2 wrap-anywhere">When enabled, this device’s push subscription, reminder task titles, and scheduled times are sent to the reminder service. Offline changes sync when you reopen the app online. Delivery depends on your connection and device settings.</p>}
        </section>
    );
}
