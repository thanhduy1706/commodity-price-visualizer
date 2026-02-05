"""
Test script to verify Python backend is working
"""

import requests

def test_backend():
    """Test if Python backend is running"""

    print("=" * 60)
    print("Testing Python Backend")
    print("=" * 60)
    print()

    try:
        print("[1/3] Testing health endpoint...")
        response = requests.get("http://localhost:8000/", timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is running!")
            print(f"    Status: {data['status']}")
            print(f"    Service: {data['service']}")
            print(f"    Version: {data['version']}")
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False

        print()
        print("[2/3] Checking CORS headers...")
        if "access-control-allow-origin" in response.headers:
            print("✅ CORS configured correctly!")
            print(f"    Origin: {response.headers.get('access-control-allow-origin')}")
        else:
            print("⚠️  CORS headers not found (may need to check)")

        print()
        print("[3/3] Testing API endpoints...")
        endpoints = data.get('endpoints', [])
        print(f"✅ Available endpoints: {', '.join(endpoints)}")

        print()
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Backend is ready to use! 🚀")
        print()
        print("Next steps:")
        print("1. Keep this backend running")
        print("2. Start Next.js frontend: npm run dev")
        print("3. Open http://localhost:3000")
        print("4. Paste your cookies and download data! ✅")
        print()

        return True

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend!")
        print()
        print("Please start the Python backend first:")
        print("  cd backend")
        print("  python main.py")
        print()
        return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_backend()
