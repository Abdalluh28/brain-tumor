import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { RouterProvider } from "react-router";

export default function App() {

    // router configuration
    const router = createBrowserRouter([
        {
            element: <AppLayout />,
            children: [
                {
                    path: '/',
                    element: <div>Home Page</div>
                },
                {
                    path: '/uploadMRI',
                    element: <div>UploadMRI Page</div>
                },
                {
                    path: '/history',
                    element: <div>History Page</div>
                },
                {
                    path: '/settings',
                    element: <div>Settings Page</div>
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
