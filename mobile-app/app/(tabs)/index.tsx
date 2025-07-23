import React, { useState, useEffect, useCallback } from 'react';
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
  brand: { name: string };
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
}

interface SectionData {
  type: 'header' | 'categories' | 'products';
  data: any[];
  title?: string;
}

// IMAGE_BASE_URL is now imported from apiConfig

const HomeScreen = () => {
  console.log('HomeScreen - Component mounted');
  // Use AuthContext directly
  const { user, token, loading: authLoading } = useAuth();
  console.log('HomeScreen - Auth state:', { user: !!user, token: !!token, authLoading });
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
    // Only fetch user address if auth is not loading and we have a token
    if (!authLoading) {
      fetchUserAddress();
    }
  }, [authLoading]);

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
    if (!token) {
      setCartCount(0);
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
        setCartCount(cartData.items?.length || 0);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    }
  };

  const fetchUserAddress = async () => {
    if (!token) {
      setUserAddress('Add Address');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/user/address`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const addressData = await response.json();
        setUserAddress(addressData.address || 'Add Address');
      } else {
        setUserAddress('Add Address');
      }
    } catch (error) {
      console.error('Error fetching user address:', error);
      setUserAddress('Add Address');
    }
  };

  const filterProducts = () => {
    try {
      // Ensure products is always an array
      let filtered = products || [];
      console.log('filterProducts - products:', products);
      console.log('filterProducts - filtered (initial):', filtered);

      // Filter by category (match by name or ID since categories API returns _id: null)
      if (selectedCategory) {
        const selectedCat = categories.find(cat => cat._id === selectedCategory || cat.name === selectedCategory);
        if (selectedCat) {
          filtered = filtered.filter(product =>
            product.category?.name === selectedCat.name ||
            product.category?._id === selectedCat._id
          );
        }
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
        fetch(`${API_ENDPOINTS.PRODUCTS}?_t=${timestamp}`),
        fetch(`${API_ENDPOINTS.CATEGORIES}?_t=${timestamp}`),
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
      setCategories(safeCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
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
    fetchData();
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleCategoryPress = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleViewAllPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleCartPress = () => {
    if (authLoading) {
      Alert.alert('Please wait', 'Checking login status...');
      return;
    }
    if (!token) {
      Alert.alert(
        'Login Required',
        'Please login to view your cart',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    router.push('/(tabs)/explore');
  };

  const handleHomeButtonPress = () => {
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const addToCart = async (productId: string) => {
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

    try {
      const response = await fetch(API_ENDPOINTS.CART_ADD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: productId,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCartNotification(true);
        setTimeout(() => setShowCartNotification(false), 2000);
        fetchCartCount();
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const getCategoryIconUrl = (category: Category) => {
    if (category.icon) {
      if (category.icon.startsWith('http')) {
        return category.icon;
      }
      return `${IMAGE_BASE_URL}${category.icon}?_t=${Date.now()}`;
    }
    return null;
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.locationContainer} onPress={() => router.push('/address')}>
        <Ionicons name="location-outline" size={20} color="#333" />
        <Text style={styles.locationText} numberOfLines={1}>{userAddress}</Text>
        <Ionicons name="chevron-down" size={16} color="#333" />
      </TouchableOpacity>
      <View style={styles.topBarActions}>
        <TouchableOpacity style={styles.cartButton} onPress={handleCartPress}>
          <Ionicons name="bag-outline" size={24} color="#333" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search for products..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );

  // --- Category Filter Row ---
  const renderCategoryFilterRow = () => (
    <View style={styles.categoryFilterRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {/* All filter */}
        <TouchableOpacity onPress={() => handleCategoryPress(null)} style={{ alignItems: 'center', marginHorizontal: 8 }}>
          <View style={styles.categoryIconContainer}>
            <Ionicons name="search" size={24} color={selectedCategory === null ? '#007AFF' : '#888'} />
          </View>
          <Text style={{ fontSize: 14, color: selectedCategory === null ? '#111' : '#888', fontWeight: selectedCategory === null ? 'bold' : 'normal' }}>All</Text>
        </TouchableOpacity>
        {categories.map((cat, index) => {
          const iconUrl = getCategoryIconUrl(cat);
          const categoryKey = cat._id || cat.name || `category-${index}`;
          return (
            <TouchableOpacity key={categoryKey} onPress={() => handleCategoryPress(cat._id)} style={{ alignItems: 'center', marginHorizontal: 8 }}>
              <View style={styles.categoryIconContainer}>
                {iconUrl ? (
                  <Image
                    source={{ uri: iconUrl }}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                    onError={() => {
                      console.log('Category icon failed to load for:', cat.name);
                    }}

                  />
                ) : (
                  <Ionicons 
                    name="restaurant-outline" 
                    size={24} 
                    color={selectedCategory === cat._id ? '#007AFF' : '#888'} 
                  />
                )}
              </View>
              <Text style={{ fontSize: 14, color: selectedCategory === cat._id ? '#111' : '#888', fontWeight: selectedCategory === cat._id ? 'bold' : 'normal' }}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
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
    // Match by name since categories API returns _id: null
    const categoryProducts = products.filter(product =>
      product.category?.name === category.name ||
      product.category?._id === category._id
    );

    console.log(`Category "${category.name}" has ${categoryProducts.length} products`);
    if (categoryProducts.length === 0) return null;
    
    return (
      <View key={category._id || category.name || `category-section-${Math.random()}`} style={styles.categorySection}>
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
          nestedScrollEnabled={true}
        />
      </View>
    );
  };

  // Create data for the main FlatList
  const getMainListData = () => {
    if (selectedCategory) {
      const selectedCat = categories.find(cat => cat._id === selectedCategory);
      return selectedCat ? [selectedCat] : [];
    }
    return categories;
  };

  const renderMainListItem = ({ item }: { item: Category }) => {
    return renderCategorySection(item);
  };

  // Memoize renderHeader to prevent remounting
  const renderHeader = useCallback(() => (
    <>
      {renderTopBar()}
      {renderSearchBar()}
    </>
  ), [userAddress, cartCount, searchQuery]);

  const renderFooter = () => (
    <View style={{ height: 100 }} />
  );

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
      {renderTopBar()}
      {renderSearchBar()}
      {searchQuery.trim() ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductTile}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32, color: '#888' }}>No products found.</Text>}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        />
      ) : (
        <FlatList
          data={getMainListData()}
          renderItem={renderMainListItem}
          keyExtractor={(item) => item._id || item.name || `category-${Math.random()}`}
          ListHeaderComponent={renderCategoryFilterRow}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Set whole app background to white
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: 'transparent',
    borderWidth: 0,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 6,
    marginRight: 4,
    flex: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    marginLeft: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  searchContainer: {
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
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
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
  loginButton: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: 'transparent',
    borderWidth: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
  },
  categoryFilterRow: {
    backgroundColor: '#fff',
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    paddingVertical: 4,
    shadowColor: 'transparent',
    borderWidth: 0,
  },
});

export default HomeScreen;
