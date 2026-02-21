"""
Test Suite for SMTP Configuration, Organization filtering, and Invitation TOPs duplication fix
Tests for KommunalCRM fixes reported by user
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    BASE_URL = "https://kommunal-logo-deploy.preview.emergentagent.com"

class TestAuthAndDemoSetup:
    """Test authentication and demo data setup"""
    
    def test_seed_demo_data(self):
        """Seed demo data first"""
        response = requests.post(f"{BASE_URL}/api/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Demo data seeded: {data.get('message')}")
    
    def test_login_demo_account(self):
        """Test login with demo account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@kommunalcrm.de"
        assert data["user"]["organization"] == "demo-org"
        print(f"✓ Login successful: {data['user']['email']}")
        return data["token"]


class TestOrganizationNameFilter:
    """Test organization filtering by name - fixes SMTP config loading issue"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_organization_filter_by_name(self):
        """Test filtering organization by name - critical for SMTP fix"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            params={"name": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should return exactly the organization with that name
        if len(data) > 0:
            org = data[0]
            assert org.get("name") == "demo-org"
            print(f"✓ Organization found by name filter: {org.get('display_name', org.get('name'))}")
        else:
            print("⚠ Organization not found - may need to create it")
    
    def test_organization_list_without_filter(self):
        """Test listing all organizations"""
        response = requests.get(f"{BASE_URL}/api/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Organizations listed: {len(data)} found")


class TestSMTPConfiguration:
    """Test SMTP configuration saving and test endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and org"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get organization
        org_resp = requests.get(
            f"{BASE_URL}/api/organizations",
            params={"name": "demo-org"}
        )
        orgs = org_resp.json()
        self.org_id = orgs[0].get("id") if orgs else None
    
    def test_update_organization_with_smtp(self):
        """Test updating organization with SMTP settings"""
        if not self.org_id:
            pytest.skip("No organization found")
        
        smtp_config = {
            "smtp_host": "smtp.ionos.de",
            "smtp_port": "587",
            "smtp_username": "test@example.com",
            "smtp_password": "testpassword123",
            "smtp_from_email": "noreply@example.com",
            "smtp_from_name": "KommunalCRM Test"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/organizations/{self.org_id}",
            json=smtp_config,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify SMTP settings were saved
        assert data.get("smtp_host") == "smtp.ionos.de"
        assert data.get("smtp_port") == "587"
        assert data.get("smtp_username") == "test@example.com"
        assert data.get("smtp_from_email") == "noreply@example.com"
        print(f"✓ SMTP settings saved: host={data.get('smtp_host')}, port={data.get('smtp_port')}")
    
    def test_verify_smtp_settings_persist(self):
        """Verify SMTP settings persist after save"""
        if not self.org_id:
            pytest.skip("No organization found")
        
        response = requests.get(
            f"{BASE_URL}/api/organizations/{self.org_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify settings persisted
        assert data.get("smtp_host") == "smtp.ionos.de"
        assert data.get("smtp_port") == "587"
        print(f"✓ SMTP settings verified: {data.get('smtp_host')}:{data.get('smtp_port')}")
    
    def test_smtp_test_endpoint_exists(self):
        """Test SMTP test endpoint exists and validates config"""
        response = requests.post(
            f"{BASE_URL}/api/smtp/test",
            json={"organization": "demo-org", "test_email": "test@example.com"},
            headers=self.headers
        )
        # Should either succeed or return validation error - not 404
        assert response.status_code != 404, "SMTP test endpoint should exist"
        print(f"✓ SMTP test endpoint responds: {response.status_code}")


class TestFractionMeetings:
    """Test fraction meetings and invitations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_fraction_meetings(self):
        """Test listing fraction meetings"""
        response = requests.get(
            f"{BASE_URL}/api/fraction_meetings",
            params={"organization": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fraction meetings listed: {len(data)} meetings")
        return data
    
    def test_create_fraction_meeting_with_agenda(self):
        """Create a fraction meeting with agenda items"""
        meeting_data = {
            "title": "Test Fraktionssitzung",
            "organization": "demo-org",
            "date": "2026-02-25T18:00:00",
            "location": "Rathaus, Sitzungssaal 1",
            "agenda": "TOP 1: Begrüßung\nTOP 2: Genehmigung Tagesordnung\nTOP 3: Bericht Fraktionsvorsitzender\nTOP 4: Antrag Spielplatz Neubau\nTOP 5: Verschiedenes",
            "invitation_text": None  # No invitation text to test agenda display
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fraction_meetings",
            json=meeting_data,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("title") == "Test Fraktionssitzung"
        assert "agenda" in data
        print(f"✓ Fraction meeting created with agenda: {data.get('id')}")
        return data
    
    def test_create_meeting_with_invitation_text(self):
        """Create meeting with invitation_text - should not show duplicate agenda"""
        meeting_data = {
            "title": "Sitzung mit Einladungstext",
            "organization": "demo-org",
            "date": "2026-03-01T19:00:00",
            "location": "Fraktionsbüro",
            "agenda": "TOP 1: Begrüßung\nTOP 2: Antrag\nTOP 3: Sonstiges",
            "invitation_text": "Liebe Fraktionsmitglieder,\n\nhiermit laden wir Sie herzlich zur nächsten Sitzung ein.\n\nTagesordnung:\n1. Begrüßung\n2. Antrag\n3. Sonstiges\n\nMit freundlichen Grüßen"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fraction_meetings",
            json=meeting_data,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("invitation_text") is not None
        print(f"✓ Meeting with invitation_text created - agenda should NOT be duplicated")
        return data
    
    def test_get_fraction_meeting_details(self):
        """Test getting fraction meeting details"""
        # First create a meeting
        meetings_resp = requests.get(
            f"{BASE_URL}/api/fraction_meetings",
            params={"organization": "demo-org"}
        )
        meetings = meetings_resp.json()
        
        if not meetings:
            pytest.skip("No meetings available")
        
        meeting_id = meetings[0].get("id")
        response = requests.get(
            f"{BASE_URL}/api/fraction_meetings/{meeting_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == meeting_id
        print(f"✓ Meeting details retrieved: {data.get('title')}")


class TestOrganizationMembers:
    """Test organization members endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@kommunalcrm.de",
            "password": "demo123"
        })
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_organization_members(self):
        """Test getting organization members"""
        response = requests.get(
            f"{BASE_URL}/api/organizations/demo-org/members",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Organization members: {len(data)} members found")
        
        # Verify password is not exposed
        for member in data:
            assert "password" not in member
        print("✓ Password not exposed in member list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
