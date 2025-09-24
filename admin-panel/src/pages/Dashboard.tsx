import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  BarChart3,
  Filter,
  RefreshCw,
  X
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface ChartFilters {
  dateRange: string;
  fromDate: string;
  toDate: string;
  status: string;
  minAmount: string;
  maxAmount: string;
}

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

  // Chart filters state
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    dateRange: "last_30_days",
    fromDate: "",
    toDate: "",
    status: "all",
    minAmount: "",
    maxAmount: ""
  });

  const [orderCountData, setOrderCountData] = useState<any[]>([]);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
    { value: "prepared", label: "Prepared" },
    { value: "accepted", label: "Accepted" },
    { value: "assigned", label: "Assigned" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const dateRangeOptions = [
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "last_90_days", label: "Last 90 Days" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  // Get date range based on preset
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = startOfDay(now);
    
    switch (range) {
      case 'last_7_days':
        return {
          from: subDays(today, 7),
          to: endOfDay(now)
        };
      case 'last_30_days':
        return {
          from: subDays(today, 30),
          to: endOfDay(now)
        };
      case 'last_90_days':
        return {
          from: subDays(today, 90),
          to: endOfDay(now)
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          from: startOfMonth,
          to: endOfDay(now)
        };
      case 'last_month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          from: startOfLastMonth,
          to: endOfDay(endOfLastMonth)
        };
      case 'custom':
        return {
          from: chartFilters.fromDate ? startOfDay(new Date(chartFilters.fromDate)) : subDays(today, 30),
          to: chartFilters.toDate ? endOfDay(new Date(chartFilters.toDate)) : endOfDay(now)
        };
      default:
        return {
          from: subDays(today, 30),
          to: endOfDay(now)
        };
    }
  };

  // Filter orders based on current filters
  const getFilteredOrders = () => {
    let filteredOrders = [...orders];

    // Date range filter
    const { from, to } = getDateRange(chartFilters.dateRange);
    filteredOrders = filteredOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= from && orderDate <= to;
    });

    // Status filter
    if (chartFilters.status !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === chartFilters.status);
    }

    // Amount range filter
    if (chartFilters.minAmount) {
      const minAmount = parseFloat(chartFilters.minAmount);
      filteredOrders = filteredOrders.filter(order => 
        parseFloat(order.total || '0') >= minAmount
      );
    }

    if (chartFilters.maxAmount) {
      const maxAmount = parseFloat(chartFilters.maxAmount);
      filteredOrders = filteredOrders.filter(order => 
        parseFloat(order.total || '0') <= maxAmount
      );
    }

    return filteredOrders;
  };

  // Generate revenue data for chart based on filters
  const generateFilteredRevenueData = () => {
    const filteredOrders = getFilteredOrders();
    const { from, to } = getDateRange(chartFilters.dateRange);
    
    const days = [];
    const currentDate = new Date(from);
    
    while (currentDate <= to) {
      const dayRevenue = filteredOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.toDateString() === currentDate.toDateString() && 
                 (chartFilters.status === 'all' || order.status === 'delivered');
        })
        .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      
      days.push({
        date: currentDate.toISOString(),
        revenue: dayRevenue
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setRevenueData(days);
  };

  // Generate order count data for chart based on filters
  const generateOrderCountData = () => {
    const filteredOrders = getFilteredOrders();
    const { from, to } = getDateRange(chartFilters.dateRange);
    
    const days = [];
    const currentDate = new Date(from);
    
    while (currentDate <= to) {
      const dayOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === currentDate.toDateString();
      }).length;
      
      days.push({
        date: currentDate.toISOString(),
        orders: dayOrders
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setOrderCountData(days);
  };

  // Handle filter changes - auto-apply status filter immediately
  const handleFilterChange = (key: keyof ChartFilters, value: string) => {
    setChartFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Auto-apply status filter immediately
    if (key === 'status') {
      setTimeout(() => {
        generateFilteredRevenueData();
        generateOrderCountData();
      }, 100);
    }
  };

  // Apply filters
  const applyFilters = () => {
    generateFilteredRevenueData();
    generateOrderCountData();
    setShowFiltersPopover(false);
    toast({
      title: "Filters Applied",
      description: "Charts updated with new filters",
    });
  };

  // Clear filters
  const clearFilters = () => {
    setChartFilters({
      dateRange: "last_30_days",
      fromDate: "",
      toDate: "",
      status: "all",
      minAmount: "",
      maxAmount: ""
    });
    setTimeout(() => {
      generateFilteredRevenueData();
      generateOrderCountData();
    }, 100);
  };

  // Refresh charts
  const refreshCharts = () => {
    setIsRefreshing(true);
    generateFilteredRevenueData();
    generateOrderCountData();
    setTimeout(() => setIsRefreshing(false), 1000);
    toast({
      title: "Charts Refreshed",
      description: "Data has been updated",
    });
  };

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('=== DASHBOARD LOADING ===');
    console.log('Sending requests for dashboard data...');
    
    wsService.send({ type: 'get_products' });
    wsService.send({ type: 'get_analytics', filters: {} }); // Back to original
    wsService.send({ type: 'get_users', filters: {} });

    const handleProductsData = (data: any) => {
      console.log('Dashboard received products data:', data.products?.length || 0, 'products');
      setProducts(data.products || []);
      calculateStats();
    };

    const handleAnalyticsData = (data: any) => {
      console.log('=== ANALYTICS DATA RECEIVED ===');
      console.log('Data received:', data);
      
      // Handle orders data if present (for chart generation)
      if (data.orders && Array.isArray(data.orders)) {
        console.log('Setting orders:', data.orders.length);
        setOrders(data.orders);
        setRecentOrders(data.orders.slice(0, 10));
        setAnalyticsLoaded(true); // Prevent calculateStats from overriding
      }
      
      // Handle analytics data for stats
      if (data.analytics) {
        console.log('Setting analytics data');
        const analytics = data.analytics;
        setStats({
          totalRevenue: analytics.total_revenue || 0,
          totalOrders: analytics.total_orders || 0,
          activeOrders: analytics.active_orders || 0,
          activeUsers: analytics.total_users || 0,
          totalProducts: analytics.total_products || 0,
        });
        setAnalyticsLoaded(true);
      }
    };

    const handleUsersData = (data: any) => {
      console.log('Dashboard received users data');
      setUsers(data.users || []);
      calculateStats();
    };

    const handleError = (data: any) => {
      console.error('Dashboard WebSocket error:', data);
      if (!data.message?.includes('Unknown message type')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    wsService.onMessage("products_data", handleProductsData);
    wsService.onMessage("orders_data", handleAnalyticsData); // Change to orders_data
    wsService.onMessage("users_data", handleUsersData);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("products_data", () => {});
      wsService.onMessage("orders_data", () => {}); // Change to orders_data
      wsService.onMessage("users_data", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [toast, setRecentOrders, setStats, setRevenueData, setProducts, setOrders, setUsers]);

  // Calculate stats based on current data - FIXED: Don't override analytics data
  const calculateStats = () => {
    // If analytics data was already loaded, don't override it
    if (analyticsLoaded) {
      console.log('Skipping calculateStats - analytics already loaded');
      return;
    }
    
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

    console.log('Calculated stats locally:', newStats);
    setStats(newStats);
  };

  // Update charts when orders or filters change
  useEffect(() => {
    if (orders.length > 0) {
      generateFilteredRevenueData();
      generateOrderCountData();
    }
  }, [orders, chartFilters]);

  // Recalculate stats when data changes
  useEffect(() => {
    if (products.length > 0 || orders.length > 0 || users.length > 0) {
      calculateStats();
    }
  }, [products, orders, users]);

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

  // Count active filters - updated since status moved outside
  const getActiveFiltersCount = () => {
    let count = 0;
    if (chartFilters.dateRange !== 'last_30_days') count++;
    if (chartFilters.minAmount) count++;
    if (chartFilters.maxAmount) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

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

      {/* Chart Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Chart Filters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCharts}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Popover open={showFiltersPopover} onOpenChange={setShowFiltersPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Advanced Filters</h4>
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    
                    <Separator />

                    {/* Amount Range */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Min Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={chartFilters.minAmount}
                          onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="No limit"
                          value={chartFilters.maxAmount}
                          onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                        />
                      </div>
                    </div>

                    <Button onClick={applyFilters} className="w-full">
                      Apply Amount Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardTitle>
          <CardDescription>
            Customize the date range and filters for both charts
          </CardDescription>
          
          {/* Quick Filters Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Date Range:</Label>
              <Select 
                value={chartFilters.dateRange} 
                onValueChange={(value) => handleFilterChange('dateRange', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select 
                value={chartFilters.status} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {chartFilters.dateRange === 'custom' && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={chartFilters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={chartFilters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={applyFilters} 
                className="mt-3"
                size="sm"
              >
                Apply Date Range
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>
              Daily revenue for the selected period
              {chartFilters.status !== 'all' && ` (${chartFilters.status} orders only)`}
            </CardDescription>
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
                  <p className="text-muted-foreground">No revenue data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Count Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Order Count Trend
            </CardTitle>
            <CardDescription>
              Daily order count for the selected period
              {chartFilters.status !== 'all' && ` (${chartFilters.status} orders only)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {orderCountData && orderCountData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderCountData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                      formatter={(value) => [value, "Orders"]}
                    />
                    <Bar
                      dataKey="orders"
                      fill="hsl(var(--primary))"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No order data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from your customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!recentOrders || recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent orders</p>
            ) : (
              recentOrders.map((order: any) => (
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
      </Card> */}
    </div>
  );
}