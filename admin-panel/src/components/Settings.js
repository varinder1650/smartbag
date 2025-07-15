import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Divider,
  Paper,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService, handleApiError } from '../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    appFee: 10,
    deliveryCharge: 40,
    gstRate: 5,
    minOrderAmount: 100,
    maxDeliveryDistance: 10,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await apiService.updateSettings(settings);
      setSuccess('Settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateExample = () => {
    const subtotal = 100;
    const gst = (subtotal * settings.gstRate) / 100;
    const total = subtotal + gst + settings.deliveryCharge + settings.appFee;
    return { subtotal, gst, deliveryCharge: settings.deliveryCharge, appFee: settings.appFee, total };
  };

  const example = calculateExample();

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
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Settings
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSettings}
          disabled={saving}
        >
          Refresh
        </Button>
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

      <Grid container spacing={3}>
        {/* Fee Settings */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fee Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="App Fee (₹)"
                    type="number"
                    value={settings.appFee}
                    onChange={(e) => handleInputChange('appFee', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Fixed fee charged per order"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Delivery Charge (₹)"
                    type="number"
                    value={settings.deliveryCharge}
                    onChange={(e) => handleInputChange('deliveryCharge', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Fixed delivery charge per order"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="GST Rate (%)"
                    type="number"
                    value={settings.gstRate}
                    onChange={(e) => handleInputChange('gstRate', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    helperText="GST percentage applied to subtotal"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Minimum Order Amount (₹)"
                    type="number"
                    value={settings.minOrderAmount}
                    onChange={(e) => handleInputChange('minOrderAmount', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Minimum order value for delivery"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Delivery Distance (km)"
                    type="number"
                    value={settings.maxDeliveryDistance}
                    onChange={(e) => handleInputChange('maxDeliveryDistance', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.1 }}
                    helperText="Maximum delivery distance in kilometers"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save Settings'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Example Calculation */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Example Calculation
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Order Value: ₹{example.subtotal}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2">₹{example.subtotal.toFixed(2)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">GST ({settings.gstRate}%):</Typography>
                    <Typography variant="body2">₹{example.gst.toFixed(2)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Delivery Charge:</Typography>
                    <Typography variant="body2">₹{example.deliveryCharge.toFixed(2)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">App Fee:</Typography>
                    <Typography variant="body2">₹{example.appFee.toFixed(2)}</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" fontWeight="bold">Total:</Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      ₹{example.total.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                This example shows how fees are calculated for a ₹100 order.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 