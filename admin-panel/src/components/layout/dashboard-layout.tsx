import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { useEffect } from "react";
import { wsService } from "@/services/websocket";
import { useDashboardStore } from "@/store/dashboardStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";

export function DashboardLayout() {
  const { toast } = useToast();
  const store = useDashboardStore();
  const { setConnected, setStats, setRevenueData, setRecentOrders, setProducts, setOrders, setUsers, setPricingConfig, setCategories } = store;
  const { user } = useAuthStore();

  const { isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated) {
    setConnected(true);

    // Connection status handler
    wsService.onConnection((connected) => {
      setConnected(connected);
      if (connected && wsService.isAuth()) {
        toast({
          title: "Connected",
          description: "Successfully connected to server",
        });
        // Subscribe to channels after connection
        wsService.subscribe('dashboard');
        wsService.subscribe('products');
        wsService.subscribe('orders');
        wsService.subscribe('users');
      } else if (!connected) {
        toast({
          title: "Disconnected",
          description: "Connection to server lost",
          variant: "destructive",
        });
      }
    });

    // Message handlers
    wsService.onMessage('analytics_data', (data) => {
      setStats(data.stats);
      setRevenueData(data.revenueData || []);
    });

    wsService.onMessage('products_initial', (data) => {
      setProducts(data.products || []);
    });

    wsService.onMessage('product_created', (data) => {
      setProducts(data.products || []);
    });

    wsService.onMessage('product_updated', (data) => {
      setProducts(data.products || []);
    });

    wsService.onMessage('product_deleted', (data) => {
      setProducts(data.products || []);
    });

    wsService.onMessage('orders_data', (data) => {
      setOrders(data.orders || []);
      setRecentOrders(data.orders?.slice(0, 5) || []);
    });

    wsService.onMessage('order_status_changed', (data) => {
      setOrders(data.orders || []);
      toast({
        title: "Order Updated",
        description: `Order ${data.orderId} status changed to ${data.status}`,
      });
    });

    wsService.onMessage('users_data', (data) => {
      setUsers(data.users || []);
    });

    wsService.onMessage('categories_data', (data) => {
      console.log(data.categories)
      setCategories(data.categories || []);
    });

    wsService.onMessage('pricing_config', (data) => {
      setPricingConfig(data.config);
    });

    wsService.onMessage('error', (data) => {
      toast({
        title: "Error",
        description: data.message || "An error occurred",
        variant: "destructive",
      });
    });

    wsService.onMessage('auth_success', () => {
      // Request initial data after successful authentication
      if (user) {
        wsService.send({ type: 'get_analytics' });
        wsService.send({ type: 'get_products' });
        wsService.send({ type: 'get_orders' });
        wsService.send({ type: 'get_users' });
        wsService.send({ type: 'get_pricing_config' });
        wsService.send({ type: 'get_categories' });
      }
    });

    return () => {
      wsService.disconnect();
    };
  }
  }, [user, toast, setConnected, setStats, setRevenueData, setRecentOrders, setProducts, setOrders, setUsers, setPricingConfig, isAuthenticated, setCategories]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
