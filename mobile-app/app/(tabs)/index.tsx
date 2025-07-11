import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
// Direct API URL instead of import
const API_BASE_URL = 'http://10.0.0.74:3001/api';
import { useAuth } from '../../contexts/AuthContext';

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

interface SectionData {
  type: 'header' | 'categories' | 'products';
  data: any[];
  title?: string;
}

const IMAGE_BASE_URL = 'http://10.0.0.74:3001';

const CATEGORY_EMOJIS: { [key: string]: string } = {
  Grocery: '🛒',
  Pizza: '🍕',
  Halal: '🥘',
  'Fast Food': '🍔',
  Alcohol: '🍷',
  Convenience: '🏪',
  Health: '💊',
  Gourmet: '🍽️',
  // Add more as needed
};

const HomeScreen = () => {
  // Initialize with safe defaults
  const [authState, setAuthState] = React.useState({ user: null, token: null });
  
  // Try to get auth, but don't crash if it fails
  React.useEffect(() => {
    try {
      const auth = useAuth();
      setAuthState(auth);
    } catch (error) {
      console.warn('useAuth failed, using default state:', error);
      setAuthState({ user: null, token: null });
    }
  }, []);
  
  const { user, token } = authState;
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('Add Address');

  useEffect(() => {
    fetchData();
    fetchCartCount();
    fetchUserAddress();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
      fetchUserAddress();
    }, [token])
  );

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products, selectedCategory]);

  const fetchCartCount = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const cartData = await response.json();
        setCartCount(cartData.items?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const fetchUserAddress = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/user/address`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const addressData = await response.json();
        setUserAddress(addressData.address || 'Add Address');
      }
    } catch (error) {
      console.error('Error fetching user address:', error);
    }
  };

  const filterProducts = () => {
    try {
      // Ensure products is always an array
      let filtered = products || [];
      console.log('filterProducts - products:', products);
      console.log('filterProducts - filtered (initial):', filtered);

      // Filter by category
      if (selectedCategory) {
        filtered = filtered.filter(product => product.category?._id === selectedCategory);
        console.log('filterProducts - after category filter:', filtered);
      }

      // Filter by search query
      if (searchQuery.trim()) {
        filtered = filtered.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        console.log('filterProducts - after search filter:', filtered);
      }

      // Ensure we always set an array
      const finalFiltered = Array.isArray(filtered) ? filtered : [];
      console.log('filterProducts - final filtered:', finalFiltered);
      setFilteredProducts(finalFiltered);
    } catch (error) {
      console.error('Error in filterProducts:', error);
      setFilteredProducts([]);
    }
  };

  const fetchData = async () => {
    try {
      console.log('fetchData - starting...');
      const timestamp = Date.now();
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products?_t=${timestamp}`),
        fetch(`${API_BASE_URL}/categories?_t=${timestamp}`),
      ]);
      
      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      
      console.log('fetchData - productsData:', productsData);
      console.log('fetchData - categoriesData:', categoriesData);
      
      // Extract products from the nested structure
      const productsArray = productsData.products || productsData;
      const categoriesArray = categoriesData.categories || categoriesData;
      
      // Ensure we always set arrays
      const safeProducts = Array.isArray(productsArray) ? productsArray : [];
      const safeCategories = Array.isArray(categoriesArray) ? categoriesArray : [];
      
      setProducts(safeProducts);
      setFilteredProducts(safeProducts);
      setCategories(safeCategories);
      
      console.log('fetchData - setProducts:', safeProducts);
      console.log('fetchData - setFilteredProducts:', safeProducts);
      console.log('fetchData - setCategories:', safeCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error
      setProducts([]);
      setFilteredProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await fetchCartCount();
    await fetchUserAddress();
    setRefreshing(false);
  };

  const retryConnection = () => {
    setLoading(true);
    fetchData();
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleCategoryPress = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleViewAllPress = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  const handleCartPress = () => {
    router.push('/(tabs)/explore');
  };

  const handleHomeButtonPress = () => {
    console.log('Home button pressed!');
    Alert.alert('Test', 'Home button is working!', [
      { text: 'OK', onPress: () => router.push('../address') }
    ]);
  };

  const addToCart = async (productId: string) => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to add items to cart');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
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
        await fetchCartCount();
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  // --- UI Components ---
  const renderTopBar = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' }}>
      {/* Search Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderRadius: 32,
        paddingHorizontal: 16,
        height: 44,
        marginBottom: 8,
      }}>
        <Ionicons name="search-outline" size={22} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, fontSize: 16, color: '#222', paddingVertical: 0, backgroundColor: 'transparent' }}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888"
          returnKeyType="search"
        />
      </View>
    </View>
  );

  // --- Category Filter Row ---
  const renderCategoryFilterRow = () => (
    <View style={{ backgroundColor: '#fff', paddingVertical: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {/* All filter */}
        <TouchableOpacity onPress={() => handleCategoryPress(null)} style={{ alignItems: 'center', marginHorizontal: 8 }}>
          <Text style={{ fontSize: 24, marginBottom: 2 }}>🔎</Text>
          <Text style={{ fontSize: 14, color: selectedCategory === null ? '#111' : '#888', fontWeight: selectedCategory === null ? 'bold' : 'normal' }}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity key={cat._id} onPress={() => handleCategoryPress(cat._id)} style={{ alignItems: 'center', marginHorizontal: 8 }}>
            <Text style={{ fontSize: 24, marginBottom: 2 }}>{CATEGORY_EMOJIS[cat.name] || '🍽️'}</Text>
            <Text style={{ fontSize: 14, color: selectedCategory === cat._id ? '#111' : '#888', fontWeight: selectedCategory === cat._id ? 'bold' : 'normal' }}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // --- Featured and Suggestions (mock for now) ---
  const safeFilteredProducts = Array.isArray(filteredProducts) ? filteredProducts : [];
  console.log('HomeScreen - filteredProducts:', filteredProducts);
  console.log('HomeScreen - safeFilteredProducts:', safeFilteredProducts);
  
  const featuredProducts = safeFilteredProducts.slice(0, 5);
  const suggestedProducts = safeFilteredProducts.slice(5, 10);

  const renderProductTile = ({ item }: { item: Product }) => {
    const imageUrl = item.images && item.images.length > 0
      ? item.images[0].startsWith('http')
        ? item.images[0]
        : `${API_BASE_URL.replace('/api', '')}${item.images[0]}?_t=${Date.now()}`
      : 'https://via.placeholder.com/150';
    
    console.log(`Rendering product ${item.name} with image: ${imageUrl}`);
    
    return (
      <TouchableOpacity style={styles.productTile} onPress={() => handleProductPress(item._id)}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.productTileImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Image failed to load for product:', item.name, 'Image:', imageUrl, 'Error:', error);
          }}
          onLoad={() => {
            console.log('Image loaded successfully for product:', item.name, 'Image:', imageUrl);
          }}
          defaultSource={{ uri: 'https://via.placeholder.com/150' }}
        />
        <View style={styles.productTileContent}>
          <Text style={styles.productTileName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productTileBrand} numberOfLines={1}>{item.brand?.name}</Text>
          <Text style={styles.productTilePrice}>₹{item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    const imageUrl = item.images && item.images.length > 0
      ? item.images[0].startsWith('http')
        ? item.images[0]
        : `${API_BASE_URL.replace('/api', '')}${item.images[0]}?_t=${Date.now()}`
      : 'https://via.placeholder.com/150';
    
    return (
      <TouchableOpacity style={styles.productCard} onPress={() => handleProductPress(item._id)}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.productCardImage}
          resizeMode="cover"
          onError={(error) => {
            console.log('Image failed to load for product:', item.name, 'Image:', imageUrl, 'Error:', error);
          }}
          onLoad={() => {
            console.log('Image loaded successfully for product:', item.name, 'Image:', imageUrl);
          }}
          defaultSource={{ uri: 'https://via.placeholder.com/150' }}
        />
        <View style={styles.productCardContent}>
          <Text style={styles.productCardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productCardBrand} numberOfLines={1}>{item.brand?.name}</Text>
          <Text style={styles.productCardPrice}>₹{item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (category: Category) => {
    const categoryProducts = products.filter(product => product.category?._id === category._id);
    
    if (categoryProducts.length === 0) return null;
    
    return (
      <View key={category._id} style={styles.categorySection}>
        <View style={styles.categorySectionHeader}>
          <Text style={styles.categorySectionTitle}>
            {category.name}
          </Text>
          <TouchableOpacity onPress={() => handleViewAllPress(category._id)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categoryProducts}
          renderItem={renderProductCard}
          keyExtractor={item => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryProductList}
        />
      </View>
    );
  };

  // --- Main Render ---
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {renderTopBar()}
        {renderCategoryFilterRow()}
        
        {/* Category Sections */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {selectedCategory ? (
            // Show only the selected category
            (() => {
              const selectedCat = categories.find(cat => cat._id === selectedCategory);
              return selectedCat ? renderCategorySection(selectedCat) : null;
            })()
          ) : (
            // Show all categories when no filter is selected
            categories.map(category => renderCategorySection(category))
          )}
        </View>
      </ScrollView>
      {showCartNotification && (
        <View style={styles.cartNotification}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.cartNotificationText}>Added to cart!</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 16,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInputUber: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  categoryUberRow: {
    padding: 16,
  },
  categoryUber: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 20,
    borderRadius: 12,
    width: 100,
    height: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryUberLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  filterRow: {
    padding: 16,
  },
  filterBtn: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  filterBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  sectionUberTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  categoryIconDynamic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryUberSelected: {
    backgroundColor: '#007AFF',
  },
  categoryUberLabelSelected: {
    color: '#fff',
  },
  productTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '48%',
  },
  productTileImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productTileContent: {
    padding: 12,
  },
  productTileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productTileBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productTilePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productCardContent: {
    padding: 12,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCardBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  categorySection: {
    marginBottom: 20,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryProductList: {
    paddingHorizontal: 8,
  },
});

export default HomeScreen;
