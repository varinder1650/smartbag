/**
 * API Diagnostics Tool
 * 
 * This script provides comprehensive API diagnostics to help troubleshoot
 * connection issues in the SmartBag app.
 * 
 * Run with: node api-diagnostics.js
 */

// API URL utilities
const ensureTrailingSlash = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
};

const removeLeadingSlash = (path) => {
  if (!path) return '';
  return path.startsWith('/') ? path.substring(1) : path;
};

const joinApiUrl = (baseUrl, path) => {
  const formattedBase = ensureTrailingSlash(baseUrl);
  const formattedPath = removeLeadingSlash(path);
  return `${formattedBase}${formattedPath}`;
};

const diagnoseApiUrl = (baseUrl) => {
  if (!baseUrl) {
    return {
      valid: false,
      issues: ['API base URL is empty or undefined'],
      suggestions: ['Check environment variables', 'Verify API configuration'],
    };
  }

  const issues = [];
  const suggestions = [];

  // Check for protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    issues.push('Missing protocol (http:// or https://)');
    suggestions.push('Add https:// to the beginning of the URL');
  }

  // Check for trailing slash
  if (!baseUrl.endsWith('/')) {
    issues.push('Missing trailing slash');
    suggestions.push('Add trailing slash to API base URL');
  }

  // Check for double slashes in the middle
  if (baseUrl.includes('//') && !baseUrl.startsWith('http')) {
    issues.push('Contains double slashes');
    suggestions.push('Remove duplicate slashes from URL');
  }

  // Check for common typos
  if (baseUrl.includes(' ')) {
    issues.push('Contains spaces');
    suggestions.push('Remove spaces from URL');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
    fixedUrl: ensureTrailingSlash(baseUrl),
  };
};

// API Base URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://smartbag.onrender.com/api/';

// API endpoints
const API_ENDPOINTS = {
  CATEGORIES: joinApiUrl(API_BASE_URL, 'categories'),
  PRODUCTS: joinApiUrl(API_BASE_URL, 'products'),
  BRANDS: joinApiUrl(API_BASE_URL, 'brands'),
  SETTINGS: joinApiUrl(API_BASE_URL, 'settings/public'),
};

// Test API URL formatting
const testUrlFormatting = () => {
  console.log('\n===== URL FORMATTING TESTS =====');
  
  const baseUrls = [
    'https://smartbag.onrender.com/api/',
    'https://smartbag.onrender.com/api',
    process.env.EXPO_PUBLIC_API_URL,
    API_BASE_URL
  ];
  
  const paths = [
    'categories',
    '/categories',
    'auth/login',
    '/auth/login'
  ];
  
  for (const baseUrl of baseUrls) {
    console.log(`\nBase URL: "${baseUrl}"`);
    console.log(`With trailing slash: "${ensureTrailingSlash(baseUrl)}"`);
    
    for (const path of paths) {
      console.log(`  Path: "${path}"`);
      console.log(`  Without leading slash: "${removeLeadingSlash(path)}"`);
      console.log(`  Joined URL: "${joinApiUrl(baseUrl, path)}"`);
    }
  }
};

// Test API endpoints
const testApiEndpoints = async () => {
  console.log('\n===== API ENDPOINT TESTS =====');
  
  const endpoints = [
    { name: 'CATEGORIES', url: API_ENDPOINTS.CATEGORIES },
    { name: 'SETTINGS', url: API_ENDPOINTS.SETTINGS },
    { name: 'PRODUCTS', url: API_ENDPOINTS.PRODUCTS },
    { name: 'BRANDS', url: API_ENDPOINTS.BRANDS }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting ${endpoint.name}: ${endpoint.url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url);
      const endTime = Date.now();
      
      console.log(`Status: ${response.status}`);
      console.log(`Time: ${endTime - startTime}ms`);
      console.log(`Final URL (after redirects): ${response.url}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`Error: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  }
};

// Diagnose API URL issues
const runApiDiagnostics = () => {
  console.log('\n===== API URL DIAGNOSTICS =====');
  
  const urls = [
    API_BASE_URL,
    process.env.EXPO_PUBLIC_API_URL,
    'https://smartbag.onrender.com/api/',
    'https://smartbag.onrender.com/api'
  ];
  
  for (const url of urls) {
    console.log(`\nDiagnosing URL: "${url}"`);
    const diagnosis = diagnoseApiUrl(url);
    console.log(`Valid: ${diagnosis.valid}`);
    
    if (diagnosis.issues.length > 0) {
      console.log('Issues:');
      diagnosis.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (diagnosis.suggestions.length > 0) {
      console.log('Suggestions:');
      diagnosis.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }
    
    if (diagnosis.fixedUrl) {
      console.log(`Fixed URL: "${diagnosis.fixedUrl}"`);
    }
  }
};

// Display environment information
const displayEnvironmentInfo = () => {
  console.log('===== ENVIRONMENT INFORMATION =====');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
};

// Run all diagnostics
const runAllDiagnostics = async () => {
  console.log('======================================');
  console.log('SMARTBAG API DIAGNOSTICS TOOL');
  console.log('======================================\n');
  
  displayEnvironmentInfo();
  testUrlFormatting();
  runApiDiagnostics();
  await testApiEndpoints();
  
  console.log('\n======================================');
  console.log('DIAGNOSTICS COMPLETE');
  console.log('======================================');
};

// Run the diagnostics
runAllDiagnostics().catch(error => {
  console.error('Error running diagnostics:', error);
});