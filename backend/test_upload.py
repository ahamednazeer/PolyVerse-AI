import requests
import uuid
import os

URL = "http://localhost:8000"

# 1. Register test user
email = f"test_{uuid.uuid4().hex[:8]}@example.com"
pw = "password123"
print("Registering...")
res = requests.post(f"{URL}/api/auth/register", json={"name": "Test", "email": email, "password": pw})
token = res.json().get("access_token")
if not token:
    print("Registration failed:", res.text)
    exit(1)

# 2. Test text upload
with open("test.txt", "w") as f:
    f.write("Hello World")

print("Uploading test.txt...")
headers = {"Authorization": f"Bearer {token}"}
with open("test.txt", "rb") as f:
    res = requests.post(f"{URL}/api/files/upload", headers=headers, files={"file": ("test.txt", f, "text/plain")})
    
print("Status:", res.status_code)
print("Response:", res.text)

os.remove("test.txt")
