/**
 * Fix Home Screen Display Issues
 * 
 * This script helps diagnose and fix issues with the home screen not displaying
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { API_BASE_URL } from './config/apiConfig';
import { useAuth } from './contexts/AuthContext';

const FixHomeScreen = () => {
  const [diagnosticResults, setDiagnosticResults] = useState({});
  const [step, setStep] = useState('initial');
  const [error, setError] = useState(null);
  
  // Get auth context
  const authContext = useAuth();
  
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      setStep('checking_auth');
      // Check auth context
      const authState = {
        user: authContext?.user ? 'Present' : 'Not present',
        token: authContext?.token ? 'Present' : 'Not present',
        loading: authContext?.loading || false
      };
      
      setStep('checking_api');
      // Check API configuration
      const apiConfig = {
        baseUrl: API_BASE_URL || 'Not set'
      };
      
      setStep('checking_tabs');
      // Check if user role is valid for tab navigation
      const userRole = authContext?.user?.role || 'Not set';
      const isValidRole = userRole === 'user' || userRole === 'partner' || userRole === 'admin';
      
      // Compile results
      setDiagnosticResults({
        authState,
        apiConfig,
        userRole,
        isValidRole,
        timestamp: new Date().toISOString()
      });
      
      setStep('complete');
    } catch (err) {
      setError(`Diagnostic error: ${err.message}`);
      setStep('error');
    }
  };

  const fixIssues = () => {
    // This function would implement fixes based on diagnostic results
    console.log('Applying fixes based on diagnostics...');
    
    // Example fix for missing user role
    if (!diagnosticResults.isValidRole) {
      console.log('User role issue detected, attempting to fix...');
      // In a real implementation, this might reload the auth state or redirect to login
    }
    
    // Example fix for API configuration
    if (!API_BASE_URL || API_BASE_URL === 'Not set') {
      console.log('API URL issue detected, attempting to fix...');
      // In a real implementation, this might update the API configuration
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Screen Diagnostics</Text>
        <Text style={styles.subtitle}>Current step: {step}</Text>
      </View>
      
      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorContent}>{error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic Results</Text>
        <Text style={styles.sectionContent}>
          {Object.keys(diagnosticResults).length > 0 ? 
            JSON.stringify(diagnosticResults, null, 2) : 
            'Running diagnostics...'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Fixes</Text>
        {step === 'complete' && (
          <>
            {!diagnosticResults.isValidRole && (
              <Text style={styles.recommendation}>
                • User role issue detected. Try logging out and logging back in.
              </Text>
            )}
            {!API_BASE_URL && (
              <Text style={styles.recommendation}>
                • API URL not configured properly. Check .env file and restart the app.
              </Text>
            )}
            {diagnosticResults.isValidRole && API_BASE_URL && (
              <Text style={styles.recommendation}>
                • No critical issues detected. Try clearing the app cache and restarting.
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={fixIssues}>
              <Text style={styles.buttonText}>Apply Fixes</Text>
            </TouchableOpacity>
          </>
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
  recommendation: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default FixHomeScreen;