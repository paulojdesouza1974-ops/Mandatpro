#!/usr/bin/env python3
"""
KommunalCRM Backend API Testing
Tests all authentication and CRUD endpoints
"""

import requests
import sys
import json
from datetime import datetime

class KommunalCRMAPITester:
    def __init__(self, base_url="https://kommunal-logo-deploy.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.demo_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )
        return success and response.get('status') == 'healthy'

    def test_seed_demo_data(self):
        """Seed demo data"""
        success, response = self.run_test(
            "Seed Demo Data",
            "POST",
            "/api/seed-demo",
            200
        )
        return success

    def test_demo_login(self):
        """Test demo login"""
        success, response = self.run_test(
            "Demo Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.demo_user_id = response.get('user', {}).get('id')
            print(f"   Demo user ID: {self.demo_user_id}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        if not self.token:
            print("❌ No token available for auth/me test")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            f"/api/auth/me?authorization={self.token}",
            200
        )
        return success and 'email' in response

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/api/auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpass123",
                "full_name": "Test User",
                "city": "Test City",
                "role": "user"
            }
        )
        return success and 'token' in response

    def test_logout(self):
        """Test logout"""
        if not self.token:
            print("❌ No token available for logout test")
            return False
            
        success, response = self.run_test(
            "Logout",
            "POST",
            "/api/auth/logout",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            self.token = None  # Clear token after logout
        return success

    def test_users_list(self):
        """Test listing users"""
        success, response = self.run_test(
            "List Users",
            "GET",
            "/api/users",
            200
        )
        return success and isinstance(response, list)

    def test_organizations_crud(self):
        """Test organizations CRUD operations"""
        # Create organization
        org_data = {
            "name": f"test-org-{datetime.now().strftime('%H%M%S')}",
            "type": "fraktion",
            "city": "Test City"
        }
        
        success, create_response = self.run_test(
            "Create Organization",
            "POST",
            "/api/organizations",
            200,
            data=org_data
        )
        
        if not success or 'id' not in create_response:
            return False
            
        org_id = create_response['id']
        
        # Get organization
        success, get_response = self.run_test(
            "Get Organization",
            "GET",
            f"/api/organizations/{org_id}",
            200
        )
        
        if not success:
            return False
            
        # List organizations
        success, list_response = self.run_test(
            "List Organizations",
            "GET",
            "/api/organizations",
            200
        )
        
        if not success:
            return False
            
        # Update organization
        update_data = {"name": f"updated-org-{datetime.now().strftime('%H%M%S')}"}
        success, update_response = self.run_test(
            "Update Organization",
            "PUT",
            f"/api/organizations/{org_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
            
        # Delete organization
        success, delete_response = self.run_test(
            "Delete Organization",
            "DELETE",
            f"/api/organizations/{org_id}",
            200
        )
        
        return success

    def test_contacts_crud(self):
        """Test contacts CRUD operations"""
        contact_data = {
            "first_name": "Test",
            "last_name": "Contact",
            "email": "test.contact@example.com",
            "organization": "demo-org"
        }
        
        success, create_response = self.run_test(
            "Create Contact",
            "POST",
            "/api/contacts",
            200,
            data=contact_data
        )
        
        if not success or 'id' not in create_response:
            return False
            
        contact_id = create_response['id']
        
        # Get contact
        success, get_response = self.run_test(
            "Get Contact",
            "GET",
            f"/api/contacts/{contact_id}",
            200
        )
        
        return success

def main():
    """Run all tests"""
    print("🚀 Starting KommunalCRM Backend API Tests")
    print("=" * 50)
    
    tester = KommunalCRMAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Seed Demo Data", tester.test_seed_demo_data),
        ("Demo Login", tester.test_demo_login),
        ("Get Current User", tester.test_auth_me),
        ("User Registration", tester.test_user_registration),
        ("List Users", tester.test_users_list),
        ("Organizations CRUD", tester.test_organizations_crud),
        ("Contacts CRUD", tester.test_contacts_crud),
        ("Logout", tester.test_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())