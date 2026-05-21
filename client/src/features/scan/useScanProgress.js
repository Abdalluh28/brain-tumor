import { useEffect } from "react";

// this hook is used to simulate a progress bar
export const useScanProgress = ({ setProgressValue }) => {
    useEffect(() => {
        const interval = setInterval(() => {
            setProgressValue((prev) => {
                if (prev >= 99) {
                    clearInterval(interval);
                    return 99;
                }
                return prev + 1;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [setProgressValue]); 
};
