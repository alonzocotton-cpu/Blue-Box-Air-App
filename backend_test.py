#!/usr/bin/env python3
"""
Blue Box Air Backend Authentication Testing
Testing the user registration and login flow
"""
import requests
import json
import sys
import uuid
from datetime import datetime

# Get backend URL from frontend env
BACKEND_URL = "https://coil-mgmt-app.preview.emergentagent.com/api"

def test_user_registration():
    """Test POST /api/auth/register - Register a new user"""
    print("\n=== Test 1: User Registration ===")
    
    # Generate unique email to avoid conflicts
    unique_id = uuid.uuid4().hex[:8]
    test_email = f"john.{unique_id}@blueboxair.com"
    
    payload = {
        "full_name": "John Smith",
        "email": test_email,
        "password": "test123",
        "phone": "555-123-4567"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["success", "message", "technician", "token"]
            
            # Check response structure
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"❌ FAIL: Missing fields in response: {missing_fields}")
                return False, test_email
            
            # Check success flag
            if data.get("success") != True:
                print(f"❌ FAIL: Success flag is not True")
                return False, test_email
            
            # Check technician data
            technician = data.get("technician", {})
            if not technician.get("email") or not technician.get("full_name"):
                print(f"❌ FAIL: Technician data incomplete")
                return False, test_email
            
            # Check token
            if not data.get("token"):
                print(f"❌ FAIL: No token provided")
                return False, test_email
            
            print(f"✅ SUCCESS: User registered successfully")
            print(f"   - Technician ID: {technician.get('id')}")
            print(f"   - Email: {technician.get('email')}")
            print(f"   - Token: {data.get('token')[:20]}...")
            return True, test_email
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False, test_email
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False, test_email

