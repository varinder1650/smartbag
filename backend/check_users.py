#!/usr/bin/env python3

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from utils.database import DatabaseManager

load_dotenv()

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = DatabaseManager(client, "blinkit_clone")
    
    users = await db.find_many('users')
    print(f"Found {len(users)} users:")
    
    for user in users:
        print(f"- Email: {user.get('email')}, Phone: {user.get('phone')}, Name: {user.get('name')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main()) 