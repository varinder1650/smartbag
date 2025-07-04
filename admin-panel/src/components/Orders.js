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
      setOrders(response.data);
    } catch (error) {
      setError('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'orderNumber', headerName: 'Order #', width: 150 },
    { field: 'user', headerName: 'Customer', width: 200,
      valueGetter: (params) => params.row.user?.name || 'N/A' },
    { field: 'totalAmount', headerName: 'Total', width: 120,
      valueFormatter: (params) => `₹${params.value}` },
    { field: 'status', headerName: 'Status', width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'completed' ? 'success' : 'warning'}
          size="small"
        />
      ) },
    { field: 'createdAt', headerName: 'Date', width: 200,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString() },
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
        <DataGrid
          rows={orders}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default Orders; 