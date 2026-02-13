import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "my_local_db")

async def delete_user(email):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    users = db.users
    pages = db.pages

    user = await users.find_one({"email": email})
    if user:
        print(f"Found user: {user.get('email')} (ID: {user.get('id')})")
        # Delete user
        result_user = await users.delete_one({"_id": user["_id"]})
        # Delete page associated with user
        result_page = await pages.delete_many({"user_id": user["id"]})
        print(f"Deleted user count: {result_user.deleted_count}")
        print(f"Deleted pages count: {result_page.deleted_count}")
        print(f"User {email} and their data deleted.")
    else:
        print(f"User {email} not found.")
    
    client.close()

if __name__ == "__main__":
    email_to_delete = "thedrumepic@gmail.com"
    asyncio.run(delete_user(email_to_delete))
