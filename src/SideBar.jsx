

export function SideBar({todoList}){

    const completedTasks = todoList.filter(todo => todo.completed).length;
    const totalTasks = todoList.length;

    return (
        <>
            <aside className="rounded-xl shadow-sm shadow-[#B77996] bg-[#FFE4EF] border border-[#f8f0f3] p-4 m-4 ">
                <div className="flex flex-col gap-4 border-b border-[#f2b5cc]  justify-center">

                    <button className="font-body  rounded-lg bg-[#F4A7C1f] hover:bg-[#f2b5cc] p-2 text-[#B77996] flex  items-center gap-2 font-semibold cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-house-heart" viewBox="0 0 16 16">
                        <path d="M8 6.982C9.664 5.309 13.825 8.236 8 12 2.175 8.236 6.336 5.309 8 6.982"/>
                        <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.707L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.646a.5.5 0 0 0 .708-.707L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
                        </svg>Today
                    </button>

                    <button className="font-body rounded-lg hover:bg-[#f2b5cc] p-2 text-[#B77996] flex justify-between items-center  font-semibold cursor-pointer">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-calendar-heart" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4zM1 14V4h14v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1m7-6.507c1.664-1.711 5.825 1.283 0 5.132-5.825-3.85-1.664-6.843 0-5.132"/>
                            </svg>                   
                            Total 
                        </div>
                        <span className="font-mali">{totalTasks}</span>
                    </button>

                <button className="font-body  rounded-lg p-2 hover:bg-[#f2b5cc]  text-[#B77996] flex justify-between items-center  mb-6  font-semibold cursor-pointer">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        Completed
                    </div>
                        <span className="font-mali">{completedTasks}</span>
                </button>

                </div>
                
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-[#B77996] font-body font-bold">Categories</span> 
                    <button className="transition-all hover:-translate-y-0.5 duration-200 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>plus</title><path fill="#B77996" 
                            d="M18 10h-4V6a2 2 0 0 0-4 0l.071 4H6a2 2 0 0 0 0 4l4.071-.071L10 18a2 2 0 0 0 4 0v-4.071L18 14a2 2 0 0 0 0-4"/></svg>                        
                    </button>
                </div>
                    
        </aside>
        
        </>
    )
}

