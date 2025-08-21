def fix_mongo_types(doc):
    from bson import ObjectId
    if isinstance(doc, dict):
        return {k: fix_mongo_types(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [fix_mongo_types(i) for i in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc 