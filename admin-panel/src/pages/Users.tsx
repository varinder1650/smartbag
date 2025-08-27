import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Shield, User, Truck, Store, Loader2 } from "lucide-react";
import { format } from "date-fns";

const roleIcons = {
  admin: Shield,
  customer: User,
  delivery_partner: Truck,
  vendor: Store,
};

const roleColors = {
  admin: "destructive",
  customer: "secondary", 
  delivery_partner: "default",
  vendor: "outline",
} as const;

export default function Users() {
  const { users, setUsers } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "customer", label: "Customer" },
    { value: "delivery_partner", label: "Delivery Partner" },
    { value: "vendor", label: "Vendor" },
  ];

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Users component mounted, requesting data...');
    setIsLoading(true);
    
    // Request initial users data
    wsService.send({
      type: 'get_users',
      filters: {}
    });

    // Set up real-time message handlers
    const handleUsersData = (data) => {
      console.log('Received users data:', data);
      setUsers(data.users || []);
      setIsLoading(false);
    };

    const handleUserUpdated = (data) => {
      console.log('User updated:', data);
      wsService.send({ type: 'get_users', filters: {} });
      setLoadingUsers(new Set()); // Clear loading states
      toast({
        title: "User Updated",
        description: "User has been updated successfully",
      });
    };

    const handleUserStatusUpdated = (data) => {
      console.log('User status updated:', data);
      wsService.send({ type: 'get_users', filters: {} });
      setLoadingUsers(new Set()); // Clear loading states
      toast({
        title: "Status Updated",
        description: "User status has been updated successfully",
      });
    };

    const handleInfo = (data) => {
      console.log('Info message:', data);
      toast({
        title: "Info",
        description: data.message || "Operation completed",
      });
    };

    const handleError = (data) => {
      console.error('WebSocket error:', data);
      setIsLoading(false);
      setLoadingUsers(new Set()); // Clear loading states
      
      // Only show error toast for actual errors, not missing features
      if (!data.message?.includes('not implemented yet') && 
          !data.message?.includes('coming soon')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Feature Coming Soon",
          description: data.message,
        });
      }
    };

    // Register message handlers
    wsService.onMessage("users_data", handleUsersData);
    wsService.onMessage("user_updated", handleUserUpdated);
    wsService.onMessage("user_status_updated", handleUserStatusUpdated);
    wsService.onMessage("info", handleInfo);
    wsService.onMessage("error", handleError);

    // Cleanup function
    return () => {
      wsService.onMessage("users_data", () => {});
      wsService.onMessage("user_updated", () => {});
      wsService.onMessage("user_status_updated", () => {});
      wsService.onMessage("info", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [setUsers, toast]);

  const filteredUsers = users.filter(user => {
    if (!user.name || !user.email) return false;
    
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    console.log(`Changing role for user ${userId} to ${newRole}`);
    
    setLoadingUsers(prev => new Set(prev).add(userId));
    
    wsService.send({
      type: 'update_user_role',
      data: { user_id: userId, role: newRole }
    });

    toast({
      title: "Updating User Role",
      description: `Changing user role to ${newRole}...`,
    });
  };

  const handleStatusToggle = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    console.log(`Toggling status for user ${userId} from ${currentStatus} to ${newStatus}`);
    
    setLoadingUsers(prev => new Set(prev).add(userId));
    
    wsService.send({
      type: 'update_user_status',
      data: { user_id: userId, status: newStatus }
    });

    toast({
      title: "Updating User Status",
      description: `${newStatus === 'active' ? 'Activating' : 'Deactivating'} user...`,
    });
  };

  const getRoleStats = () => {
    const stats = users.reduce((acc, user) => {
      const role = user.role || 'customer';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { role: 'admin', count: stats.admin || 0, label: 'Admins' },
      { role: 'customer', count: stats.customer || 0, label: 'Customers' },
      { role: 'delivery_partner', count: stats.delivery_partner || 0, label: 'Delivery Partners' },
      { role: 'vendor', count: stats.vendor || 0, label: 'Vendors' },
    ];
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {getRoleStats().map((stat) => {
          const Icon = roleIcons[stat.role as keyof typeof roleIcons];
          return (
            <Card key={stat.role}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            {isLoading ? "Loading users..." : `${filteredUsers.length} users found`}
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter} disabled={isLoading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const Icon = roleIcons[user.role as keyof typeof roleIcons] || User;
                  const isUserLoading = loadingUsers.has(user._id || user.id);
                  
                  return (
                    <TableRow key={user._id || user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{user.name || user.email || "Unknown"}</span>
                          {isUserLoading && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role || "customer"}
                          onValueChange={(value) => handleRoleChange(user._id || user.id, value)}
                          disabled={isUserLoading}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="delivery_partner">Delivery Partner</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={user.status || "active"} />
                          <Switch
                            checked={(user.status || "active") === 'active'}
                            onCheckedChange={() => handleStatusToggle(user._id || user.id, user.status || "active")}
                            disabled={isUserLoading}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.joined_at ? format(new Date(user.joined_at), "MMM dd, yyyy") : 
                         user.created_at ? format(new Date(user.created_at), "MMM dd, yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {(user.status || "active") === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusToggle(user._id || user.id, user.status || "active")}
                              disabled={isUserLoading}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStatusToggle(user._id || user.id, user.status || "active")}
                              disabled={isUserLoading}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          {!isLoading && filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}