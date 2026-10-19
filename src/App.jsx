import { useState, useEffect, useRef, useCallback } from 'react'
import { SideBar } from './SideBar';
import { Navigation } from './Navigation';
import { Greetings } from './Greetings';
import { Widgets } from './Widgets';
import { TaskSection } from './TaskSection';
import { Toast } from './Toast';


function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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


    const [newTasks, setNewTasks] = useState("");

        const removeTask = tasksId => {
            if (!todoList.some(task => task.id === tasksId)) return;
            setTodoList(current => current.filter(task => task.id !== tasksId));
            showToast('delete', 'Task deleted ♡');
        }

        const handleToggle = (idToToggle) => {
            setTodoList(todoList.map(task => {
                if(task.id === idToToggle){
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
                task: newTasks,
                completed: false,
            };

            addTask(updatedTask);
            setNewTasks("");
        }


    const visibleTasks = todoList.filter(todo =>
        todo.task.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

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
                    <SideBar todoList={todoList}/>
                </div>
                <div className='min-w-0'>
                    <Greetings/>
                    <TaskSection
                        todoList={visibleTasks}
                        isSearching={Boolean(searchQuery.trim())}
                        newTasks={newTasks}
                        setNewTasks={setNewTasks}
                        removeTask={removeTask}
                        handleToggle={handleToggle}
                        handleSubmit={handleSubmit}
                    />
                </div>
                <Widgets todoList={todoList} onTimerComplete={handleTimerComplete}/>
            </div>
            

    
        </>
            )
}

export default App
