import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/blinkit_clone")

async def make_admin(identifier):
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client.get_default_database()
    result = await db.users.update_one({
        "$or": [
            {"email": identifier},
            {"phone": identifier}
        ]
    }, {"$set": {"role": "admin"}})
    if result.modified_count:
        print(f"User {identifier} updated to admin.")
    else:
        print(f"No user updated. (User may already be admin or not found)")
    client.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python make_admin_by_email_or_phone.py <email_or_phone>")
    else:
        asyncio.run(make_admin(sys.argv[1])) 