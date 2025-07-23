/**
 * API URL Format Test
 * 
 * This script tests different API URL formats to determine which works best
 * with the SmartBag API.
 */

// Test different URL formats
const testUrls = [
  // Format 1: With trailing slash in base URL
  { 
    name: 'Base URL with trailing slash',
    url: 'https://smartbag.onrender.com/api/',
    endpoints: [
      'categories',
      'products',
      'brands',
      'settings/public'
    ]
  },
  // Format 2: Without trailing slash in base URL
  { 
    name: 'Base URL without trailing slash',
    url: 'https://smartbag.onrender.com/api',
    endpoints: [
      'categories',
      'products',
      'brands',
      'settings/public'
    ]
  },
  // Format 3: With trailing slash in base URL and leading slash in endpoints
  { 
    name: 'Base URL with trailing slash + endpoints with leading slash',
    url: 'https://smartbag.onrender.com/api/',
    endpoints: [
      '/categories',
      '/products',
      '/brands',
      '/settings/public'
    ]
  },
  // Format 4: Without trailing slash in base URL and with leading slash in endpoints
  { 
    name: 'Base URL without trailing slash + endpoints with leading slash',
    url: 'https://smartbag.onrender.com/api',
    endpoints: [
      '/categories',
      '/products',
      '/brands',
      '/settings/public'
    ]
  },
];

// Utility function to join URL parts
function joinUrl(base, path) {
  return `${base}${path}`;
}

// Test each URL format
async function testApiFormats() {
  console.log('===== API URL FORMAT TEST =====');
  
  for (const format of testUrls) {
    console.log(`\n----- Testing ${format.name} -----`);
    console.log(`Base URL: ${format.url}`);
    
    for (const endpoint of format.endpoints) {
      const fullUrl = joinUrl(format.url, endpoint);
      console.log(`\nEndpoint: ${endpoint}`);
      console.log(`Full URL: ${fullUrl}`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(fullUrl);
        const endTime = Date.now();
        
        console.log(`Status: ${response.status}`);
        console.log(`Time: ${endTime - startTime}ms`);
        console.log(`Final URL (after redirects): ${response.url}`);
        console.log(`Redirected: ${response.redirected}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Response: ${JSON.stringify(data).substring(0, 50)}...`);
        } else {
          console.log(`Error: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error: ${error.message}`);
      }
    }
  }
}

// Run the tests
testApiFormats().then(() => {
  console.log('\n===== TESTS COMPLETE =====');
});