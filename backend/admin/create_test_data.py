# create_test_data.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_data():
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client["ecommerce"]
    
    # Create admin user
    admin_user = {
        "email": "admin@example.com",
        "name": "Test Admin",
        "role": "admin",
        "hashed_password": pwd_context.hash("password"),
        "created_at": datetime.utcnow()
    }
    
    await db.users.update_one(
        {"email": admin_user["email"]},
        {"$set": admin_user},
        upsert=True
    )
    print("Admin user created")
    
    # Create test categories
    categories = [
        {"name": "Electronics", "description": "Electronic items"},
        {"name": "Clothing", "description": "Fashion and apparel"},
        {"name": "Books", "description": "Books and publications"}
    ]
    
    for category in categories:
        await db.categories.update_one(
            {"name": category["name"]},
            {"$set": category},
            upsert=True
        )
    print("Categories created")
    
    # Create test brands
    brands = [
        {"name": "TechCorp", "description": "Technology company"},
        {"name": "FashionBrand", "description": "Fashion brand"},
        {"name": "BookPublisher", "description": "Book publisher"}
    ]
    
    for brand in brands:
        await db.brands.update_one(
            {"name": brand["name"]},
            {"$set": brand},
            upsert=True
        )
    print("Brands created")
    
    # Get category and brand IDs
    electronics = await db.categories.find_one({"name": "Electronics"})
    techcorp = await db.brands.find_one({"name": "TechCorp"})
    
    # Create test products
    products = [
        {
            "name": "Laptop Pro",
            "description": "High-performance laptop",
            "price": 1299.99,
            "category": electronics["_id"],
            "brand": techcorp["_id"],
            "stock": 50,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Smartphone X",
            "description": "Latest smartphone",
            "price": 899.99,
            "category": electronics["_id"],
            "brand": techcorp["_id"],
            "stock": 100,
            "created_at": datetime.utcnow()
        }
    ]
    
    for product in products:
        await db.products.insert_one(product)
    print("Products created")
    
    print("\nTest data created successfully!")
    print(f"Admin login: admin@example.com / password")
    print(f"Category ID for testing: {electronics['_id']}")
    print(f"Brand ID for testing: {techcorp['_id']}")

if __name__ == "__main__":
    asyncio.run(create_test_data())