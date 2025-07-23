import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, IMAGE_BASE_URL, API_ENDPOINTS } from '../../config/apiConfig';

const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: { name: string; _id: string };
  brand: { name: string };
}

interface Category {
  _id: string;
  name: string;
}

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCartNotification, setShowCartNotification] = useState(false);

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [id]);

  const fetchCategoryAndProducts = async () => {
    try {
      const timestamp = Date.now();
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.PRODUCTS}?_t=${timestamp}`),
        fetch(`${API_ENDPOINTS.CATEGORIES}?_t=${timestamp}`),
      ]);
      
      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      
      // Extract data from nested structure
      const productsArray = productsData.products || productsData;
      const categoriesArray = categoriesData.categories || categoriesData;
      
      // Filter products by category
      const categoryProducts = productsArray.filter((product: Product) => 
        product.category?._id === id
      );
      
      // Find category details
      const categoryDetails = categoriesArray.find((cat: Category) => cat._id === id);
      
      setProducts(categoryProducts);
      setCategory(categoryDetails);
    } catch (error) {
      console.error('Error fetching category products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategoryAndProducts();
    setRefreshing(false);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const addToCart = async (productId: string) => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.CART_ADD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
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

  const renderProductTile = ({ item }: { item: Product }) => {
    const imageUrl = item.images && item.images.length > 0
      ? item.images[0].startsWith('http')
        ? item.images[0]
        : `${API_BASE_URL.replace('/api', '')}${item.images[0]}?_t=${Date.now()}`
      : 'https://via.placeholder.com/150';
    
    return (
      <View style={styles.productTile}>
        <TouchableOpacity onPress={() => handleProductPress(item._id)}>
          <View style={styles.productImageContainer}>
            <View style={styles.productImage}>
              <Text style={styles.productImagePlaceholder}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productBrand} numberOfLines={1}>{item.brand?.name}</Text>
            <Text style={styles.productPrice}>₹{item.price}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => addToCart(item._id)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {category?.name || 'Category Products'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            No products available in this category
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.shopNowText}>Browse All Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductTile}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          style={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={styles.productsListContent}
        />
      )}

      {showCartNotification && (
        <View style={styles.cartNotification}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.cartNotificationText}>Added to cart!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    padding: 16,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productTile: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  productImageContainer: {
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholder: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addToCartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cartNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cartNotificationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});