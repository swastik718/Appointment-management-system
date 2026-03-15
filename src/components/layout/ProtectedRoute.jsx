import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Logged in but wrong role
    // Redirect to their respective dashboard
    const redirectPath = userRole === 'admin' ? '/admin' : '/customer';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
