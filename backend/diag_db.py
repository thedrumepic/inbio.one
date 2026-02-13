import json
import os

def check_db():
    filepath = "local_db.json"
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        users = data.get("my_local_db", {}).get("users", [])
        print(f"Total users found: {len(users)}")
        for i, user in enumerate(users):
            print(f"User {i+1}:")
            print(f"  ID: {user.get('id')}")
            print(f"  Email: {user.get('email')}")
            print(f"  Role: {user.get('role', 'NOT SET (default user)')}")
            print(f"  Google: {user.get('google_auth', False)}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error reading DB: {e}")

if __name__ == "__main__":
    check_db()
