
import { useState, useEffect } from "react";

function useLocalStorage (key, initialValue){

    const [value, setValue] = useState(() => {

        const isSaved = localStorage.getItem(key);

        if(isSaved){
            return JSON.parse(isSaved);
        } else{
            return initialValue;
        }
    })

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value))
    }, [value])


    return [value, setValue];

}

export default useLocalStorage;