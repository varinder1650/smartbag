import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { token, loading } = useAuth();

  useEffect(() => {
    console.log('IndexScreen - Auth state:', { token: !!token, loading });
    if (!loading) {
      if (token) {
        console.log('IndexScreen - Navigating to tabs (authenticated)');
        router.replace('/(tabs)');
      } else {
        console.log('IndexScreen - Navigating to login (not authenticated)');
        router.replace('/auth/login');
      }
    }
  }, [token, loading]);

  // Show loading while determining where to navigate
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
    </View>
  );
}
