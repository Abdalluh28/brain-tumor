import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useScanProgress = ({ progressValue, setProgressValue }) => {
    const navigate = useNavigate();

    // the request to backend goes here, I will simulate progress for now
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
    

    // Navigate to results page after reaching 100%
    // Replace this with your actual navigation logic
    useEffect(() => {
        if (progressValue === 100) {
            const randomId = Math.floor(Math.random() * 10000);
            navigate(`/scan/${randomId}`);
        }
    }, [progressValue, navigate]);
};
