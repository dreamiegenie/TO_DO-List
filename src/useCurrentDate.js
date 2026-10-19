import { useEffect, useState } from "react";

export function useCurrentDate() {
    const [today, setToday] = useState(() => new Date());

    useEffect(() => {
        let timeout;

        function scheduleNextChange(now = new Date()) {
            const nextChange = new Date(now);
            const nextHour = now.getHours() < 12 ? 12 : now.getHours() < 18 ? 18 : 24;
            nextChange.setHours(nextHour, 0, 0, 0);
            timeout = window.setTimeout(() => {
                setToday(new Date());
                scheduleNextChange();
            }, nextChange.getTime() - now.getTime() + 50);
        }

        function refreshDate() {
            if (document.visibilityState === "hidden") return;
            window.clearTimeout(timeout);
            const now = new Date();
            setToday(now);
            scheduleNextChange(now);
        }

        timeout = window.setTimeout(refreshDate, 0);
        window.addEventListener("focus", refreshDate);
        document.addEventListener("visibilitychange", refreshDate);
        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener("focus", refreshDate);
            document.removeEventListener("visibilitychange", refreshDate);
        };
    }, []);

    return today;
}
