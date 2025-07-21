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
  const [iconFile, setIconFile] = useState(null);

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

      const filteredCategories = safeCategories.filter(cat => cat._id);
      
      setCategories(filteredCategories);
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

  const handleIconSelect = (event) => {
    const file = event.target.files[0];
    if (file) setIconFile(file);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Always use FormData for consistency with backend expectations
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      if (iconFile) {
        formDataObj.append('icon', iconFile);
      }

      let response;
      if (editingCategory) {
        response = await apiService.updateCategory(editingCategory._id, formDataObj);
        setSuccess('Category updated successfully');
      } else {
        response = await apiService.createCategory(formDataObj);
        setSuccess('Category created successfully');
      }
      
      setOpenDialog(false);
      fetchData();
      setIconFile(null);
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
    // If the path already starts with /api/, construct the full URL correctly
    if (icon.startsWith('/api/')) {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001';
      // Remove /api from the base URL if it exists, then add the icon path
      const cleanBaseUrl = baseUrl.replace(/\/api$/, '');
      return `${cleanBaseUrl}${icon}`;
    }
    // For other paths, prepend the base URL
    return `${process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001'}${icon}`;
  };

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001';
      const response = await fetch(`${baseUrl}/api/upload/category`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return `${process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001'}${data.icon}`;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    return null;
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
    <Box sx={{ pt: 10 }}>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            maxHeight: '90vh',
            height: 'auto',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid #e0e0e0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2.5
          }}
        >
          {editingCategory ? <EditIcon sx={{ fontSize: 28 }} /> : <AddIcon sx={{ fontSize: 28 }} />}
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent sx={{ p: 4, maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', backgroundColor: '#fafbfc' }}>
          <Grid columns={12} spacing={3} direction="column" sx={{ mt: 2 }}>
            {/* Category Name */}
            <Grid columnSpan={12}>
              <TextField
                fullWidth
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#667eea'
                      }
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 500
                  }
                }}
              />
            </Grid>
            {/* Description */}
            <Grid columnSpan={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'white',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#667eea'
                      }
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 500
                  }
                }}
              />
            </Grid>
            {/* Icon Upload Section */}
            <Grid columnSpan={12}>
              <Box sx={{
                p: 3,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="h6" sx={{
                  mb: 3,
                  fontWeight: 700,
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <ImageIcon color="primary" />
                  Category Icon
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {iconFile ? (
                    <Avatar
                      src={URL.createObjectURL(iconFile)}
                      sx={{ width: 64, height: 64 }}
                      variant="rounded"
                    />
                  ) : editingCategory && editingCategory.icon ? (
                    <Avatar
                      src={getIconUrl(editingCategory.icon)}
                      sx={{ width: 64, height: 64 }}
                      variant="rounded"
                    />
                  ) : (
                    <Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.300' }} variant="rounded">
                      <ImageIcon />
                    </Avatar>
                  )}
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="icon-upload"
                      type="file"
                      onChange={handleIconSelect}
                    />
                    <label htmlFor="icon-upload">
                      <Button
                        component="span"
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        size="medium"
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          py: 1.5,
                          borderColor: '#667eea',
                          color: '#667eea',
                          '&:hover': {
                            borderColor: '#5a6fd8',
                            backgroundColor: 'rgba(102, 126, 234, 0.04)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        Upload Icon
                      </Button>
                    </label>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Upload a square image (PNG, JPG) for the category icon. Recommended size: 64x64px.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{
          p: 3,
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          gap: 2
        }}>
          <Button
            onClick={() => setOpenDialog(false)}
            disabled={submitting}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderColor: '#6c757d',
              color: '#6c757d',
              '&:hover': {
                borderColor: '#5a6268',
                backgroundColor: 'rgba(108, 117, 125, 0.04)'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)'
              },
              '&:disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : (editingCategory ? 'Update Category' : 'Create Category')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories; 
