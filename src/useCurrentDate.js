import { useEffect, useState } from "react";

export function useCurrentDate() {
    const [today, setToday] = useState(() => new Date());

    useEffect(() => {
        let timeout;

        function scheduleMidnight() {
            const now = new Date();
            const nextDay = new Date(now);
            nextDay.setHours(24, 0, 0, 0);
            timeout = window.setTimeout(() => {
                setToday(new Date());
                scheduleMidnight();
            }, nextDay.getTime() - now.getTime() + 50);
        }

        function refreshDate() {
            if (document.visibilityState === "hidden") return;
            window.clearTimeout(timeout);
            setToday(new Date());
            scheduleMidnight();
        }

        scheduleMidnight();
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
