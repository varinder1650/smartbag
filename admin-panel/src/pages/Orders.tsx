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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Truck, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function Orders() {
  const { orders, setOrders } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [deliveryPartner, setDeliveryPartner] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

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
    // Request initial orders data
    wsService.send({
      type: 'get_orders',
      filters: {}
    });

    // Set up real-time message handlers
    const handleOrdersData = (data) => {
      console.log('Received orders data:', data);
      setOrders(data.orders || []);
    };

    const handleOrderUpdated = (data) => {
      console.log('Order updated:', data);
      wsService.send({ type: 'get_orders', filters: {} });
    };

    const handleOrderStatusChanged = (data) => {
      console.log('Order status changed:', data);
      wsService.send({ type: 'get_orders', filters: {} });
    };

    const handleError = (data) => {
      console.error('WebSocket error:', data);
      toast({
        title: "Error",
        description: data.message || "An error occurred",
        variant: "destructive",
      });
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId, newStatus) => {
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

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const getStatusActions = (order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            onClick={() => handleStatusChange(order.id, 'confirmed')}
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
          >
            <Truck className="h-4 w-4 mr-1" />
            Out for Delivery
          </Button>
        );
        break;
    }

    return actions;
  };

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
            {filteredOrders.length} orders found
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
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
              {filteredOrders.map((order) => (
                <TableRow key={order._id || order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>${order.total}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    {order.deliveryPartner || (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {getStatusActions(order)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.id}</DialogTitle>
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
                      <p><strong>Name:</strong> {selectedOrder.customer}</p>
                      <p><strong>Order Date:</strong> {format(new Date(selectedOrder.createdAt), "MMM dd, yyyy HH:mm")}</p>
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status} /></p>
                      <p><strong>Total:</strong> ${selectedOrder.total}</p>
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
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status} /></p>
                      
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
                            disabled={!deliveryPartner}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Assign & Send for Delivery
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
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              )}
                              <span>{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>${item.price}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            <p className="text-muted-foreground">No items found</p>
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