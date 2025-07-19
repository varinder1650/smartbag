#!/usr/bin/env python3

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from utils.database import DatabaseManager
from utils.auth import get_password_hash

load_dotenv()

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = DatabaseManager(client, "blinkit_clone")
    
    # Test user data
    test_user = {
        "name": "Test User",
        "email": "test@example.com",
        "phone": "9999999999",
        "hashed_password": get_password_hash("password123"),
        "is_active": True,
        "role": "user"
    }
    
    try:
        # Check if user already exists
        existing_user = await db.find_one("users", {"email": test_user["email"]})
        if existing_user:
            print(f"User {test_user['email']} already exists")
            print("Updating password...")
            await db.update_one(
                "users",
                {"email": test_user["email"]},
                {"hashed_password": test_user["hashed_password"]}
            )
            print("Password updated successfully!")
        else:
            print(f"Creating new user: {test_user['email']}")
            user_id = await db.insert_one("users", test_user)
            print(f"User created with ID: {user_id}")
        
        print("\nTest user credentials:")
        print(f"Email: {test_user['email']}")
        print(f"Phone: {test_user['phone']}")
        print("Password: password123")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main()) 