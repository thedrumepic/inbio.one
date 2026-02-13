import json
import os

DB_FILE = "..\\local_db.json" # Relative path from backend
DB_NAME = "my_local_db"

def delete_user_from_root_json(email):
    full_path = os.path.abspath(DB_FILE)
    if not os.path.exists(full_path):
        print(f"Database file {full_path} not found.")
        return

    with open(full_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Some local_db might not have the DB_NAME wrapper or structure might differ
    # Let's check structure based on size (small file)
    # If smaller file, maybe it holds different structure?
    # Let's assume standard structure for now or check.
    
    if DB_NAME in data:
        db = data[DB_NAME]
        users = db.get("users", [])
        # ... logic similar to before
        new_users = [u for u in users if u.get("email") != email]
        
        if len(users) != len(new_users):
             print(f"Removed user from {full_path}")
             data[DB_NAME]["users"] = new_users
             with open(full_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        else:
             print(f"User {email} not found in {full_path}")
    else:
        # Maybe direct array?
        print(f"Structure mismatch in {full_path}")

if __name__ == "__main__":
    delete_user_from_root_json("thedrumepic@gmail.com")
