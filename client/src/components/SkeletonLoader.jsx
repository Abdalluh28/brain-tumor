import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useSelector } from "react-redux";

export default function SkeletonLoader({ count = 1, height = 150 }) {

    const theme = useSelector(state => state.theme.mode);

    return (
        <div className={`grid gap-4 p-4 grid-cols-1 ${count > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} height={height} baseColor={theme === "light" ? "#f6f3f3" : "#1f2937"}
                    highlightColor={theme === "light" ? "#d1d5db" : "#374151"} style={{ borderRadius: '1rem' }} />
            ))}
        </div>
    )
}
