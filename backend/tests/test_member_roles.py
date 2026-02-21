"""
Test suite for Member and Role Management in KommunalCRM
Tests the following features:
- GET /api/organizations/{org_name}/members - Get organization members
- PUT /api/users/{user_id}/role - Update user's org_role
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kommunal-logo-deploy.preview.emergentagent.com')

# Test constants
DEMO_EMAIL = "demo@kommunalcrm.de"
DEMO_PASSWORD = "demo123"
DEMO_ORG = "demo-org"

# Valid German role values
VALID_ROLES = [
    "fraktionsvorsitzender",
    "stv_fraktionsvorsitzender",
    "fraktionsgeschaeftsfuehrer",
    "ratsmitglied",
    "sachkundiger_buerger",
    "mitglied"
]


class TestMemberRoleManagement:
    """Test suite for member and role management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup before each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_login_with_demo_account(self, api_client):
        """Test login with demo account credentials"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        assert data["user"]["role"] == "admin"  # Demo user is admin
        print(f"✅ Login successful for {DEMO_EMAIL}")
    
    def test_get_organization_members(self):
        """Test GET /api/organizations/{org_name}/members endpoint"""
        response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0
        
        # Verify member structure
        for member in members:
            assert "id" in member
            assert "email" in member
            assert "organization" in member
            assert member["organization"] == DEMO_ORG
            # full_name may or may not exist
            print(f"  - Member: {member.get('full_name', member['email'])}, org_role: {member.get('org_role', 'none')}")
        
        print(f"✅ Found {len(members)} members in {DEMO_ORG}")
        return members
    
    def test_update_user_role(self):
        """Test PUT /api/users/{user_id}/role endpoint"""
        # First get members to get a user ID
        members_response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        members = members_response.json()
        assert len(members) > 0
        
        user_id = members[0]["id"]
        original_role = members[0].get("org_role", "mitglied")
        
        # Change role to a different value
        new_role = "ratsmitglied" if original_role != "ratsmitglied" else "mitglied"
        
        response = self.client.put(
            f"{BASE_URL}/api/users/{user_id}/role",
            headers=self.headers,
            json={"org_role": new_role}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["org_role"] == new_role
        print(f"✅ Role updated from '{original_role}' to '{new_role}'")
        
        # Restore original role
        restore_response = self.client.put(
            f"{BASE_URL}/api/users/{user_id}/role",
            headers=self.headers,
            json={"org_role": original_role}
        )
        assert restore_response.status_code == 200
        print(f"✅ Role restored to '{original_role}'")
    
    def test_role_change_persists(self):
        """Test that role change persists in database"""
        # Get initial member data
        initial_response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        members = initial_response.json()
        user_id = members[0]["id"]
        original_role = members[0].get("org_role", "mitglied")
        
        # Change role
        test_role = "sachkundiger_buerger"
        self.client.put(
            f"{BASE_URL}/api/users/{user_id}/role",
            headers=self.headers,
            json={"org_role": test_role}
        )
        
        # Fetch members again to verify persistence
        verify_response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        updated_members = verify_response.json()
        updated_user = next(m for m in updated_members if m["id"] == user_id)
        assert updated_user["org_role"] == test_role
        print(f"✅ Role change persisted: {test_role}")
        
        # Restore original role
        self.client.put(
            f"{BASE_URL}/api/users/{user_id}/role",
            headers=self.headers,
            json={"org_role": original_role}
        )
        print(f"✅ Role restored to original: {original_role}")
    
    def test_all_valid_roles(self):
        """Test that all valid German role values work"""
        # Get a user to test with
        members_response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        members = members_response.json()
        user_id = members[0]["id"]
        original_role = members[0].get("org_role", "mitglied")
        
        # Test each valid role
        for role in VALID_ROLES:
            response = self.client.put(
                f"{BASE_URL}/api/users/{user_id}/role",
                headers=self.headers,
                json={"org_role": role}
            )
            assert response.status_code == 200
            assert response.json()["org_role"] == role
            print(f"  ✅ Role '{role}' works")
        
        # Restore original role
        self.client.put(
            f"{BASE_URL}/api/users/{user_id}/role",
            headers=self.headers,
            json={"org_role": original_role}
        )
        print(f"✅ All {len(VALID_ROLES)} valid roles work correctly")
    
    def test_members_list_shows_name_and_email(self):
        """Test that member list contains name and email fields"""
        response = self.client.get(
            f"{BASE_URL}/api/organizations/{DEMO_ORG}/members",
            headers=self.headers
        )
        assert response.status_code == 200
        members = response.json()
        
        for member in members:
            # Check email is present (required)
            assert "email" in member
            assert member["email"] is not None
            # full_name should be present for demo user
            if member["email"] == DEMO_EMAIL:
                assert "full_name" in member
                assert member["full_name"] == "Max Mustermann"
        
        print(f"✅ Member list contains required name and email fields")
    
    def test_nonexistent_user_role_update(self):
        """Test updating role of nonexistent user returns 404"""
        response = self.client.put(
            f"{BASE_URL}/api/users/000000000000000000000000/role",
            headers=self.headers,
            json={"org_role": "mitglied"}
        )
        assert response.status_code == 404
        print(f"✅ Nonexistent user returns 404 as expected")


# ========== FIXTURES ==========

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for demo user"""
    # First seed demo data
    api_client.post(f"{BASE_URL}/api/seed-demo")
    
    # Login
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
