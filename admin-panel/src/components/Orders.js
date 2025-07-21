import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid } from '@mui/x-data-grid';
import { apiService, extractData, handleApiError } from '../services/api';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPartner, setEditPartner] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [users, setUsers] = useState([]); // For delivery partner selection
  const [search, setSearch] = useState('');
  const filteredOrders = orders.filter(order =>
    order._id && order._id.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getOrders();
      const ordersArray = extractData(response);
      const safeOrders = Array.isArray(ordersArray) ? ordersArray : [];
      const filteredOrders = safeOrders.filter(order => order._id);
      
      // Flatten user fields for DataGrid and ensure all fields are properly mapped
      const mappedOrders = filteredOrders.map(order => ({
        ...order,
        id: order._id, // Ensure DataGrid has a proper id field
        // User information from user_info field
        customerName: order.user_info?.name || order.user || 'N/A',
        customerEmail: order.user_info?.email || 'N/A',
        customerPhone: order.user_info?.phone || 'N/A',
        // Format delivery address for display - note the field name is delivery_address
        deliveryAddressFormatted: order.delivery_address ? 
          `${order.delivery_address.address}, ${order.delivery_address.city}${order.delivery_address.state ? `, ${order.delivery_address.state}` : ''} - ${order.delivery_address.pincode}` : 
          'N/A',
        // Get latest status change - note the field name is status_change_history
        lastStatusChange: order.status_change_history && order.status_change_history.length > 0 ? 
          order.status_change_history[order.status_change_history.length - 1] : null,
        // Ensure these fields are properly set - note the field names
        totalAmount: order.total_amount || 0,
        paymentMethod: order.payment_method || 'N/A',
        createdAt: order.created_at || order.createdAt || '',
        updatedAt: order.updated_at,
        status: order.order_status || 'pending',
        items: order.items || []
      }));
      
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      // ignore for now
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditPartner(order.delivery_partner || '');
    setEditDialogOpen(true);
  };

  const handleDelete = (order) => {
    setDeletingOrder(order);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingOrder) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await apiService.deleteOrder(deletingOrder._id);
      setSuccess('Order deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingOrder(null);
      fetchData();
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await apiService.updateOrderStatus(editingOrder._id, status);
      setSuccess('Order status updated successfully');
      setOpenDialog(false);
      fetchData();
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await apiService.updateOrderStatus(editingOrder._id, editStatus, editPartner);
      setSuccess('Order updated successfully');
      setEditDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderIdClick = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'primary';
      case 'out_for_delivery':
        return 'secondary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const statusSteps = [
    { key: 'confirmed', label: 'Order Confirmed' },
    { key: 'payment_accepted', label: 'Payment Accepted' },
    { key: 'preparing', label: 'Order is Being Prepared' },
    { key: 'shipped', label: 'Order Has Been Shipped' },
    { key: 'delivered', label: 'Order Successfully Delivered' },
  ];

  const columns = [
    {
      field: '_id',
      headerName: 'Order ID',
      width: 220,
      renderCell: (params) => (
        <Link
          component="button"
          variant="body2"
          onClick={() => handleOrderIdClick(params.row)}
          underline="hover"
        >
          {params.value}
        </Link>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Order Date',
      width: 180,
      valueGetter: (params) => formatDateTime(params.value),
    },
    {
      field: 'assignedTo',
      headerName: 'Assigned To',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.delivery_partner_info?.name || 'Unassigned'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleEdit(params.row)} size="small">
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Orders</Typography>
        <input
          type="text"
          placeholder="Search by Order ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: 8, fontSize: 16, borderRadius: 4, border: '1px solid #ccc', minWidth: 250 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <DataGrid
        rows={filteredOrders}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        autoHeight
        getRowId={(row) => row._id || row.id}
        rowHeight={60}
        sx={{
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #e0e0e0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
            borderBottom: '2px solid #e0e0e0',
          },
        }}
      />

      {/* Edit Status Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Update Order Status
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Order ID: {editingOrder?._id}
            </Typography>
            
            {/* Delivery Address Section */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationIcon />
                Delivery Address
              </Typography>
              <Typography variant="body2">
                {editingOrder?.deliveryAddressFormatted || 'N/A'}
              </Typography>
            </Paper>

            {/* Status Change History */}
            {editingOrder?.statusChangeHistory && editingOrder.statusChangeHistory.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <HistoryIcon />
                  Status History
                </Typography>
                <List dense>
                  {editingOrder.statusChangeHistory.slice().reverse().map((change, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={change.status}
                              color={getStatusColor(change.status)}
                              size="small"
                            />
                            <Typography variant="body2" color="textSecondary">
                              by {change.changedBy}
                            </Typography>
                          </Box>
                        }
                        secondary={formatDateTime(change.changedAt)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                label="New Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !status}
          >
            {submitting ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={editStatus}
              label="Status"
              onChange={e => setEditStatus(e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Delivery Partner</InputLabel>
            <Select
              value={editPartner}
              label="Delivery Partner"
              onChange={e => setEditPartner(e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.filter(u => u.role === 'partner').map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleEditSubmit} color="primary" disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this order?</Typography>
          {deletingOrder && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Order ID: {deletingOrder._id}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{ sx: { width: 400, maxWidth: '90vw' } }}
      >
        <Box sx={{ p: 3, minHeight: '100vh' }}>
          {selectedOrder ? (
            <>
              {/* Order Status Timeline at the top */}
              <Typography variant="h6" gutterBottom>Order Details</Typography>
              <Timeline position="right" sx={{ mb: 2 }}>
                {[
                  { key: 'placed', label: 'Order Placed' },
                  { key: 'confirmed', label: 'Order Confirmed' },
                  { key: 'preparing', label: 'Preparing' },
                  { key: 'assigned_to_partner', label: 'Assigned to Partner' },
                  { key: 'out_for_delivery', label: 'Out for Delivery' },
                  { key: 'delivered', label: 'Delivered' },
                ].map((step, idx, arr) => {
                  // Find the first matching status_change_history for this step
                  const history = step.key === 'placed'
                    ? (selectedOrder.status_change_history?.[0] || null)
                    : selectedOrder.status_change_history?.find(h => h.status === step.key);
                  // Determine if this is the current status
                  const isActive = selectedOrder.status === step.key || (step.key === 'placed' && selectedOrder.status_change_history?.length > 0 && selectedOrder.status_change_history[0].status === 'pending');
                  // Determine if this step is completed
                  const isCompleted = step.key === 'placed'
                    ? true
                    : selectedOrder.status_change_history?.some(h => h.status === step.key);
                  return (
                    <TimelineItem key={step.key}>
                      <TimelineOppositeContent sx={{ flex: 0.25, pr: 0 }}>
                        {history ? formatDateTime(history.changed_at) : ''}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={isActive ? 'primary' : isCompleted ? 'success' : 'grey'} />
                        {idx < arr.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography color={isActive ? 'primary' : isCompleted ? 'textSecondary' : 'text.disabled'}>
                          {step.label}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>
              {/* Order ID only, no date/status here */}
              <Typography variant="subtitle2" color="textSecondary">Order ID:</Typography>
              <Typography variant="body1" gutterBottom>{selectedOrder._id}</Typography>
              <Divider sx={{ my: 2 }} />
              {/* Customer Details */}
              <Typography variant="subtitle2" color="textSecondary">Customer Details:</Typography>
              <Typography variant="body1">{selectedOrder.user_info?.name || 'N/A'}</Typography>
              <Typography variant="body2" color="textSecondary">{selectedOrder.user_info?.email || 'N/A'}</Typography>
              <Typography variant="body2" color="textSecondary">{selectedOrder.user_info?.phone || 'N/A'}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {selectedOrder.delivery_address ? `${selectedOrder.delivery_address.address}, ${selectedOrder.delivery_address.city}${selectedOrder.delivery_address.state ? `, ${selectedOrder.delivery_address.state}` : ''} - ${selectedOrder.delivery_address.pincode}` : 'N/A'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              {/* Products */}
              <Typography variant="subtitle2" color="textSecondary">Products:</Typography>
              <List>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item, idx) => (
                    <ListItem key={idx} alignItems="flex-start">
                      <ListItemText
                        primary={`${item.product_name || 'Unknown'} (ID: ${item.product_id || item.product})`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Quantity: {item.quantity} | Price: ₹{item.product_price} | Total: ₹{item.product_price * item.quantity}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No products found" />
                  </ListItem>
                )}
              </List>
              <Divider sx={{ my: 2 }} />
              {/* Price Summary */}
              <Typography variant="subtitle2" color="textSecondary">Price Summary:</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">Subtotal: ₹{selectedOrder.subtotal}</Typography>
                <Typography variant="body2">App Fee: ₹{selectedOrder.app_fee}</Typography>
                <Typography variant="body2">Delivery Fee: ₹{selectedOrder.delivery_charge}</Typography>
                <Typography variant="body2">Tax: ₹{selectedOrder.tax}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>Total: ₹{selectedOrder.totalAmount}</Typography>
              </Box>
            </>
          ) : (
            <Typography>No order selected.</Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Orders; 
