import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Inventory as ProductsIcon,
  Category as CategoriesIcon,
  Business as BrandsIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  TrendingUp as SalesIcon,
} from '@mui/icons-material';
import { apiService, extractData, handleApiError } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    brands: 0,
    orders: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      const [productsRes, categoriesRes, brandsRes, ordersRes, usersRes] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
        apiService.getBrands(),
        apiService.getOrders(),
        apiService.getUsers(),
      ]);

      // Extract data using helper function to handle nested structures
      const productsArray = extractData(productsRes);
      const categoriesArray = extractData(categoriesRes);
      const brandsArray = extractData(brandsRes);
      const ordersArray = extractData(ordersRes);
      const usersArray = extractData(usersRes);

      // Ensure we always have arrays
      const safeProducts = Array.isArray(productsArray) ? productsArray : [];
      const safeCategories = Array.isArray(categoriesArray) ? categoriesArray : [];
      const safeBrands = Array.isArray(brandsArray) ? brandsArray : [];
      const safeOrders = Array.isArray(ordersArray) ? ordersArray : [];
      const safeUsers = Array.isArray(usersArray) ? usersArray : [];

      console.log('Dashboard stats:', {
        products: safeProducts.length,
        categories: safeCategories.length,
        brands: safeBrands.length,
        orders: safeOrders.length,
        users: safeUsers.length,
      });

      setStats({
        products: safeProducts.length,
        categories: safeCategories.length,
        brands: safeBrands.length,
        orders: safeOrders.length,
        users: safeUsers.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome to your Admin dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Products"
            value={stats.products}
            icon={<ProductsIcon sx={{ color: 'white' }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Categories"
            value={stats.categories}
            icon={<CategoriesIcon sx={{ color: 'white' }} />}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Brands"
            value={stats.brands}
            icon={<BrandsIcon sx={{ color: 'white' }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Orders"
            value={stats.orders}
            icon={<OrdersIcon sx={{ color: 'white' }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Registered Users"
            value={stats.users}
            icon={<UsersIcon sx={{ color: 'white' }} />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Sales"
            value="₹0"
            icon={<SalesIcon sx={{ color: 'white' }} />}
            color="error.main"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 