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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteImageIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Debug logging
  useEffect(() => {
    console.log('Products data:', products);
    if (products && products.length > 0) {
      console.log('First product:', products[0]);
      console.log('First product price:', products[0].price);
      console.log('First product category:', products[0].category);
      console.log('First product brand:', products[0].brand);
    }
    console.log('Categories data:', categories);
    console.log('Brands data:', brands);
  }, [products, categories, brands]);

  const fetchData = async () => {
    try {
      console.log('=== FETCHING DATA ===');
      console.log('Current timestamp:', Date.now());
      
      const timestamp = Date.now();
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        axios.get(`/products?_t=${timestamp}`),
        axios.get(`/categories?_t=${timestamp}`),
        axios.get(`/brands?_t=${timestamp}`),
      ]);

      console.log('API Calls completed successfully');
      console.log('Products Response Status:', productsRes.status);
      console.log('Categories Response Status:', categoriesRes.status);
      console.log('Brands Response Status:', brandsRes.status);

      console.log('Products Response:', productsRes.data);
      console.log('Categories Response:', categoriesRes.data);
      console.log('Brands Response:', brandsRes.data);

      // Extract data from nested structure
      const productsArray = productsRes.data.products || productsRes.data;
      const categoriesArray = categoriesRes.data.categories || categoriesRes.data;
      const brandsArray = brandsRes.data.brands || brandsRes.data;

      console.log('Extracted Products:', productsArray);
      console.log('Extracted Categories:', categoriesArray);
      console.log('Extracted Brands:', brandsArray);

      // Ensure we always set arrays
      const safeProducts = Array.isArray(productsArray) ? productsArray : [];
      const safeCategories = Array.isArray(categoriesArray) ? categoriesArray : [];
      const safeBrands = Array.isArray(brandsArray) ? brandsArray : [];

      console.log('Safe Products:', safeProducts);
      console.log('Safe Categories:', safeCategories);
      console.log('Safe Brands:', safeBrands);

      // Process products to add categoryName and brandName fields
      const processedProducts = safeProducts.map(product => ({
        ...product,
        categoryName: product.category?.name || 'Unknown Category',
        brandName: product.brand?.name || 'Unknown Brand'
      }));

      console.log('Processed Products:', processedProducts);
      console.log('=== SETTING STATE ===');
      console.log('Setting products:', processedProducts.length);
      console.log('Setting categories:', safeCategories.length);
      console.log('Setting brands:', safeBrands.length);

      setProducts(processedProducts);
      setCategories(safeCategories);
      setBrands(safeBrands);
      
      console.log('=== STATE SET COMPLETE ===');
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response?.data);
      setError('Error fetching data');
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
    setOpenDialog(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category._id || product.category,
      brand: product.brand._id || product.brand,
    });
    setImageFiles([]);
    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/products/${id}`);
        setSuccess('Product deleted successfully');
        fetchData();
      } catch (error) {
        setError('Error deleting product');
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
      const productData = new FormData();
      productData.append('name', formData.name);
      productData.append('description', formData.description);
      productData.append('price', formData.price);
      productData.append('stock', formData.stock);
      productData.append('category', formData.category);
      productData.append('brand', formData.brand);
      
      // Append new files
      imageFiles.forEach(file => {
        productData.append('images', file);
      });
      
      // Append existing images as URLs
      existingImages.forEach(image => {
        productData.append('images', image);
      });

      if (editingProduct) {
        await axios.put(`/products/${editingProduct._id}`, productData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Product updated successfully');
      } else {
        await axios.post('/products', productData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('Product created successfully');
      }
      setOpenDialog(false);
      setImageFiles([]);
      setExistingImages([]);
      
      // Force a complete refresh with cache busting
      console.log('Forcing data refresh after product update...');
      await fetchData();
      
      // Force a re-render by updating a state variable
      setProducts(prev => [...prev]);
      
    } catch (error) {
      setError(error.response?.data?.message || 'Error saving product');
    }
  };

  const columns = [
    { 
      field: 'name', 
      headerName: 'Name', 
      width: 200,
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      width: 300,
    },
    { 
      field: 'price', 
      headerName: 'Price', 
      width: 100,
      renderCell: (params) => {
        const value = params.row.price;
        if (value === null || value === undefined) return 'N/A';
        return `₹${value}`;
      }
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      width: 100,
      renderCell: (params) => {
        const value = params.row.stock;
        if (value === null || value === undefined) return 'N/A';
        return value.toString();
      }
    },
    { 
      field: 'categoryName', 
      headerName: 'Category', 
      width: 150,
    },
    { 
      field: 'brandName', 
      headerName: 'Brand', 
      width: 150,
    },
    { 
      field: 'images', 
      headerName: 'Images', 
      width: 200,
      renderCell: (params) => {
        const images = params.row.images;
        if (!images || images.length === 0) return 'No images';
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {images.slice(0, 3).map((image, index) => (
              <img
                key={`${params.row._id}-${index}-${Date.now()}`}
                src={`http://10.0.0.74:3001${image}?_t=${Date.now()}`}
                alt={`Product ${index + 1}`}
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                onError={(e) => {
                  console.error('Image failed to load:', image);
                  e.target.style.display = 'none';
                }}
              />
            ))}
            {images.length > 3 && (
              <Chip label={`+${images.length - 3}`} size="small" />
            )}
          </Box>
        );
      }
    },
    { 
      field: 'createdAt', 
      headerName: 'Created', 
      width: 150,
      renderCell: (params) => {
        const value = params.row.createdAt;
        if (!value) return 'N/A';
        try {
          return new Date(value).toLocaleDateString();
        } catch (error) {
          return 'Invalid Date';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleEdit(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row._id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

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

      {/* Debug Info */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2">
          Debug Info: Loading={loading.toString()}, Products={products.length}, Categories={categories.length}, Brands={brands.length}
        </Typography>
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

      <Box sx={{ height: 600, width: '100%' }}>
        {products && products.length > 0 ? (
          <DataGrid
            rows={products}
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
              {loading ? 'Loading products...' : 'No products found'}
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                fullWidth
              />
              <TextField
                label="Stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Product Images
              </Typography>
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  multiple
                  type="file"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setImageFiles(prev => [...prev, ...files]);
                  }}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Upload Images
                  </Button>
                </label>
                {/* New Images */}
                {imageFiles.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      New Images:
                    </Typography>
                    <Grid container spacing={2}>
                      {imageFiles.map((file, index) => (
                        <Grid item xs={6} sm={4} key={index}>
                          <Card>
                            <CardMedia
                              component="img"
                              height="140"
                              image={URL.createObjectURL(file)}
                              alt={`New image ${index + 1}`}
                            />
                            <CardContent sx={{ p: 1 }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveImage(index)}
                              >
                                <DeleteImageIcon />
                              </IconButton>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Current Images:
                    </Typography>
                    <Grid container spacing={2}>
                      {existingImages.map((image, index) => (
                        <Grid item xs={6} sm={4} key={index}>
                          <Card>
                            <CardMedia
                              component="img"
                              height="140"
                              image={`http://10.0.0.74:3001${image}?_t=${Date.now()}`}
                              alt={`Current image ${index + 1}`}
                              onError={(e) => {
                                console.error('Existing image failed to load:', image);
                                e.target.style.display = 'none';
                              }}
                            />
                            <CardContent sx={{ p: 1 }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveExistingImage(index)}
                              >
                                <DeleteImageIcon />
                              </IconButton>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products; 