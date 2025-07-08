import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Inventory as ProductsIcon,
  Category as CategoriesIcon,
  Business as BrandsIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  TrendingUp as SalesIcon,
} from '@mui/icons-material';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    brands: 0,
    orders: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [products, categories, brands, orders, users] = await Promise.all([
        axios.get('/products'),
        axios.get('/categories'),
        axios.get('/brands'),
        axios.get('/orders'),
        axios.get('/auth/users'),
      ]);

      setStats({
        products: products.data.length,
        categories: categories.data.length,
        brands: brands.data.length,
        orders: orders.data.length,
        users: users.data.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    <Box sx={{ mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome to your Admin dashboard
      </Typography>

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