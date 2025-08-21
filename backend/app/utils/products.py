from db.db_connection import get_connection
from dotenv import load_dotenv
import os
from db.db_manager import get_database

load_dotenv()

# client = get_connection()
# db = client[os.getenv('DB_NAME')]
db = get_database()

async def get_all_products():
    all_products = []
    cursor = await db.find_many('products',{})
    # print(cursor)
    for product in cursor:
        product['_id'] = str(product['_id'])
        all_products.append(product)
    return all_products