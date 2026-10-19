import { useEffect, useState } from "react";

function ToastIcon({ type }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 shrink-0"
        >
            {type === "timer" ? (
                <>
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l3 2M9 2h6M12 2v3M18 5l2 2" />
                </>
            ) : type === "delete" ? (
                <>
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" />
                </>
            ) : (
                <>
                    <path d="M20 11v1a8 8 0 1 1-4.6-7.3" />
                    <path d="m8 11 3 3 9-10" />
                </>
            )}
        </svg>
    );
}

function ToastItem({ toast, onDismiss }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPaused = isHovered || isFocused;

    useEffect(() => {
        if (isPaused) return;

        const timeout = window.setTimeout(() => {
            onDismiss(toast.id);
        }, toast.type === "timer" ? 6000 : 4000);

        return () => window.clearTimeout(timeout);
    }, [toast.id, toast.type, onDismiss, isPaused]);

    function handlePointerEnter(event) {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
            setIsHovered(true);
        }
    }

    function handlePointerLeave(event) {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
            setIsHovered(false);
        }
    }

    return (
        <div
            className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-[#E8A7C0] bg-[#FFF4F8] p-3 text-[#823B56] shadow-lg shadow-[#B77996]/20 motion-safe:animate-[toast-enter_180ms_ease-out] dark:border-night-border dark:bg-night-card dark:text-night-soft-ink dark:shadow-night-shadow/40"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
            onFocus={() => setIsFocused(true)}
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsFocused(false);
                }
            }}
        >
            <ToastIcon type={toast.type} />
            <p className="min-w-0 flex-1 font-mali text-sm [overflow-wrap:anywhere]">
                {toast.message}
            </p>
            <button
                type="button"
                aria-label="Dismiss notification"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#F4A7C1]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A85F80] dark:hover:bg-night-hover dark:focus-visible:outline-night-primary"
                onClick={() => onDismiss(toast.id)}
            >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-4">
                    <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
            </button>
        </div>
    );
}

export function Toast({ toasts, onDismiss }) {
    return (
        <div
            role="log"
            aria-label="Notifications"
            aria-live="polite"
            aria-relevant="additions"
            aria-atomic="false"
            className="pointer-events-none fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-sm flex-col gap-2"
        >
            {toasts.slice(0, 3).map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}
