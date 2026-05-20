import { useEffect } from "react";

export const useScanProgress = ({ progressValue, setProgressValue }) => {
    useEffect(() => {
        const interval = setInterval(() => {
            setProgressValue((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [setProgressValue]); 
};
