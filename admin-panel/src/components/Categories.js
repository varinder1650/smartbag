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
  Avatar,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { apiService, extractData, handleApiError } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

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
      
      const response = await apiService.getCategories();
      const categoriesArray = extractData(response);
      const safeCategories = Array.isArray(categoriesArray) ? categoriesArray : [];
      
      setCategories(safeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
    });
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
    });
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await apiService.deleteCategory(id);
        setSuccess('Category deleted successfully');
        fetchData();
      } catch (error) {
        const errorResult = handleApiError(error);
        setError(errorResult.message);
      }
    }
  };

  const handleIconUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!editingCategory) {
      setError('Please save the category first before uploading an icon');
      return;
    }

    try {
      setUploadingIcon(true);
      setError('');

      const formData = new FormData();
      formData.append('icon', file);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/categories/${editingCategory._id}/icon`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload icon');
      }

      const result = await response.json();
      setSuccess('Icon uploaded successfully');
      
      // Update the category in the list
      setCategories(prev => prev.map(cat => 
        cat._id === editingCategory._id 
          ? { ...cat, icon: result.icon }
          : cat
      ));
      
      // Update the editing category
      setEditingCategory({ ...editingCategory, icon: result.icon });
    } catch (error) {
      console.error('Error uploading icon:', error);
      setError('Failed to upload icon');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingCategory) {
        await apiService.updateCategory(editingCategory._id, formData);
        setSuccess('Category updated successfully');
      } else {
        const newCategory = await apiService.createCategory(formData);
        setSuccess('Category created successfully');
        // Set the new category as editing category for icon upload
        setEditingCategory(newCategory);
        return; // Don't close dialog yet, allow icon upload
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

  const getIconUrl = (icon) => {
    if (!icon) return null;
    if (icon.startsWith('http')) return icon;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${icon}`;
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 200 },
    {
      field: 'icon',
      headerName: 'Icon',
      width: 100,
      renderCell: (params) => {
        const iconUrl = getIconUrl(params.row.icon);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {iconUrl ? (
              <Avatar
                src={iconUrl}
                sx={{ width: 32, height: 32 }}
                variant="rounded"
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
                <ImageIcon />
              </Avatar>
            )}
          </Box>
        );
      },
    },
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Categories</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Category
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
        rows={categories}
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
          {editingCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              
              {/* Icon Upload Section */}
              {editingCategory && (
                <Grid item xs={12}>
                  <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Category Icon
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {editingCategory.icon ? (
                        <Avatar
                          src={getIconUrl(editingCategory.icon)}
                          sx={{ width: 48, height: 48 }}
                          variant="rounded"
                        />
                      ) : (
                        <Avatar sx={{ width: 48, height: 48, bgcolor: 'grey.300' }}>
                          <ImageIcon />
                        </Avatar>
                      )}
                      
                      <Box>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="icon-upload"
                          type="file"
                          onChange={handleIconUpload}
                        />
                        <label htmlFor="icon-upload">
                          <Button
                            component="span"
                            variant="outlined"
                            startIcon={uploadingIcon ? <CircularProgress size={16} /> : <UploadIcon />}
                            disabled={uploadingIcon}
                            size="small"
                          >
                            {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                          </Button>
                        </label>
                      </Box>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary">
                      Upload a square image (PNG, JPG) for the category icon. Recommended size: 64x64px.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
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
            {submitting ? <CircularProgress size={20} /> : (editingCategory ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories; 