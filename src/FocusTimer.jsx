import { useState, useEffect } from "react";

export function FocusTimer() {


    const [onMouseHover, setOnMouseHover] = useState(false);

    const handleHover = () => {
        setOnMouseHover(true);
    }


    const initialTime = 25 * 60;

    const [isRunning, setIsRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(initialTime);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    useEffect(() => {
        if (!isRunning) return;

        const timer = setInterval(() => {
            setSecondsLeft(prev => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning]);

    useEffect(() => {
        if (secondsLeft === 0) {
            setIsRunning(false);
        }
    }, [secondsLeft]);

    function handleReset() {
        setIsRunning(false);
        setSecondsLeft(initialTime);
    }

    const buttonStyle =
        "text-[#A85F80] border border-[#F4A7C1] font-mali p-2 px-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#A85F80] hover:text-white cursor-pointer duration-300";

    return (
        <div className="flex flex-col items-center gap-5 p-5">

            <div className="flex flex-col items-center gap-2">
                

                <p className="font-gummy text-5xl text-[#684D60]">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                </p>

                <p className="font-mali text-xs text-[#A18A98]">
                    {secondsLeft === 0
                        ? "Session complete! 🌸"
                        : isRunning
                        ? "You're doing amazing!"
                        : "A little focus goes a long way ♡"}
                </p>
            </div>

            <div className="flex items-center justify-center gap-3">

                <button
                    type="button"
                    className={buttonStyle}
                    onClick={() => {
                        if (secondsLeft === 0) {
                            setSecondsLeft(initialTime);
                        }
                        setIsRunning(prev => !prev);
                    }}
                >
                    {isRunning ? "Pause" : "Start"}
                </button>

                <button
                    type="button"
                    className={buttonStyle}
                    onClick={handleReset}>
                    Reset
                </button>

            </div>
        </div>
    );
}