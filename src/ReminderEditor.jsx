import { useId, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { formatDueDate, getReminderTime, REMINDER_OFFSETS } from "./reminders";
import { readUpdateSnapshot, useUpdateSnapshot } from "./updateSession";

function localDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dueDateFromInput(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ReminderEditor({ task, onSave, onClose, deliveryMessage }) {
    const snapshotKey = `reminder-editor:${task.id}`;
    const restoredDraft = readUpdateSnapshot(snapshotKey);
    const [dueValue, setDueValue] = useState(() => restoredDraft?.dueValue ?? localDateTime(task.dueAt));
    const [enabled, setEnabled] = useState(() => restoredDraft?.enabled ?? Boolean(task.reminder?.enabled));
    const [offsetMinutes, setOffsetMinutes] = useState(() => {
        const offset = restoredDraft?.offsetMinutes ?? task.reminder?.offsetMinutes ?? 0;
        return REMINDER_OFFSETS.some(option => option.value === offset) ? offset : 0;
    });
    const [error, setError] = useState("");
    const dateInputRef = useRef(null);
    const dateInputId = useId();
    const reminderInputId = useId();
    const offsetInputId = useId();
    const errorId = useId();
    useUpdateSnapshot(snapshotKey, () => ({ dueValue, enabled, offsetMinutes }));

    const dueAt = dueDateFromInput(dueValue);
    const reminderTime = enabled && dueAt ? getReminderTime({ dueAt, reminder: { enabled, offsetMinutes } }) : null;
    const inputClass = "block min-h-11 w-full min-w-0 max-w-full appearance-none rounded-xl border border-[#D9AABD] bg-[#FFF0F4] px-3 py-2 font-body text-base text-[#823B56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A85F80] dark:border-night-control-border dark:bg-night-field dark:text-night-text dark:focus-visible:outline-night-primary";
    const secondaryButtonClass = "min-h-10 cursor-pointer rounded-xl border border-[#E8B4C9] px-3 py-2 font-body text-sm font-semibold text-[#A3637C] hover:bg-[#FFE3EE] dark:border-night-control-border dark:text-night-soft-ink dark:hover:bg-night-hover";

    function saveReminder(event) {
        event.preventDefault();
        if (dueValue && !dueAt) {
            setError("Choose a valid date and time.");
            dateInputRef.current?.focus();
            return;
        }
        const result = onSave({ dueAt, reminder: { enabled, offsetMinutes } });
        if (!result?.ok) {
            setError(result?.error || "The reminder could not be saved. Please try again.");
            dateInputRef.current?.focus();
            return;
        }
        onClose();
    }

    function removeDueDate() {
        setDueValue("");
        setEnabled(false);
        setError("");
        dateInputRef.current?.focus();
    }

    return (
        <Dialog title="Due date & reminder" description="Choose when this task is due and whether you’d like a reminder." onClose={onClose} initialFocusRef={dateInputRef}>
            <form onSubmit={saveReminder} className="min-w-0">
                <p className="mb-4 rounded-xl bg-[#FFF0F5] px-3 py-2 font-gummy text-sm text-[#A3637C] wrap-anywhere dark:bg-night-soft dark:text-night-soft-ink">{task.task}</p>
                <div className="min-w-0">
                    <label htmlFor={dateInputId} className="mb-1 block font-body text-sm font-semibold text-[#A3637C] dark:text-night-accent">Due date and time</label>
                    <input ref={dateInputRef} id={dateInputId} type="datetime-local" step="60" value={dueValue} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={event => { setDueValue(event.target.value); setError(""); }} className={inputClass} />
                    <p className="mt-1 font-body text-xs text-[#A3637C] dark:text-night-muted">Uses this device’s local time.</p>
                    {dueValue && <button type="button" onClick={removeDueDate} className="mt-1 min-h-9 cursor-pointer rounded-lg px-1 font-body text-xs font-semibold text-[#A3637C] underline underline-offset-4 dark:text-night-soft-ink">Remove due date</button>}
                </div>
                <div className="mt-4 min-w-0 rounded-xl border border-[#E8B4C9] p-3 dark:border-night-border">
                    <label htmlFor={reminderInputId} className="flex cursor-pointer items-center gap-2 font-body text-sm font-semibold text-[#A3637C] dark:text-night-accent">
                        <input id={reminderInputId} type="checkbox" checked={enabled} onChange={event => { setEnabled(event.target.checked); setError(""); }} className="size-5 shrink-0 accent-[#BF6F8D] dark:accent-night-primary" />
                        Remind me
                    </label>
                    {deliveryMessage && <p className="mt-2 font-body text-xs text-[#A3637C] wrap-anywhere dark:text-night-muted">{deliveryMessage}</p>}
                    <label htmlFor={offsetInputId} className="mb-1 mt-3 block font-body text-xs font-semibold text-[#A3637C] dark:text-night-muted">Reminder time</label>
                    <select id={offsetInputId} value={offsetMinutes} disabled={!enabled} onChange={event => { setOffsetMinutes(Number(event.target.value)); setError(""); }} className={`${inputClass} disabled:opacity-60`}>
                        {REMINDER_OFFSETS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {enabled && Number.isFinite(reminderTime) && <p className="mt-2 font-body text-xs text-[#A3637C] wrap-anywhere dark:text-night-muted">Reminder: {formatDueDate(new Date(reminderTime).toISOString())}</p>}
                    {enabled && <button type="button" onClick={() => { setEnabled(false); setError(""); }} className="mt-2 min-h-9 cursor-pointer rounded-lg px-1 font-body text-xs font-semibold text-[#A3637C] underline underline-offset-4 dark:text-night-soft-ink">Cancel reminder</button>}
                </div>
                {error && <p id={errorId} role="alert" className="mt-3 font-body text-sm text-[#9D3F62] wrap-anywhere dark:text-night-accent">{error}</p>}
                <div className="mt-5 flex min-w-0 flex-wrap justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
                    <button type="submit" className="min-h-10 cursor-pointer rounded-xl border border-[#A3637C] bg-[#F4A7C1] px-4 py-2 font-mali text-sm font-semibold text-[#823B56] transition-colors hover:bg-[#D17699] hover:text-white dark:border-night-control-border dark:bg-night-primary dark:text-night-primary-ink dark:hover:bg-night-accent">Save changes</button>
                </div>
            </form>
        </Dialog>
    );
}
