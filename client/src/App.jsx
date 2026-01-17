import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { RouterProvider } from "react-router";
import Dashboard from "./pages/Dashboard";
import UploadScan from "./pages/UploadScan";
import History from "./pages/History";
import Settings from "./pages/Settings";
import { useSelector } from "react-redux";
import { useEffect } from "react";

export default function App() {

    const theme = useSelector(state => state.theme.mode);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);


    // router configuration
    const router = createBrowserRouter([
        {
            element: <AppLayout />,
            children: [
                {
                    path: '/',
                    element: <Dashboard />
                },
                {
                    path: '/uploadScan',
                    element: <UploadScan />
                },
                {
                    path: '/history',
                    element: <History />
                },
                {
                    path: '/settings',
                    element: <Settings />
                }
            ]
        },
        {
            path: 'login',
            element: <div>Login Page</div>
        },
        {
            path: 'register',
            element: <div>Register Page</div>
        }
    ])


    return (
        <RouterProvider router={router} />
    );
}
