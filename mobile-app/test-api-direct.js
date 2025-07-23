/**
 * Direct API Test Script
 * 
 * This script directly tests the API connection without relying on the full app.
 * Run with: node -r expo-env/script test-api-direct.js
 */

const API_BASE_URL = 'https://smartbag.onrender.com/api/';

// Utility functions
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

// Test different URL combinations
const testUrls = [
  // Test 1: Direct concatenation with trailing slash in base URL
  { 
    name: 'Direct with trailing slash in base',
    url: 'https://smartbag.onrender.com/api/' + 'categories'
  },
  // Test 2: Direct concatenation without trailing slash in base URL
  { 
    name: 'Direct without trailing slash in base',
    url: 'https://smartbag.onrender.com/api' + '/categories'
  },
  // Test 3: Using joinApiUrl with trailing slash in base URL
  { 
    name: 'joinApiUrl with trailing slash in base',
    url: joinApiUrl('https://smartbag.onrender.com/api/', 'categories')
  },
  // Test 4: Using joinApiUrl without trailing slash in base URL
  { 
    name: 'joinApiUrl without trailing slash in base',
    url: joinApiUrl('https://smartbag.onrender.com/api', 'categories')
  },
  // Test 5: Using joinApiUrl with leading slash in path
  { 
    name: 'joinApiUrl with leading slash in path',
    url: joinApiUrl('https://smartbag.onrender.com/api', '/categories')
  },
];

// Test each URL
async function testApiUrls() {
  console.log('===== DIRECT API TEST =====');
  
  for (const test of testUrls) {
    console.log(`\nTesting ${test.name}:`);
    console.log(`URL: ${test.url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(test.url);
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
}

// Run the tests
testApiUrls().then(() => {
  console.log('\n===== TESTS COMPLETE =====');
});