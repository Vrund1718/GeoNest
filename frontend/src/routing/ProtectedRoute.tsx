import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full shadow-sm" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/`} replace />;
  }
  return <>{children}</>;
};

export const GuestOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full shadow-sm" />
      </div>
    );
  }
  if (user) {
    const target = user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/student';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
};

export const RoleHomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full shadow-sm" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const target = user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/student';
  return <Navigate to={target} replace />;
};
