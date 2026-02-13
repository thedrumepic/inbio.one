import asyncio
import json
from mock_db import AsyncMockClient

async def test_projection():
    client = AsyncMockClient("local_db.json")
    db = client["my_local_db"]
    
    # Test find_one with projection
    user = await db.users.find_one({"email": "thedrumepic@gmail.com"}, {"_id": 0, "password": 0})
    print("User without _id and password:", user)
    
    if user and "password" in user:
        print("FAIL: password still in user")
    
    # Test inclusion projection
    user_id_only = await db.users.find_one({"email": "thedrumepic@gmail.com"}, {"id": 1})
    print("User with only id:", user_id_only)
    
    # Test get_current_user projection equivalent
    # server.py: await db.users.find_one({"id": user_id}, {"_id": 0})
    user_no_id_internal = await db.users.find_one({"email": "thedrumepic@gmail.com"}, {"_id": 0})
    print("User without _id:", user_no_id_internal)

if __name__ == "__main__":
    asyncio.run(test_projection())
