import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RouterProvider } from "react-router";
import { createBrowserRouter } from "react-router-dom";
import { DismissableToaster } from "./components/DismissableToaster";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ResetPassword from "./features/auth/ResetPassword";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Scan from "./pages/Scan";
import ScanId from "./pages/ScanId";
import ProtectedRoutes from "./components/ProtectedRoutes";
import AuthRoutes from "./components/authRoutes";


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
        }
    }
})

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
            element: <ProtectedRoutes />,
            children: [
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
                }
            ]
        },
        {
            element: <AuthRoutes />,
            children: [
                {
                    path: 'login',
                    element: <Login />
                },
                {
                    path: 'register',
                    element: <Register />
                }
            ]
        },
        {
            path: 'password/reset/:id/:accessToken',
            element: <ResetPassword />
        }
    ])


    return (
        <>
            <QueryClientProvider client={queryClient} >
                <RouterProvider router={router} />
                <DismissableToaster />
            </QueryClientProvider>
        </>
    );
}

