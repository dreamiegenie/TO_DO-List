import { getTaskCreatedAt, isSameCalendarDay } from "./taskDates.js";

export function normalizeCategoryName(name) {
    return name.trim().replace(/\s+/g, ' ');
}

export function readSavedCategories() {
    try {
        const saved = JSON.parse(window.localStorage.getItem('todoCategories') ?? '[]');
        if (!Array.isArray(saved)) return [];
        const ids = new Set();
        const names = new Set();
        return saved.flatMap(category => {
            if (!category || typeof category.id !== 'string' || !category.id || typeof category.name !== 'string') return [];
            const name = normalizeCategoryName(category.name);
            if (!name || ids.has(category.id) || names.has(name.toLowerCase())) return [];
            ids.add(category.id);
            names.add(name.toLowerCase());
            return [{ id: category.id, name }];
        });
    } catch {
        return [];
    }
}

export function getTaskCategoryId(task, categories) {
    return categories.some(category => category.id === task.categoryId) ? task.categoryId : '';
}

export function isTaskFromToday(task, today = new Date()) {
    const createdAt = getTaskCreatedAt(task);
    return createdAt !== null && isSameCalendarDay(createdAt, today);
}
