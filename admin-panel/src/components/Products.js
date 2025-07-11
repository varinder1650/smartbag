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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteImageIcon,
  Info as InfoIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { apiService, extractData, handleApiError } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    brand: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('=== FETCHING DATA ===');
      
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
        apiService.getBrands(),
      ]);

      console.log('API Calls completed successfully');

      // Extract data using helper function
      const productsArray = extractData(productsRes);
      const categoriesArray = extractData(categoriesRes);
      const brandsArray = extractData(brandsRes);

      console.log('Extracted data:', {
        products: productsArray?.length || 0,
        categories: categoriesArray?.length || 0,
        brands: brandsArray?.length || 0
      });

      // Ensure we always set arrays
      const safeProducts = Array.isArray(productsArray) ? productsArray : [];
      const safeCategories = Array.isArray(categoriesArray) ? categoriesArray : [];
      const safeBrands = Array.isArray(brandsArray) ? brandsArray : [];

      // Process products to add categoryName and brandName fields
      const processedProducts = safeProducts.map(product => ({
        ...product,
        categoryName: product.category?.name || 'Unknown Category',
        brandName: product.brand?.name || 'Unknown Brand',
        // Ensure images is always an array
        images: Array.isArray(product.images) ? product.images : []
      }));

      setProducts(processedProducts);
      setCategories(safeCategories);
      setBrands(safeBrands);
      
      console.log('=== DATA LOADED SUCCESSFULLY ===');
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
      setProducts([]);
      setCategories([]);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      brand: '',
    });
    setImageFiles([]);
    setExistingImages([]);
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      category: product.category?._id || product.category || '',
      brand: product.brand?._id || product.brand || '',
    });
    setImageFiles([]);
    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setError('');
    setSuccess('');
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.deleteProduct(id);
        setSuccess('Product deleted successfully');
        fetchData();
      } catch (error) {
        const errorResult = handleApiError(error);
        setError(errorResult.message);
      }
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setExistingImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const productData = new FormData();
      productData.append('name', formData.name);
      productData.append('description', formData.description);
      productData.append('price', formData.price);
      productData.append('stock', formData.stock);
      productData.append('category', formData.category);
      productData.append('brand', formData.brand);
      
      // Append new files
      imageFiles.forEach((file) => {
        productData.append('images', file);
      });

      // Append existing images that weren't removed
      existingImages.forEach((image) => {
        productData.append('existingImages', image);
      });

      if (editingProduct) {
        await apiService.updateProduct(editingProduct._id, productData);
        setSuccess('Product updated successfully');
      } else {
        await apiService.createProduct(productData);
        setSuccess('Product created successfully');
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

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    setImageFiles(prev => [...prev, ...files]);
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'price', headerName: 'Price', width: 100, type: 'number' },
    { field: 'stock', headerName: 'Stock', width: 100, type: 'number' },
    { field: 'categoryName', headerName: 'Category', width: 150 },
    { field: 'brandName', headerName: 'Brand', width: 150 },
    {
      field: 'images',
      headerName: 'Images',
      width: 140,
      renderCell: (params) => {
        const images = params.value || [];
        const fallback =
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="100%" height="100%" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%23777">No Img</text></svg>';
        const backendBase = process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001';
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {images.length > 0 ? (
              images.slice(0, 3).map((image, index) => {
                let imageUrl;
                if (image.startsWith('http')) {
                  imageUrl = image;
                } else if (image.startsWith('/uploads/')) {
                  imageUrl = `${backendBase}${image}?_t=${Date.now()}`;
                } else {
                  imageUrl = `${backendBase}/uploads/${image}?_t=${Date.now()}`;
                }
                console.log('Product image URL:', imageUrl);
                return (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Product ${index + 1}`}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', background: '#fafafa' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallback;
                    }}
                  />
                );
              })
            ) : (
              <img src={fallback} alt="No Img" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', background: '#fafafa' }} />
            )}
            {images.length > 3 && (
              <Chip label={`+${images.length - 3}`} size="small" />
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
    <Box sx={{ mt: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Product
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
        rows={products}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        autoHeight
        getRowId={(row) => row._id}
        rowHeight={60}
        headerHeight={60}
      />

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            maxHeight: '95vh',
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
          {editingProduct ? <EditIcon sx={{ fontSize: 28 }} /> : <AddIcon sx={{ fontSize: 28 }} />}
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 4, maxHeight: '70vh', overflowY: 'auto', backgroundColor: '#fafbfc' }}>
          <Grid container spacing={3}>
            {/* First row: Name & Price */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Name"
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
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
            {/* Second row: Stock & Category */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Quantity"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required variant="outlined" sx={{ 
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
              }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Third row: Brand & Description */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required variant="outlined" sx={{ 
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
              }}>
                <InputLabel>Brand</InputLabel>
                <Select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  label="Brand"
                >
                  {brands.map((brand) => (
                    <MenuItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Description"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            {/* Images Section: always full width */}
            <Grid item xs={12}>
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
                  Product Images
                </Typography>
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ 
                      mb: 2, 
                      fontWeight: 600, 
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <InfoIcon fontSize="small" />
                      Current Images ({existingImages.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {existingImages.map((image, index) => {
                        let imageUrl;
                        if (image.startsWith('/uploads/')) {
                          imageUrl = `${process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001'}${image}?_t=${Date.now()}`;
                        } else {
                          imageUrl = `${process.env.REACT_APP_API_URL || 'http://10.0.0.74:3001'}/uploads/${image}?_t=${Date.now()}`;
                        }
                        return (
                          <Grid item key={index}>
                            <Card 
                              sx={{ 
                                width: 120, 
                                position: 'relative',
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                }
                              }}
                            >
                              <CardMedia
                                component="img"
                                height="120"
                                image={imageUrl}
                                alt={`Image ${index + 1}`}
                                sx={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  console.error('Image failed to load in dialog:', imageUrl);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <IconButton
                                size="small"
                                sx={{ 
                                  position: 'absolute', 
                                  top: 4, 
                                  right: 4, 
                                  bgcolor: 'rgba(255,255,255,0.95)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  '&:hover': { 
                                    bgcolor: 'rgba(255,255,255,1)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                                onClick={() => handleRemoveExistingImage(index)}
                              >
                                <DeleteImageIcon fontSize="small" color="error" />
                              </IconButton>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                )}
                {/* New Images */}
                {imageFiles.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ 
                      mb: 2, 
                      fontWeight: 600, 
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <CloudUploadIcon fontSize="small" />
                      New Images ({imageFiles.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {imageFiles.map((file, index) => (
                        <Grid item key={index}>
                          <Card 
                            sx={{ 
                              width: 120, 
                              position: 'relative',
                              borderRadius: 2,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              transition: 'transform 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                              }
                            }}
                          >
                            <CardMedia
                              component="img"
                              height="120"
                              image={URL.createObjectURL(file)}
                              alt={`New Image ${index + 1}`}
                              sx={{ objectFit: 'cover' }}
                            />
                            <IconButton
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: 4, 
                                right: 4, 
                                bgcolor: 'rgba(255,255,255,0.95)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                '&:hover': { 
                                  bgcolor: 'rgba(255,255,255,1)',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onClick={() => handleRemoveImage(index)}
                            >
                              <DeleteImageIcon fontSize="small" color="error" />
                            </IconButton>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                {/* Upload Button */}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    py: 1.5,
                    px: 3,
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
                  Upload Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </Button>
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
            disabled={submitting || !formData.name || !formData.price || !formData.category || !formData.brand}
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
            {submitting ? <CircularProgress size={20} color="inherit" /> : (editingProduct ? 'Update Product' : 'Create Product')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products; 