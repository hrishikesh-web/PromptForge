import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { LandingLogin } from './pages/LandingLogin';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { ExplorePrompts } from './pages/ExplorePrompts';
import { PromptDetails } from './pages/PromptDetails';
import { CreatePrompt } from './pages/CreatePrompt';
import { EditPrompt } from './pages/EditPrompt';
import { MyPrompts } from './pages/MyPrompts';
import { Bookmarks } from './pages/Bookmarks';
import { CreatorProfile } from './pages/CreatorProfile';
import { Notifications } from './pages/Notifications';
import { Analytics } from './pages/Analytics';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoadingState } from './components/LoadingState';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState fullScreen message="Verifying session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingState fullScreen message="Checking privileges..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public standalone auth routes */}
            <Route path="/login" element={<LandingLogin />} />
            <Route path="/register" element={<Register />} />

            {/* Platform Application Shell routes */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="explore" element={<ExplorePrompts />} />
              <Route path="prompts/:id" element={<PromptDetails />} />
              <Route path="creators/:id" element={<CreatorProfile />} />
              <Route path="analytics" element={<Analytics />} />

              {/* Protected user routes */}
              <Route
                path="create"
                element={
                  <ProtectedRoute>
                    <CreatePrompt />
                  </ProtectedRoute>
                }
              />
              <Route
                path="prompts/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditPrompt />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-prompts"
                element={
                  <ProtectedRoute>
                    <MyPrompts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="bookmarks"
                element={
                  <ProtectedRoute>
                    <Bookmarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* Admin only route */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;
