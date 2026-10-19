import { useState, useEffect } from "react";

export function FocusTimer() {


    const initialTime = 25 * 60;

    const [isRunning, setIsRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(initialTime);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    useEffect(() => {
        if (!isRunning) return;

        const timer = setTimeout(() => {
            setSecondsLeft(Math.max(secondsLeft - 1, 0));
            if (secondsLeft <= 1) {
                setIsRunning(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [isRunning, secondsLeft]);

    function handleReset() {
        setIsRunning(false);
        setSecondsLeft(initialTime);
    }

    const buttonStyle =
        "min-h-10 min-w-0 flex-1 text-xs text-[#A85F80] border border-[#F4A7C1] font-mali p-1 rounded-2xl flex items-center justify-center hover:bg-[#A85F80] hover:text-white cursor-pointer duration-300 lg:min-h-0 lg:gap-2 lg:p-2 lg:text-sm lg:@min-[220px]:flex-none lg:@min-[220px]:px-5 lg:@min-[220px]:text-base";

    return (
        <div className="flex min-w-0 flex-col items-center gap-3 pt-4 lg:gap-5 lg:p-2 lg:@min-[220px]:p-5">

            <div className="flex min-w-0 flex-col items-center gap-2">
                

                <p className="font-gummy text-3xl text-[#684D60] sm:text-4xl lg:@min-[220px]:text-5xl">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                </p>

                <p className="font-mali text-center text-xs text-[#A18A98] lg:text-left">
                    {secondsLeft === 0
                        ? "Session complete! 🌸"
                        : isRunning
                        ? "You're doing amazing!"
                        : "A little focus goes a long way ♡"}
                </p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1 lg:gap-2 lg:@min-[220px]:w-auto lg:@min-[220px]:gap-3">

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
