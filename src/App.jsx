import { useState, useEffect, useRef, useCallback } from 'react'
import { SideBar } from './SideBar';
import { Navigation } from './Navigation';
import { Greetings } from './Greetings';
import { Widgets } from './Widgets';
import { TaskSection } from './TaskSection';
import { Toast } from './Toast';
import { useCurrentDate } from './useCurrentDate';
import { getTaskCategoryId, isTaskFromToday, normalizeCategoryName, readSavedCategories } from './categoryUtils';


function App() {
    const today = useCurrentDate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [categories, setCategories] = useState(readSavedCategories);
    const [activeView, setActiveView] = useState({ type: 'all' });
    const [newTaskCategoryId, setNewTaskCategoryId] = useState('');
    const taskHeadingRef = useRef(null);
    const menuButtonRef = useRef(null);
    const sidebarRef = useRef(null);
    const [toasts, setToasts] = useState([]);
    const toastSequence = useRef(0);

    const showToast = useCallback((type, message) => {
        const id = ++toastSequence.current;
        setToasts(current => [...current, { id, type, message }]);
    }, []);

    const dismissToast = useCallback(id => {
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);

    const handleTimerComplete = useCallback(() => {
        showToast('timer', 'Focus session complete! Time for a little break ♡');
    }, [showToast]);

    useEffect(() => {
        if (!isMenuOpen) return;

        const closeOnEscape = event => {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        const closeOnOutsideClick = event => {
            if (!sidebarRef.current?.contains(event.target) &&
                !menuButtonRef.current?.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        const desktop = window.matchMedia("(min-width: 64rem)");
        const closeOnDesktop = event => {
            if (event.matches) setIsMenuOpen(false);
        };

        document.addEventListener("keydown", closeOnEscape);
        document.addEventListener("pointerdown", closeOnOutsideClick);
        desktop.addEventListener("change", closeOnDesktop);
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            desktop.removeEventListener("change", closeOnDesktop);
        };
    }, [isMenuOpen]);

    const [todoList, setTodoList] = useState(() => {
        const saved = localStorage.getItem("todos");

        return saved? JSON.parse(saved) : [];
    })


    useEffect(()=>{
        localStorage.setItem("todos", JSON.stringify(todoList));

        
    }, [todoList]);

    useEffect(() => {
        try {
            localStorage.setItem('todoCategories', JSON.stringify(categories));
        } catch {
            // Categories remain usable for this visit when saving is unavailable.
        }
    }, [categories]);


    const [newTasks, setNewTasks] = useState("");

        const removeTask = tasksId => {
            if (!todoList.some(task => task.id === tasksId && !task.deletedAt)) return;
            const deletedAt = new Date().toISOString();
            setTodoList(current => current.map(task =>
                task.id === tasksId && !task.deletedAt ? { ...task, deletedAt } : task));
            showToast('delete', 'Task moved to Deleted Tasks ♡');
            window.requestAnimationFrame(() => taskHeadingRef.current?.focus({ preventScroll: true }));
        }

        const restoreTask = tasksId => {
            if (!todoList.some(task => task.id === tasksId && task.deletedAt)) return;
            setTodoList(current => current.map(task => {
                if (task.id !== tasksId || !task.deletedAt) return task;
                const restoredTask = { ...task };
                delete restoredTask.deletedAt;
                return restoredTask;
            }));
            showToast('add', 'Task restored ♡');
            window.requestAnimationFrame(() => taskHeadingRef.current?.focus({ preventScroll: true }));
        }

        const handleToggle = (idToToggle) => {
            setTodoList(current => current.map(task => {
                if(task.id === idToToggle && !task.deletedAt){
                    return {...task, completed: !task.completed}
                }

                return task;
            }))
        }

        function addTask(newlyAddedTasks){
            setTodoList(current => [...current, newlyAddedTasks]);
            showToast('add', 'Task added ♡');
        }

        function handleSubmit(e){
            e.preventDefault();
            if(!newTasks.trim()) return;

            const createdAt = new Date();

            const updatedTask = {
                id: createdAt.getTime(),
                createdAt: createdAt.toISOString(),
                task: newTasks,
                completed: false,
                categoryId: categories.some(category => category.id === newTaskCategoryId) ? newTaskCategoryId : null,
            };

            addTask(updatedTask);
            setNewTasks("");
            if (activeView.type === 'completed' || activeView.type === 'deleted') setActiveView({ type: 'all' });
            else if ((activeView.type === 'category' && activeView.categoryId !== updatedTask.categoryId) ||
                (activeView.type === 'uncategorized' && updatedTask.categoryId)) {
                setActiveView(updatedTask.categoryId ? { type: 'category', categoryId: updatedTask.categoryId } : { type: 'uncategorized' });
            }
        }

    function selectView(view) {
        setActiveView(view);
        setNewTaskCategoryId(view.type === 'category' ? view.categoryId : '');
        if (isMenuOpen) {
            setIsMenuOpen(false);
            window.requestAnimationFrame(() => taskHeadingRef.current?.focus());
        }
    }

    function validateCategoryName(rawName, exceptId) {
        const name = normalizeCategoryName(rawName);
        if (!name) return { ok: false, error: 'Enter a category name.' };
        if (name.toLowerCase() === 'uncategorized') return { ok: false, error: 'Uncategorized is reserved for tasks without a category.' };
        if (name.toLowerCase() === 'deleted tasks') return { ok: false, error: 'Deleted Tasks is reserved for removed tasks.' };
        if (name.length > 40) return { ok: false, error: 'Use 40 characters or fewer.' };
        if (categories.some(category => category.id !== exceptId && category.name.toLowerCase() === name.toLowerCase())) {
            return { ok: false, error: 'A category with this name already exists.' };
        }
        return { ok: true, name };
    }

    function createCategory(rawName) {
        const result = validateCategoryName(rawName);
        if (!result.ok) return result;
        const category = { id: crypto.randomUUID(), name: result.name };
        setCategories(current => [...current, category]);
        setActiveView({ type: 'category', categoryId: category.id });
        setNewTaskCategoryId(category.id);
        showToast('add', 'Category added ♡');
        return { ok: true, id: category.id };
    }

    function renameCategory(id, rawName) {
        const category = categories.find(item => item.id === id);
        if (!category) return { ok: false, error: 'This category is no longer available.' };
        const result = validateCategoryName(rawName, id);
        if (!result.ok) return result;
        if (category.name !== result.name) {
            setCategories(current => current.map(item => item.id === id ? { ...item, name: result.name } : item));
            showToast('add', 'Category updated ♡');
        }
        return { ok: true };
    }

    function deleteCategory(id) {
        if (!categories.some(category => category.id === id)) return false;
        setCategories(current => current.filter(category => category.id !== id));
        setTodoList(current => current.map(task => task.categoryId === id ? { ...task, categoryId: null } : task));
        if (activeView.type === 'category' && activeView.categoryId === id) setActiveView({ type: 'all' });
        if (newTaskCategoryId === id) setNewTaskCategoryId('');
        showToast('delete', 'Category deleted. Tasks kept in Uncategorized ♡');
        return true;
    }

    function clearFilters() {
        selectView({ type: 'all' });
        setSearchQuery('');
    }

    const activeTasks = todoList.filter(task => !task.deletedAt);
    const deletedTasks = todoList.filter(task => task.deletedAt);
    const isDeletedView = activeView.type === 'deleted';
    const viewedCategory = activeView.type === 'category' ? categories.find(category => category.id === activeView.categoryId) : null;
    const viewTitle = viewedCategory?.name ?? ({ all: 'Your tasks', today: 'Today', completed: 'Completed', uncategorized: 'Uncategorized', deleted: 'Deleted Tasks' }[activeView.type] ?? 'Your tasks');
    const hasActiveFilters = activeView.type !== 'all' || Boolean(searchQuery.trim());
    const visibleTasks = (isDeletedView ? deletedTasks : activeTasks).filter(todo => {
        if (activeView.type === 'today' && !isTaskFromToday(todo, today)) return false;
        if (activeView.type === 'completed' && !todo.completed) return false;
        if (activeView.type === 'category' && getTaskCategoryId(todo, categories) !== activeView.categoryId) return false;
        if (activeView.type === 'uncategorized' && getTaskCategoryId(todo, categories)) return false;
        return todo.task.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
    const emptyMessage = searchQuery.trim() ? (isDeletedView ? 'No deleted tasks match your search.' : 'No tasks match your search.') :
        isDeletedView ? 'No deleted tasks yet.' :
        viewedCategory ? `No tasks in ${viewedCategory.name} yet.` :
        activeView.type === 'today' ? 'No tasks added today.' :
        activeView.type === 'completed' ? 'No completed tasks yet.' :
        activeView.type === 'uncategorized' ? 'No uncategorized tasks.' :
        'Task is empty! Add task above.';

    return(
        <>
            <Toast toasts={toasts} onDismiss={dismissToast}/>
            <Navigation
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(open => !open)}
                menuButtonRef={menuButtonRef}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
            <div className='grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)]'>
                <div ref={sidebarRef} id="task-navigation" className={`${isMenuOpen ? 'block' : 'hidden'} min-w-0 lg:block`}>
                    <SideBar
                        todoList={activeTasks}
                        deletedCount={deletedTasks.length}
                        today={today}
                        categories={categories}
                        activeView={activeView}
                        onSelectView={selectView}
                        onCreateCategory={createCategory}
                        onRenameCategory={renameCategory}
                        onDeleteCategory={deleteCategory}
                    />
                </div>
                <div className='min-w-0'>
                    <Greetings today={today}/>
                    <TaskSection
                        todoList={visibleTasks}
                        today={today}
                        isSearching={Boolean(searchQuery.trim())}
                        newTasks={newTasks}
                        setNewTasks={setNewTasks}
                        removeTask={removeTask}
                        restoreTask={restoreTask}
                        isDeletedView={isDeletedView}
                        handleToggle={handleToggle}
                        handleSubmit={handleSubmit}
                        viewTitle={viewTitle}
                        emptyMessage={emptyMessage}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                        headingRef={taskHeadingRef}
                    />
                </div>
                <Widgets todoList={activeTasks} onTimerComplete={handleTimerComplete}/>
            </div>
            

    
        </>
            )
}

export default App
