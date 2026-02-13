import requests
import json
import os

BASE_URL = "http://localhost:8000/api"

def test_email_registration_flow():
    print("--- Testing Email Registration Flow ---")
    
    # 1. Check Username
    username = "testuser_api"
    print(f"Checking username: {username}")
    res = requests.post(f"{BASE_URL}/auth/check-username", json={"username": username})
    print(f"Check result: {res.json()}")
    if not res.json().get('available'):
        print("Username not available, maybe previous test leftovers?")
    
    # 2. Register
    email = "test_api@example.com"
    password = "password123"
    print(f"Registering with email: {email} and username: {username}")
    reg_data = {
        "email": email,
        "password": password,
        "username": username
    }
    res = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    print(f"Register status: {res.status_code}")
    print(f"Register response: {res.json()}")
    
    if res.status_code == 200:
        data = res.json()
        if data.get('username') == username:
            print("SUCCESS: Registration returned correct username.")
        else:
            print(f"FAILURE: Registration returned username: {data.get('username')}")
    else:
        print("FAILURE: Registration failed.")

def test_google_registration_logic_via_api():
    print("\n--- Testing Google Registration Logic ---")
    # We can't easily get a real token, but we can verify the backend handles the 'username' field
    # by sending a mock call (which might fail validation but we check the payload logic in server.py)
    # Actually, without a real token, id_token.verify will fail.
    # But we already reviewed the code in server.py and it handles data.username.
    print("Skipping actual Google token verification as it requires real Google interaction.")

if __name__ == "__main__":
    try:
        test_email_registration_flow()
    except Exception as e:
        print(f"Error during test: {e}")