def test_user_login(email, password):
    """Test POST /api/auth/login - Login with registered user"""
    print("\n=== Test 2: User Login (Registered User) ===")
    
    payload = {
        "username": email,
        "password": password
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["success", "technician", "token"]
            
            # Check response structure
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"❌ FAIL: Missing fields in response: {missing_fields}")
                return False
            
            # Check success flag
            if data.get("success") != True:
                print(f"❌ FAIL: Success flag is not True")
                return False
            
            # Check technician data
            technician = data.get("technician", {})
            if technician.get("email") != email:
                print(f"❌ FAIL: Email mismatch. Expected {email}, got {technician.get('email')}")
                return False
            
            print(f"✅ SUCCESS: User login successful")
            print(f"   - Technician: {technician.get('full_name')}")
            print(f"   - Email: {technician.get('email')}")
            return True
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_wrong_password_login(email):
    """Test POST /api/auth/login - Login with wrong password"""
    print("\n=== Test 3: Wrong Password Login ===")
    
    payload = {
        "username": email,
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print(f"✅ SUCCESS: Correctly rejected wrong password with 401")
            return True
        else:
            print(f"❌ FAIL: Expected 401 for wrong password, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_duplicate_registration(existing_email):
    """Test POST /api/auth/register - Try duplicate email registration"""
    print("\n=== Test 4: Duplicate Email Registration ===")
    
    payload = {
        "full_name": "Jane Smith",
        "email": existing_email,
        "password": "test456"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "already exists" in data.get("detail", "").lower():
                print(f"✅ SUCCESS: Correctly rejected duplicate email with 400 and proper error message")
                return True
            else:
                print(f"❌ FAIL: Got 400 but error message doesn't mention 'already exists'")
                return False
        else:
            print(f"❌ FAIL: Expected 400 for duplicate email, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_demo_mode_login():
    """Test POST /api/auth/login - Demo mode still works"""
    print("\n=== Test 5: Demo Mode Login ===")
    
    payload = {
        "username": "demo",
        "password": "demo"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") == True:
                # Check if it's demo mode (fallback to mock data)
                message = data.get("message", "")
                if "demo" in message.lower() or data.get("technician", {}).get("username") == "john.smith":
                    print(f"✅ SUCCESS: Demo mode login working")
                    return True
                else:
                    print(f"❌ FAIL: Login successful but doesn't appear to be demo mode")
                    return False
            else:
                print(f"❌ FAIL: Success flag is not True")
                return False
        else:
            print(f"❌ FAIL: Expected 200 for demo login, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_google_first_login():
    """Test POST /api/auth/google - First Google login (creates new user)"""
    print("\n=== Test 6: Google OAuth First Login (New User) ===")
    
    payload = {
        "email": "testuser@gmail.com",
        "name": "Test Google User", 
        "google_id": "google-12345",
        "picture": "https://example.com/photo.jpg"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/google", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["success", "message", "technician", "token"]
            
            # Check response structure
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"❌ FAIL: Missing fields in response: {missing_fields}")
                return False
                
            # Check success flag
            if data.get("success") != True:
                print(f"❌ FAIL: Success flag is not True")
                return False
                
            # Check message for new user creation
            message = data.get("message", "")
            if "created" not in message.lower():
                print(f"❌ FAIL: Message doesn't indicate account creation: {message}")
                return False
                
            # Check technician data
            technician = data.get("technician", {})
            required_fields = ["full_name", "email", "google_id", "auth_provider"]
            for field in required_fields:
                if field not in technician:
                    print(f"❌ FAIL: Missing technician field: {field}")
                    return False
            
            # Validate specific values
            if technician.get("email") != payload["email"]:
                print(f"❌ FAIL: Email mismatch")
                return False
            if technician.get("google_id") != payload["google_id"]:
                print(f"❌ FAIL: Google ID mismatch")
                return False
            if technician.get("auth_provider") != "google":
                print(f"❌ FAIL: Auth provider should be 'google'")
                return False
            
            # Check token
            if not data.get("token"):
                print(f"❌ FAIL: No token provided")
                return False
            
            print(f"✅ SUCCESS: Google first login successful")
            print(f"   - User created with Google ID: {technician.get('google_id')}")
            print(f"   - Auth provider: {technician.get('auth_provider')}")
            print(f"   - Token provided: {data.get('token')[:20]}...")
            return True
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_google_returning_login():
    """Test POST /api/auth/google - Returning Google user (logs in existing)"""
    print("\n=== Test 7: Google OAuth Returning Login (Existing User) ===")
    
    # Same data as first login test
    payload = {
        "email": "testuser@gmail.com",
        "name": "Test Google User",
        "google_id": "google-12345"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/google", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["success", "message", "technician", "token"]
            
            # Check response structure
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"❌ FAIL: Missing fields in response: {missing_fields}")
                return False
                
            # Check success flag
            if data.get("success") != True:
                print(f"❌ FAIL: Success flag is not True")
                return False
                
            # Check message for existing user login
            message = data.get("message", "")
            if "login successful" not in message.lower():
                print(f"❌ FAIL: Message doesn't indicate successful login: {message}")
                return False
                
            # Check technician data
            technician = data.get("technician", {})
            if technician.get("email") != payload["email"]:
                print(f"❌ FAIL: Email mismatch")
                return False
            if technician.get("google_id") != payload["google_id"]:
                print(f"❌ FAIL: Google ID mismatch")
                return False
            
            # Check token
            if not data.get("token"):
                print(f"❌ FAIL: No token provided")
                return False
            
            print(f"✅ SUCCESS: Google returning login successful")
            print(f"   - Existing user logged in: {technician.get('email')}")
            print(f"   - Token provided: {data.get('token')[:20]}...")
            return True
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_google_demo_login():
    """Test POST /api/auth/google - Demo Google login"""
    print("\n=== Test 8: Google OAuth Demo Login ===")
    
    payload = {
        "email": "demo.user@gmail.com",
        "name": "Google Demo User",
        "google_id": "google-demo-123"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/google", json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["success", "message", "technician", "token"]
            
            # Check response structure
            missing_fields = [field for field in expected_fields if field not in data]
            if missing_fields:
                print(f"❌ FAIL: Missing fields in response: {missing_fields}")
                return False
                
            # Check success flag
            if data.get("success") != True:
                print(f"❌ FAIL: Success flag is not True")
                return False
                
            # Check technician data
            technician = data.get("technician", {})
            if technician.get("email") != payload["email"]:
                print(f"❌ FAIL: Email mismatch")
                return False
            
            # Check token
            if not data.get("token"):
                print(f"❌ FAIL: No token provided")
                return False
            
            print(f"✅ SUCCESS: Google demo login successful")
            print(f"   - Demo user created/logged in: {technician.get('email')}")
            return True
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_existing_endpoints():
    """Test existing endpoints still work after Google OAuth implementation"""
    print("\n=== Test 9: Existing Endpoints Verification ===")
    
    results = []
    
    # Test demo login
    print("\n--- Testing existing POST /api/auth/login ---")
    payload = {"username": "test", "password": "test"}
    try:
        response = requests.post(f"{BACKEND_URL}/auth/login", json=payload, timeout=30)
        if response.status_code == 200 and response.json().get("success") == True:
            print("✅ Demo login still works")
            results.append(True)
        else:
            print(f"❌ Demo login failed: {response.status_code} - {response.text}")
            results.append(False)
    except Exception as e:
        print(f"❌ Demo login error: {str(e)}")
        results.append(False)
    
    # Test projects endpoint
    print("\n--- Testing GET /api/projects ---")
    try:
        response = requests.get(f"{BACKEND_URL}/projects", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if "projects" in data and isinstance(data["projects"], list):
                print(f"✅ Projects endpoint works - returned {len(data['projects'])} projects")
                results.append(True)
            else:
                print(f"❌ Projects endpoint response invalid: {data}")
                results.append(False)
        else:
            print(f"❌ Projects endpoint failed: {response.status_code} - {response.text}")
            results.append(False)
    except Exception as e:
        print(f"❌ Projects endpoint error: {str(e)}")
        results.append(False)
    
    # Return overall result
    all_passed = all(results)
    if all_passed:
        print(f"✅ SUCCESS: All existing endpoints working")
    else:
        print(f"❌ FAIL: Some existing endpoints have issues")
    
    return all_passed

def main():
    """Run all authentication tests including Google OAuth"""
    print("=" * 60)
    print("Blue Box Air Backend Authentication Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Keep track of test results
    results = []
    test_email = None
    
    # Original authentication tests
    print("\n🔵 STANDARD AUTHENTICATION TESTS")
    
    # Test 1: Register new user
    success, test_email = test_user_registration()
    results.append(("User Registration", success))
    
    if not success:
        print("\n❌ CRITICAL: Registration failed - cannot continue with other tests")
        return False
    
    # Test 2: Login with registered user
    success = test_user_login(test_email, "test123")
    results.append(("User Login", success))
    
    # Test 3: Login with wrong password
    success = test_wrong_password_login(test_email)
    results.append(("Wrong Password", success))
    
    # Test 4: Duplicate registration
    success = test_duplicate_registration(test_email)
    results.append(("Duplicate Email", success))
    
    # Test 5: Demo mode
    success = test_demo_mode_login()
    results.append(("Demo Mode", success))
    
    # Google OAuth tests
    print("\n🔵 GOOGLE OAUTH TESTS")
    
    # Test 6: Google first login
    success = test_google_first_login()
    results.append(("Google First Login", success))
    
    # Test 7: Google returning login
    success = test_google_returning_login()
    results.append(("Google Return Login", success))
    
    # Test 8: Google demo login
    success = test_google_demo_login()
    results.append(("Google Demo Login", success))
    
    # Test 9: Existing endpoints verification
    success = test_existing_endpoints()
    results.append(("Existing Endpoints", success))
    
    # Summary
    print("\n" + "=" * 60)
    print("COMPLETE AUTHENTICATION TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:20} | {status}")
        if success:
            passed += 1
    
    print("-" * 60)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL AUTHENTICATION TESTS PASSED!")
        return True
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED - Authentication system has issues")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)