#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Bio-Link Platform
Tests all endpoints: auth, pages, blocks, events, showcases, music, upload
"""

import requests
import sys
import json
from datetime import datetime
import time

class BioLinkAPITester:
    def __init__(self, base_url="https://740dd358-8e93-413f-bf98-aaa7867f5b84.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.test_page_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, files=files, timeout=30)
                else:
                    # Use longer timeout for music resolve endpoint
                    timeout_val = 30 if 'music/resolve' in endpoint else 10
                    response = requests.post(url, json=data, headers=headers, timeout=timeout_val)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json() if response.content else {}
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True)
                    return True, {}
            else:
                try:
                    error_data = response.json() if response.content else {}
                    self.log_test(name, False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Status {response.status_code}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test username availability check
        success, _ = self.run_test(
            "Check username availability",
            "POST",
            "auth/check-username",
            200,
            {"username": f"testuser_{int(time.time())}"}
        )
        
        # Test registration
        test_email = f"test_{int(time.time())}@example.com"
        test_username = f"testuser_{int(time.time())}"
        
        success, response = self.run_test(
            "User registration",
            "POST",
            "auth/register",
            200,
            {
                "email": test_email,
                "password": "testpass123",
                "username": test_username
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user_id']
            print(f"   📝 Registered user: {test_email}")
        
        # Test login
        success, response = self.run_test(
            "User login",
            "POST",
            "auth/login",
            200,
            {
                "email": test_email,
                "password": "testpass123"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Login successful")

    def test_pages_endpoints(self):
        """Test pages endpoints"""
        print("\n📄 Testing Pages Endpoints...")
        
        if not self.token:
            print("❌ Skipping pages tests - no auth token")
            return
        
        # Get user pages
        success, pages = self.run_test(
            "Get user pages",
            "GET",
            "pages",
            200
        )
        
        # Create a new page
        test_username = f"testpage_{int(time.time())}"
        success, response = self.run_test(
            "Create new page",
            "POST",
            "pages",
            200,
            {
                "username": test_username,
                "name": "Test Page",
                "bio": "This is a test bio"
            }
        )
        
        if success and 'id' in response:
            self.test_page_id = response['id']
            print(f"   📝 Created page: {test_username}")
        
        # Get page by username (public endpoint)
        if self.test_page_id:
            success, _ = self.run_test(
                "Get page by username (public)",
                "GET",
                f"pages/{test_username}",
                200
            )
        
        # Update page
        if self.test_page_id:
            success, _ = self.run_test(
                "Update page",
                "PATCH",
                f"pages/{self.test_page_id}",
                200,
                {
                    "name": "Updated Test Page",
                    "bio": "Updated bio"
                }
            )

    def test_blocks_endpoints(self):
        """Test blocks endpoints"""
        print("\n🧱 Testing Blocks Endpoints...")
        
        if not self.token or not self.test_page_id:
            print("❌ Skipping blocks tests - no auth token or page ID")
            return
        
        # Create link block
        success, link_block = self.run_test(
            "Create link block",
            "POST",
            "blocks",
            200,
            {
                "page_id": self.test_page_id,
                "block_type": "link",
                "content": {
                    "title": "Test Link",
                    "url": "https://example.com",
                    "icon": "🔗"
                },
                "order": 1
            }
        )
        
        # Create text block
        success, text_block = self.run_test(
            "Create text block",
            "POST",
            "blocks",
            200,
            {
                "page_id": self.test_page_id,
                "block_type": "text",
                "content": {
                    "text": "This is a test text block"
                },
                "order": 2
            }
        )
        
        # Update block
        if link_block and 'id' in link_block:
            success, _ = self.run_test(
                "Update block",
                "PATCH",
                f"blocks/{link_block['id']}",
                200,
                {
                    "content": {
                        "title": "Updated Link",
                        "url": "https://updated.com"
                    }
                }
            )

    def test_events_endpoints(self):
        """Test events endpoints"""
        print("\n📅 Testing Events Endpoints...")
        
        if not self.token or not self.test_page_id:
            print("❌ Skipping events tests - no auth token or page ID")
            return
        
        # Create event
        success, event = self.run_test(
            "Create event",
            "POST",
            "events",
            200,
            {
                "page_id": self.test_page_id,
                "title": "Test Event",
                "date": "2025-12-31",
                "description": "Test event description",
                "button_text": "Learn More",
                "button_url": "https://example.com/event"
            }
        )
        
        # Update event
        if event and 'id' in event:
            success, _ = self.run_test(
                "Update event",
                "PATCH",
                f"events/{event['id']}",
                200,
                {
                    "title": "Updated Event",
                    "description": "Updated description"
                }
            )

    def test_showcases_endpoints(self):
        """Test showcases endpoints"""
        print("\n🛍️ Testing Showcases Endpoints...")
        
        if not self.token or not self.test_page_id:
            print("❌ Skipping showcases tests - no auth token or page ID")
            return
        
        # Create showcase
        success, showcase = self.run_test(
            "Create showcase",
            "POST",
            "showcases",
            200,
            {
                "page_id": self.test_page_id,
                "title": "Test Product",
                "price": "$19.99",
                "button_text": "Buy Now",
                "button_url": "https://example.com/buy"
            }
        )
        
        # Update showcase
        if showcase and 'id' in showcase:
            success, _ = self.run_test(
                "Update showcase",
                "PATCH",
                f"showcases/{showcase['id']}",
                200,
                {
                    "title": "Updated Product",
                    "price": "$29.99"
                }
            )

    def test_music_endpoints(self):
        """Test music/Odesli endpoints"""
        print("\n🎵 Testing Music/Odesli Endpoints...")
        
        # Test music resolution with Spotify URL
        success, response = self.run_test(
            "Resolve music link (Spotify)",
            "POST",
            "music/resolve",
            200,
            {
                "url": "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
                "mode": "auto"
            }
        )
        
        if success:
            print(f"   🎵 Music resolution: {response.get('success', False)}")

    def test_upload_endpoints(self):
        """Test upload endpoints"""
        print("\n📤 Testing Upload Endpoints...")
        
        if not self.token:
            print("❌ Skipping upload tests - no auth token")
            return
        
        # Create a proper test image using PIL
        from PIL import Image
        from io import BytesIO
        
        img = Image.new('RGB', (100, 100), color='red')
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_data = img_buffer.getvalue()
        
        # Test image upload
        files = {'file': ('test.png', BytesIO(img_data), 'image/png')}
        success, response = self.run_test(
            "Upload image",
            "POST",
            "upload",
            200,
            files=files
        )
        
        if success and 'url' in response:
            print(f"   📷 Image uploaded successfully")

    def test_password_change(self):
        """Test password change"""
        print("\n🔒 Testing Password Change...")
        
        if not self.token:
            print("❌ Skipping password change test - no auth token")
            return
        
        success, _ = self.run_test(
            "Change password",
            "POST",
            "auth/change-password",
            200,
            {
                "current_password": "testpass123",
                "new_password": "newpass123"
            }
        )

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.token and self.test_page_id:
            success, _ = self.run_test(
                "Delete test page",
                "DELETE",
                f"pages/{self.test_page_id}",
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Bio-Link Platform API Tests")
        print(f"📡 Testing API: {self.base_url}")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_auth_endpoints()
        self.test_pages_endpoints()
        self.test_blocks_endpoints()
        self.test_events_endpoints()
        self.test_showcases_endpoints()
        self.test_music_endpoints()
        self.test_upload_endpoints()
        self.test_password_change()
        self.cleanup_test_data()
        
        end_time = time.time()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"⏱️  Total time: {end_time - start_time:.2f}s")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

def main():
    tester = BioLinkAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())