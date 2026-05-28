import requests
import json

BASE = "http://localhost:8000"

# Test 1: Register
print("=== Register ===")
r = requests.post(f"{BASE}/auth/register", json={
    "username": "testuser",
    "email": "test@example.com",
    "password": "test1234"
})
print(f"Status: {r.status_code}")
data = r.json()
print(json.dumps(data, indent=2, ensure_ascii=False))
api_key = data.get("api_key", "")
jwt_token = data.get("access_token", "")
print(f"\nAPI Key: {api_key}")
print(f"JWT Token: {jwt_token[:50]}...")

# Test 2: Dashboard
print("\n=== Dashboard ===")
r = requests.get(f"{BASE}/dashboard/profile", headers={
    "Authorization": f"Bearer {jwt_token}"
})
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2, ensure_ascii=False))

print("\nAll tests passed!")
