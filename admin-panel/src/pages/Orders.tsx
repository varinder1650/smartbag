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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Truck, Clock, CheckCircle, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Orders() {
  const { orders, setOrders } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [deliveryPartner, setDeliveryPartner] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
    { value: "prepared", label: "Prepared" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Orders component mounted');
    
    // Request orders data
    if (wsService.isConnected()) {
      console.log('Requesting orders data...');
      wsService.send({
        type: 'get_orders',
        filters: {}
      });
    } else {
      console.log('WebSocket not connected, retrying in 2 seconds...');
      setTimeout(() => {
        if (wsService.isConnected()) {
          wsService.send({
            type: 'get_orders',
            filters: {}
          });
        }
      }, 2000);
    }

    // Set up real-time message handlers
    const handleOrdersData = (data: any) => {
      console.log('Received orders data:', data);
      try {
        const ordersArray = Array.isArray(data.orders) ? data.orders : [];
        setOrders(ordersArray);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing orders data:', error);
        setOrders([]);
        setIsLoading(false);
      }
    };

    const handleOrderUpdated = (data: any) => {
      console.log('Order updated:', data);
      setIsUpdating(false);
      // Refresh orders list
      wsService.send({ type: 'get_orders', filters: {} });
      toast({
        title: "Order Updated",
        description: "Order has been updated successfully",
      });
    };

    const handleOrderStatusChanged = (data: any) => {
      console.log('Order status changed:', data);
      setIsUpdating(false);
      // Refresh orders list
      wsService.send({ type: 'get_orders', filters: {} });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully",
      });
    };

    const handleError = (data: any) => {
      console.error('Orders WebSocket error:', data);
      setIsLoading(false);
      setIsUpdating(false);
      
      // Only show error toast for relevant errors
      if (!data.message?.includes('Unknown message type') && 
          !data.message?.includes('not implemented')) {
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    };

    // Register message handlers
    wsService.onMessage("orders_data", handleOrdersData);
    wsService.onMessage("order_updated", handleOrderUpdated);
    wsService.onMessage("order_status_updated", handleOrderUpdated);
    wsService.onMessage("order_status_changed", handleOrderStatusChanged);
    wsService.onMessage("error", handleError);

    // Cleanup function
    return () => {
      wsService.onMessage("orders_data", () => {});
      wsService.onMessage("order_updated", () => {});
      wsService.onMessage("order_status_updated", () => {});
      wsService.onMessage("order_status_changed", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [setOrders, toast]);

  // Safely filter orders with proper error handling
  const filteredOrders = (() => {
    try {
      if (!Array.isArray(orders)) {
        console.warn('Orders is not an array:', orders);
        return [];
      }
      
      return orders.filter(order => {
        try {
          if (!order || !order.id) return false;
          
          const searchTerm = searchQuery.toLowerCase();
          const matchesSearch = (order.id || '').toString().toLowerCase().includes(searchTerm) ||
                               (order.customer || '').toLowerCase().includes(searchTerm);
          const matchesStatus = statusFilter === "all" || order.status === statusFilter;
          return matchesSearch && matchesStatus;
        } catch (error) {
          console.error('Error filtering order:', order, error);
          return false;
        }
      });
    } catch (error) {
      console.error('Error in filteredOrders:', error);
      return [];
    }
  })();

  const handleStatusChange = (orderId: string, newStatus: string) => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Invalid order ID",
        variant: "destructive",
      });
      return;
    }

    console.log(`Updating order ${orderId} status to ${newStatus}`);
    setIsUpdating(true);

    wsService.send({
      type: 'update_order_status',
      data: {
        order_id: orderId,
        status: newStatus,
        notes: statusNotes,
        delivery_partner: newStatus === 'out_for_delivery' ? deliveryPartner : undefined
      }
    });

    toast({
      title: "Updating Order Status",
      description: `Changing order ${orderId} status to ${newStatus}...`,
    });

    setStatusNotes("");
    setDeliveryPartner("");
  };

  const handleViewOrder = (order: any) => {
    if (!order) {
      console.error('Cannot view order: order is null/undefined');
      return;
    }
    console.log('Viewing order:', order);
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // FIXED: Added the missing getStatusActions function
  const getStatusActions = (order: any) => {
    if (!order || !order.status) return [];
    
    const actions = [];
    
    try {
      switch (order.status) {
        case 'pending':
          actions.push(
            <Button
              key="confirm"
              size="sm"
              onClick={() => handleStatusChange(order.id, 'confirmed')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          );
          break;
        case 'confirmed':
          actions.push(
            <Button
              key="prepare"
              size="sm"
              onClick={() => handleStatusChange(order.id, 'preparing')}
              disabled={isUpdating}
            >
              <Clock className="h-4 w-4 mr-1" />
              Start Preparing
            </Button>
          );
          break;
        case 'preparing':
          actions.push(
            <Button
              key="prepared"
              size="sm"
              onClick={() => handleStatusChange(order.id, 'prepared')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Prepared
            </Button>
          );
          break;
        case 'prepared':
          actions.push(
            <Button
              key="deliver"
              size="sm"
              onClick={() => handleStatusChange(order.id, 'out_for_delivery')}
              disabled={isUpdating}
            >
              <Truck className="h-4 w-4 mr-1" />
              Out for Delivery
            </Button>
          );
          break;
      }
    } catch (error) {
      console.error('Error generating status actions for order:', order, error);
    }

    return actions;
  };

  // Error boundary-like error handling
  if (!Array.isArray(orders) && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders and delivery status</p>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Error loading orders. Please refresh the page.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage customer orders and delivery status</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            {isLoading ? "Loading orders..." : `${filteredOrders.length} orders found`}
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={setStatusFilter} disabled={isLoading}>
              <SelectTrigger className="w-[180px]">
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Partner</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                    try {
                      return (
                        <TableRow key={order._id || order.id}>
                          <TableCell className="font-medium">#{order.id || 'N/A'}</TableCell>
                          <TableCell>{order.customer || 'Unknown'}</TableCell>
                          <TableCell>${order.total || '0.00'}</TableCell>
                          <TableCell>
                            <StatusBadge status={order.status || 'pending'} />
                          </TableCell>
                          <TableCell>
                            {order.deliveryPartner || (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.createdAt ? (
                              format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewOrder(order)}
                                disabled={isUpdating}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {getStatusActions(order)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    } catch (error) {
                      console.error('Error rendering order row:', order, error);
                      return (
                        <TableRow key={`error-${order._id || order.id || Math.random()}`}>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Error displaying order data
                          </TableCell>
                        </TableRow>
                      );
                    }
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No orders found matching your criteria.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.id || 'N/A'}</DialogTitle>
            <DialogDescription>
              Complete order information and status management
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedOrder.customer || 'N/A'}</p>
                      <p><strong>Order Date:</strong> {
                        selectedOrder.createdAt ? 
                          format(new Date(selectedOrder.createdAt), "MMM dd, yyyy HH:mm") : 
                          'N/A'
                      }</p>
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status || 'pending'} /></p>
                      <p><strong>Total:</strong> ${selectedOrder.total || '0.00'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Delivery Partner:</strong> {selectedOrder.deliveryPartner || "Not assigned"}</p>
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status || 'pending'} /></p>
                      
                      {selectedOrder.status === 'prepared' && (
                        <div className="space-y-3 mt-4">
                          <Label htmlFor="delivery-partner">Assign Delivery Partner</Label>
                          <Input
                            id="delivery-partner"
                            placeholder="Enter delivery partner name"
                            value={deliveryPartner}
                            onChange={(e) => setDeliveryPartner(e.target.value)}
                          />
                          <Button
                            onClick={() => handleStatusChange(selectedOrder.id, 'out_for_delivery')}
                            disabled={!deliveryPartner || isUpdating}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            {isUpdating ? "Assigning..." : "Assign & Send for Delivery"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item: any, index: number) => {
                          try {
                            return (
                              <TableRow key={item.id || `item-${index}`}>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name || 'Product'}
                                        className="h-10 w-10 rounded-lg object-cover"
                                        onError={(e) => {
                                          console.error('Failed to load item image:', item.image);
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <span>{item.name || 'Unknown Product'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>${item.price || '0.00'}</TableCell>
                                <TableCell>{item.quantity || 0}</TableCell>
                                <TableCell>${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          } catch (error) {
                            console.error('Error rendering order item:', item, error);
                            return (
                              <TableRow key={`error-item-${index}`}>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Error displaying item
                                </TableCell>
                              </TableRow>
                            );
                          }
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <p className="text-muted-foreground">No items found for this order</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Status Change */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      {getStatusActions(selectedOrder)}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status-notes">Notes (optional)</Label>
                      <Textarea
                        id="status-notes"
                        placeholder="Add any notes about the status change..."
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}