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

const HomeScreen = () => {
  const { user, token } = useAuth();
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
    let filtered = products;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category?._id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/categories`),
      ]);
      
      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      
      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
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
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.locationBtn} onPress={handleHomeButtonPress}>
        <Text style={styles.locationText}>{userAddress}</Text>
        <Ionicons name="chevron-down" size={18} color="#333" />
      </TouchableOpacity>
      <View style={styles.topIcons}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color="#333" />
          {/* Notification badge example */}
          {/* <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>1</Text></View> */}
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleCartPress}>
          <Ionicons name="cart-outline" size={22} color="#333" />
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
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={20} color="#666" style={{ marginRight: 8 }} />
      <TextInput
        style={styles.searchInputUber}
        placeholder="Search"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#666"
      />
      <TouchableOpacity>
        <Ionicons name="options-outline" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderCategoryIcon = ({ item }) => {
    console.log('Category name:', item.name); // Debug log
    
    const getCategoryIcon = (categoryName) => {
      const name = categoryName.toLowerCase();
      console.log('Processing category:', name); // Debug log
      
      if (name.includes('electronics') || name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) {
        return 'phone-portrait-outline';
      } else if (name.includes('fashion') || name.includes('clothing') || name.includes('apparel') || name.includes('wear')) {
        return 'shirt-outline';
      } else if (name.includes('food') || name.includes('grocery') || name.includes('fresh') || name.includes('vegetables') || name.includes('fruits')) {
        return 'restaurant-outline';
      } else if (name.includes('home') || name.includes('kitchen') || name.includes('household') || name.includes('appliances')) {
        return 'home-outline';
      } else if (name.includes('beauty') || name.includes('cosmetics') || name.includes('personal') || name.includes('care')) {
        return 'rose-outline';
      } else if (name.includes('sports') || name.includes('fitness') || name.includes('outdoor') || name.includes('exercise')) {
        return 'fitness-outline';
      } else if (name.includes('books') || name.includes('stationery') || name.includes('office') || name.includes('paper')) {
        return 'library-outline';
      } else if (name.includes('toys') || name.includes('games') || name.includes('entertainment') || name.includes('play')) {
        return 'game-controller-outline';
      } else if (name.includes('automotive') || name.includes('car') || name.includes('vehicle') || name.includes('auto')) {
        return 'car-outline';
      } else if (name.includes('health') || name.includes('medical') || name.includes('pharmacy') || name.includes('medicine')) {
        return 'medical-outline';
      } else if (name.includes('dairy') || name.includes('milk') || name.includes('cheese')) {
        return 'nutrition-outline';
      } else if (name.includes('beverages') || name.includes('drinks') || name.includes('juice') || name.includes('soda')) {
        return 'cafe-outline';
      } else {
        console.log('Using default icon for:', name); // Debug log
        return 'grid-outline'; // default icon
      }
    };

    const iconName = getCategoryIcon(item.name);
    console.log('Selected icon:', iconName); // Debug log

    return (
      <TouchableOpacity
        style={[styles.categoryUber, selectedCategory === item._id && styles.categoryUberSelected]}
        onPress={() => setSelectedCategory(selectedCategory === item._id ? null : item._id)}
      >
        <View style={styles.categoryIconDynamic}>
          <Ionicons 
            name={iconName} 
            size={28} 
            color={selectedCategory === item._id ? '#fff' : '#007AFF'} 
          />
        </View>
        <Text style={[styles.categoryUberLabel, selectedCategory === item._id && styles.categoryUberLabelSelected]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterBtn = ({ item, index }) => (
    <TouchableOpacity key={index} style={styles.filterBtn}>
      <Ionicons name={item.icon} size={16} color="#333" style={{ marginRight: 4 }} />
      <Text style={styles.filterBtnText}>{item.label}</Text>
    </TouchableOpacity>
  );

  // --- Featured and Suggestions (mock for now) ---
  const featuredProducts = filteredProducts.slice(0, 5);
  const suggestedProducts = filteredProducts.slice(5, 10);

  const renderHorizontalProduct = ({ item }) => (
    <TouchableOpacity style={styles.horizontalProductCard} onPress={() => handleProductPress(item._id)}>
      <Image
        source={{
          uri:
            item.images && item.images.length > 0
              ? item.images[0].startsWith('http')
                ? item.images[0]
                : `${API_BASE_URL.replace('/api', '')}${item.images[0]}`
              : 'https://via.placeholder.com/150'
        }}
        style={styles.horizontalProductImageFixed}
        resizeMode="cover"
      />
      <Text style={styles.horizontalProductName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.horizontalProductBrand}>{item.brand?.name}</Text>
      <Text style={styles.horizontalProductPrice}>₹{item.price}</Text>
    </TouchableOpacity>
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
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {renderTopBar()}
        {renderSearchBar()}
        <View style={styles.categoryUberRow}>
          <FlatList
            data={categories}
            renderItem={renderCategoryIcon}
            keyExtractor={item => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        <Text style={styles.sectionUberTitle}>Featured Products</Text>
        <FlatList
          data={filteredProducts.slice(0, 10)}
          renderItem={renderHorizontalProduct}
          keyExtractor={item => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingBottom: 8 }}
        />
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
    marginBottom: 16,
  },
  horizontalProductCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horizontalProductImageFixed: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  horizontalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  horizontalProductBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  horizontalProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
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
});

export default HomeScreen;
