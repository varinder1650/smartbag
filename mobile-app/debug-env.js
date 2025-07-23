/**
 * Debug Environment Variables
 * 
 * This file helps debug issues with environment variables in Expo
 * and provides utilities for API URL diagnostics
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config/apiConfig';
import { diagnoseApiUrl, fixApiUrl } from './utils/apiUtils';

// Log all environment-related information
console.log('===== DEBUG ENVIRONMENT VARIABLES =====');
console.log('Constants object:', Constants);
console.log('Constants.expoConfig:', Constants.expoConfig);
console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('EXPO_PUBLIC_API_URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL);
console.log('Process env:', process.env);
console.log('Platform:', Platform.OS);
console.log('API_BASE_URL:', API_BASE_URL);

// Run API URL diagnostics
const apiDiagnosis = diagnoseApiUrl(API_BASE_URL);
console.log('API URL Diagnosis:', apiDiagnosis);

if (!apiDiagnosis.valid && apiDiagnosis.fixedUrl) {
  console.log('Suggested fixed URL:', apiDiagnosis.fixedUrl);
}

console.log('========================================');

// Export a function to get environment variables and API diagnostics
export function getEnvDebugInfo() {
  const apiDiagnosis = diagnoseApiUrl(API_BASE_URL);
  
  return {
    constants: Constants,
    expoConfig: Constants.expoConfig,
    extra: Constants.expoConfig?.extra,
    apiUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
    processEnv: process.env,
    platform: Platform.OS,
    apiBaseUrl: API_BASE_URL,
    apiDiagnosis: apiDiagnosis,
    suggestedFixedUrl: apiDiagnosis.valid ? null : apiDiagnosis.fixedUrl
  };
}

/**
 * Runs a comprehensive environment and API URL diagnostic
 * and returns a detailed report
 */
export function runDiagnostics() {
  const envInfo = getEnvDebugInfo();
  const apiDiagnosis = diagnoseApiUrl(API_BASE_URL);
  
  return {
    environment: {
      platform: Platform.OS,
      expoConfigAvailable: !!Constants.expoConfig,
      expoManifestAvailable: !!Constants.manifest,
      envVarsAvailable: !!process.env.EXPO_PUBLIC_API_URL
    },
    api: {
      baseUrl: API_BASE_URL,
      diagnosis: apiDiagnosis,
      fixedUrl: apiDiagnosis.valid ? null : fixApiUrl(API_BASE_URL)
    },
    recommendations: [
      ...apiDiagnosis.suggestions,
      'Use the EnhancedApiDebugger component for detailed API testing',
      'Run api-diagnostics.js for command-line API diagnostics'
    ]
  };
}