import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageServices from './pages/admin/ManageServices';
import ManageSchedule from './pages/admin/ManageSchedule';
import ManageAppointments from './pages/admin/ManageAppointments';
import ManageQueue from './pages/admin/ManageQueue';
import ManageUsers from './pages/admin/ManageUsers';
import AdminLogin from './pages/admin/AdminLogin';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import BookAppointment from './pages/customer/BookAppointment';
import CustomerHistory from './pages/customer/CustomerHistory';
import CustomerQueue from './pages/customer/CustomerQueue';

// Helper component to redirect users based on their role
function RootRedirect() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/customer" replace />;
}

// Redirect if already logged in or handle loading
function AuthRedirect({ children }) {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentUser) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/customer" replace />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Toast notifications container */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b', // dark-800
              color: '#f1f5f9', // slate-100
              border: '1px solid #334155', // dark-700
            },
            success: {
              iconTheme: {
                primary: '#10b981', // emerald-500
                secondary: '#1e293b',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes with AuthRedirect to prevent logged in users from seeing them */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
          <Route path="/admin/login" element={<AuthRedirect><AdminLogin /></AuthRedirect>} />
          <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Customer Routes */}
          <Route path="/customer" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CustomerDashboard />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="history" element={<CustomerHistory />} />
            <Route path="queue" element={<CustomerQueue />} />
            {/* other customer routes will go here */}
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<ManageServices />} />
            <Route path="schedule" element={<ManageSchedule />} />
            <Route path="appointments" element={<ManageAppointments />} />
            <Route path="queue" element={<ManageQueue />} />
            <Route path="users" element={<ManageUsers />} />
            {/* other admin routes will go here */}
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
