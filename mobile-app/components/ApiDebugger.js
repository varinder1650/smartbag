import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL, getApiBaseUrl } from '../config/apiConfig';

/**
 * Component to debug API configuration and environment variables
 * Add this component to your app temporarily to debug issues
 */
export default function ApiDebugger() {
  useEffect(() => {
    console.log('ApiDebugger mounted');
    debugEnvironment();
  }, []);

  const debugEnvironment = () => {
    console.log('===== API DEBUGGER =====');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('getApiBaseUrl():', getApiBaseUrl());
    console.log('Constants.expoConfig:', Constants.expoConfig);
    console.log('Constants.manifest:', Constants.manifest);
    console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
    console.log('======================');
  };

  // Get all environment variables
  const getEnvInfo = () => {
    return {
      API_BASE_URL,
      apiBaseUrlFunction: getApiBaseUrl(),
      expoConfig: Constants.expoConfig,
      manifest: Constants.manifest,
      processEnv: process.env.EXPO_PUBLIC_API_URL,
    };
  };

  const envInfo = getEnvInfo();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>API Configuration Debug</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Base URL:</Text>
          <Text style={styles.value}>{API_BASE_URL || 'Not set'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Base URL Function Result:</Text>
          <Text style={styles.value}>{envInfo.apiBaseUrlFunction || 'Not set'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expo Config:</Text>
          <Text style={styles.value}>
            {Constants.expoConfig ? 'Available' : 'Not available'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expo Manifest:</Text>
          <Text style={styles.value}>
            {Constants.manifest ? 'Available' : 'Not available'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment Variables:</Text>
          <Text style={styles.value}>
            EXPO_PUBLIC_API_URL: {process.env.EXPO_PUBLIC_API_URL || 'Not set'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
});