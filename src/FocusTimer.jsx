import { useState, useEffect, useRef } from "react";

export function FocusTimer({onComplete}) {


    const initialTime = 25 * 60;

    const [isRunning, setIsRunning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(initialTime);
    const completionReported = useRef(false);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    useEffect(() => {
        if (!isRunning) return;

        const timer = setTimeout(() => {
            setSecondsLeft(Math.max(secondsLeft - 1, 0));
            if (secondsLeft <= 1) {
                setIsRunning(false);
                if (!completionReported.current) {
                    completionReported.current = true;
                    onComplete?.();
                }
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [isRunning, secondsLeft, onComplete]);

    function handleReset() {
        setIsRunning(false);
        setSecondsLeft(initialTime);
        completionReported.current = false;
    }

    const buttonStyle =
        "min-h-8 min-w-0 flex-1 gap-0.5 text-[11px] text-[#A85F80] border border-[#F4A7C1] font-mali p-1 rounded-2xl flex items-center justify-center hover:bg-[#A85F80] hover:text-white cursor-pointer transition-colors duration-300 lg:min-h-0 lg:gap-2 lg:p-2 lg:text-sm lg:@min-[220px]:flex-none lg:@min-[220px]:px-5 lg:@min-[220px]:text-base dark:border-night-control-border dark:bg-night-soft dark:text-night-soft-ink dark:hover:bg-night-hover dark:hover:text-night-text";

    return (
        <div className="flex min-w-0 flex-col items-center gap-2 pt-1 lg:gap-5 lg:p-2 lg:@min-[220px]:p-5">

            <div className="flex min-w-0 flex-col items-center lg:gap-2">
                

                <p className="font-gummy text-3xl text-[#684D60] lg:text-4xl lg:@min-[220px]:text-5xl dark:text-night-text">
                    {String(minutes).padStart(2, "0")}:
                    {String(seconds).padStart(2, "0")}
                </p>

                <p className="font-mali text-center text-[8px] leading-3 text-[#A18A98] lg:text-left lg:text-xs lg:leading-4 dark:text-night-muted">
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
                            completionReported.current = false;
                            setSecondsLeft(initialTime);
                        }
                        setIsRunning(prev => !prev);
                    }}
                >
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5 shrink-0 fill-current lg:hidden">
                        {isRunning
                            ? <path d="M2 1h3v10H2zm5 0h3v10H7z" />
                            : <path d="m3 1 8 5-8 5z" />}
                    </svg>
                    {isRunning ? "Pause" : "Start"}
                </button>

                <button
                    type="button"
                    className={buttonStyle}
                    onClick={handleReset}>
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5 shrink-0 fill-none stroke-current lg:hidden" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4a4.5 4.5 0 1 1-.5 4M2 1v3h3" />
                    </svg>
                    Reset
                </button>

            </div>
        </div>
    );
}
