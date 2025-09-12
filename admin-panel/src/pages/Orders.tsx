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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/store/dashboardStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Truck, Clock, CheckCircle, Package, Loader2, User, Calendar, MapPin, ExternalLink, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DeliveryPartner {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  current_orders?: number;
}

interface OrderStatusHistory {
  status: string;
  timestamp: string;
  updated_by: string;
  notes?: string;
  delivery_partner?: string;
}

export default function Orders() {
  const { orders, setOrders } = useDashboardStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryPartner[]>([]); // New state for delivery requests
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderStatusHistory, setOrderStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const filteredOrders2 =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const currentOrders = filteredOrders2.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredOrders2.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
    { value: "prepared", label: "Prepared" },
    { value: "accepted", label: "Accepted" }, // This is the status that shows assign button
    { value: "assigned", label: "Assigned" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    
    if (wsService.isConnected()) {
      wsService.send({
        type: 'get_orders',
        filters: {}
      });
    } else {
      setTimeout(() => {
        if (wsService.isConnected()) {
          wsService.send({
            type: 'get_orders',
            filters: {}
          });
        }
      }, 2000);
    }

    toast({
      title: "Refreshing Orders",
      description: "Loading latest order data...",
    });
  };

  // Request initial data and set up real-time handlers
  useEffect(() => {
    console.log('Orders component mounted');
    
    // Request orders and delivery partners data
    if (wsService.isConnected()) {
      console.log('Requesting orders and delivery partners data...');
      wsService.send({
        type: 'get_orders',
        filters: {}
      });
      // wsService.send({
      //   type: 'get_delivery_partners'
      // });
    } else {
      console.log('WebSocket not connected, retrying in 2 seconds...');
      setTimeout(() => {
        if (wsService.isConnected()) {
          wsService.send({
            type: 'get_orders',
            filters: {}
          });
          // wsService.send({
          //   type: 'get_delivery_partners'
          // });
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
        setIsRefreshing(false);
      } catch (error) {
        console.error('Error processing orders data:', error);
        setOrders([]);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    const handleDeliveryPartnersData = (data: any) => {
      console.log('Received delivery partners data:', data);
      setDeliveryPartners(data.delivery_partners || []);
    };

    const handleDeliveryRequestsData = (data: any) => {
      console.log('Received delivery requests data for order:', data);
      setDeliveryRequests(data.delivery_requests || []);
    };

    const handleOrderStatusHistory = (data: any) => {
      console.log('Received order status history:', data);
      setOrderStatusHistory(data.history || []);
    };

    const handleOrderUpdated = (data: any) => {
      console.log('Order updated:', data);
      setIsUpdating(false);
      wsService.send({ type: 'get_orders', filters: {} });
      toast({
        title: "Order Updated",
        description: "Order has been updated successfully",
      });
    };

    const handleOrderAssigned = (data: any) => {
      console.log('Order assigned:', data);
      setIsUpdating(false);
      setShowAssignModal(false);
      setSelectedDeliveryPartner("");
      setStatusNotes("");
      wsService.send({ type: 'get_orders', filters: {} });
      toast({
        title: "Order Assigned",
        description: "Order assigned to delivery partner successfully",
      });
    };

    const handleError = (data: any) => {
      console.error('Orders WebSocket error:', data);
      setIsLoading(false);
      setIsUpdating(false);
      setIsRefreshing(false);
      
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
    wsService.onMessage("delivery_partners_data", handleDeliveryPartnersData);
    wsService.onMessage("delivery_requests_data", handleDeliveryRequestsData);
    wsService.onMessage("order_status_history", handleOrderStatusHistory);
    wsService.onMessage("order_updated", handleOrderUpdated);
    wsService.onMessage("order_assigned", handleOrderAssigned);
    wsService.onMessage("error", handleError);

    return () => {
      wsService.onMessage("orders_data", () => {});
      wsService.onMessage("delivery_partners_data", () => {});
      wsService.onMessage("delivery_requests_data", () => {});
      wsService.onMessage("order_status_history", () => {});
      wsService.onMessage("order_updated", () => {});
      wsService.onMessage("order_assigned", () => {});
      wsService.onMessage("error", () => {});
    };
  }, [setOrders, toast]);

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
                               (order.user_name || order.customer || '').toLowerCase().includes(searchTerm);
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
        delivery_partner: newStatus === 'out_for_delivery' ? selectedDeliveryPartner : undefined
      }
    });

    toast({
      title: "Updating Order Status",
      description: `Changing order ${orderId} status to ${newStatus}...`,
    });

    setStatusNotes("");
    setSelectedDeliveryPartner("");
  };

  const handleAssignDeliveryPartner = (orderId: string) => {
    if (!selectedDeliveryPartner) {
      toast({
        title: "Error",
        description: "Please select a delivery partner",
        variant: "destructive",
      });
      return;
    }

    console.log(`Assigning order ${orderId} to delivery partner ${selectedDeliveryPartner}`);
    setIsUpdating(true);

    wsService.send({
      type: 'assign_delivery_partner',
      data: {
        order_id: orderId,
        delivery_partner_id: selectedDeliveryPartner,
        // notes: statusNotes
      }
    });

    toast({
      title: "Assigning Order",
      description: "Assigning order to delivery partner...",
    });
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

  const handleViewOrderDetails = (order: any) => {
    if (!order) {
      console.error('Cannot view order details: order is null/undefined');
      return;
    }
    console.log('Viewing detailed order:', order);
    setSelectedOrder(order);
    
    // Fetch order status history
    // wsService.send({
    //   type: 'get_order_status_history',
    //   data: { order_id: order.id }
    // });
    
    setShowOrderDrawer(true);
  };

  const openAssignModal = (order: any) => {
    setSelectedOrder(order);
    setSelectedDeliveryPartner("");
    setDeliveryRequests([]); // Clear previous requests
    
    // Fetch delivery partners who requested this specific order
    console.log('Fetching delivery requests for order:', order.id);
    wsService.send({
      type: 'get_delivery_requests_for_order',
      data: { order_id: order.id }
    });
    
    setShowAssignModal(true);
  };

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
              key="assigning"
              size="sm"
              onClick={() => handleStatusChange(order.id, 'assigning')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Prepared
            </Button>
          );
          break;
        case 'accepted': // Changed from 'assigning' to 'accepted'
          actions.push(
            <Button
              key="assign"
              size="sm"
              variant="secondary"
              onClick={() => openAssignModal(order)}
              disabled={isUpdating}
            >
              <User className="h-4 w-4 mr-1" />
              Assign Partner
            </Button>
          );
          break;
      }
    } catch (error) {
      console.error('Error generating status actions for order:', order, error);
    }

    return actions;
  };

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
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
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order) => {
                      try {
                        return (
                          <TableRow key={order._id || order.id}>
                            <TableCell className="font-medium">
                              <Button 
                                variant="link" 
                                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                                onClick={() => handleViewOrderDetails(order)}
                              >
                                #{order.id || 'N/A'}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </TableCell>
                            <TableCell>{order.user_name || 'Unknown'}</TableCell>
                            <TableCell>₹{order.total || '0.00'}</TableCell>
                            <TableCell>
                              <StatusBadge status={order.status || 'pending'} />
                            </TableCell>
                            <TableCell>
                              {order.delivery_partner_name ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{order.delivery_partner_name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.created_at ? (
                                format(parseISO(order.created_at), "MMM dd, yyyy")
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.created_at ? (
                                format(parseISO(order.created_at), "HH:mm:ss")
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
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              Error displaying order data
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No orders found matching your criteria.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {filteredOrders2.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {indexOfFirstRow + 1}–{Math.min(indexOfLastRow, filteredOrders2.length)} of {filteredOrders2.length} orders
                  </p>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Details Drawer */}
      <Sheet open={showOrderDrawer} onOpenChange={setShowOrderDrawer}>
        <SheetContent className="w-[800px] sm:w-[1000px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Order Details - #{selectedOrder?.id || 'N/A'}</SheetTitle>
            <SheetDescription>
              Complete order information and status tracking
            </SheetDescription>
          </SheetHeader>
          
          {selectedOrder && (
            <div className="flex-1 overflow-y-auto space-y-6 py-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Customer:</strong> {selectedOrder.user_name || 'N/A'}</p>
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status || 'pending'} /></p>
                    </div>
                    <div>
                      <p><strong>Total:</strong> ₹{selectedOrder.total || '0.00'}</p>
                      <p><strong>Created:</strong> {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), "MMM dd, yyyy HH:mm:ss") : 'N/A'}</p>
                      <p><strong>Delivery Partner:</strong> {selectedOrder.delivery_partner_name || "Not assigned"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderStatusHistory.length > 0 ? (
                      orderStatusHistory.map((history, index) => (
                        <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                Status changed to <StatusBadge status={history.status} />
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(history.timestamp), "MMM dd, HH:mm:ss")}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Updated by: {history.updated_by}
                            </p>
                            {history.delivery_partner && (
                              <p className="text-sm text-muted-foreground">
                                Delivery Partner: {history.delivery_partner}
                              </p>
                            )}
                            {history.notes && (
                              <p className="text-sm mt-1 p-2 bg-muted rounded">
                                {history.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No status history available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedOrder.user_name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedOrder.user_email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedOrder.user_phone || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>{selectedOrder.delivery_address?.address || "No address provided"}</p>
                      {selectedOrder.delivery_address?.city && (
                        <p>{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state}</p>
                      )}
                      {selectedOrder.delivery_address?.pincode && (
                        <p>PIN: {selectedOrder.delivery_address.pincode}</p>
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
                                    {item.product_image?.[0] ? (
                                      <img
                                        src={item.product_image[0]}
                                        alt={item.product_name || 'Product'}
                                        className="h-10 w-10 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <span>{item.product_name || 'Unknown Product'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>₹{item.price || '0.00'}</TableCell>
                                <TableCell>{item.quantity || 0}</TableCell>
                                <TableCell>₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</TableCell>
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
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Delivery Partner Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Delivery Partner</DialogTitle>
            <DialogDescription>
              Select from delivery partners who requested order #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {deliveryRequests.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="delivery-partner">Available Delivery Partners</Label>
                  <Select
                    value={selectedDeliveryPartner}
                    onValueChange={setSelectedDeliveryPartner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select from requested partners" />
                    </SelectTrigger>
                    <SelectContent>
                    {deliveryRequests.map((partner,index) => (
                      <SelectItem key={`${partner.id}-${index}`} value={partner.id}>
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{partner.name}</span>
                            {/* <Badge variant="outline" className="ml-2">
                              {partner.current_orders || 0} orders
                            </Badge> */}
                          </div>
                          {/* <span className="text-xs text-muted-foreground">
                            {partner.phone || partner.email}
                          </span> */}
                        </div>
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Showing {deliveryRequests.length} delivery partner(s) who requested this order
                  </p>
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="assignment-notes">Assignment Notes (optional)</Label>
                  <Textarea
                    id="assignment-notes"
                    placeholder="Add any notes about the assignment..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    disabled={isUpdating}
                  />
                </div> */}

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssignModal(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleAssignDeliveryPartner(selectedOrder?.id)}
                    disabled={isUpdating || !selectedDeliveryPartner}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Assign Partner
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No delivery requests found</p>
                <p className="text-sm text-muted-foreground">
                  No delivery partners have requested this order yet. Please wait for requests or check back later.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAssignModal(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Original Order Details Modal (simplified) */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.id || 'N/A'}</DialogTitle>
            <DialogDescription>
              Quick view of order information
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
                      <p><strong>Name:</strong> {selectedOrder.user_name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedOrder.user_email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedOrder.user_phone || 'N/A'}</p>
                      <p><strong>Order Date:</strong> {
                        selectedOrder.created_at ? 
                          format(new Date(selectedOrder.created_at), "MMM dd, yyyy HH:mm:ss") : 
                          'N/A'
                      }</p>
                      <p><strong>Total:</strong> ₹{selectedOrder.total || '0.00'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status & Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p><strong>Status:</strong> <StatusBadge status={selectedOrder.status || 'pending'} /></p>
                      <p><strong>Delivery Partner:</strong> {selectedOrder.deliveryPartner || "Not assigned"}</p>
                      
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
                      
                      <div className="flex space-x-2">
                        {getStatusActions(selectedOrder)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}