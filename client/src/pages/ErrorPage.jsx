import { TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom"

export default function ErrorPage() {

    const error = useRouteError();
    const navigate = useNavigate();

    

    return (
        <div className="flex w-full items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 p-8 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <TriangleAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{error.statusText || 'Something went wrong'}</h1>
                <p className='text-gray-600 dark:text-gray-400 mb-6'>Error: {error?.message || 'An unexpected error occurred.'}</p>
                <button onClick={() => navigate('/', { replace: true })} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                    Go to Dashboard
                </button>
            </div>
        </div>
    )
}
