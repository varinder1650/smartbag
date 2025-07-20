import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Products from './components/Products';
import Categories from './components/Categories';
import Brands from './components/Brands';
import Orders from './components/Orders';
import Users from './components/Users';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import Debug from './components/Debug';

// Services
import { AuthProvider, useAuth } from './contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div style={{textAlign: 'center', marginTop: '20vh', fontSize: 24}}>Loading...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/debug" element={<Debug />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Dashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Products />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Categories />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Brands />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Orders />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Users />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Settings />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debug"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ErrorBoundary>
                      <Debug />
                    </ErrorBoundary>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
