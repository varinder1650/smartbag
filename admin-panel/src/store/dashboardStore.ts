import { create } from 'zustand';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeOrders: number;
  activeUsers: number;
  totalProducts: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface Order {
  id: string;
  customer: string;
  total: number;
  status: string;
  deliveryPartner?: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive';
  image?: string;
  keywords?: string[];
  brandId?: string;
  categoryId?: string;
  description:string;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  parentId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'delivery_partner' | 'vendor';
  status: 'active' | 'inactive';
  joinedAt: string;
}

interface PricingConfig {
  deliveryFee: {
    type: 'fixed' | 'distance_based' | 'order_value_based';
    baseFee: number;
    perKmRate?: number;
    minFee?: number;
    maxFee?: number;
    freeDeliveryThreshold?: number;
  };
  appFee: {
    type: 'fixed' | 'percentage' | 'tiered';
    value: number;
    minFee?: number;
    maxFee?: number;
  };
}

interface DashboardState {
  // Connection status
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Dashboard data
  stats: DashboardStats;
  revenueData: RevenueData[];
  recentOrders: Order[];
  setStats: (stats: DashboardStats) => void;
  setRevenueData: (data: RevenueData[]) => void;
  setRecentOrders: (orders: Order[]) => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: string, deliveryPartner?: string) => void;

  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  updateUserRole: (userId: string, role: string) => void;
  toggleUserStatus: (userId: string) => void;

  // Pricing
  pricingConfig: PricingConfig | null;
  setPricingConfig: (config: PricingConfig) => void;

  // Brands
  brands: Brand[];
  setBrands: (brands: Brand[]) => void;
  addBrand: (brand: Brand) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Connection status
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Dashboard data
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    activeOrders: 0,
    activeUsers: 0,
    totalProducts: 0,
  },
  revenueData: [],
  recentOrders: [],
  setStats: (stats) => set({ stats: stats || { totalRevenue: 0, totalOrders: 0, activeOrders: 0, activeUsers: 0, totalProducts: 0 } }),
  setRevenueData: (revenueData) => set({ revenueData }),
  setRecentOrders: (recentOrders) => set({ recentOrders }),

  // Products
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  // Orders
  orders: [],
  setOrders: (orders) => set({ orders }),
  updateOrderStatus: (orderId, status, deliveryPartner) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status, deliveryPartner } : o
      ),
    })),

  // Users
  users: [],
  setUsers: (users) => set({ users }),
  updateUserRole: (userId, role) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role: role as any } : u)),
    })),
  toggleUserStatus: (userId) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
      ),
    })),

  // Pricing
  pricingConfig: null,
  setPricingConfig: (pricingConfig) => set({ pricingConfig }),

  // Brands
  brands: [],
  setBrands: (brands) => set({ brands }),
  addBrand: (brand) => set((state) => ({ brands: [...state.brands, brand] })),
  updateBrand: (id, updates) =>
    set((state) => ({
      brands: state.brands.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  deleteBrand: (id) =>
    set((state) => ({
      brands: state.brands.filter((b) => b.id !== id),
    })),

  // Categories  
  categories: [],
  setCategories: (categories) => set({
    categories: categories.map((c: any) => ({ ...c, id: c._id || c.id }))
  }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),
}));
