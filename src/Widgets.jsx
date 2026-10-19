import { useState } from "react";
import { FocusTimer } from "./FocusTimer";


export function Widgets({todoList}) {


    const completedTasks = todoList.filter(todo => todo.completed).length;

    const progress = todoList.length > 0 ? Math.round((completedTasks / todoList.length) * 100) : 0;


    return (
        <>
            <aside className=" m-2 p-2 flex  flex-col gap-4">
                {/* progress widget */}
                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2 px-4">
                    <h2 className="font-bold font-mali text-[#a3637c] ">Today's Progress</h2>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mt-4 m-auto" style={{ background: `conic-gradient(#F4A7C1  ${progress}%, #FCE5EE 0)`}}>
                            <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center "> <span className="font-itim font-extrabold text-[#A85F80]">{`${progress}`}%</span></div>
                    </div>

                </div>

                {/* timer widget */}
                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2"> 
                    <h2 className="text-[#a3637c] font-mali font-bold">Focus Timer ♡</h2>
                    <FocusTimer/>
                </div>

                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2">
                    <p className="font-semibold font-itim px-4 py-2 text-xl text-[#a3637c]">Quick Note</p>
                    <textarea rows={5} cols={25}  placeholder="Jot down a thought..." className="border border-[#d9aabd] rounded-2xl font-gummy px-2 py-2 text-[#823b56]"/>
                </div>
            </aside>
        
        </>
    )
}
