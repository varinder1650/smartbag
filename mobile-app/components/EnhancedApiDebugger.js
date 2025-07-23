import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL, getApiBaseUrl, API_ENDPOINTS } from '../config/apiConfig';
import { testApiEndpoint, diagnoseApiUrl, analyzeApiError, fixApiUrl } from '../utils/apiUtils';

/**
 * Enhanced API Debugger Component
 * 
 * This component provides detailed API debugging information including:
 * - API configuration
 * - Environment variables
 * - Live API testing with actual responses
 * - Error details
 */
export default function EnhancedApiDebugger() {
  const [apiTestResults, setApiTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [expanded, setExpanded] = useState({});
  const [apiDiagnosis, setApiDiagnosis] = useState(null);

  useEffect(() => {
    console.log('EnhancedApiDebugger mounted');
    debugEnvironment();
    
    // Run API URL diagnosis
    const diagnosis = diagnoseApiUrl(API_BASE_URL);
    setApiDiagnosis(diagnosis);
    console.log('API URL diagnosis:', diagnosis);
    
    // Auto-test the Categories endpoint on mount
    testEndpoint('CATEGORIES', API_ENDPOINTS.CATEGORIES);
  }, []);

  const debugEnvironment = () => {
    console.log('===== ENHANCED API DEBUGGER =====');
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

  const testEndpoint = async (endpointName, url) => {
    setLoading(prev => ({ ...prev, [endpointName]: true }));
    try {
      const result = await testApiEndpoint(url);
      console.log(`Endpoint ${endpointName} result:`, result);
      setApiTestResults(prev => ({ ...prev, [endpointName]: result }));
    } catch (error) {
      console.error(`Error testing ${endpointName}:`, error);
      // Use analyzeApiError to get more detailed error information
      const errorAnalysis = analyzeApiError(error, url);
      setApiTestResults(prev => ({
        ...prev,
        [endpointName]: {
          success: false,
          error: error.message,
          errorAnalysis,
          url,
        },
      }));
    } finally {
      setLoading(prev => ({ ...prev, [endpointName]: false }));
    }
  };
  
  const fixAndTestUrl = async (endpointName, url) => {
    const fixedUrl = fixApiUrl(url);
    if (fixedUrl !== url) {
      testEndpoint(`${endpointName}_FIXED`, fixedUrl);
    }
  };

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const envInfo = getEnvInfo();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>API Configuration</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Base URL:</Text>
          <Text style={[styles.value, apiDiagnosis?.valid === false ? styles.errorText : null]}>
            {API_BASE_URL || 'Not set'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Base URL Function Result:</Text>
          <Text style={styles.value}>{envInfo.apiBaseUrlFunction || 'Not set'}</Text>
        </View>
        
        {apiDiagnosis && !apiDiagnosis.valid && (
          <View style={styles.diagnosisContainer}>
            <Text style={styles.diagnosisTitle}>API URL Issues Detected:</Text>
            {apiDiagnosis.issues.map((issue, index) => (
              <Text key={index} style={styles.issueText}>• {issue}</Text>
            ))}
            
            <Text style={styles.diagnosisTitle}>Suggestions:</Text>
            {apiDiagnosis.suggestions.map((suggestion, index) => (
              <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
            ))}
            
            {apiDiagnosis.fixedUrl && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suggested Fixed URL:</Text>
                <Text style={styles.fixedUrlText}>{apiDiagnosis.fixedUrl}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment Variables:</Text>
          <Text style={styles.value}>
            EXPO_PUBLIC_API_URL: {process.env.EXPO_PUBLIC_API_URL || 'Not set'}
          </Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Live API Tests</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testEndpoint('CATEGORIES', API_ENDPOINTS.CATEGORIES)}
          >
            <Text style={styles.buttonText}>Test Categories</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testEndpoint('PRODUCTS', API_ENDPOINTS.PRODUCTS)}
          >
            <Text style={styles.buttonText}>Test Products</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testEndpoint('BRANDS', API_ENDPOINTS.BRANDS)}
          >
            <Text style={styles.buttonText}>Test Brands</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => testEndpoint('SETTINGS', API_ENDPOINTS.SETTINGS)}
          >
            <Text style={styles.buttonText}>Test Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Render test results for each endpoint */}
        {Object.keys(apiTestResults).map(endpointName => (
          <View key={endpointName} style={styles.resultContainer}>
            {loading[endpointName] && (
              <ActivityIndicator size="small" color="#0000ff" style={styles.loader} />
            )}
            
            <TouchableOpacity 
              style={[styles.resultHeader, apiTestResults[endpointName].ok ? styles.successHeader : styles.errorHeader]} 
              onPress={() => toggleExpand(endpointName)}
            >
              <Text style={styles.resultTitle}>
                {endpointName}: {apiTestResults[endpointName].status} 
                {apiTestResults[endpointName].ok ? ' ✅' : ' ❌'}
                {apiTestResults[endpointName].redirected && ' (Redirected)'}
              </Text>
              <Text style={styles.responseTime}>
                {apiTestResults[endpointName].responseTime}ms
              </Text>
              <Text style={styles.expandButton}>
                {expanded[endpointName] ? '▼' : '►'}
              </Text>
            </TouchableOpacity>

            {expanded[endpointName] && (
              <View style={styles.resultDetails}>
                <Text style={styles.detailLabel}>Original URL:</Text>
                <Text style={styles.detailValue}>{apiTestResults[endpointName].originalUrl || 'N/A'}</Text>
                
                <Text style={styles.detailLabel}>Final URL:</Text>
                <Text style={styles.detailValue}>{apiTestResults[endpointName].url}</Text>
                
                {apiTestResults[endpointName].redirected && (
                  <View style={styles.redirectInfo}>
                    <Text style={styles.redirectText}>⚠️ URL was redirected</Text>
                    <TouchableOpacity 
                      style={styles.fixButton}
                      onPress={() => fixAndTestUrl(endpointName, apiTestResults[endpointName].originalUrl)}
                    >
                      <Text style={styles.fixButtonText}>Test Fixed URL</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <Text style={styles.detailLabel}>Headers:</Text>
                <Text style={styles.detailValue}>
                  {apiTestResults[endpointName].headers ? 
                    Object.entries(apiTestResults[endpointName].headers)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n') : 
                    'No headers available'}
                </Text>
                
                {apiTestResults[endpointName].error ? (
                  <>
                    <Text style={styles.detailLabel}>Error:</Text>
                    <Text style={[styles.detailValue, styles.errorText]}>
                      {apiTestResults[endpointName].error}
                    </Text>
                    
                    {apiTestResults[endpointName].errorAnalysis && (
                      <>
                        <Text style={styles.detailLabel}>Error Analysis:</Text>
                        <View style={styles.errorAnalysis}>
                          <Text style={styles.errorType}>
                            Type: {apiTestResults[endpointName].errorAnalysis.type}
                          </Text>
                          <Text style={styles.errorCause}>
                            Cause: {apiTestResults[endpointName].errorAnalysis.cause}
                          </Text>
                          <Text style={styles.errorSuggestion}>
                            Suggestion: {apiTestResults[endpointName].errorAnalysis.suggestion}
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.detailLabel}>Response Data:</Text>
                    <Text style={styles.detailValue}>
                      {JSON.stringify(apiTestResults[endpointName].data, null, 2)}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  redirectInfo: {
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  redirectText: {
    color: '#ff6f00',
    fontWeight: '500',
  },
  fixButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  fixButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  successHeader: {
    backgroundColor: '#e8f5e9',
  },
  errorHeader: {
    backgroundColor: '#ffebee',
  },
  responseTime: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  errorAnalysis: {
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 4,
  },
  errorType: {
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorCause: {
    color: '#555',
    marginBottom: 4,
  },
  errorSuggestion: {
    color: '#2e7d32',
    fontWeight: '500',
  },
  diagnosisContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fff8e1',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  diagnosisTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#ff6f00',
  },
  issueText: {
    color: '#d32f2f',
    marginBottom: 4,
  },
  suggestionText: {
    color: '#2e7d32',
    marginBottom: 4,
  },
  fixedUrlText: {
    fontWeight: 'bold',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
  },
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
  testButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 4,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 10,
  },
  resultContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#eee',
  },
  resultTitle: {
    fontWeight: '600',
    flex: 1,
  },
  expandButton: {
    fontSize: 16,
    color: '#555',
  },
  resultDetails: {
    padding: 10,
  },
  detailLabel: {
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
    color: '#555',
  },
  detailValue: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorText: {
    color: 'red',
  },
});