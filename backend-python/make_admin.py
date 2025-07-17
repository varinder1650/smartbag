import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/blinkit_clone")

async def make_admin():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client.get_default_database()
    result = await db.users.update_one({"phone": "9999999999"}, {"$set": {"role": "admin"}})
    if result.modified_count:
        print("User updated to admin.")
    else:
        print("No user updated. (User may already be admin or not found)")
    client.close()

if __name__ == "__main__":
    asyncio.run(make_admin()) 