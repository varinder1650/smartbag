import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Direct API URL instead of import
const API_BASE_URL = 'http://10.0.0.74:3001/api';
const IMAGE_BASE_URL = 'http://10.0.0.74:3001';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: { name: string; _id: string };
  brand: { name: string; _id: string };
  stock: number;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${API_BASE_URL}/products/${id}?_t=${timestamp}`);
      const data = await response.json();
      
      if (response.ok) {
        setProduct(data);
      } else {
        Alert.alert('Error', 'Product not found');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!token) {
      Alert.alert('Error', 'Please login to add items to cart');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCartNotification(true);
        setTimeout(() => setShowCartNotification(false), 2000);
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Image */}
      {product.images && product.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                product.images[selectedImageIndex] && product.images[selectedImageIndex].startsWith('http')
                  ? product.images[selectedImageIndex]
                  : `${API_BASE_URL.replace('/api', '')}${product.images[selectedImageIndex]}?_t=${Date.now()}`
            }}
            style={styles.mainImage}
            resizeMode="cover"
            onError={(error) => {
              console.log('Main image failed to load for product:', product.name, 'Image:', product.images?.[selectedImageIndex], 'Error:', error);
            }}
            onLoad={() => {
              console.log('Main image loaded successfully for product:', product.name, 'Image:', product.images?.[selectedImageIndex]);
            }}
            defaultSource={{ uri: 'https://via.placeholder.com/400x300' }}
          />
          
          {/* Image Thumbnails */}
          {product.images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
              {product.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImageIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.selectedThumbnail
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        image && image.startsWith('http')
                          ? image
                          : `${API_BASE_URL.replace('/api', '')}${image}?_t=${Date.now()}`
                    }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('Thumbnail image failed to load for product:', product.name, 'Image:', image, 'Error:', error);
                    }}
                    onLoad={() => {
                      console.log('Thumbnail image loaded successfully for product:', product.name, 'Image:', image);
                    }}
                    defaultSource={{ uri: 'https://via.placeholder.com/60x60' }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>₹{product.price}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{product.category?.name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Brand:</Text>
          <Text style={styles.detailValue}>{product.brand?.name || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Stock:</Text>
          <Text style={styles.detailValue}>
            {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
          </Text>
        </View>
      </View>

      {/* Add to Cart Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.addToCartButton, product.stock <= 0 && styles.disabledButton]}
          onPress={addToCart}
          disabled={product.stock <= 0}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.addToCartText}>
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showCartNotification && (
        <View style={styles.cartNotification}>
          <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
          <Text style={styles.cartNotificationText}>Added to cart!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    marginBottom: 20,
  },
  mainImage: {
    width: width,
    height: width * 0.8,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#007AFF',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cartNotification: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    padding: 24,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    transform: [{ translateY: -40 }],
  },
  cartNotificationText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
}); 