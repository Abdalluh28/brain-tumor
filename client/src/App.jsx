import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RouterProvider } from "react-router";
import { createBrowserRouter } from "react-router-dom";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Scan from "./pages/Scan";
import ScanId from "./pages/ScanId";
import ResetPassword from "./features/auth/ResetPassword";

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
                }
            ]
        },
        {
            path: 'login',
            element: <Login />
        },
        {
            path: 'register',
            element: <Register />
        },
        {
            path: 'reset',
            element: <ResetPassword />
        }
    ])


    return (
        <>
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}
