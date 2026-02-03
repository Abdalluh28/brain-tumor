import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RouterProvider } from "react-router";
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import ScanId from "./pages/ScanId";
import History from "./pages/History";
import Settings from "./pages/Settings";
import { Toaster } from "react-hot-toast";

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
                    path: '/scan',
                    element: <Scan />
                },
                {
                    path: '/scan/:scanId',
                    element: <ScanId />
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
        <>
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}
