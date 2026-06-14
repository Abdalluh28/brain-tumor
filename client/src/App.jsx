import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSelector } from "react-redux";
import { RouterProvider } from "react-router";
import { createBrowserRouter } from "react-router-dom";
import { DismissableToaster } from "./components/DismissableToaster";
import ProtectedRoutes from "./components/ProtectedRoutes";
import AuthRoutes from "./components/AuthRoutes";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ResetPassword from "./features/auth/ResetPassword";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Doctors from "./pages/Doctors";
import DoctorsInvitation from "./pages/DoctorsInvitation";
import ErrorFallback from "./pages/ErrorFallback";
import ErrorPage from "./pages/ErrorPage";
import History from "./pages/History";
import MriViewer from "./pages/MriViewer";
import Patients from "./pages/Patients";
import Scan from "./pages/Scan";
import ScanId from "./pages/ScanId";
import AdminRoutes from "./components/AdminRoutes";
import RadiologyCenter from "./pages/RadiologyCenter";


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
            errorElement: <ErrorPage />,
            children: [
                {
                    element: <AppLayout />,
                    children: [
                        {
                            path: '/',
                            errorElement: <ErrorPage />,
                            element: <Dashboard />
                        },
                        {
                            path: '/scan',
                            errorElement: <ErrorPage />,
                            element: <Scan />
                        },
                        {
                            path: '/scan/:scanId',
                            errorElement: <ErrorPage />,
                            element: <ScanId />
                        },
                        {
                            path: '/viewer',
                            errorElement: <ErrorPage />,
                            element: <MriViewer />
                        },
                        {
                            element: <AdminRoutes />,
                            children: [
                                {
                                    path: '/patients',
                                    errorElement: <ErrorPage />,
                                    element: <Patients />
                                },
                                {
                                    path: '/doctors',
                                    errorElement: <ErrorPage />,
                                    element: <Doctors />
                                },
                                {
                                    path: '/doctors/invite',
                                    errorElement: <ErrorPage />,
                                    element: <DoctorsInvitation />
                                },
                            ]
                        },
                        {
                            path: '/history',
                            errorElement: <ErrorPage />,
                            element: <History />
                        },
                        {
                            path: 'radiology-centers',
                            errorElement: <ErrorPage />,
                            element: <RadiologyCenter />
                        }
                    ]
                }
            ]
        },
        {
            element: <AuthRoutes />,
            errorElement: <ErrorPage />,
            children: [
                {
                    path: 'login',
                    element: <Login />
                },
                {
                    path: 'register',
                    element: <Register />
                },
                {
                    path: 'password/reset/:id/:accessToken',
                    element: <ResetPassword />
                },
            ]
        },
        {
            path: 'password/forgot/:id/:accessToken',
            element: <ResetPassword />
        },
    ])


    return (
        <>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
                <QueryClientProvider client={queryClient} >
                    <RouterProvider router={router} />
                    <DismissableToaster />
                </QueryClientProvider>
            </ErrorBoundary>
        </>
    );
}

