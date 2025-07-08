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
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        axios.get('/products'),
        axios.get('/categories'),
        axios.get('/brands'),
      ]);

      // Ensure we have valid arrays
      const products = Array.isArray(productsRes.data) ? productsRes.data : [];
      const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const brands = Array.isArray(brandsRes.data) ? brandsRes.data : [];

      // Process products to add categoryName and brandName fields
      const processedProducts = products.map(product => ({
        ...product,
        categoryName: product.category ? (typeof product.category === 'object' ? product.category.name : product.category) : 'N/A',
        brandName: product.brand ? (typeof product.brand === 'object' ? product.brand.name : product.brand) : 'N/A'
      }));

      console.log('Processed products:', processedProducts);
      if (processedProducts.length > 0) {
        console.log('First product details:', {
          name: processedProducts[0].name,
          price: processedProducts[0].price,
          stock: processedProducts[0].stock,
          createdAt: processedProducts[0].createdAt,
          priceType: typeof processedProducts[0].price,
          stockType: typeof processedProducts[0].stock,
          createdAtType: typeof processedProducts[0].createdAt
        });
      }

      setProducts(processedProducts);
      setCategories(categories);
      setBrands(brands);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      fetchData();
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
                key={index}
                src={`http://localhost:3001${image}`}
                alt={`Product ${index + 1}`}
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
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
            getRowId={(row) => {
              console.log('Row ID for:', row.name, 'ID:', row._id || row.id);
              return row._id || row.id || Math.random().toString();
            }}
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
                              image={`http://localhost:3001${image}`}
                              alt={`Current image ${index + 1}`}
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