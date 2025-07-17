from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, client: AsyncIOMotorClient, db_name: str):
        self.client = client
        self.db = client[db_name]

    async def find_one(self, collection: str, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find one document in collection"""
        try:
            result = await self.db[collection].find_one(filter_dict)
            return result
        except Exception as e:
            logger.error(f"Error finding document in {collection}: {e}")
            raise

    async def find_many(self, collection: str, filter_dict: Dict[str, Any] = None, 
                       skip: int = 0, limit: int = 0, sort: List = None) -> List[Dict[str, Any]]:
        """Find multiple documents in collection"""
        try:
            cursor = self.db[collection].find(filter_dict or {})
            
            if sort:
                cursor = cursor.sort(sort)
            
            if skip:
                cursor = cursor.skip(skip)
            
            if limit:
                cursor = cursor.limit(limit)
            
            results = await cursor.to_list(length=None)
            return results
        except Exception as e:
            logger.error(f"Error finding documents in {collection}: {e}")
            raise

    async def insert_one(self, collection: str, document: Dict[str, Any]) -> str:
        """Insert one document into collection"""
        try:
            result = await self.db[collection].insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error inserting document in {collection}: {e}")
            raise

    async def insert_many(self, collection: str, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents into collection"""
        try:
            result = await self.db[collection].insert_many(documents)
            return [str(id) for id in result.inserted_ids]
        except Exception as e:
            logger.error(f"Error inserting documents in {collection}: {e}")
            raise

    async def update_one(self, collection: str, filter_dict: Dict[str, Any], 
                        update_dict: Dict[str, Any]) -> bool:
        """Update one document in collection"""
        try:
            result = await self.db[collection].update_one(filter_dict, {"$set": update_dict})
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating document in {collection}: {e}")
            raise

    async def update_many(self, collection: str, filter_dict: Dict[str, Any], 
                         update_dict: Dict[str, Any]) -> int:
        """Update multiple documents in collection"""
        try:
            result = await self.db[collection].update_many(filter_dict, {"$set": update_dict})
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating documents in {collection}: {e}")
            raise

    async def delete_one(self, collection: str, filter_dict: Dict[str, Any]) -> bool:
        """Delete one document from collection"""
        try:
            result = await self.db[collection].delete_one(filter_dict)
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting document from {collection}: {e}")
            raise

    async def delete_many(self, collection: str, filter_dict: Dict[str, Any]) -> int:
        """Delete multiple documents from collection"""
        try:
            result = await self.db[collection].delete_many(filter_dict)
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting documents from {collection}: {e}")
            raise

    async def count_documents(self, collection: str, filter_dict: Dict[str, Any] = None) -> int:
        """Count documents in collection"""
        try:
            return await self.db[collection].count_documents(filter_dict or {})
        except Exception as e:
            logger.error(f"Error counting documents in {collection}: {e}")
            raise

    async def aggregate(self, collection: str, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform aggregation on collection"""
        try:
            cursor = self.db[collection].aggregate(pipeline)
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error performing aggregation on {collection}: {e}")
            raise

def get_database() -> DatabaseManager:
    """Get database manager instance"""
    from main import client
    return DatabaseManager(client, "blinkit_clone") 