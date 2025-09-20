import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { wsService } from "@/services/websocket";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Brands from "./pages/Brands";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Help from './pages/Help';
import Requests from './pages/Requests';
import DiscountCoupons from "./pages/Discount";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Connect WebSocket once on app start
    wsService.connect().catch(err => {
      console.error("WebSocket connection failed", err);
    });
  
    // If user is authenticated (from persisted storage), send token immediately
    if (isAuthenticated && user?.token) {
      console.log('User already authenticated, sending token to WebSocket');
      wsService.send({ 
        type: 'authenticate', 
        payload: { token: user.token }
      });
    }
  
    return () => {
      if (wsService.isConnected()) {
        wsService.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once

  // Send token when user becomes authenticated (e.g., after login)
  useEffect(() => {
    if (isAuthenticated && user?.token && wsService.isConnected()) {
      console.log('User authenticated, sending token to WebSocket');
      wsService.send({ 
        type: 'authenticate', 
        payload: { token: user.token }
      });
    }
  }, [isAuthenticated, user?.token]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="brands" element={<Brands />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="users" element={<Users />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="discount" element={<DiscountCoupons />} />
        <Route path="help" element={<Help />} />
        <Route path="requests" element={<Requests />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;