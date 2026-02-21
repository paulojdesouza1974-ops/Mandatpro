"""
Test SendGrid email fix and core features for KommunalCRM
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSendGridFix:
    """Tests for the SendGrid email fix - P0 bug"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login and get token
        login_response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = self.session.get(f"{self.base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health endpoint returns healthy status")
        
    def test_seed_demo_endpoint(self):
        """Test seed-demo endpoint"""
        response = self.session.post(f"{self.base_url}/api/seed-demo")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True or data.get("skipped") == True
        print(f"PASS: Seed demo endpoint - {data.get('message', 'OK')}")
        
    def test_demo_login_fraktion(self):
        """Test demo login for Fraktion"""
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@kommunalcrm.de"
        print("PASS: Demo Fraktion login works")
        
    def test_demo_login_verband(self):
        """Test demo login for Verband"""
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo-verband@kommunalcrm.de", "password": "demo123"}
        )
        # May return 401 if not seeded
        if response.status_code == 401:
            # Seed full demo first
            self.session.post(f"{self.base_url}/api/seed-full-demo")
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": "demo-verband@kommunalcrm.de", "password": "demo123"}
            )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("PASS: Demo Verband login works")
        
    def test_sendgrid_email_sending(self):
        """Test SendGrid email sending via /api/email/send-invitation - P0 FIX VERIFICATION"""
        response = self.session.post(
            f"{self.base_url}/api/email/send-invitation",
            json={
                "to": ["test-sendgrid@example.com"],
                "subject": "Test: SendGrid Fix Verification",
                "body": "This is a test email to verify the SendGrid fix is working correctly.\n\nThe verified sender info@mandatpro.de should be used."
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "Einladung an 1 Empfänger gesendet" in data.get("message", "")
        print("PASS: SendGrid email sending works with verified sender (P0 FIX VERIFIED)")
        
    def test_sendgrid_email_multiple_recipients(self):
        """Test SendGrid email with multiple recipients"""
        response = self.session.post(
            f"{self.base_url}/api/email/send-invitation",
            json={
                "to": ["test1@example.com", "test2@example.com"],
                "subject": "Test: Multiple Recipients",
                "body": "Testing multiple recipient email sending."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert len(data.get("recipients", [])) == 2
        print("PASS: SendGrid email with multiple recipients works")


class TestFractionMeetings:
    """Tests for Fraktionssitzungen feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        
    def test_create_fraction_meeting(self):
        """Test creating a fraction meeting"""
        response = self.session.post(
            f"{self.base_url}/api/fraction_meetings",
            json={
                "title": "TEST_Fraktionssitzung März 2026",
                "organization": "demo-org",
                "date": "2026-03-15T18:00:00",
                "location": "Rathaus, Sitzungssaal 1",
                "agenda": "1. Begrüßung\n2. Berichte\n3. Anträge\n4. Verschiedenes",
                "status": "geplant"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Fraktionssitzung März 2026"
        print(f"PASS: Created fraction meeting with ID: {data['id']}")
        return data["id"]
        
    def test_get_fraction_meetings(self):
        """Test listing fraction meetings"""
        response = self.session.get(
            f"{self.base_url}/api/fraction_meetings",
            params={"organization": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} fraction meetings")


class TestAIFeatures:
    """Tests for AI features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        
    def test_ai_generate_invitation(self):
        """Test AI invitation generation"""
        response = self.session.post(
            f"{self.base_url}/api/ai/generate-invitation",
            json={
                "prompt": "Erstelle eine Einladung zur Fraktionssitzung am 15. März 2026 um 18:00 Uhr im Rathaus."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "content" in data
        assert len(data["content"]) > 50  # Should have substantial content
        print("PASS: AI invitation generation works")
        
    def test_ai_generate_protocol(self):
        """Test AI protocol generation"""
        response = self.session.post(
            f"{self.base_url}/api/ai/generate-protocol",
            json={
                "prompt": "Erstelle ein Protokoll für die Fraktionssitzung: Anwesend waren 8 Mitglieder, TOP 1 einstimmig angenommen."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "content" in data
        print("PASS: AI protocol generation works")


class TestMemberManagement:
    """Tests for Member and Role management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        
    def test_get_organization_members(self):
        """Test getting organization members"""
        response = self.session.get(f"{self.base_url}/api/organizations/demo-org/members")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "email" in data[0]
            assert "password" not in data[0]  # Password should not be exposed
        print(f"PASS: Got {len(data)} organization members")
        

class TestSupportTickets:
    """Tests for Support Ticket system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": "demo@kommunalcrm.de", "password": "demo123"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        
    def test_create_support_ticket(self):
        """Test creating a support ticket"""
        response = self.session.post(
            f"{self.base_url}/api/support_tickets",
            json={
                "organization": "demo-org",
                "subject": "TEST_Support Anfrage",
                "message": "Dies ist eine Test-Support-Anfrage",
                "priority": "mittel",
                "status": "offen"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"PASS: Created support ticket with ID: {data['id']}")
        
    def test_get_support_tickets(self):
        """Test listing support tickets"""
        response = self.session.get(
            f"{self.base_url}/api/support_tickets",
            params={"organization": "demo-org"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} support tickets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
