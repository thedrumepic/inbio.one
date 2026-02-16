
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def seed():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['my_local_db'] # Default from server.py
    
    reserved = ["admin", "support", "root", "dev"]
    
    for username in reserved:
        # Check if exists
        existing = await db.reserved_usernames.find_one({"username": username})
        if not existing:
            await db.reserved_usernames.insert_one({
                "username": username,
                "comment": "System reserved",
                "created_at": "2024-01-01T00:00:00Z"
            })
            print(f"Inserted reserved username: {username}")
        else:
            print(f"Reserved username already exists: {username}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(seed())
