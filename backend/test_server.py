#!/usr/bin/env python3
"""
Simple test script to verify FastAPI backend functionality
"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:3001"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpass123"

async def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/health")
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200

async def test_public_settings():
    """Test the public settings endpoint"""
    print("\nTesting public settings...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/settings/public")
        print(f"Public settings status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Settings: {json.dumps(data, indent=2)}")
        return response.status_code == 200

async def test_register_user():
    """Test user registration"""
    print("\nTesting user registration...")
    user_data = {
        "name": "Test User",
        "email": TEST_EMAIL,
        "phone": "1234567890",
        "password": TEST_PASSWORD
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/register",
            json=user_data
        )
        print(f"Registration status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"User created: {data.get('user', {}).get('email')}")
        return response.status_code in [201, 400]  # 400 if user already exists

async def test_login():
    """Test user login"""
    print("\nTesting user login...")
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json=login_data
        )
        print(f"Login status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print(f"Login successful: {data.get('user', {}).get('email')}")
            return data.get('access_token')
        return None

async def test_protected_endpoint(token):
    """Test a protected endpoint"""
    if not token:
        print("\nSkipping protected endpoint test (no token)")
        return False
    
    print("\nTesting protected endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/user/address",
            headers=headers
        )
        print(f"Protected endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"User address: {json.dumps(data, indent=2)}")
        return response.status_code == 200

async def main():
    """Run all tests"""
    print("Starting FastAPI backend tests...")
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now()}")
    
    # Test basic functionality
    health_ok = await test_health_check()
    settings_ok = await test_public_settings()
    
    if not health_ok:
        print("\n❌ Health check failed - server may not be running")
        return
    
    # Test authentication
    register_ok = await test_register_user()
    token = await test_login()
    protected_ok = await test_protected_endpoint(token)
    
    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    print(f"Health Check: {'✅' if health_ok else '❌'}")
    print(f"Public Settings: {'✅' if settings_ok else '❌'}")
    print(f"User Registration: {'✅' if register_ok else '❌'}")
    print(f"User Login: {'✅' if token else '❌'}")
    print(f"Protected Endpoint: {'✅' if protected_ok else '❌'}")
    
    if health_ok and settings_ok:
        print("\n🎉 Basic functionality is working!")
    else:
        print("\n⚠️  Some tests failed. Check server logs.")

if __name__ == "__main__":
    asyncio.run(main()) 