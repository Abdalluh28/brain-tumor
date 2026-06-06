
export default function ErrorFallback({ error }) {
    return (
        <div>
            <h2>Something went wrong</h2>
            <pre>{error.message}</pre>
        </div>
    );

}
