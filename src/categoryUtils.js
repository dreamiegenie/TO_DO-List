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
    let createdAt = task.createdAt == null || task.createdAt === '' ? new Date(NaN) : new Date(task.createdAt);
    // Earlier tasks store their creation time in their numeric id.
    if (Number.isNaN(createdAt.getTime()) && typeof task.id === 'number') createdAt = new Date(task.id);
    return !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === today.getFullYear() &&
        createdAt.getMonth() === today.getMonth() &&
        createdAt.getDate() === today.getDate();
}
