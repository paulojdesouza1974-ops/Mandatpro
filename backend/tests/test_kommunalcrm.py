"""
KommunalCRM Backend API Tests
Testing: Authentication, Registration, User Profile, Contacts CRUD
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://local-gov-hub-2.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_seed_demo_data(self):
        """Test seeding demo data"""
        response = requests.post(f"{BASE_URL}/api/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Demo data seeded: {data}")
    
    def test_demo_login(self):
        """Test demo user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@kommunalcrm.de"
        print(f"✅ Demo login successful, token received")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✅ Invalid login correctly rejected")


class TestRegistration:
    """User registration tests"""
    
    @pytest.fixture
    def unique_email(self):
        """Generate unique email for registration tests"""
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"test_reg_{suffix}@example.com"
    
    def test_registration_success(self, unique_email):
        """Test successful user registration with all required fields"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "full_name": "Test Registration User",
            "organization": "test-org",
            "org_type": "fraktion",
            "role": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["full_name"] == "Test Registration User"
        assert data["user"]["org_type"] == "fraktion"
        print(f"✅ Registration successful for {unique_email}")
    
    def test_registration_with_verband_type(self):
        """Test registration with Verband organization type"""
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"test_verband_{suffix}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "testpass123",
            "full_name": "Verband Test User",
            "organization": "verband-test-org",
            "org_type": "verband",
            "role": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["org_type"] == "verband"
        print(f"✅ Verband registration successful for {email}")
    
    def test_registration_duplicate_email(self):
        """Test registration with duplicate email fails"""
        # First seed demo data to ensure demo user exists
        requests.post(f"{BASE_URL}/api/seed-demo")
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "demo@kommunalcrm.de",
            "password": "newpassword",
            "full_name": "Duplicate User",
            "organization": "any-org"
        })
        assert response.status_code == 400
        print(f"✅ Duplicate email registration correctly rejected")


class TestUserProfile:
    """User profile tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        # Seed demo data first
        requests.post(f"{BASE_URL}/api/seed-demo")
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_get_current_user(self, auth_token):
        """Test getting current user profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "demo@kommunalcrm.de"
        print(f"✅ Retrieved current user: {data['email']}")
    
    def test_update_user_profile(self, auth_token):
        """Test updating user profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update profile
        update_data = {
            "full_name": "Max Mustermann Updated",
            "phone": "+49 123 9999999",
            "party": "SPD",
            "city": "Berlin"
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/me", headers=headers, json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "+49 123 9999999"
        print(f"✅ Profile updated successfully")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["phone"] == "+49 123 9999999"
        print(f"✅ Profile update persisted correctly")
    
    def test_change_org_type(self, auth_token):
        """Test changing organization type between Fraktion and Verband"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Change to Verband
        response = requests.put(f"{BASE_URL}/api/auth/me", headers=headers, json={
            "org_type": "verband"
        })
        assert response.status_code == 200
        assert response.json()["org_type"] == "verband"
        print(f"✅ Changed to Verband")
        
        # Change back to Fraktion
        response = requests.put(f"{BASE_URL}/api/auth/me", headers=headers, json={
            "org_type": "fraktion"
        })
        assert response.status_code == 200
        assert response.json()["org_type"] == "fraktion"
        print(f"✅ Changed back to Fraktion")


class TestContacts:
    """Contacts CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        requests.post(f"{BASE_URL}/api/seed-demo")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        if response.status_code == 200:
            token = response.json()["token"]
            return {"Authorization": f"Bearer {token}"}
        pytest.skip("Could not authenticate")
    
    def test_create_contact(self, auth_headers):
        """Test creating a new contact"""
        suffix = ''.join(random.choices(string.digits, k=4))
        contact_data = {
            "first_name": f"Test{suffix}",
            "last_name": "Contact",
            "email": f"test{suffix}@example.com",
            "organization": "demo-org",
            "category": "buerger",
            "status": "aktiv"
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["first_name"] == f"Test{suffix}"
        print(f"✅ Contact created: {data['first_name']} {data['last_name']}")
        return data["id"]
    
    def test_list_contacts(self, auth_headers):
        """Test listing contacts"""
        response = requests.get(f"{BASE_URL}/api/contacts", params={"organization": "demo-org"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} contacts")
    
    def test_update_contact(self, auth_headers):
        """Test updating a contact"""
        # Create contact first
        suffix = ''.join(random.choices(string.digits, k=4))
        create_response = requests.post(f"{BASE_URL}/api/contacts", json={
            "first_name": f"Update{suffix}",
            "last_name": "Test",
            "organization": "demo-org"
        })
        contact_id = create_response.json()["id"]
        
        # Update it
        update_response = requests.put(f"{BASE_URL}/api/contacts/{contact_id}", json={
            "first_name": f"Updated{suffix}",
            "phone": "+49 555 1234"
        })
        assert update_response.status_code == 200
        assert update_response.json()["first_name"] == f"Updated{suffix}"
        print(f"✅ Contact updated successfully")
    
    def test_delete_contact(self, auth_headers):
        """Test deleting a contact"""
        # Create contact first
        suffix = ''.join(random.choices(string.digits, k=4))
        create_response = requests.post(f"{BASE_URL}/api/contacts", json={
            "first_name": f"Delete{suffix}",
            "last_name": "Me",
            "organization": "demo-org"
        })
        contact_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/contacts/{contact_id}")
        assert delete_response.status_code == 200
        print(f"✅ Contact deleted successfully")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/contacts/{contact_id}")
        assert get_response.status_code == 404
        print(f"✅ Deletion verified - contact not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
