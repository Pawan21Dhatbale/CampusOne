import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner text="Checking authentication session..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
};
