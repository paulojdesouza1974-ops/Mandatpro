#!/usr/bin/env python3
"""
Fraktionssitzungen Feature Testing
Tests all fraction meetings functionality including AI and email endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta

class FractionMeetingsAPITester:
    def __init__(self, base_url="https://kannst-du-besser.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.demo_user_id = None
        self.test_meeting_id = None

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
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 300:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: List with {len(response_data)} items")
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

    def setup_demo_login(self):
        """Login with demo credentials"""
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

    def test_fraction_meetings_crud(self):
        """Test fraction meetings CRUD operations"""
        # Create fraction meeting
        meeting_date = (datetime.now() + timedelta(days=7)).isoformat()
        meeting_data = {
            "title": f"Test Fraktionssitzung {datetime.now().strftime('%H%M%S')}",
            "organization": "demo-org",
            "date": meeting_date,
            "location": "Rathaus Sitzungssaal 1",
            "agenda": "1. Begrüßung\n2. Genehmigung des letzten Protokolls\n3. Berichte\n4. Anträge\n5. Verschiedenes",
            "attendees": ["demo@kommunalcrm.de", "test@example.com"],
            "status": "geplant"
        }
        
        success, create_response = self.run_test(
            "Create Fraction Meeting",
            "POST",
            "/api/fraction_meetings",
            200,
            data=meeting_data
        )
        
        if not success or 'id' not in create_response:
            return False
            
        self.test_meeting_id = create_response['id']
        
        # Get fraction meeting
        success, get_response = self.run_test(
            "Get Fraction Meeting",
            "GET",
            f"/api/fraction_meetings/{self.test_meeting_id}",
            200
        )
        
        if not success:
            return False
            
        # List fraction meetings
        success, list_response = self.run_test(
            "List Fraction Meetings",
            "GET",
            "/api/fraction_meetings?organization=demo-org",
            200
        )
        
        if not success:
            return False
            
        # Update fraction meeting
        update_data = {
            "status": "einladung_versendet",
            "invitation_text": "Sehr geehrte Damen und Herren,\n\nhiermit lade ich Sie herzlich zur nächsten Fraktionssitzung ein."
        }
        success, update_response = self.run_test(
            "Update Fraction Meeting",
            "PUT",
            f"/api/fraction_meetings/{self.test_meeting_id}",
            200,
            data=update_data
        )
        
        return success

    def test_ai_generate_protocol(self):
        """Test AI protocol generation endpoint"""
        if not self.test_meeting_id:
            print("❌ No test meeting available for protocol generation")
            return False
            
        protocol_prompt = f"""Erstelle ein professionelles Sitzungsprotokoll für folgende Fraktionssitzung:

SITZUNG: Test Fraktionssitzung
DATUM: {datetime.now().strftime('%d.%m.%Y %H:%M')}
ORT: Rathaus Sitzungssaal 1
ANWESEND: Max Mustermann, Test User

TAGESORDNUNG:
1. Begrüßung
2. Genehmigung des letzten Protokolls
3. Berichte
4. Anträge
5. Verschiedenes

NOTIZEN/STICHPUNKTE:
- TOP 1: Einstimmig genehmigt
- TOP 2: Antrag XY mit 5:2 angenommen
- TOP 3: Diskussion über Haushalt

Bitte erstelle ein vollständiges, formelles Sitzungsprotokoll."""

        success, response = self.run_test(
            "AI Generate Protocol",
            "POST",
            "/api/ai/generate-protocol",
            200,
            data={"prompt": protocol_prompt}
        )
        
        if success and response.get('success') and response.get('content'):
            print(f"   Generated protocol preview: {response['content'][:100]}...")
            return True
        return False

    def test_ai_generate_invitation(self):
        """Test AI invitation generation endpoint"""
        invitation_prompt = f"""Erstelle eine professionelle Einladung zu folgender Fraktionssitzung:

TITEL: Test Fraktionssitzung
DATUM: {(datetime.now() + timedelta(days=7)).strftime('%A, %d. %B %Y um %H:%M Uhr')}
ORT: Rathaus Sitzungssaal 1

