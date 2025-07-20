import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';

const Debug = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [authStatus, setAuthStatus] = useState('Testing...');
  const [localStorageStatus, setLocalStorageStatus] = useState('Testing...');

  useEffect(() => {
    testAPI();
    testAuth();
    testLocalStorage();
  }, []);

  const testAPI = async () => {
    try {
      const response = await fetch('http://10.0.0.74:3001/api/health');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(`✅ API Connected: ${data.message}`);
      } else {
        setApiStatus(`❌ API Error: ${response.status}`);
      }
    } catch (error) {
      setApiStatus(`❌ API Failed: ${error.message}`);
    }
  };

  const testAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const response = await fetch('http://10.0.0.74:3001/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          setAuthStatus('✅ Authenticated');
        } else {
          setAuthStatus('❌ Token invalid');
        }
      } else {
        setAuthStatus('❌ No token found');
      }
    } catch (error) {
      setAuthStatus(`❌ Auth error: ${error.message}`);
    }
  };

  const testLocalStorage = () => {
    try {
      const token = localStorage.getItem('adminToken');
      setLocalStorageStatus(token ? `✅ Token: ${token.substring(0, 20)}...` : '❌ No token');
    } catch (error) {
      setLocalStorageStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel Debug
      </Typography>
      
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>API Connection</Typography>
        <Alert severity={apiStatus.includes('✅') ? 'success' : 'error'}>
          {apiStatus}
        </Alert>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Authentication</Typography>
        <Alert severity={authStatus.includes('✅') ? 'success' : 'error'}>
          {authStatus}
        </Alert>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Local Storage</Typography>
        <Alert severity={localStorageStatus.includes('✅') ? 'success' : 'error'}>
          {localStorageStatus}
        </Alert>
      </Paper>

      <Button 
        variant="contained" 
        onClick={() => window.location.href = '/login'}
        sx={{ mr: 2 }}
      >
        Go to Login
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={() => window.location.reload()}
      >
        Reload Page
      </Button>
    </Box>
  );
};

export default Debug; 