import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PublicPage from './pages/PublicPage';
import Dashboard from './pages/Dashboard';
import EditLink from './pages/EditLink';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import './App.css';

function App() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes for any authenticated user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:username"
            element={
              <ProtectedRoute>
                <EditLink />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/:username"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Admin/Secret Room - Only for Owner */}
          <Route
            path="/secretroom"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/404" element={<NotFound />} />
          <Route path="/:username" element={<PublicPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" theme="dark" />
    </GoogleOAuthProvider>
  );
}

export default App;