import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { apiService, extractData, handleApiError } from '../services/api';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getBrands();
      const brandsArray = extractData(response);
      const safeBrands = Array.isArray(brandsArray) ? brandsArray : [];

      setBrands(
        data.filter(row => row._id)
      );
      
      setBrands(safeBrands);
    } catch (error) {
      console.error('Error fetching brands:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      description: '',
    });
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name || '',
      description: brand.description || '',
    });
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await apiService.deleteBrand(id);
        setSuccess('Brand deleted successfully');
        fetchData();
      } catch (error) {
        const errorResult = handleApiError(error);
        setError(errorResult.message);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingBrand) {
        await apiService.updateBrand(editingBrand._id, formData);
        setSuccess('Brand updated successfully');
      } else {
        await apiService.createBrand(formData);
        setSuccess('Brand created successfully');
      }

      setOpenDialog(false);
      fetchData();
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 200 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleEdit(params.row)} size="small">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row._id)} size="small" color="error">
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
        <Typography variant="h4">Brands</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Brand
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

      <DataGrid
        rows={brands}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        autoHeight
        getRowId={(row) => row._id}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBrand ? 'Edit Brand' : 'Add Brand'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name}
          >
            {submitting ? <CircularProgress size={20} /> : (editingBrand ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Brands; 
