
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import PLCalculator from './components/Tools/PLCalculator';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useWebSocket } from './hooks/useWebSocket';

const Dashboard = () => {
  // Initialize WebSocket when dashboard is active
  useWebSocket();

  return (
    <>
      <AppShell />
      {/* Global modals rendered at root level */}
      <PLCalculator />
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard (which redirects to login if needed) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
