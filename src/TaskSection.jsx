

function getTaskTimestamp(todo) {
    if (todo.timestamp) return todo.timestamp;
    if (typeof todo.id !== "number" || !Number.isFinite(todo.id)) return "";

    const createdAt = new Date(todo.id);
    if (Number.isNaN(createdAt.getTime())) return "";

    return createdAt.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

export function TaskSection({todoList, isSearching, newTasks,setNewTasks,handleSubmit,removeTask,handleToggle}) {

    const listItems = todoList.map(todo => (
        
        <li key={todo.id} className="bg-white dark:bg-night-card dark:border-night-border rounded-xl p-2.5 border border-[#d392a7c7] shadow-xxs mb-2 lg:rounded-3xl lg:p-2 lg:pt-4">
            <div className="flex justify-between items-center gap-2 lg:mx-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input type="checkbox" aria-label={`Mark ${todo.task} as ${todo.completed ? 'incomplete' : 'complete'}`} checked={todo.completed} onChange={() => handleToggle(todo.id)} className="w-6 h-6 shrink-0 rounded-full appearance-none border-2 border-[#DAA3B8] bg-white dark:bg-night-field dark:border-night-control-border dark:checked:bg-night-primary dark:checked:border-night-primary dark:checked:after:text-night-primary-ink checked:bg-[#F4A4C3] checked:border-[#F4A4C3] cursor-pointer transition-all duration-300 checked:after:content-['✓'] checked:after:text-white checked:after:flex checked:after:justify-center checked:after:items-center checked:after:text-sm"/>
                    <div className="min-w-0 flex-1">
                        <span style={{textDecoration: todo.completed? "line-through ": "none" }} className="block min-w-0 text-xs [overflow-wrap:anywhere] font-gummy text-[#a8637c] dark:text-night-text min-[375px]:text-sm lg:text-base">{todo.task}</span>
                        <span className="mt-0.5 block text-[10px] font-itim text-[#eeb9cc] dark:text-night-muted min-[375px]:text-xs lg:hidden">{getTaskTimestamp(todo)}</span>
                    </div>
                </div>
            
            <button type="button" aria-label={`Remove ${todo.task}`} onClick={() => removeTask(todo.id)}
                className="flex min-h-9 shrink-0 items-center gap-1 px-2 py-1.5 rounded-full bg-[#FFF0F5] border border-[#F6C3D5] text-[#C17694] hover:bg-[#FFE3EE] dark:bg-night-soft dark:border-night-control-border dark:text-night-soft-ink dark:hover:bg-night-hover dark:hover:text-night-text hover:shadow-sm transition-all duration-200 min-[375px]:px-3 lg:min-h-0 lg:gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 64 64" fill="none">
                <path d="M24 12C24 9.8 25.8 8 28 8H36C38.2 8 40 9.8 40 12V14H47C48.7 14 50 15.3 50 17C50 18.7 48.7 20 47 20H17C15.3 20 14 18.7 14 17C14 15.3 15.3 14 17 14H24V12Z" fill="#F8BFD2" stroke="#C97C9A" strokeWidth="2.2" strokeLinejoin="round"/>
                <path d="M20 22H44L42 49C41.8 52 39.3 54.4 36.3 54.4H27.7C24.7 54.4 22.2 52 22 49L20 22Z" fill="#FFDCE8" stroke="#C97C9A" strokeWidth="2.2" strokeLinejoin="round"/>
                <path d="M27 28V45M32 28V45M37 28V45" stroke="#E89AB7" strokeWidth="2.4" strokeLinecap="round"/>
                <path d="M32 39C29.8 36.8 26.5 35.6 26.5 32.5C26.5 30.4 28.1 29 30.1 29C31.3 29 32 29.6 32 29.6C32 29.6 32.7 29 33.9 29C35.9 29 37.5 30.4 37.5 32.5C37.5 35.6 34.2 36.8 32 39Z" fill="#F7A9C4"/>
                </svg>
                <span className="font-body text-xs capitalize lg:text-base lg:font-bold lg:normal-case">remove</span>
            </button>
            </div>
                <span className="hidden text-[#eeb9cc] dark:text-night-muted text-xs font-itim lg:inline lg:px-12">{getTaskTimestamp(todo)}</span>
        </li>
        
        
    )); 


    return(
        <>
            <div className="min-w-0 rounded-2xl bg-white/40 dark:bg-night-panel mx-4 mt-2 mb-0 p-2 sm:p-4 lg:m-4 lg:p-6">
                <form onSubmit={handleSubmit}>
                    <div className="flex min-w-0 items-center gap-2 lg:gap-4">
                        <div className="relative min-w-0 flex-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" className="absolute left-3 top-1/2 -translate-y-1/2    AS" viewBox="0 0 24 24"><title>circle-plus-duotone</title>
                            <g fill="none" stroke="#a3637c" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path fill="#F4A7C1" fillOpacity=".4" 
                            d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12Z" 
                            stroke="none"/><path d="M8 12H16M11.995 16.005V8.005"/></g></svg>
                            <input type="text" aria-label="New task" value={newTasks} onChange={(e)=> setNewTasks(e.target.value)} className="w-full min-w-0 border border-[#f4c3d4] rounded-2xl py-2 pl-9 pr-2 font-gummy text-[#a3637c] focus:outline-none focus:ring-0 shadow-2xs lg:py-1 dark:bg-night-field dark:border-night-control-border dark:text-night-text dark:placeholder:text-night-muted" placeholder="Add a new task..." />
                        </div>
                                <button type="submit" aria-label="Add task" className="flex min-h-10 shrink-0 items-center gap-2 bg-[#F4A7C1] text-[#9d5e79] rounded-2xl p-1 px-3 font-mali shadow-xs border border-[#a3637c] cursor-pointer hover:bg-[#d17699] hover:text-white dark:bg-night-primary dark:border-night-control-border dark:text-night-primary-ink dark:hover:bg-night-accent dark:hover:text-night-primary-ink hover:-translate-y-0.5 transition-all duration-200 lg:min-h-0 lg:px-4">Add 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>stars-duotone</title>
                                    <path fill="#fff" d="M7.846 8.822c.427-1.027 1.881-1.027 2.308 0l1.214 2.919l3.151.252c1.108.09 1.558 1.472.713 2.195l-2.4 2.057l.733 3.075c.258 1.081-.918 1.936-1.867 1.357L9 19.029l-2.698 1.648c-.949.58-2.125-.276-1.867-1.357l.733-3.075l-2.4-2.057c-.845-.723-.395-2.106.713-2.195l3.15-.252zM9 9.953l-1.042 2.505a1.25 1.25 0 0 1-1.054.766L4.2 13.44l2.06 1.765c.356.305.512.784.403 1.24l-.63 2.638l2.315-1.414a1.25 1.25 0 0 1 1.304 0l2.315 1.414l-.63-2.638a1.25 1.25 0 0 1 .403-1.24l2.06-1.765l-2.704-.216a1.25 1.25 0 0 1-1.054-.766z"/>
                                    <path fill="#fff" d="M13.538 3.11a.5.5 0 0 1 .923 0l.48 1.152a.5.5 0 0 0 .421.306l1.244.1a.5.5 0 0 1 .285.878l-.947.812a.5.5 0 0 0-.162.495l.29 1.214a.5.5 0 0 1-.747.542l-1.065-.65a.5.5 0 0 0-.52 0l-1.065.65a.5.5 0 0 1-.747-.542l.289-1.214a.5.5 0 0 0-.161-.495l-.947-.812a.5.5 0 0 1 .285-.878l1.243-.1a.5.5 0 0 0 .422-.306zm5.009 6.86a.5.5 0 0 1 .906 0l.425.91a.5.5 0 0 0 .241.242l.91.425a.5.5 0 0 1 0 .906l-.91.425a.5.5 0 0 0-.241.241l-.425.91a.5.5 0 0 1-.906 0l-.425-.91a.5.5 0 0 0-.242-.241l-.91-.425a.5.5 0 0 1 0-.906l.91-.425a.5.5 0 0 0 .242-.241z" opacity=".5"/></svg>
                                </button>
                    </div>
                </form>

                <div className="mt-3 lg:mt-10">
                    <ul>
                        {todoList.length === 0? <li className="font-bold text-[#a3637c] dark:text-night-muted text-center mt-10 font-body">{isSearching ? "No tasks match your search." : "Task is empty! Add task above."}</li> : listItems}
                    </ul>
                </div>
            </div>
        </>
    )
}
