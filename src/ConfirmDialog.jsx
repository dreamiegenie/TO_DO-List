import { useRef, useState } from "react";
import { Dialog } from "./Dialog";

export function ConfirmDialog({ title, description, confirmLabel = "Delete permanently", onConfirm, onClose }) {
    const cancelRef = useRef(null);
    const [error, setError] = useState("");

    return (
        <Dialog title={title} description={description} onClose={onClose} initialFocusRef={cancelRef}>
            {error && <p role="alert" className="mt-3 text-sm text-[#9D3F62] [overflow-wrap:anywhere] dark:text-night-accent">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button ref={cancelRef} type="button" onClick={onClose} className="min-h-10 cursor-pointer rounded-xl border border-[#D493AE] bg-white/50 px-3 py-2 font-semibold text-[#823B56] hover:bg-[#F4A7C1]/25 dark:border-night-control-border dark:bg-night-field dark:text-night-text dark:hover:bg-night-hover">Cancel</button>
                <button type="button" onClick={() => {
                    const result = onConfirm();
                    if (result?.ok === false) {
                        setError(result.error || "This could not be deleted. Please try again.");
                        return;
                    }
                    onClose();
                }} className="min-h-10 cursor-pointer rounded-xl border border-[#A3637C] bg-[#F4A7C1] px-3 py-2 font-semibold text-[#823B56] hover:bg-[#E8A7C0] dark:border-night-control-border dark:bg-night-primary dark:text-night-primary-ink dark:hover:bg-night-accent">{confirmLabel}</button>
            </div>
        </Dialog>
    );
}
