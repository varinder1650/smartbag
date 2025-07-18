import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from utils.database import DatabaseManager

async def check_users():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = DatabaseManager(client, "blinkit_clone")
    
    try:
        users = await db.find_many('users')
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- {user.get('name', 'N/A')} ({user.get('email', 'N/A')}) - Role: {user.get('role', 'N/A')}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_users()) 