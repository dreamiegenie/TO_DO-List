import { FocusTimer } from "./FocusTimer";


export function Widgets({todoList}) {


    const completedTasks = todoList.filter(todo => todo.completed).length;

    const progress = todoList.length > 0 ? Math.round((completedTasks / todoList.length) * 100) : 0;


    return (
        <>
            <aside className="m-2 grid min-w-0 grid-cols-2 gap-3 p-2 lg:flex lg:flex-col lg:gap-4">
                {/* progress widget */}
                <div className="min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2 lg:px-4">
                    <h2 className="font-bold font-mali text-sm text-[#a3637c] lg:text-base">Today's Progress</h2>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mt-4 m-auto" style={{ background: `conic-gradient(#F4A7C1  ${progress}%, #FCE5EE 0)`}}>
                            <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center "> <span className="font-itim font-extrabold text-[#A85F80]">{`${progress}`}%</span></div>
                    </div>

                </div>

                {/* timer widget */}
                <div className="@container min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2"> 
                    <h2 className="text-[#a3637c] font-mali text-sm font-bold lg:text-base">Focus Timer ♡</h2>
                    <FocusTimer/>
                </div>

                <div className="col-span-2 min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2 lg:col-span-1">
                    <p className="font-semibold font-itim px-4 py-2 text-xl text-[#a3637c]">Quick Note</p>
                    <textarea rows={5} aria-label="Quick note" placeholder="Jot down a thought..." className="block w-full min-w-0 resize-y border border-[#d9aabd] rounded-2xl font-gummy px-2 py-2 text-[#823b56]"/>
                </div>
            </aside>
        
        </>
    )
}
