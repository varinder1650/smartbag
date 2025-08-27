import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, Users, Package, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { 
    stats, 
    revenueData, 
    recentOrders, 
    setStats, 
    setRevenueData, 
    setRecentOrders,
    products,
    orders,
    users,
    setProducts,
    setOrders,
    setUsers
  } = useDashboardStore();
  const { toast } = useToast();

  // Request initial data and set up real-time handlers
  useEffect(() => {
    // Request all dashboard data - only call endpoints that exist
    wsService.send({ type: 'get_products' });
    wsService.send({ type: 'get_orders', filters: {} });
    wsService.send({ type: 'get_users', filters: {} });

    // Set up real-time message handlers
    const handleProductsData = (data) => {
      console.log('Dashboard received products data');
      setProducts(data.products || []);
      calculateStats();
    };

    const handleOrdersData = (data) => {
      console.log('Dashboard received orders data');
      setOrders(data.orders || []);
      setRecentOrders(data.orders?.slice(0, 10) || []);
      calculateStats();
      generateRevenueData(data.orders || []);
    };

    const handleUsersData = (data) => {
      console.log('Dashboard received users data');
      setUsers(data.users || []);
      calculateStats();
    };

    const handleError = (data) => {
      console.error('Dashboard WebSocket error:', data);
      // Only show error toast for non-routine errors
      if (!data.message?.includes('Unknown message type')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    // Register message handlers
    wsService.onMessage("products_data", handleProductsData);
    wsService.onMessage("orders_data", handleOrdersData);
    wsService.onMessage("users_data", handleUsersData);
    wsService.onMessage("error", handleError);

    // Cleanup function
    return () => {
      wsService.onMessage("products_data", () => {});
      wsService.onMessage("orders_data", () => {});
      wsService.onMessage("users_data", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [toast, setRecentOrders, setStats, setRevenueData, setProducts, setOrders, setUsers]);

  // Calculate stats based on current data
  const calculateStats = () => {
    const totalRevenue = orders.reduce((sum, order) => {
      return order.status === 'delivered' ? sum + (parseFloat(order.total) || 0) : sum;
    }, 0);

    const activeOrders = orders.filter(order => 
      ['pending', 'confirmed', 'preparing', 'prepared', 'out_for_delivery'].includes(order.status)
    ).length;

    const activeUsers = users.filter(user => user.status === 'active').length;

    const newStats = {
      totalRevenue: totalRevenue,
      totalOrders: orders.length,
      activeOrders: activeOrders,
      activeUsers: activeUsers,
      totalProducts: products.length,
    };

    setStats(newStats);
  };

  // Generate revenue data for chart
  const generateRevenueData = (ordersData) => {
    const last30Days = [];
    const now = new Date();
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dayRevenue = ordersData
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.toDateString() === date.toDateString() && 
                 order.status === 'delivered';
        })
        .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      
      last30Days.push({
        date: date.toISOString(),
        revenue: dayRevenue
      });
    }
    
    setRevenueData(last30Days);
  };

  // Recalculate stats when data changes
  useEffect(() => {
    if (products.length > 0 || orders.length > 0 || users.length > 0) {
      calculateStats();
    }
  }, [products, orders, users]);

  // Generate revenue data when orders change
  useEffect(() => {
    if (orders.length > 0) {
      generateRevenueData(orders);
    }
  }, [orders, setRevenueData]);

  const statsCards = [
    {
      title: "Total Revenue",
      value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: "Total revenue generated",
    },
    {
      title: "Orders",
      value: (stats?.totalOrders || 0).toLocaleString(),
      icon: ShoppingCart,
      description: `${stats?.activeOrders || 0} active orders`,
      badge: (stats?.activeOrders || 0) > 0 ? (stats?.activeOrders || 0).toString() : null,
    },
    {
      title: "Active Users",
      value: (stats?.activeUsers || 0).toLocaleString(),
      icon: Users,
      description: "Currently active users",
    },
    {
      title: "Products",
      value: (stats?.totalProducts || 0).toLocaleString(),
      icon: Package,
      description: "Total products in catalog",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your store.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className="flex items-center gap-2">
                {stat.badge && (
                  <Badge variant="secondary" className="px-2 py-1">
                    {stat.badge}
                  </Badge>
                )}
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                      formatter={(value) => [`₹${value}`, "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Loading revenue data...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!recentOrders || recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent orders</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order._id || order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">#{order.id}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{order.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.created_at ? format(new Date(order.created_at), "MMM dd, HH:mm") : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{order.total}</p>
                      {order.deliveryPartner && (
                        <p className="text-xs text-muted-foreground">{order.deliveryPartner}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}