#!/usr/bin/env python3
"""
Blue Box Air API Test Suite
Tests the AI endpoints and existing endpoints for Blue Box Air technician app
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import time

class BlueBoxAPITester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "https://coil-mgmt-app.preview.emergentagent.com/api"
        self.headers = {"Content-Type": "application/json"}
        self.auth_token = None
        self.test_results = {}
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        print(f"{status}: {test_name}")
        if message:
            print(f"    Message: {message}")
        if response_data and not success:
            print(f"    Response: {json.dumps(response_data, indent=2, default=str)}")
        print()
        
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "response": response_data
        }
    
    def make_request(self, method, endpoint, data=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error for {method} {endpoint}: {str(e)}")
            return None
    
    def test_ai_chat(self):
        """Test AI Chat endpoint - POST /api/ai/chat"""
        test_name = "AI Chat Endpoint"
        endpoint = "/ai/chat"
        data = {"message": "What is coil cleaning?", "session_id": None}
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "response" in response_data and "session_id" in response_data:
                    ai_response = response_data.get("response", "")
                    session_id = response_data.get("session_id", "")
                    if ai_response and session_id:
                        self.log_result(test_name, True, f"AI responded with {len(ai_response)} characters, session_id: {session_id}")
                        return True
                    else:
                        self.log_result(test_name, False, "Empty response or session_id", response_data)
                else:
                    self.log_result(test_name, False, "Missing required fields: response, session_id", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_ai_troubleshoot(self):
        """Test AI Troubleshoot endpoint - POST /api/ai/troubleshoot"""
        test_name = "AI Troubleshoot Endpoint"
        endpoint = "/ai/troubleshoot"
        data = {
            "equipment_name": "AHU-01",
            "issue": "High differential pressure after cleaning",
            "readings": [
                {
                    "type": "Differential Pressure",
                    "pre": "1.2",
                    "post": "0.8",
                    "unit": "inWC"
                }
            ]
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "response" in response_data:
                    ai_response = response_data.get("response", "")
                    if ai_response:
                        self.log_result(test_name, True, f"AI troubleshooting response: {len(ai_response)} characters")
                        return True
                    else:
                        self.log_result(test_name, False, "Empty troubleshooting response", response_data)
                else:
                    self.log_result(test_name, False, "Missing required field: response", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_ai_report_summary(self):
        """Test AI Report Summary endpoint - POST /api/ai/report-summary"""
        test_name = "AI Report Summary Endpoint"
        endpoint = "/ai/report-summary"
        data = {
            "project_name": "Test Project",
            "equipment_reports": [
                {
                    "equipment": {
                        "name": "AHU-01",
                        "equipment_type": "AHU"
                    },
                    "comparisons": [
                        {
                            "reading_type": "Differential Pressure",
                            "unit": "inWC",
                            "pre": {"value": 1.2},
                            "post": {"value": 0.8},
                            "difference": -0.4,
                            "percent_change": -33.3
                        }
                    ]
                }
            ]
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "summary" in response_data:
                    ai_summary = response_data.get("summary", "")
                    if ai_summary:
                        self.log_result(test_name, True, f"AI report summary: {len(ai_summary)} characters")
                        return True
                    else:
                        self.log_result(test_name, False, "Empty summary response", response_data)
                else:
                    self.log_result(test_name, False, "Missing required field: summary", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_auth_login(self):
        """Test authentication login endpoint - POST /api/auth/login"""
        test_name = "Auth Login API"
        endpoint = "/auth/login"
        data = {"username": "test", "password": "test"}
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success") and "technician" in response_data and "token" in response_data:
                    self.auth_token = response_data.get("token")
                    self.log_result(test_name, True, "Login successful, mock mode working")
                    return True
                else:
                    self.log_result(test_name, False, "Missing required fields in response", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_projects_list(self):
        """Test get projects list - GET /api/projects"""
        test_name = "Projects List API"
        endpoint = "/projects"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "projects" in response_data and "total" in response_data:
                    projects = response_data["projects"]
                    total = response_data["total"]
                    if isinstance(projects, list) and total == 3:  # Expecting 3 projects
                        self.log_result(test_name, True, f"Retrieved {len(projects)} projects as expected")
                        return True
                    else:
                        self.log_result(test_name, False, f"Expected 3 projects, got {total}", response_data)
                else:
                    self.log_result(test_name, False, "Missing required fields: projects, total", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_reports_get(self):
        """Test get report for project - GET /api/reports/proj-001"""
        test_name = "Reports API"
        endpoint = "/reports/proj-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_fields = ["report_id", "project", "technician", "summary", "equipment_reports"]
                if all(field in response_data for field in required_fields):
                    project = response_data.get("project", {})
                    if project.get("id") == "proj-001":
                        self.log_result(test_name, True, "Report generated successfully for proj-001")
                        return True
                    else:
                        self.log_result(test_name, False, "Wrong project in report", response_data)
                else:
                    missing = [f for f in required_fields if f not in response_data]
                    self.log_result(test_name, False, f"Missing fields: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def run_focused_tests(self):
        """Run focused tests for the review request"""
        print("=" * 80)
        print("BLUE BOX AIR - BACKEND API TEST SUITE")
        print("=" * 80)
        print(f"Testing against: {self.base_url}")
        print()
        
        # AI endpoints tests (high priority from review request)
        print("🤖 AI ENDPOINTS TESTS (NEW)")
        print("-" * 40)
        self.test_ai_chat()
        self.test_ai_troubleshoot()
        self.test_ai_report_summary()
        print()
        
        # Existing endpoints verification (from review request)
        print("🔐 EXISTING ENDPOINTS VERIFICATION")
        print("-" * 40)
        self.test_auth_login()
        self.test_projects_list()
        self.test_reports_get()
        print()
        
        # Final summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        # List failed tests
        failed_tests = [name for name, result in self.test_results.items() if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                result = self.test_results[test]
                print(f"  - {test}: {result['message']}")
        
        print()
        return self.passed_tests == self.total_tests

def main():
    """Main test execution"""
    tester = BlueBoxAPITester()
    success = tester.run_focused_tests()
    
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the results above.")
        sys.exit(1)

if __name__ == "__main__":
    main()