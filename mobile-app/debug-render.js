/**
 * Debug Render Script
 * 
 * This script helps diagnose rendering issues in the app
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from './config/apiConfig';
import { useAuth } from './contexts/AuthContext';

const DebugRender = () => {
  const [apiTest, setApiTest] = useState(null);
  const [authState, setAuthState] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('initial');
  
  // Get auth context if available
  let authContext = null;
  try {
    authContext = useAuth();
    setAuthState({
      user: authContext?.user ? 'Present' : 'Not present',
      token: authContext?.token ? 'Present' : 'Not present',
      loading: authContext?.loading || false
    });
  } catch (err) {
    setError(`Auth context error: ${err.message}`);
  }

  // Test API connection
  const testApi = async () => {
    try {
      setStep('testing_api');
      console.log('Testing API connection...');
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const status = response.status;
      const data = await response.json();
      setApiTest({ status, data: data ? 'Data received' : 'No data' });
      setStep('api_tested');
    } catch (err) {
      setApiTest({ error: err.message });
      setStep('api_error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Render</Text>
        <Text style={styles.subtitle}>Diagnosing rendering issues</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Render Step</Text>
        <Text style={styles.sectionContent}>{step}</Text>
      </View>

      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorContent}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth State</Text>
        <Text style={styles.sectionContent}>
          {authState ? JSON.stringify(authState, null, 2) : 'Not checked yet'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Configuration</Text>
        <Text style={styles.sectionContent}>API_BASE_URL: {API_BASE_URL || 'Not set'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Test</Text>
        {apiTest ? (
          <Text style={styles.sectionContent}>
            {JSON.stringify(apiTest, null, 2)}
          </Text>
        ) : (
          <TouchableOpacity style={styles.button} onPress={testApi}>
            <Text style={styles.buttonText}>Test API</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
  },
  errorSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorContent: {
    fontSize: 14,
    color: '#b71c1c',
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DebugRender;