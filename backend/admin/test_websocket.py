# test_websocket.py
import asyncio
import websockets
import json
from datetime import datetime

async def test_admin_websocket():
    uri = "ws://localhost:8000/admin/ws"
    
    async with websockets.connect(uri) as websocket:
        # Test 1: Authentication
        print("Testing authentication...")
        auth_data = {
            "email": "admin@test.com",
            "password": "password"
        }
        await websocket.send(json.dumps(auth_data))
        
        response = await websocket.recv()
        auth_response = json.loads(response)
        print(f"Auth response: {auth_response['type']}")
        
        if auth_response['type'] != 'auth_success':
            print("Authentication failed!")
            return
        
        # Test 2: Subscribe to products
        print("\nTesting product subscription...")
        await websocket.send(json.dumps({
            "type": "subscribe",
            "channel": "products"
        }))
        
        # Test 3: Get products
        print("\nGetting products...")
        await websocket.send(json.dumps({
            "type": "get_products"
        }))
        
        products_response = await websocket.recv()
        products_data = json.loads(products_response)
        print(f"Received {len(products_data.get('products', []))} products")
        
        # Test 4: Create product
        print("\nCreating product...")
        new_product = {
            "type": "create_product",
            "data": {
                "name": f"Test Product {datetime.now().isoformat()}",
                "description": "Test product created via WebSocket",
                "price": 99.99,
                "category": "507f1f77bcf86cd799439011",  # Replace with actual ID
                "brand": "507f1f77bcf86cd799439012",     # Replace with actual ID
                "stock": 100
            }
        }
        await websocket.send(json.dumps(new_product))
        
        create_response = await websocket.recv()
        create_data = json.loads(create_response)
        print(f"Product created: {create_data.get('type')}")
        
        # Test 5: Ping/Pong
        print("\nTesting ping/pong...")
        await websocket.send(json.dumps({"type": "ping"}))
        pong_response = await websocket.recv()
        pong_data = json.loads(pong_response)
        print(f"Ping response: {pong_data['type']}")
        
        # Keep connection open to receive broadcasts
        print("\nListening for broadcasts...")
        for i in range(5):
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"Broadcast received: {json.loads(message)['type']}")
            except asyncio.TimeoutError:
                pass
        
        # Test 6: Logout
        print("\nLogging out...")
        await websocket.send(json.dumps({"type": "logout"}))

if __name__ == "__main__":
    asyncio.run(test_admin_websocket())