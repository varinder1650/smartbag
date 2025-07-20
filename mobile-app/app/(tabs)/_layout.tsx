import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AuthWrapper from '@/components/AuthWrapper';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Ensure user exists and has a valid role
  if (!user || !user.role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isPartner = user.role === 'partner';

  return (
    <AuthWrapper>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />, 
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Cart',
            tabBarIcon: ({ color }) => <Ionicons name="cart-outline" size={24} color={color} />, 
          }}
        />
        <Tabs.Screen
          name="delivery"
          options={{
            title: 'Delivery',
            tabBarIcon: ({ color }) => <Ionicons name="bicycle-outline" size={24} color={color} />, 
            href: isPartner ? undefined : null, // Hide tab for non-partners
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />, 
          }}
        />
      </Tabs>
    </AuthWrapper>
  );
}
