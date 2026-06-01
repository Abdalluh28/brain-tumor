import { useUser } from '@/features/settings/useUser'
import React from 'react'
import Spinner from './Spinner';
import { Navigate, Outlet } from 'react-router-dom';
import SkeletonLoader from './SkeletonLoader';

export default function ProtectedRoutes() {
    const { user, isLoading } = useUser();

    // if loading, show spinner
    if (isLoading) return <SkeletonLoader count={1} height={400} />

    // if not logged in, redirect to login
    if (!user) return <Navigate to="/login" replace={true} />

    // if logged in, render the matched child route
    return <Outlet />
}