TAGESORDNUNG:
1. Begrüßung
2. Genehmigung des letzten Protokolls
3. Berichte
4. Anträge
5. Verschiedenes

Die Einladung soll förmlich und professionell sein."""

        success, response = self.run_test(
            "AI Generate Invitation",
            "POST",
            "/api/ai/generate-invitation",
            200,
            data={"prompt": invitation_prompt}
        )
        
        if success and response.get('success') and response.get('content'):
            print(f"   Generated invitation preview: {response['content'][:100]}...")
            return True
        return False

    def test_send_invitation_email(self):
        """Test email sending endpoint (simulated)"""
        email_data = {
            "to": ["demo@kommunalcrm.de", "test@example.com"],
            "subject": "Einladung: Test Fraktionssitzung",
            "body": "Sehr geehrte Damen und Herren,\n\nhiermit lade ich Sie herzlich zur nächsten Fraktionssitzung ein.\n\nMit freundlichen Grüßen\nMax Mustermann",
            "attachment_base64": "JVBERi0xLjQKJcOkw7zDtsOgCjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0KQNP...",
            "attachment_filename": "Einladung_Test_Fraktionssitzung.pdf"
        }
        
        success, response = self.run_test(
            "Send Invitation Email",
            "POST",
            "/api/email/send-invitation",
            200,
            data=email_data
        )
        
        if success and response.get('success'):
            print(f"   Email sent to {len(email_data['to'])} recipients (simulated)")
            return True
        return False

    def test_pdf_generation_endpoints(self):
        """Test PDF generation endpoints"""
        # Test invitation PDF generation
        invitation_data = {
            "title": "Test Fraktionssitzung",
            "date": datetime.now().strftime('%d.%m.%Y %H:%M'),
            "location": "Rathaus Sitzungssaal 1",
            "agenda": "1. Begrüßung\n2. Genehmigung des letzten Protokolls\n3. Berichte",
            "invitation_text": "Sehr geehrte Damen und Herren,\n\nhiermit lade ich Sie herzlich ein.",
            "organization_name": "SPD Fraktion Musterstadt"
        }
        
        success, response = self.run_test(
            "Generate Invitation PDF",
            "POST",
            "/api/pdf/generate-invitation",
            200,
            data=invitation_data
        )
        
        if not success or 'html' not in response:
            return False
            
        # Test protocol PDF generation
        protocol_data = {
            "title": "Test Fraktionssitzung",
            "date": datetime.now().strftime('%d.%m.%Y %H:%M'),
            "location": "Rathaus Sitzungssaal 1",
            "agenda": "1. Begrüßung\n2. Genehmigung des letzten Protokolls\n3. Berichte",
            "protocol": "Protokoll der Sitzung vom...",
            "attendees": ["Max Mustermann", "Test User"]
        }
        
        success, response = self.run_test(
            "Generate Protocol PDF",
            "POST",
            "/api/pdf/generate-protocol",
            200,
            data=protocol_data
        )
        
        return success and 'html' in response

    def cleanup_test_data(self):
        """Clean up test meeting"""
        if self.test_meeting_id:
            success, response = self.run_test(
                "Delete Test Meeting",
                "DELETE",
                f"/api/fraction_meetings/{self.test_meeting_id}",
                200
            )
            return success
        return True

def main():
    """Run all Fraktionssitzungen tests"""
    print("🚀 Starting Fraktionssitzungen Feature Tests")
    print("=" * 60)
    
    tester = FractionMeetingsAPITester()
    
    # Test sequence
    tests = [
        ("Setup Demo Login", tester.setup_demo_login),
        ("Fraction Meetings CRUD", tester.test_fraction_meetings_crud),
        ("AI Generate Protocol", tester.test_ai_generate_protocol),
        ("AI Generate Invitation", tester.test_ai_generate_invitation),
        ("Send Invitation Email", tester.test_send_invitation_email),
        ("PDF Generation Endpoints", tester.test_pdf_generation_endpoints),
        ("Cleanup Test Data", tester.cleanup_test_data),
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
    print(f"\n{'='*60}")
    print(f"📊 FRAKTIONSSITZUNGEN TEST RESULTS")
    print(f"{'='*60}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All Fraktionssitzungen tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())