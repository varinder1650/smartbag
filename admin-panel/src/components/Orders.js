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
import { DataGrid } from '@mui/x-data-grid';
import { apiService, extractData, handleApiError } from '../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getOrders();
      const ordersArray = extractData(response);
      const safeOrders = Array.isArray(ordersArray) ? ordersArray : [];
      
      // Flatten user fields for DataGrid and ensure all fields are properly mapped
      const mappedOrders = safeOrders.map(order => ({
        ...order,
        id: order._id, // Ensure DataGrid has a proper id field
        customerName: order.user?.name || 'N/A',
        customerEmail: order.user?.email || 'N/A',
        customerPhone: order.user?.phone || 'N/A',
        // Format delivery address for display
        deliveryAddressFormatted: order.deliveryAddress ? 
          `${order.deliveryAddress.address}, ${order.deliveryAddress.city}${order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ''} - ${order.deliveryAddress.pincode}` : 
          'N/A',
        // Get latest status change
        lastStatusChange: order.statusChangeHistory && order.statusChangeHistory.length > 0 ? 
          order.statusChangeHistory[order.statusChangeHistory.length - 1] : null,
        // Ensure these fields are properly set
        totalAmount: order.totalAmount || 0,
        paymentMethod: order.paymentMethod || 'N/A',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        status: order.status || 'pending',
        items: order.items || []
      }));
      
      console.log('Mapped orders:', mappedOrders); // Debug log
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

  const handleEdit = (order) => {
    setEditingOrder(order);
    setStatus(order.status || 'pending');
    setError('');
    setSuccess('');
    setOpenDialog(true);
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

  const columns = [
    { field: '_id', headerName: 'Order ID', width: 220 },
    { field: 'customerName', headerName: 'Customer', width: 150 },
    { field: 'customerEmail', headerName: 'Email', width: 200 },
    { field: 'customerPhone', headerName: 'Phone', width: 130 },
    {
      field: 'deliveryAddressFormatted',
      headerName: 'Delivery Address',
      width: 300,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: 250 
          }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'items',
      headerName: 'Items',
      width: 100,
      renderCell: (params) => (
        <Box>
          {params.value?.length || 0} items
        </Box>
      ),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          ₹{params.value ? Number(params.value).toFixed(2) : '0.00'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'paymentMethod',
      headerName: 'Payment',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? params.value.toUpperCase() : 'N/A'}
          variant="outlined"
          size="small"
          color={params.value === 'online' ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Order Date',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDateTime(params.value)}
        </Typography>
      ),
    },
    {
      field: 'lastStatusChange',
      headerName: 'Last Update',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value ? formatDateTime(params.value.changedAt) : 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <IconButton onClick={() => handleEdit(params.row)} size="small">
          <EditIcon />
        </IconButton>
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
        rows={orders}
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
    </Box>
  );
};

export default Orders; 