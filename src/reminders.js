export const REMINDER_OFFSETS = [
    { value: 0, label: 'At the scheduled time' },
    { value: 15, label: '15 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
];

export function getReminderTime(task) {
    if (!task || task.completed || task.deletedAt || !task.reminder?.enabled || !task.dueAt) return null;
    const due = Date.parse(task.dueAt);
    const offset = task.reminder.offsetMinutes ?? 0;
    return Number.isFinite(due) && REMINDER_OFFSETS.some(option => option.value === offset)
        ? due - offset * 60000 : null;
}

export function getUpcomingReminders(tasks, now = Date.now()) {
    return tasks.filter(task => {
        const time = getReminderTime(task);
        return time !== null && time > Number(now);
    }).sort((a, b) => getReminderTime(a) - getReminderTime(b));
}

export function formatDueDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(date);
}

export function validateReminder(patch, task, now = Date.now()) {
    if (!patch || !patch.reminder || typeof patch.reminder.enabled !== 'boolean') return { ok: false, error: 'Choose whether to enable the reminder.' };
    const { enabled, offsetMinutes } = patch.reminder;
    if (!REMINDER_OFFSETS.some(option => option.value === offsetMinutes)) return { ok: false, error: 'Choose a reminder time from the list.' };
    const due = patch.dueAt === null ? null : Date.parse(patch.dueAt);
    if (due !== null && !Number.isFinite(due)) return { ok: false, error: 'Choose a valid due date and time.' };
    if (enabled && due === null) return { ok: false, error: 'Choose a due date and time before enabling a reminder.' };
    if (enabled && task.completed) return { ok: false, error: 'Mark this task incomplete before enabling its reminder.' };
    if (enabled && due - offsetMinutes * 60000 <= Number(now)) return { ok: false, error: 'Choose a reminder time in the future, or turn the reminder off.' };
    return { ok: true, dueAt: due === null ? null : new Date(due).toISOString(), reminder: { enabled, offsetMinutes } };
}

export function toReminderSnapshot(tasks) {
    return tasks.filter(task => getReminderTime(task) !== null).sort((a, b) => String(a.id).localeCompare(String(b.id))).map(task => ({
        taskId: String(task.id),
        revision: task.reminder.revision,
        dueAt: task.dueAt,
        offsetMinutes: task.reminder.offsetMinutes ?? 0,
        taskTitle: task.task.slice(0, 200),
    }));
}
