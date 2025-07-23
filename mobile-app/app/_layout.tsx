import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View, Text, Platform } from 'react-native';
import { useEffect } from 'react';

import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import testApiConnection from '../test-api-connection';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { token, loading } = useAuth();

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      console.log('Testing API connection...');
      const result = await testApiConnection();
      console.log('API connection test result:', result);
    };

    testConnection();
  }, []);



  // Add error handling for initialization
  try {
    console.log('RootLayout initializing...');
    
    if (!loaded || loading) {
      console.log('Fonts not loaded yet or Auth loading');
      // Show a simple loading indicator instead of returning null
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      );
    }
  } catch (error) {
    console.error('Error in RootLayout:', error);
    // Show error state
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 16, marginBottom: 10 }}>Error initializing app</Text>
        <Text>{errorMessage}</Text>
      </View>
    );
  }

  // Wrap the entire return in a try-catch for additional safety
  try {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 16, marginBottom: 10 }}>Error rendering app</Text>
        <Text>{errorMessage}</Text>
      </View>
    );
  }
}
