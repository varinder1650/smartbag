from datetime import datetime
from bson import ObjectId

def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    
    # Convert ObjectId to string
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    
    # Convert other ObjectIds
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, list):
            # Handle lists of ObjectIds or dates
            doc[key] = [
                str(item) if isinstance(item, ObjectId) else 
                item.isoformat() if isinstance(item, datetime) else 
                item 
                for item in value
            ]
    
    return doc