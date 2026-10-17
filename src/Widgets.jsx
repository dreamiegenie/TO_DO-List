import { useState } from "react"


export function Widgets() {

    const [onMouseHover, setOnMouseHover] = useState(false);

    const handleHover = () => {
        setOnMouseHover(true);
    }
    return (
        <>
            <main className=" m-2 p-2 flex flex-col gap-4">
                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2 ">
                    <h2 className="font-bold font-mali text-[#a3637c]">Today's Progress</h2>
                </div>

                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2"> 
                    <h2 className="text-[#a3637c] font-mali font-bold">Focus Timer</h2>

                    <button
                        className="text-[#A85F80] border font-mali p-1 px-4 rounded-2xl flex items-center gap-2 hover:bg-[#A85F80] hover:text-white cursor-pointer"
                        onMouseEnter={handleHover}
                        onMouseLeave={() => setOnMouseHover(false)}>
                        { onMouseHover ? <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><title>play-bold</title><path fill="#ffffff" d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z"/></svg> :
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"  viewBox="0 0 24 24"><title>play-bold</title><path fill="#A85F80" 
                        d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z"/></svg> }
                        Start</button>
                </div>

                <div className="border border-white shadow bg-[#FCE5EE] rounded-xl p-2">
                    <p className="font-semibold font-itim px-4 py-2 text-xl text-[#a3637c]">Quick Note</p>
                    <textarea rows={5} cols={25}  placeholder="Jot down a thought..." className="border border-[#d9aabd] rounded-2xl font-gummy px-2 py-2 text-[#823b56]"/>
                </div>
            </main>
        
        </>
    )
}
