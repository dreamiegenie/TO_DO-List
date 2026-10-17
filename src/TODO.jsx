
import { useEffect, useState } from "react";


function TODO(){

    const [todoList, setTodoList] = useState(() => {
        const saved = localStorage.getItem("todos");

        return saved? JSON.parse(saved) : [];
    })


    useEffect(()=>{
        localStorage.setItem("todos", JSON.stringify(todoList));

        
    }, [todoList]);


    const [newTasks, setNewTasks] = useState("");

        const removeTask = tasks => {
            setTodoList(todoList.filter(taskList => taskList.id !== tasks))

        }

        const handleToggle = (idToToggle) => {
            setTodoList(todoList.map(task => {
                if(task.id === idToToggle){
                    if(!task.completed){
                        alert("Task Completed");
                        
                    }

                    return {...task, completed: !task.completed}
                }

                return task;
            }))
        }

    const listItems = todoList.map(todo => (
        <li key={todo.id}>
            <input type="checkbox"  checked={todo.completed} onChange={() => handleToggle(todo.id)}/> <span style={{textDecoration: todo.completed? "line-through": "none" }}>{todo.task}</span>
            <button onClick={() => removeTask(todo.id)}>remove</button>
        </li>
        
    )); 

        const updatedTask = {id: Date.now(), task: newTasks, completed: false};

        function addTask(newlyAddedTasks){
            setTodoList([...todoList, newlyAddedTasks]);
        }


        function handleSubmit(e){
            e.preventDefault();
            if(!newTasks.trim()) return;
            addTask(updatedTask);
            setNewTasks("");
        }

    return(
        <>
        <ul>
            {todoList.length === 0? "Task is empty! Add task below." : listItems}
        </ul>
        <form onSubmit={handleSubmit}>
        <input type="text" value={newTasks} placeholder="Add a task here..." onChange={(e)=> setNewTasks(e.target.value)} /> 
    <button class="relative inline-block m-2 px-2 p-1  tracking-[1px] no-underline text-[#725AC1] bg-transparent cursor-pointer duration-500 ease-out border-2 border-[#725AC1] rounded-[10px] shadow-[inset_0_0_0_0_#725AC1] transition-all hover:text-white hover:shadow-[inset_0_-100px_0_0_#725AC1] active:scale-90">
  Button Text
</button>
        
        </form>
        </>
    )
}

export default TODO;