"""
Test file for KommunalCRM bug fixes verification
Tests: Motion Print View, Motion Type Change, Fraktionssitzungen, SMTP Test
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login with demo account and get auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@kommunalcrm.de", "password": "demo123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}

class TestMotionsAPI:
    """Test motions CRUD and type change"""
    
    def test_list_motions(self, auth_headers):
        """Test getting list of motions"""
        response = requests.get(
            f"{BASE_URL}/api/motions",
            headers=auth_headers,
            params={"organization": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} motions")
    
    def test_create_motion_with_type(self, auth_headers):
        """Test creating motion with specific type"""
        motion_data = {
            "title": "TEST_Type_Change_Motion",
            "organization": "demo-org",
            "type": "anfrage",  # Testing type field
            "status": "entwurf",
            "body": "Test body content",
            "priority": "mittel"
        }
        response = requests.post(
            f"{BASE_URL}/api/motions",
            headers=auth_headers,
            json=motion_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "anfrage"
        assert "id" in data
        print(f"Created motion with type 'anfrage': {data['id']}")
        return data["id"]
    
    def test_update_motion_type(self, auth_headers):
        """Test changing motion type"""
        # First create a motion
        create_resp = requests.post(
            f"{BASE_URL}/api/motions",
            headers=auth_headers,
            json={
                "title": "TEST_Motion_For_Type_Update",
                "organization": "demo-org",
                "type": "antrag"
            }
        )
        assert create_resp.status_code == 200
        motion_id = create_resp.json()["id"]
        
        # Update type to different value
        update_resp = requests.put(
            f"{BASE_URL}/api/motions/{motion_id}",
            headers=auth_headers,
            json={"type": "aenderungsantrag"}
        )
        assert update_resp.status_code == 200
        updated_data = update_resp.json()
        assert updated_data["type"] == "aenderungsantrag"
        print(f"Successfully changed motion type from 'antrag' to 'aenderungsantrag'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/motions/{motion_id}", headers=auth_headers)

class TestFractionMeetingsAPI:
    """Test fraction meetings endpoints"""
    
    def test_list_fraction_meetings(self, auth_headers):
        """Test getting list of fraction meetings"""
        response = requests.get(
            f"{BASE_URL}/api/fraction_meetings",
            headers=auth_headers,
            params={"organization": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} fraction meetings")
    
    def test_create_fraction_meeting(self, auth_headers):
        """Test creating a fraction meeting"""
        meeting_data = {
            "title": "TEST_Fraction_Meeting",
            "organization": "demo-org",
            "date": "2026-04-15T14:00:00.000Z",
            "location": "Rathaus",
            "agenda": "1. Begrüßung\n2. Berichte",
            "status": "geplant"
        }
        response = requests.post(
            f"{BASE_URL}/api/fraction_meetings",
            headers=auth_headers,
            json=meeting_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Fraction_Meeting"
        print(f"Created fraction meeting: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fraction_meetings/{data['id']}", headers=auth_headers)

class TestOrganizationAPI:
    """Test organization and member management"""
    
    def test_get_organization_members(self, auth_headers):
        """Test getting organization members"""
        response = requests.get(
            f"{BASE_URL}/api/organizations/demo-org/members",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} organization members")
        
        # Verify member structure
        if len(data) > 0:
            member = data[0]
            assert "id" in member
            assert "email" in member
            print(f"First member: {member.get('email', 'N/A')}")
    
    def test_get_organization_details(self, auth_headers):
        """Test getting organization details"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            headers=auth_headers,
            params={"name": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            org = data[0]
            print(f"Organization: {org.get('display_name', org.get('name'))}")

class TestSMTPEndpoint:
    """Test SMTP test endpoint"""
    
    def test_smtp_test_without_config(self, auth_headers):
        """Test SMTP endpoint returns proper error when not configured"""
        response = requests.post(
            f"{BASE_URL}/api/smtp/test",
            headers=auth_headers,
            json={
                "organization": "demo-org",
                "test_email": "test@example.com"
            }
        )
        # Should fail because SMTP is not configured for demo-org
        # Status 400 indicates SMTP not configured, which is expected
        assert response.status_code in [400, 500], f"Unexpected status: {response.status_code}"
        print(f"SMTP test properly returns error when not configured: {response.status_code}")

class TestPrintTemplates:
    """Test print templates for motion print view"""
    
    def test_list_print_templates(self, auth_headers):
        """Test getting print templates"""
        response = requests.get(
            f"{BASE_URL}/api/print_templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} print templates")

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_motions(self, auth_headers):
        """Remove test motions"""
        response = requests.get(
            f"{BASE_URL}/api/motions",
            headers=auth_headers,
            params={"organization": "demo-org"}
        )
        if response.status_code == 200:
            motions = response.json()
            for motion in motions:
                if motion.get("title", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/motions/{motion['id']}",
                        headers=auth_headers
                    )
                    print(f"Cleaned up test motion: {motion['title']}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
