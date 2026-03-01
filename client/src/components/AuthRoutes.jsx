import { getAccessToken } from '@/utils/tokenManager'
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';

export default function AuthRoutes() {

    const accessToken = getAccessToken();

    if (accessToken) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
