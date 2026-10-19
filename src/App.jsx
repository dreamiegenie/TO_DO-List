import { useState, useEffect} from 'react'
import './App.css';
import { SideBar } from './SideBar';
import { Navigation } from './Navigation';
import { Greetings } from './Greetings';
import { Widgets } from './Widgets';
import { TaskSection } from './TaskSection';


function App() {


    const [todoList, setTodoList] = useState(() => {
        const saved = localStorage.getItem("todos");

        return saved? JSON.parse(saved) : [];
    })


    useEffect(()=>{
        localStorage.setItem("todos", JSON.stringify(todoList));

        
    }, [todoList]);


    const [newTasks, setNewTasks] = useState("");

        const removeTask = tasksId => {
            setTodoList(todoList.filter(taskList => taskList.id !== tasksId))
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
            setTodoList([...todoList, newlyAddedTasks]);
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


    return(
        <>
            <Navigation/>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-[1fr_3fr_1fr] lg:gap-0'>
                <div className='hidden lg:block'>
                    <SideBar todoList={todoList}/>
                </div>
                <div className='min-w-0'>
                    <Greetings/>
                    <TaskSection
                        todoList={todoList}
                        newTasks={newTasks}
                        setNewTasks={setNewTasks}
                        removeTask={removeTask}
                        handleToggle={handleToggle}
                        handleSubmit={handleSubmit}
                    />
                </div>
                <Widgets todoList={todoList}/>
            </div>
            

    
        </>
            )
}

export default App
