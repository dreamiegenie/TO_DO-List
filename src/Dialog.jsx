import { useEffect, useId, useRef } from "react";

export function Dialog({ title, description, children, onClose, initialFocusRef }) {
    const dialogRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousFocus = document.activeElement;
        if (!dialog.open) dialog.showModal();
        const firstControl = initialFocusRef?.current ?? dialog.querySelector("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex='0']");
        (firstControl ?? dialog).focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                previousFocus.focus({ preventScroll: true });
            }
        };
    }, [initialFocusRef]);

    function handleKeyDown(event) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
            return;
        }
        if (event.key !== "Tab") return;

        const controls = [...dialogRef.current.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
            .filter(control => control.getClientRects().length > 0 && !control.closest("[inert]"));
        if (!controls.length) {
            event.preventDefault();
            dialogRef.current.focus();
            return;
        }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <dialog
            ref={dialogRef}
            tabIndex={-1}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onKeyDown={handleKeyDown}
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#E8A7C0] bg-[#FFF4F8] p-4 font-body text-[#823B56] shadow-2xl shadow-[#B77996]/20 backdrop:bg-[#211A26]/45 dark:border-night-border dark:bg-night-panel dark:text-night-text dark:shadow-night-shadow/50"
        >
            <h2 id={titleId} className="font-mali text-lg font-bold text-[#A3637C] [overflow-wrap:anywhere] dark:text-night-accent">{title}</h2>
            {description && <p id={descriptionId} className="mt-2 text-sm text-[#A3637C] [overflow-wrap:anywhere] dark:text-night-muted">{description}</p>}
            {children}
        </dialog>
    );
}
