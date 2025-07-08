import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/orders');
      const orders = Array.isArray(response.data) ? response.data : [];
      
      // Process orders to add customerName field
      const processedOrders = orders.map(order => ({
        ...order,
        customerName: order.user ? (typeof order.user === 'object' ? order.user.name : order.user) : 'N/A'
      }));
      
      setOrders(processedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Error fetching orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      field: 'orderNumber', 
      headerName: 'Order #', 
      width: 150,
    },
    { 
      field: 'customerName', 
      headerName: 'Customer', 
      width: 200,
    },
    { 
      field: 'totalAmount', 
      headerName: 'Total', 
      width: 120,
      valueFormatter: (params) => {
        if (params.value === null || params.value === undefined) return 'N/A';
        return `₹${params.value}`;
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'completed' ? 'success' : 'warning'}
          size="small"
        />
      ) 
    },
    { 
      field: 'createdAt', 
      headerName: 'Date', 
      width: 200,
      valueFormatter: (params) => {
        if (!params.value) return 'N/A';
        try {
          return new Date(params.value).toLocaleDateString();
        } catch (error) {
          return 'Invalid Date';
        }
      }
    },
  ];

  return (
    <Box sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 600, width: '100%' }}>
        {orders && orders.length > 0 ? (
          <DataGrid
            rows={orders}
            columns={columns}
            getRowId={(row) => row._id || row.id || Math.random().toString()}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            onError={(error) => {
              console.error('DataGrid error:', error);
              setError('Error displaying data grid');
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h6" color="textSecondary">
              {loading ? 'Loading orders...' : 'No orders found'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Orders; 