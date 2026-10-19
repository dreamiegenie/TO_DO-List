import { useState } from "react";
import useLocalStorage from "./useLocalStorage";
import sun from './assets/sun.png';
import moon from './assets/moon.png';


export function Navigation () {

    const [darkMode, setDarkMode] = useLocalStorage("darkMode", false);

        const toggleButton = () => {
        setDarkMode(!darkMode);
    }
    

    return (
        <>
            <nav className="flex bg-[#F8C8DC] mrounded-[14px] p-3 m-4 justify-between items-center shadow  shadow-[#B77996]">
                
                

                <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 260 215" fill="none" className="overflow-visible">             
                            <ellipse cx="130" cy="174" rx="115" ry="30" fill="#F8B6C1"/>
                            <path d="M25 168Q18 146 45 141Q52 117 86 127Q107 113 129 133Q157 117 179 133Q217 126 225 153Q247 160 235 180Q218 200 173 198H73Q30 197 25 168Z" fill="#FFD1D8" stroke="#F5A5AF" strokeWidth="2.5"/>
                            <path d="M75 148Q69 104 79 48Q83 35 103 51L117 65Q146 55 161 65L186 34Q199 21 205 48L211 102Q227 143 201 161Q183 178 141 178H111Q77 176 75 148Z" className="kitty-breathe" fill="#FFF9F6" stroke="#995F55" strokeWidth="3.5" strokeLineJoin="round"/>
                            <path d="M87 57L101 65L84 80Z M182 61L199 45L202 79Z" fill="#FFB6BE"/>
                            <path d="M92 104Q107 117 120 102 M158 101Q169 115 182 99"   className="kitty-eyes" stroke="#805047" strokeWidth="4.5" strokeLinecap="round"/>
                            <ellipse cx="104" cy="128" rx="14" ry="10" fill="#FBC4C8"/>
                            <ellipse cx="184" cy="124" rx="14" ry="10" fill="#FBC4C8"/>
                            <path d="M139 118Q145 113 151 118L145 124Z" fill="#E89098"/>
                            <path d="M145 124Q140 132 134 126M145 124Q151 132 157 126" stroke="#A66B64" strokeWidth="2.2" strokeLinecap="round"/>
                            <path d="M90 117L68 112 M89 125L66 126 M193 113L216 108 M195 122L218 124" stroke="#A66B64" strokeWidth="2" strokeLinecap="round"/>
                            <path className="kitty-left-paw" d="M96 156Q104 144 119 150Q135 161 123 173L98 173Q88 168 96 156Z" fill="#FFF9F6" stroke="#995F55" strokeWidth="2.5"/>
                            <path className="kitty-right-paw" d="M173 149Q189 144 197 155Q205 170 188 174H168Q158 163 173 149Z" fill="#FFF9F6" stroke="#995F55" strokeWidth="2.5" />
                            <path d="M44 179Q75 162 95 185M161 183Q199 165 224 181" stroke="#F5A5AF" strokeWidth="2.5" strokeLinecap="round"/>
                            <g className="kitty-zzz"> <text x="205" y="48" fontSize="22" fill="#B77996" fontWeight="bold">z</text>
                            <text x="222" y="32" fontSize="17" fill="#D48FA8" fontWeight="bold">z</text></g>
                        </svg>
                <div>
                    <h3 className="text-[#684D60] font-heading  text-4xl text-shadow-2xs">My To-Dos 
                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 32 32" fill="none" className="inline"> 
                            <path d="M16 28 C12 24 3.5 17.5 3.5 10.5 C3.5 4.5 10.5 3.5 16 11 C21.5 3.5 28.5 4.5 28.5 10.5 C28.5 17.5 20 24 16 28 Z" fill="#FFB9C9" stroke="#F47791" strokeWidth="1.8" strokeLineJoin="round"/>
                            <path d="M9 9 C8 11 8.5 13 9.5 14" stroke="#FFF0F4" strokeWidth="2" strokeLinecap="round" /></svg> </h3>
                    <p className="font-bod text-[#A18A98] text-xs mx-2.5 flex items-center">small steps, big dreams <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" fill="none" className="inline"><path d="M16 27 C13.3 24.5 5 18.5 5 12 C5 6.5 12 5.5 16 11 C20 5.5 27 6.5 27 12 C27 18.5 18.7 24.5 16 27 Z" stroke="#af8398" strokeWidth="2.5" strokeLinecap="round" strokeLineJoin="round"/></svg></p>
                </div>
                </div>
                <div className="flex  items-center gap-8 ">
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        <path fill="#e29fbc" d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.6 5.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/>
                        </svg>
                        <input
                        type="search"
                        aria-label="Search tasks"
                        placeholder="Search tasks..."
                        className="border border-[#F4A7C1] bg-[#FFF0F4] text-[#9a536e]  py-1 pl-9 pr-2 rounded-xl focus:outline-none focus:ring-1"/>
                    </div>
                    <button onClick={toggleButton} className="mx-4 hover:-translate-y-1 transition-transform  duration-300">
                        { darkMode?  <img src={sun} width={50}/> :  <img src={moon} width={50} />}
                        </button>
                </div>
            </nav>

        </>
    )
}
