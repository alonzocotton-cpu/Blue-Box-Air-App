#!/usr/bin/env python3
"""
Comprehensive backend API test suite for Field Tech Connect Technician App
Tests all API endpoints defined in the backend server
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import time

class TechnicianAPITester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "https://techservice-app-2.preview.emergentagent.com/api"
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
    
    def test_auth_login(self):
        """Test authentication login endpoint"""
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
    
    def test_auth_profile(self):
        """Test get profile endpoint"""
        test_name = "Auth Profile API"
        endpoint = "/auth/profile"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_fields = ["id", "username", "email", "full_name"]
                if all(field in response_data for field in required_fields):
                    self.log_result(test_name, True, "Profile data retrieved successfully")
                    return True
                else:
                    missing_fields = [f for f in required_fields if f not in response_data]
                    self.log_result(test_name, False, f"Missing fields: {missing_fields}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_work_orders_list(self):
        """Test get work orders list"""
        test_name = "Work Orders List API"
        endpoint = "/work-orders"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "work_orders" in response_data and "total" in response_data:
                    work_orders = response_data["work_orders"]
                    if isinstance(work_orders, list):
                        self.log_result(test_name, True, f"Retrieved {len(work_orders)} work orders")
                        return True
                    else:
                        self.log_result(test_name, False, "work_orders is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing required fields", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_work_order_detail(self):
        """Test get specific work order"""
        test_name = "Work Order Detail API"
        endpoint = "/work-orders/wo-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_sections = ["work_order", "photos", "time_entries", "expenses", "signatures"]
                if all(section in response_data for section in required_sections):
                    wo = response_data["work_order"]
                    if wo.get("id") == "wo-001":
                        self.log_result(test_name, True, "Work order detail retrieved with all sections")
                        return True
                    else:
                        self.log_result(test_name, False, "Wrong work order returned", response_data)
                else:
                    missing = [s for s in required_sections if s not in response_data]
                    self.log_result(test_name, False, f"Missing sections: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_work_order_update(self):
        """Test update work order"""
        test_name = "Work Order Update API"
        endpoint = "/work-orders/wo-001"
        data = {"status": "In Progress"}
        
        response = self.make_request("PATCH", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success"):
                    self.log_result(test_name, True, "Work order updated successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Update not successful", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_time_entries_create(self):
        """Test create time entry"""
        test_name = "Time Entries Create API"
        endpoint = "/time-entries"
        data = {
            "work_order_id": "wo-001",
            "start_time": "2026-03-10T12:00:00",
            "entry_type": "Work"
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return None
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_fields = ["id", "work_order_id", "technician_id", "start_time", "entry_type"]
                if all(field in response_data for field in required_fields):
                    self.log_result(test_name, True, "Time entry created successfully")
                    return response_data["id"]  # Return ID for stop test
                else:
                    missing = [f for f in required_fields if f not in response_data]
                    self.log_result(test_name, False, f"Missing fields: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return None
    
    def test_time_entries_get(self):
        """Test get time entries for work order"""
        test_name = "Time Entries Get API"
        endpoint = "/time-entries/wo-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "time_entries" in response_data:
                    entries = response_data["time_entries"]
                    if isinstance(entries, list):
                        self.log_result(test_name, True, f"Retrieved {len(entries)} time entries")
                        return True
                    else:
                        self.log_result(test_name, False, "time_entries is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing time_entries field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_time_entries_stop(self, entry_id):
        """Test stop time entry"""
        if not entry_id:
            self.log_result("Time Entries Stop API", False, "No entry ID available from create test")
            return False
            
        test_name = "Time Entries Stop API"
        endpoint = f"/time-entries/{entry_id}/stop"
        
        response = self.make_request("PATCH", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success") and "duration_minutes" in response_data:
                    self.log_result(test_name, True, "Time entry stopped successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Missing success or duration_minutes", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_expenses_create(self):
        """Test create expense"""
        test_name = "Expenses Create API"
        endpoint = "/expenses"
        data = {
            "work_order_id": "wo-001",
            "expense_type": "Parts",
            "description": "Test expense",
            "amount": 50.00
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_fields = ["id", "work_order_id", "technician_id", "expense_type", "description", "amount"]
                if all(field in response_data for field in required_fields):
                    self.log_result(test_name, True, "Expense created successfully")
                    return True
                else:
                    missing = [f for f in required_fields if f not in response_data]
                    self.log_result(test_name, False, f"Missing fields: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_expenses_get(self):
        """Test get expenses for work order"""
        test_name = "Expenses Get API"
        endpoint = "/expenses/wo-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "expenses" in response_data:
                    expenses = response_data["expenses"]
                    if isinstance(expenses, list):
                        self.log_result(test_name, True, f"Retrieved {len(expenses)} expenses")
                        return True
                    else:
                        self.log_result(test_name, False, "expenses is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing expenses field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_photos_create(self):
        """Test upload photo"""
        test_name = "Photos Create API"
        endpoint = "/photos"
        data = {
            "work_order_id": "wo-001",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "photo_type": "General"
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success") and "photo_id" in response_data:
                    self.log_result(test_name, True, "Photo uploaded successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Missing success or photo_id", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_photos_get(self):
        """Test get photos for work order"""
        test_name = "Photos Get API"
        endpoint = "/photos/wo-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "photos" in response_data:
                    photos = response_data["photos"]
                    if isinstance(photos, list):
                        self.log_result(test_name, True, f"Retrieved {len(photos)} photos")
                        return True
                    else:
                        self.log_result(test_name, False, "photos is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing photos field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_signatures_create(self):
        """Test save signature"""
        test_name = "Signatures Create API"
        endpoint = "/signatures"
        data = {
            "work_order_id": "wo-001",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "signer_name": "John Doe",
            "signer_type": "Customer"
        }
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success") and "signature_id" in response_data:
                    self.log_result(test_name, True, "Signature saved successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Missing success or signature_id", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_signatures_get(self):
        """Test get signatures for work order"""
        test_name = "Signatures Get API"
        endpoint = "/signatures/wo-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "signatures" in response_data:
                    signatures = response_data["signatures"]
                    if isinstance(signatures, list):
                        self.log_result(test_name, True, f"Retrieved {len(signatures)} signatures")
                        return True
                    else:
                        self.log_result(test_name, False, "signatures is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing signatures field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_accounts_list(self):
        """Test get accounts"""
        test_name = "Accounts List API"
        endpoint = "/accounts"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "accounts" in response_data:
                    accounts = response_data["accounts"]
                    if isinstance(accounts, list) and len(accounts) > 0:
                        self.log_result(test_name, True, f"Retrieved {len(accounts)} accounts")
                        return True
                    else:
                        self.log_result(test_name, False, "No accounts returned or not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing accounts field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_account_detail(self):
        """Test get specific account"""
        test_name = "Account Detail API"
        endpoint = "/accounts/acc-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_sections = ["account", "contacts", "work_orders"]
                if all(section in response_data for section in required_sections):
                    account = response_data["account"]
                    if account.get("id") == "acc-001":
                        self.log_result(test_name, True, "Account detail retrieved with contacts and work orders")
                        return True
                    else:
                        self.log_result(test_name, False, "Wrong account returned", response_data)
                else:
                    missing = [s for s in required_sections if s not in response_data]
                    self.log_result(test_name, False, f"Missing sections: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_contacts_list(self):
        """Test get contacts"""
        test_name = "Contacts List API"
        endpoint = "/contacts"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "contacts" in response_data:
                    contacts = response_data["contacts"]
                    if isinstance(contacts, list) and len(contacts) > 0:
                        self.log_result(test_name, True, f"Retrieved {len(contacts)} contacts")
                        return True
                    else:
                        self.log_result(test_name, False, "No contacts returned or not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing contacts field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_cases_list(self):
        """Test get cases"""
        test_name = "Cases List API"
        endpoint = "/cases"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "cases" in response_data:
                    cases = response_data["cases"]
                    if isinstance(cases, list) and len(cases) > 0:
                        self.log_result(test_name, True, f"Retrieved {len(cases)} cases")
                        return True
                    else:
                        self.log_result(test_name, False, "No cases returned or not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing cases field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_case_detail(self):
        """Test get specific case"""
        test_name = "Case Detail API"
        endpoint = "/cases/case-001"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("id") == "case-001":
                    self.log_result(test_name, True, "Case detail retrieved successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Wrong case returned", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_dashboard_stats(self):
        """Test get dashboard stats"""
        test_name = "Dashboard Stats API"
        endpoint = "/dashboard/stats"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                required_stats = ["total_work_orders", "new", "in_progress", "completed"]
                if all(stat in response_data for stat in required_stats):
                    self.log_result(test_name, True, "Dashboard stats retrieved successfully")
                    return True
                else:
                    missing = [s for s in required_stats if s not in response_data]
                    self.log_result(test_name, False, f"Missing stats: {missing}", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_location_update(self):
        """Test location update"""
        test_name = "Location Update API"
        endpoint = "/location"
        data = {"latitude": 40.7128, "longitude": -74.0060}
        
        response = self.make_request("POST", endpoint, data)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if response_data.get("success"):
                    self.log_result(test_name, True, "Location updated successfully")
                    return True
                else:
                    self.log_result(test_name, False, "Update not successful", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def test_location_history(self):
        """Test get location history"""
        test_name = "Location History API"
        endpoint = "/location/history"
        
        response = self.make_request("GET", endpoint)
        
        if response is None:
            self.log_result(test_name, False, "Request failed - connection error")
            return False
        
        try:
            response_data = response.json()
            if response.status_code == 200:
                if "locations" in response_data:
                    locations = response_data["locations"]
                    if isinstance(locations, list):
                        self.log_result(test_name, True, f"Retrieved {len(locations)} location records")
                        return True
                    else:
                        self.log_result(test_name, False, "locations is not a list", response_data)
                else:
                    self.log_result(test_name, False, "Missing locations field", response_data)
            else:
                self.log_result(test_name, False, f"HTTP {response.status_code}", response_data)
        except json.JSONDecodeError:
            self.log_result(test_name, False, f"Invalid JSON response. Status: {response.status_code}")
        
        return False
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("=" * 80)
        print("FIELD TECH CONNECT - BACKEND API TEST SUITE")
        print("=" * 80)
        print(f"Testing against: {self.base_url}")
        print()
        
        # Auth tests (high priority)
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        self.test_auth_login()
        self.test_auth_profile()
        print()
        
        # Work orders tests (high priority)
        print("📋 WORK ORDERS TESTS")
        print("-" * 40)
        self.test_work_orders_list()
        self.test_work_order_detail()
        self.test_work_order_update()
        print()
        
        # Time entries tests (high priority)
        print("⏰ TIME ENTRIES TESTS")
        print("-" * 40)
        entry_id = self.test_time_entries_create()
        self.test_time_entries_get()
        self.test_time_entries_stop(entry_id)
        print()
        
        # Expenses tests
        print("💰 EXPENSES TESTS")
        print("-" * 40)
        self.test_expenses_create()
        self.test_expenses_get()
        print()
        
        # Photos tests
        print("📷 PHOTOS TESTS")
        print("-" * 40)
        self.test_photos_create()
        self.test_photos_get()
        print()
        
        # Signatures tests
        print("✍️ SIGNATURES TESTS")
        print("-" * 40)
        self.test_signatures_create()
        self.test_signatures_get()
        print()
        
        # Accounts/Contacts tests
        print("👥 ACCOUNTS & CONTACTS TESTS")
        print("-" * 40)
        self.test_accounts_list()
        self.test_account_detail()
        self.test_contacts_list()
        print()
        
        # Cases tests
        print("🎫 CASES TESTS")
        print("-" * 40)
        self.test_cases_list()
        self.test_case_detail()
        print()
        
        # Dashboard tests (high priority)
        print("📊 DASHBOARD TESTS")
        print("-" * 40)
        self.test_dashboard_stats()
        print()
        
        # Location tests
        print("📍 LOCATION TESTS")
        print("-" * 40)
        self.test_location_update()
        self.test_location_history()
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
    tester = TechnicianAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the results above.")
        sys.exit(1)

if __name__ == "__main__":
    main()