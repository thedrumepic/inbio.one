
import asyncio
import os
import sys
from unittest.mock import MagicMock
from fastapi import Request

# Avoid running full server init if possible, or just import
# We need ADMIN_PASSWORD and the functions

async def test_bypass():
    sys.path.append(os.getcwd())
    import server
    
    print("Testing get_current_admin bypass...")
    mock_request = MagicMock()
    mock_request.headers = {"X-Admin-Password": "secretboost1"}
    
    try:
        result = await server.get_current_admin(request=mock_request, current_user=None)
        print(f"Success Result: {result}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_bypass())
