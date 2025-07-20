// Test script to verify admin panel can connect to backend
const testBackendConnection = async () => {
  const baseUrl = 'http://10.0.0.74:3001/api';
  
  console.log('🔗 Testing backend connection...');
  console.log('🌐 Base URL:', baseUrl);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    console.log('Health status:', healthResponse.status);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
    }
    
    // Test categories endpoint
    console.log('\n2. Testing categories endpoint...');
    const categoriesResponse = await fetch(`${baseUrl}/categories/`);
    console.log('Categories status:', categoriesResponse.status);
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log('Categories count:', categoriesData.length);
      console.log('First category:', categoriesData[0]);
    }
    
    // Test products endpoint
    console.log('\n3. Testing products endpoint...');
    const productsResponse = await fetch(`${baseUrl}/products/`);
    console.log('Products status:', productsResponse.status);
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log('Products count:', productsData.products?.length || 0);
      console.log('First product:', productsData.products?.[0]);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
};

// Run the test
testBackendConnection(); 