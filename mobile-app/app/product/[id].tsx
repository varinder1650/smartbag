import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useLocalSearchParams, useGlobalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, IMAGE_BASE_URL, API_ENDPOINTS } from '../../config/apiConfig';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ProductImage {
  url?: string;
  secure_url?: string;
  thumbnail?: string;
  public_id?: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: (string | ProductImage)[];
  category: { name: string; _id: string };
  brand: { name: string; _id: string };
  stock: number;
  status: string;
  keywords?: string[];
}

export default function ProductDetailScreen() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const { token } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // New state for cart quantity
  const [cartQuantity, setCartQuantity] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);
  
  // Add ref to prevent multiple fetches
  const isFetching = useRef(false);
  const productIdRef = useRef<string | null>(null);

  // Memoized product ID extraction
  const getProductId = useCallback(() => {
    const id = localParams.id || 
              localParams.productId || 
              globalParams.id || 
              globalParams.productId;
    
    if (Array.isArray(id)) {
      return id[0];
    }
    
    return id as string;
  }, [localParams.id, localParams.productId, globalParams.id, globalParams.productId]);

  // Memoized fetch function
  const fetchProduct = useCallback(async (productId: string) => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) {
      console.log('Product fetch already in progress, skipping...');
      return;
    }
    
    // Prevent fetching the same product multiple times
    if (productIdRef.current === productId && product) {
      console.log('Product already loaded, skipping fetch...');
      return;
    }

    try {
      isFetching.current = true;
      productIdRef.current = productId;
      
      console.log('Fetching product:', productId);
      
      if (!productId || productId === 'undefined' || productId.trim() === '') {
        console.error('Invalid product ID provided');
        Alert.alert('Error', 'Invalid product ID');
        router.back();
        return;
      }

      const timestamp = Date.now();
      const apiUrl = `${API_ENDPOINTS.PRODUCTS}/${productId}?_t=${timestamp}`;
      console.log('Fetching from URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        if (response.status === 404) {
          Alert.alert('Error', 'Product not found');
        } else if (response.status === 400) {
          Alert.alert('Error', 'Invalid product ID format');
        } else {
          Alert.alert('Error', `Failed to load product (${response.status})`);
        }
        router.back();
        return;
      }
      
      const data = await response.json();
      console.log('Product data received for:', data.name);
      
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', `Failed to load product: ${error.message}`);
      router.back();
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [product]); // Only depend on current product state

  // Fetch cart quantity for this product
  const fetchCartQuantity = useCallback(async () => {
    if (!token || !product) {
      setCartQuantity(0);
      return;
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.CART, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const cartData = await response.json();
        const items = cartData.items || [];
        const cartItem = items.find((item: any) => item.product?._id === product._id);
        setCartQuantity(cartItem ? cartItem.quantity : 0);
      } else {
        setCartQuantity(0);
      }
    } catch (error) {
      console.error('Error fetching cart quantity:', error);
      setCartQuantity(0);
    }
  }, [token, product]);

  // Effect with stable dependencies
  useEffect(() => {
    const productId = getProductId();
    console.log('useEffect triggered with productId:', productId);
    
    if (productId && productId !== 'undefined') {
      fetchProduct(productId);
    } else {
      console.error('No valid product ID found');
      Alert.alert('Error', 'No product ID provided');
      router.back();
    }
  }, []); // Empty dependency array - only run once on mount

  // Fetch cart quantity when product or token changes
  useEffect(() => {
    if (product && token) {
      fetchCartQuantity();
    }
  }, [product, token, fetchCartQuantity]);

  // Memoized image processing
  const getImageUrls = useCallback((images: (string | ProductImage)[]): string[] => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return ['https://via.placeholder.com/400x300?text=No+Image'];
    }
    
    return images.map(img => {
      if (typeof img === 'string') {
        return img.startsWith('http') ? img : `${IMAGE_BASE_URL}${img}`;
      }
      
      if (typeof img === 'object' && img !== null) {
        const url = img.url || img.secure_url || img.thumbnail;
        if (url) {
          return url;
        }
      }
      
      return 'https://via.placeholder.com/400x300?text=No+Image';
    });
  }, []);

  // Add to cart function
  const addToCart = useCallback(async () => {
    if (!token) {
      Alert.alert(
        'Login Required',
        'Please login to add items to your cart',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (!product) {
      Alert.alert('Error', 'Product not loaded');
      return;
    }

    if (product.stock === 0) {
      Alert.alert('Error', 'Product is out of stock');
      return;
    }

    setAddingToCart(true);
    try {
      const requestBody = {
        productId: product._id,
        quantity: 1
      };
      
      const response = await fetch(API_ENDPOINTS.CART_ADD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();

      if (response.ok) {
        // Update local cart quantity
        setCartQuantity(prev => prev + 1);

        // Show notification
        setShowCartNotification(true);
        setTimeout(() => setShowCartNotification(false), 2000);
      } else {
        if (response.status === 401) {
          Alert.alert(
            'Session Expired',
            'Please login again',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => router.push('/auth/login') }
            ]
          );
        } else {
          Alert.alert('Error', data.message || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [token, product]);

  // Update cart quantity function
  const updateCartQuantity = useCallback(async (newQuantity: number) => {
    if (!token || !product) {
      Alert.alert('Error', 'Please login to manage cart');
      return;
    }

    setAddingToCart(true);

    try {
      if (newQuantity <= 0) {
        // Remove item from cart - we need to find the cart item ID first
        const cartResponse = await fetch(API_ENDPOINTS.CART, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          const cartItem = cartData.items?.find((item: any) => item.product?._id === product._id);
          
          if (cartItem) {
            const response = await fetch(`${API_ENDPOINTS.CART_REMOVE}?item_id=${cartItem._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              setCartQuantity(0);
            } else {
              const errorData = await response.json();
              Alert.alert('Error', errorData.message || 'Failed to remove item');
            }
          }
        }
      } else {
        // Update quantity - we need to find the cart item ID first
        const cartResponse = await fetch(API_ENDPOINTS.CART, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          const cartItem = cartData.items?.find((item: any) => item.product?._id === product._id);
          
          if (cartItem) {
            const response = await fetch(API_ENDPOINTS.CART_UPDATE, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ itemId: cartItem._id, quantity: newQuantity }),
            });

            if (response.ok) {
              setCartQuantity(newQuantity);
            } else {
              const errorData = await response.json();
              Alert.alert('Error', errorData.message || 'Failed to update quantity');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      Alert.alert('Error', 'Failed to update cart');
    } finally {
      setAddingToCart(false);
    }
  }, [token, product]);

  // Memoized viewable items changed handler
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Memoized image item renderer
  const renderImageItem = useCallback(({ item, index }: { item: string; index: number }) => {
    return (
      <View style={styles.imageItem}>
        <Image
          source={{ uri: item }}
          style={styles.carouselImage}
          resizeMode="cover"
          onError={() => {
            console.log('Product detail image failed to load:', item);
          }}
        />
      </View>
    );
  }, []);

  // Memoized dot indicator renderer
  const renderDotIndicator = useCallback(() => {
    if (!product) return null;
    
    const imageUrls = getImageUrls(product.images);
    
    if (imageUrls.length <= 1) return null;
    
    return (
      <View style={styles.dotContainer}>
        {imageUrls.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              currentImageIndex === index && styles.activeDot
            ]}
          />
        ))}
      </View>
    );
  }, [product, currentImageIndex, getImageUrls]);

  // Render cart button based on quantity
  const renderCartButton = useCallback(() => {
    const isOutOfStock = product?.stock === 0;

    if (isOutOfStock) {
      return (
        <View style={[styles.addToCartButton, styles.outOfStockButton]}>
          <Text style={styles.outOfStockButtonText}>Out of Stock</Text>
        </View>
      );
    }

    if (cartQuantity > 0) {
      return (
        <View style={styles.quantityControlsContainer}>
          <TouchableOpacity
            style={[styles.quantityControlButton, addingToCart && styles.disabledButton]}
            onPress={() => updateCartQuantity(cartQuantity - 1)}
            disabled={addingToCart}
          >
            <Ionicons name="remove" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.quantityControlText}>{cartQuantity}</Text>
          <TouchableOpacity
            style={[styles.quantityControlButton, addingToCart && styles.disabledButton]}
            onPress={() => updateCartQuantity(cartQuantity + 1)}
            disabled={addingToCart || cartQuantity >= (product?.stock || 0)}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.addToCartButton, 
          addingToCart && styles.disabledButton
        ]}
        onPress={addToCart}
        disabled={addingToCart}
      >
        <Ionicons name="bag-add" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.addToCartText}>
          {addingToCart ? 'Adding...' : 'Add to Cart'}
        </Text>
      </TouchableOpacity>
    );
  }, [product, cartQuantity, addingToCart, addToCart, updateCartQuantity]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    const productId = getProductId();
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Product not found</Text>
        <Text style={styles.errorSubtext}>
          Product ID: {productId || 'Not provided'}
        </Text>
        <TouchableOpacity style={styles.backToHomeButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.backToHomeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get processed image URLs
  const imageUrls = getImageUrls(product.images);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Image Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={imageUrls}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `product-detail-image-${index}`}
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
          removeClippedSubviews={false}
          nestedScrollEnabled={true}
        />
        {renderDotIndicator()}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>₹{product.price}</Text>
        
        {/* Stock Status */}
        <View style={styles.stockContainer}>
          <Ionicons 
            name={product.stock > 0 ? "checkmark-circle" : "alert-circle"} 
            size={16} 
            color={product.stock > 0 ? "#4CAF50" : "#FF5722"} 
          />
          <Text style={[styles.stockText, { color: product.stock > 0 ? "#4CAF50" : "#FF5722" }]}>
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
        
        <Text style={styles.productDescription}>{product.description}</Text>
        
        <View style={styles.detailsSection}>
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{product.category?.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Brand:</Text>
            <Text style={styles.detailValue}>{product.brand?.name || 'N/A'}</Text>
          </View>
          
          {product.keywords && product.keywords.length > 0 && (
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {product.keywords.slice(0, 3).map((keyword, index) => (
                  <View key={`tag-${index}-${keyword}`} style={styles.tag}>
                    <Text style={styles.tagText}>{keyword}</Text>
                  </View>
                ))}
                {product.keywords.length > 3 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>+{product.keywords.length - 3}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Cart Button */}
      <View style={styles.buttonContainer}>
        {renderCartButton()}
      </View>

      {/* Cart Notification */}
      {showCartNotification && (
        <View style={styles.notification}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
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
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  backToHomeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backToHomeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 30,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 2,
    justifyContent: 'flex-end',
  },
  tag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
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
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  outOfStockButton: {
    backgroundColor: '#f5f5f5',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  outOfStockButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // New styles for quantity controls
  quantityControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityControlText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    minWidth: 50,
    textAlign: 'center',
  },
  notification: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  notificationText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
});