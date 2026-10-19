import { useEffect, useId, useRef, useState } from "react";
import { getTaskCategoryId, isTaskFromToday } from "./categoryUtils";

export function SideBar({
    todoList,
    deletedCount = 0,
    today = new Date(),
    categories = [],
    activeView = { type: "all" },
    onSelectView,
    onCreateCategory,
    onRenameCategory,
    onDeleteCategory,
}) {
    const [editor, setEditor] = useState(null);
    const [categoryName, setCategoryName] = useState("");
    const [editorError, setEditorError] = useState("");
    const plusRef = useRef(null);
    const editorInputRef = useRef(null);
    const returnFocusRef = useRef(null);
    const editorInputId = useId();
    const editorErrorId = `${editorInputId}-error`;

    const completedTasks = todoList.filter(todo => todo.completed).length;
    const todayTasks = todoList.filter(task => isTaskFromToday(task, today)).length;
    const categoryCounts = new Map(categories.map(category => [category.id, 0]));
    let uncategorizedTasks = 0;

    for (const task of todoList) {
        const categoryId = getTaskCategoryId(task, categories);
        if (categoryId) {
            categoryCounts.set(categoryId, categoryCounts.get(categoryId) + 1);
        } else {
            uncategorizedTasks += 1;
        }
    }

    useEffect(() => {
        if (editor) editorInputRef.current?.focus();
    }, [editor]);

    function openEditor(event, category) {
        returnFocusRef.current = event.currentTarget;
        setCategoryName(category?.name ?? "");
        setEditorError("");
        setEditor(category ? { type: "rename", id: category.id } : { type: "create" });
    }

    function closeEditor() {
        setEditor(null);
        setCategoryName("");
        setEditorError("");
        window.requestAnimationFrame(() => {
            const trigger = returnFocusRef.current;
            if (trigger?.isConnected) trigger.focus();
            else plusRef.current?.focus();
        });
    }

    function handleCategorySubmit(event) {
        event.preventDefault();
        if (!categoryName.trim()) {
            setEditorError("Give your category a name.");
            editorInputRef.current?.focus();
            return;
        }

        const result = editor.type === "create"
            ? onCreateCategory(categoryName)
            : onRenameCategory(editor.id, categoryName);

        if (!result.ok) {
            setEditorError(result.error);
            editorInputRef.current?.focus();
            return;
        }

        closeEditor();
    }

    function handleCategoryDelete(categoryId) {
        if (!onDeleteCategory(categoryId)) return;
        if (editor?.id === categoryId) {
            setEditor(null);
            setCategoryName("");
            setEditorError("");
        }
        window.requestAnimationFrame(() => plusRef.current?.focus());
    }

    function filterButtonClass(isActive, compact = false) {
        return `flex min-w-0 cursor-pointer items-center justify-between rounded-lg text-sm font-semibold text-[#B77996] hover:bg-[#f2b5cc] dark:hover:bg-night-hover xl:text-base ${compact ? "gap-1 px-1 py-2" : "gap-1.5 p-2"} ${isActive
            ? "bg-[#F4A7C1]/35 dark:bg-night-soft dark:text-night-accent"
            : "dark:text-night-muted"}`;
    }

    const categoryControlClass = "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#B77996] hover:bg-[#f2b5cc] dark:text-night-muted dark:hover:bg-night-hover";

    return (
        <aside className="min-w-0 rounded-xl shadow-sm shadow-[#B77996] bg-[#FFE4EF] border border-[#f8f0f3] p-4 m-4 dark:border-night-border dark:bg-night-panel dark:shadow-night-shadow/60">
            <div className="flex flex-col gap-3 border-b border-[#f2b5cc] pb-4 font-body dark:border-night-border">
                <button type="button" aria-pressed={activeView.type === "today"} onClick={() => onSelectView({ type: "today" })} className={filterButtonClass(activeView.type === "today")}>
                    <span className="flex min-w-0 items-center gap-2">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-house-heart shrink-0" viewBox="0 0 16 16">
                            <path d="M8 6.982C9.664 5.309 13.825 8.236 8 12 2.175 8.236 6.336 5.309 8 6.982"/>
                            <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.707L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.646a.5.5 0 0 0 .708-.707L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
                        </svg>
                        <span className="min-w-0 truncate">Today</span>
                    </span>
                    <span className="shrink-0 font-mali dark:text-night-accent">{todayTasks}</span>
                </button>

                <button type="button" aria-pressed={activeView.type === "all"} onClick={() => onSelectView({ type: "all" })} className={filterButtonClass(activeView.type === "all")}>
                    <span className="flex min-w-0 items-center gap-2">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-calendar-heart shrink-0" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4zM1 14V4h14v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1m7-6.507c1.664-1.711 5.825 1.283 0 5.132-5.825-3.85-1.664-6.843 0-5.132"/>
                        </svg>
                        <span className="min-w-0 truncate">Total</span>
                    </span>
                    <span className="shrink-0 font-mali dark:text-night-accent">{todoList.length}</span>
                </button>

                <button type="button" aria-pressed={activeView.type === "completed"} onClick={() => onSelectView({ type: "completed" })} className={filterButtonClass(activeView.type === "completed")}>
                    <span className="flex min-w-0 items-center gap-2">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span className="min-w-0 truncate">Completed</span>
                    </span>
                    <span className="shrink-0 font-mali dark:text-night-accent">{completedTasks}</span>
                </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                <h2 className="text-[#B77996] font-body font-bold dark:text-night-accent">Categories</h2>
                <button ref={plusRef} type="button" aria-label="Create category" aria-expanded={editor?.type === "create"} onClick={event => openEditor(event)} className={`${categoryControlClass} transition-transform hover:-translate-y-0.5 duration-200`}>
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="#B77996" className="dark:fill-night-accent" d="M18 10h-4V6a2 2 0 0 0-4 0l.071 4H6a2 2 0 0 0 0 4l4.071-.071L10 18a2 2 0 0 0 4 0v-4.071L18 14a2 2 0 0 0 0-4"/></svg>
                </button>
            </div>

            {editor && (
                <form className="my-2 min-w-0 rounded-xl border border-[#e8b4c9] bg-white/35 p-2 dark:border-night-border dark:bg-night-field" onSubmit={handleCategorySubmit} onKeyDown={event => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        closeEditor();
                    }
                }}>
                    <label htmlFor={editorInputId} className="mb-1 block font-body text-xs font-semibold text-[#A3637C] dark:text-night-accent">
                        {editor.type === "create" ? "New category" : "Rename category"}
                    </label>
                    <input ref={editorInputRef} id={editorInputId} type="text" value={categoryName} maxLength={40} aria-invalid={Boolean(editorError)} aria-describedby={editorError ? editorErrorId : undefined} onChange={event => {
                        setCategoryName(event.target.value);
                        setEditorError("");
                    }} className="block min-h-9 w-full min-w-0 rounded-lg border border-[#d9aabd] bg-white/60 px-2 font-body text-sm text-[#823b56] dark:border-night-control-border dark:bg-night-field dark:text-night-text" />
                    {editorError && <p id={editorErrorId} role="alert" className="mt-1 font-body text-xs text-[#9D3F62] wrap-anywhere dark:text-night-accent">{editorError}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="submit" className="min-h-8 cursor-pointer rounded-lg border border-[#D493AE] bg-[#F4A7C1]/35 px-2 font-body text-xs font-semibold text-[#823B56] hover:bg-[#f2b5cc] dark:border-night-control-border dark:bg-night-soft dark:text-night-soft-ink dark:hover:bg-night-hover">Save</button>
                        <button type="button" onClick={closeEditor} className="min-h-8 cursor-pointer rounded-lg px-2 font-body text-xs text-[#A3637C] hover:bg-[#f2b5cc] dark:text-night-muted dark:hover:bg-night-hover">Cancel</button>
                    </div>
                </form>
            )}

            <div className="mt-1 flex min-w-0 flex-col gap-1 font-body">
                <button type="button" aria-pressed={activeView.type === "uncategorized"} onClick={() => onSelectView({ type: "uncategorized" })} className={filterButtonClass(activeView.type === "uncategorized")}>
                    <span className="min-w-0 truncate">Uncategorized</span>
                    <span className="shrink-0 font-mali dark:text-night-accent">{uncategorizedTasks}</span>
                </button>
                <button type="button" aria-label={`Deleted Tasks, ${deletedCount} deleted tasks`} title="Deleted Tasks" aria-pressed={activeView.type === "deleted"} onClick={() => onSelectView({ type: "deleted" })} className={filterButtonClass(activeView.type === "deleted")}>
                    <span className="flex min-w-0 items-center gap-1">
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0"><path d="M3 6h14M7 6V3h6v3M5 6l1 11h8l1-11M8 9v5M12 9v5" /></svg>
                        <span className="min-w-0 truncate">Deleted Tasks</span>
                    </span>
                    <span className="shrink-0 font-mali dark:text-night-accent">{deletedCount}</span>
                </button>
                {categories.map(category => (
                    <div key={category.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-0.5">
                        <button type="button" aria-label={`${category.name}, ${categoryCounts.get(category.id)} tasks`} title={category.name} aria-pressed={activeView.type === "category" && activeView.categoryId === category.id} onClick={() => onSelectView({ type: "category", categoryId: category.id })} className={filterButtonClass(activeView.type === "category" && activeView.categoryId === category.id, true)}>
                            <span className="min-w-0 truncate">{category.name}</span>
                            <span className="shrink-0 font-mali text-xs dark:text-night-accent">{categoryCounts.get(category.id)}</span>
                        </button>
                        <button type="button" aria-label={`Rename ${category.name}`} title={`Rename ${category.name}`} onClick={event => openEditor(event, category)} className={categoryControlClass}>
                            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="m12.5 3.5 4 4M3 17l4.5-1 10-10a1.4 1.4 0 0 0 0-2l-1.5-1.5a1.4 1.4 0 0 0-2 0l-10 10z" /></svg>
                        </button>
                        <button type="button" aria-label={`Delete ${category.name}`} title={`Delete ${category.name}`} onClick={() => handleCategoryDelete(category.id)} className={categoryControlClass}>
                            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M3 6h14M7 6V3h6v3M5 6l1 11h8l1-11M8 9v5M12 9v5" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </aside>
    );
}
