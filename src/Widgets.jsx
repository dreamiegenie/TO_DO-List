import { FocusTimer } from "./FocusTimer";


export function Widgets({todoList, onTimerComplete}) {


    const completedTasks = todoList.filter(todo => todo.completed).length;

    const progress = todoList.length > 0 ? Math.round((completedTasks / todoList.length) * 100) : 0;


    return (
        <>
            <aside className="mx-2 my-2 grid min-w-0 grid-cols-2 gap-3 px-2 lg:flex lg:flex-col lg:gap-4 lg:p-2">
                {/* progress widget */}
                <div className="min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2 lg:px-4 dark:border-night-border dark:bg-night-widget dark:shadow-night-shadow/40">
                    <h2 className="font-bold font-mali text-sm text-[#a3637c] lg:text-base dark:text-night-accent">Today's Progress</h2>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mt-2 m-auto lg:w-24 lg:h-24 lg:mt-4" style={{ background: `conic-gradient(var(--progress-accent) ${progress}%, var(--progress-track) 0)`}}>
                            <div className="w-14 h-14 bg-white/50 rounded-full flex items-center justify-center lg:w-16 lg:h-16 dark:bg-night-ring-center"> <span className="font-itim font-extrabold text-[#A85F80] dark:text-night-accent">{`${progress}`}%</span></div>
                    </div>

                </div>

                {/* timer widget */}
                <div className="@container min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2 dark:border-night-border dark:bg-night-widget dark:shadow-night-shadow/40"> 
                    <h2 className="text-[#a3637c] font-mali text-sm font-bold lg:text-base dark:text-night-accent">Focus Timer ♡</h2>
                    <FocusTimer onComplete={onTimerComplete}/>
                </div>

                <div className="col-span-2 min-w-0 border border-white shadow bg-[#FCE5EE] rounded-xl p-2 lg:col-span-1 dark:border-night-border dark:bg-night-widget dark:shadow-night-shadow/40">
                    <p className="font-semibold font-itim px-2 pb-2 text-base text-[#a3637c] lg:px-4 lg:py-2 lg:text-xl dark:text-night-accent">Quick Note</p>
                    <textarea rows={5} aria-label="Quick note" placeholder="Jot down a thought..." className="block h-16 w-full min-w-0 resize-y border border-[#d9aabd] rounded-2xl font-gummy px-2 py-2 text-base/5 text-[#823b56] lg:h-auto lg:text-base dark:border-night-control-border dark:bg-night-field dark:text-night-text dark:placeholder:text-night-muted"/>
                </div>
            </aside>
        
        </>
    )
}
