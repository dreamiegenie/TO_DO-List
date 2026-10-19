export function getTaskCreatedAt(task) {
    const value = task.createdAt;
    if ((typeof value === "string" && value.trim()) ||
        (typeof value === "number" && Number.isFinite(value))) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date;
    }

    // Older saved tasks use their numeric ID as the creation timestamp.
    if (typeof task.id === "number" && Number.isFinite(task.id)) {
        const date = new Date(task.id);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
}

export function isSameCalendarDay(first, second) {
    return first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate();
}

export function formatTaskTimestamp(task, today = new Date()) {
    const createdAt = getTaskCreatedAt(task);
    if (!createdAt) return typeof task.timestamp === "string" ? task.timestamp : "";

    // Compare local calendar dates instead of 24-hour periods across DST changes.
    const calendarDay = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = (calendarDay(today) - calendarDay(createdAt)) / 86400000;
    let dayLabel;
    if (daysAgo === 0) dayLabel = "Today";
    else if (daysAgo === 1) dayLabel = "Yesterday";
    else if (daysAgo > 1 && daysAgo < 7) dayLabel = createdAt.toLocaleDateString(undefined, { weekday: "long" });
    else dayLabel = createdAt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(createdAt.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
    });

    const time = createdAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${dayLabel}, ${time}`;
}
