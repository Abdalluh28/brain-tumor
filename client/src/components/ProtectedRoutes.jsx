import { useUser } from '@/features/settings/useUser'
import React from 'react'
import Spinner from './Spinner';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoutes() {
    const { user, isLoading } = useUser();

    // if loading, show spinner
    if (isLoading) return <Spinner />

    // if not logged in, redirect to login
    if (!user) return <Navigate to="/login" replace />

    // if logged in, render the matched child route
    return <Outlet />
}
