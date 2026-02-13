import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_auth():
    print("Testing auth flow...")
    
    # 1. Test Login
    login_data = {
        "email": "thedrumepic@gmail.com",
        "password": "password123" # I assumed this password based on previous resets, but user might have used another
    }
    
    try:
        print(f"Attempting login for {login_data['email']}...")
        r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status: {r.status_code}")
        if r.status_code == 200:
            token_data = r.json()
            print("Login success!")
            token = token_data["access_token"]
            
            # 2. Test Me
            headers = {"Authorization": f"Bearer {token}"}
            r_me = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            print(f"Me Status: {r_me.status_code}")
            if r_me.status_code == 200:
                print("Me Response:", r_me.json())
            else:
                print("Me Error:", r_me.text)
                
            # 3. Test Admin Stats
            r_stats = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
            print(f"Stats Status: {r_stats.status_code}")
            if r_stats.status_code == 200:
                print("Stats success!")
            else:
                print("Stats Error:", r_stats.text)
                
        else:
            print("Login Error:", r.text)
            
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_auth()
