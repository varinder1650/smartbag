#!/usr/bin/env python3
"""
Script to update existing category icon paths from /uploads/ to /api/uploads/
"""
import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/blinkit_clone")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.blinkit_clone

async def update_category_paths():
    """Update existing category icon paths"""
    try:
        # Find all categories with old icon paths
        categories = await db.categories.find({"icon": {"$regex": "^/uploads/"}}).to_list(length=None)
        
        print(f"Found {len(categories)} categories with old icon paths")
        
        for category in categories:
            old_path = category.get("icon")
            if old_path and old_path.startswith("/uploads/"):
                new_path = old_path.replace("/uploads/", "/api/uploads/")
                
                # Update the category
                result = await db.categories.update_one(
                    {"_id": category["_id"]},
                    {"$set": {"icon": new_path}}
                )
                
                if result.modified_count > 0:
                    print(f"Updated category '{category.get('name', 'Unknown')}': {old_path} -> {new_path}")
                else:
                    print(f"Failed to update category '{category.get('name', 'Unknown')}'")
        
        print("Category path update completed!")
        
    except Exception as e:
        print(f"Error updating category paths: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(update_category_paths()) 