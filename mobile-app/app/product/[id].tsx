import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, IMAGE_BASE_URL, API_ENDPOINTS } from '../../config/apiConfig';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${API_ENDPOINTS.PRODUCT_BY_ID(id)}?_t=${timestamp}`);
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
      console.log('addToCart: token:', token);
      console.log('addToCart: productId:', id);
      const body = JSON.stringify({ productId: id, quantity: 1 });
      console.log('addToCart: request body:', body);
      const response = await fetch(API_ENDPOINTS.CART_ADD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body,
      });
      console.log('addToCart: response status:', response.status);
      const data = await response.json();
      console.log('addToCart: response data:', data);
      if (response.ok) {
        setShowCartNotification(true);
        setTimeout(() => setShowCartNotification(false), 2000);
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('addToCart: error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderImageItem = ({ item, index }: { item: string; index: number }) => {
    let imageUrl = '';
    if (typeof item === 'string' && item.startsWith('http')) {
      imageUrl = item;
    } else if (typeof item === 'string' && item.trim() !== '') {
      imageUrl = `${API_BASE_URL.replace('/api', '')}${item}?_t=${Date.now()}`;
    }
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      imageUrl = 'https://via.placeholder.com/400x300';
    }
    return (
      <View style={styles.imageItem}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.carouselImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Carousel image failed to load for product:', product?.name, 'Image:', imageUrl, 'Error:', error);
          }}
          onLoad={() => {
            console.log('Carousel image loaded successfully for product:', product?.name, 'Image:', imageUrl);
          }}
          defaultSource={{ uri: 'https://via.placeholder.com/400x300' }}
        />
      </View>
    );
  };

  const renderDotIndicator = () => {
    if (!product?.images || product.images.length <= 1) return null;
    
    return (
      <View style={styles.dotContainer}>
        {product.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentImageIndex === index && styles.activeDot
            ]}
          />
        ))}
      </View>
    );
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

      {/* Image Carousel */}
      {product.images && product.images.length > 0 && (
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={product.images}
            renderItem={renderImageItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={true}
            nestedScrollEnabled={true}
          />
          {renderDotIndicator()}
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
      </View>

      {/* Add to Cart Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={addToCart}
        >
          <Text style={styles.addToCartText}>
            Add to Cart
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cart Notification */}
      {showCartNotification && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>Added to cart!</Text>
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
  carouselContainer: {
    position: 'relative',
    width: width,
    height: width * 0.8,
    marginBottom: 20,
  },
  imageItem: {
    width: width,
    height: width * 0.8,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  dotContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
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
  buttonContainer: {
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
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notification: {
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
  notificationText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
});