"""
Test AI Generation Endpoints for KommunalCRM
Tests for:
- POST /api/ai/generate-email - Bulk email generation with AI
- POST /api/ai/generate-protocol - Meeting protocol generation with AI
- POST /api/ai/generate-invitation - Meeting invitation generation with AI
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kommunal-rebuild.preview.emergentagent.com').rstrip('/')

class TestHealthCheck:
    """Health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestAIEmailGeneration:
    """Tests for /api/ai/generate-email endpoint"""
    
    def test_generate_newsletter_email(self):
        """Test generating newsletter email with AI"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-email",
            json={"topic": "Newsletter", "organization_name": "Ortsverband Neustadt"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "subject" in data, "Response should contain 'subject'"
        assert "body" in data, "Response should contain 'body'"
        assert "success" in data, "Response should contain 'success'"
        
        # Verify content
        assert data["success"] == True
        assert len(data["subject"]) > 10, "Subject should have meaningful content"
        assert len(data["body"]) > 100, "Body should have meaningful content"
        print(f"✓ Newsletter email generated - Subject: {data['subject'][:50]}...")
    
    def test_generate_kreisparteitag_email(self):
        """Test generating Kreisparteitag invitation email"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-email",
            json={"topic": "Kreisparteitag-Einladung", "organization_name": "SPD Ortsverband"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert len(data["subject"]) > 5
        assert len(data["body"]) > 50
        print(f"✓ Kreisparteitag email generated - Subject: {data['subject'][:50]}...")
    
    def test_generate_custom_topic_email(self):
        """Test generating email with custom topic"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-email",
            json={"topic": "Sommerfest 2026", "organization_name": "Ortsverband"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert len(data["body"]) > 50
        print("✓ Custom topic email generated")
    
    def test_generate_email_without_organization(self):
        """Test generating email without organization name (should use default)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-email",
            json={"topic": "Stammtisch-Einladung"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print("✓ Email generated without organization name")


class TestAIProtocolGeneration:
    """Tests for /api/ai/generate-protocol endpoint"""
    
    def test_generate_meeting_protocol(self):
        """Test generating meeting protocol with AI"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-protocol",
            json={
                "prompt": "Erstelle ein Protokoll für die Fraktionssitzung am 15. März 2026 um 18:00 Uhr im Rathaus. Tagesordnung: 1. Begrüßung 2. Haushaltsdebatte 3. Verschiedenes"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "content" in data, "Response should contain 'content'"
        assert "success" in data, "Response should contain 'success'"
        
        # Verify content
        assert data["success"] == True
        assert len(data["content"]) > 100, "Protocol should have meaningful content"
        
        # Check for typical protocol elements
        content = data["content"].lower()
        assert any(word in content for word in ["protokoll", "sitzung", "tagesordnung"]), \
            "Protocol should contain typical German meeting terms"
        print(f"✓ Protocol generated - Length: {len(data['content'])} characters")
    
    def test_generate_protocol_with_details(self):
        """Test generating protocol with detailed notes"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-protocol",
            json={
                "prompt": "Protokoll für Vorstandssitzung. Anwesend: Max Müller, Petra Schmidt. TOP 1: Einstimmig genehmigt. TOP 2: Antrag XY mit 5:2 angenommen.",
                "context": "SPD Fraktion Musterstadt"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert len(data["content"]) > 50
        print("✓ Detailed protocol generated")


class TestAIInvitationGeneration:
    """Tests for /api/ai/generate-invitation endpoint"""
    
    def test_generate_meeting_invitation(self):
        """Test generating meeting invitation with AI"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-invitation",
            json={
                "prompt": "Erstelle eine Einladung zur Fraktionssitzung am 20. März 2026 um 19:00 Uhr im Sitzungssaal 1. Tagesordnung: 1. Begrüßung 2. Haushaltsberatung 3. Anträge"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "content" in data, "Response should contain 'content'"
        assert "success" in data, "Response should contain 'success'"
        
        # Verify content
        assert data["success"] == True
        assert len(data["content"]) > 100, "Invitation should have meaningful content"
        
        # Check for typical invitation elements
        content = data["content"].lower()
        assert any(word in content for word in ["einladung", "sitzung", "laden"]), \
            "Invitation should contain typical German invitation terms"
        print(f"✓ Invitation generated - Length: {len(data['content'])} characters")
    
    def test_generate_invitation_with_context(self):
        """Test generating invitation with context"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-invitation",
            json={
                "prompt": "Einladung zur Mitgliederversammlung am 1. April 2026",
                "context": "Wichtige Wahlen stehen an"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert len(data["content"]) > 50
        print("✓ Contextual invitation generated")


class TestEmailSendEndpoint:
    """Tests for /api/email/send-invitation endpoint (SIMULATED)"""
    
    def test_send_invitation_email(self):
        """Test sending invitation email (simulated)"""
        response = requests.post(
            f"{BASE_URL}/api/email/send-invitation",
            json={
                "to": ["test@example.com"],
                "subject": "Test Einladung",
                "body": "Dies ist eine Test-Einladung."
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "simulated" in data.get("message", "").lower() or "recipients" in data
        print("✓ Email send simulation successful")


class TestEdgeCases:
    """Edge case tests"""
    
    def test_empty_topic_email(self):
        """Test email generation with empty topic - should still work or return error"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-email",
            json={"topic": ""}
        )
        # Either works with empty or returns appropriate error
        assert response.status_code in [200, 400, 422]
        print("✓ Empty topic handled correctly")
    
    def test_long_prompt_protocol(self):
        """Test protocol generation with very long prompt"""
        long_prompt = "Protokoll der Sitzung. " * 100  # Very long prompt
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-protocol",
            json={"prompt": long_prompt}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Long prompt handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
