import asyncio
import os
from server import db # Import the actual db instance from server.py

async def upgrade_user():
    email = "thedrumepic@gmail.com"
    print(f"Attempting to upgrade user: {email}")
    
    # Update in whatever DB is being used (Mongo or Mock)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"role": "admin"}}
    )
    
    if result:
        print(f"Successfully updated user in database.")
    else:
        print(f"Failed to update user or user not found.")

if __name__ == "__main__":
    asyncio.run(upgrade_user())
