import { useLayoutEffect, useState } from "react";

function readSavedTheme() {
    try {
        return window.localStorage.getItem("darkMode") === "true";
    } catch {
        return false;
    }
}

export function useTheme() {
    const [darkMode, setDarkMode] = useState(readSavedTheme);

    useLayoutEffect(() => {
        const theme = darkMode ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        try {
            window.localStorage.setItem("darkMode", JSON.stringify(darkMode));
        } catch {
            // Keep the toggle usable when saving the preference is unavailable.
        }
    }, [darkMode]);

    return [darkMode, () => setDarkMode(current => !current)];
}
