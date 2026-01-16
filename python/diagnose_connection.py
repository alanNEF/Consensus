#!/usr/bin/env python3
"""
Diagnostic script to troubleshoot Zilliz Cloud connection issues
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
python_dir = Path(__file__).parent
env_path = python_dir / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

MILVUS_URI = os.getenv("MILVUS_URI")
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN")
MILVUS_USER = os.getenv("MILVUS_USER")
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")

print("=" * 60)
print("Zilliz Cloud Connection Diagnostics")
print("=" * 60)
print()

# Check environment variables
print("1. Environment Variables:")
print(f"   MILVUS_URI: {'✓ Set' if MILVUS_URI else '✗ Missing'}")
if MILVUS_URI:
    print(f"      Value: {MILVUS_URI}")
    # Check URI format
    if not MILVUS_URI.startswith("https://"):
        print(f"      ⚠️  Warning: URI should start with 'https://'")
    if "zilliz" not in MILVUS_URI.lower():
        print(f"      ⚠️  Warning: URI doesn't contain 'zilliz' - is this correct?")
    if ":" not in MILVUS_URI.split("//")[1]:
        print(f"      ℹ️  Info: URI doesn't have explicit port (will try :443)")

print(f"   MILVUS_TOKEN: {'✓ Set' if MILVUS_TOKEN else '✗ Missing'}")
if MILVUS_TOKEN:
    token_preview = MILVUS_TOKEN[:10] + "..." if len(MILVUS_TOKEN) > 10 else MILVUS_TOKEN
    print(f"      Value: {token_preview} (length: {len(MILVUS_TOKEN)})")
    # Check token format
    if ":" in MILVUS_TOKEN:
        print(f"      ℹ️  Token appears to be in 'username:password' format")
    else:
        print(f"      ℹ️  Token appears to be an API key")

print(f"   MILVUS_USER: {'✓ Set' if MILVUS_USER else '✗ Not set (OK if using token)'}")
print(f"   MILVUS_PASSWORD: {'✓ Set' if MILVUS_PASSWORD else '✗ Not set (OK if using token)'}")
print()

# Check authentication
print("2. Authentication:")
has_auth = bool(MILVUS_TOKEN) or (MILVUS_USER and MILVUS_PASSWORD)
if has_auth:
    if MILVUS_TOKEN:
        print("   ✓ Using MILVUS_TOKEN (API key)")
    else:
        print("   ✓ Using MILVUS_USER + MILVUS_PASSWORD")
        print(f"      Combined token would be: {MILVUS_USER}:{MILVUS_PASSWORD}")
else:
    print("   ✗ No authentication provided!")
    print("   → Zilliz Cloud requires either:")
    print("     - MILVUS_TOKEN (API key from Zilliz Cloud console)")
    print("     - MILVUS_USER + MILVUS_PASSWORD (cluster credentials)")
print()

# Try connection
print("3. Testing Connection:")
if not MILVUS_URI:
    print("   ✗ Cannot test: MILVUS_URI not set")
    sys.exit(1)

if not has_auth:
    print("   ✗ Cannot test: No authentication provided")
    sys.exit(1)

try:
    from pymilvus import connections, utility
    
    # Prepare connection
    uri = MILVUS_URI.strip()
    if uri.startswith("https://") and ":" not in uri.split("//")[1]:
        uri = f"{uri}:443"
    
    connection_params = {
        "alias": "default",
        "uri": uri,
    }
    
    if MILVUS_TOKEN:
        connection_params["token"] = MILVUS_TOKEN
    elif MILVUS_USER and MILVUS_PASSWORD:
        connection_params["token"] = f"{MILVUS_USER}:{MILVUS_PASSWORD}"
    
    print(f"   Attempting connection to: {uri}")
    print(f"   Using token: {'Yes' if 'token' in connection_params else 'No'}")
    
    # Try multiple connection methods
    connected = False
    last_error = None
    
    # Method 1: Try with connections.connect (legacy API)
    try:
        print("   Trying connections.connect()...")
        connections.connect(**connection_params)
        print("   ✓ Connection successful with connections.connect()!")
        connected = True
    except Exception as e1:
        last_error = e1
        print(f"   ✗ connections.connect() failed: {e1}")
        
        # Method 2: Try with MilvusClient (newer API, better for serverless)
        try:
            print("   Trying MilvusClient (recommended for serverless)...")
            from pymilvus import MilvusClient
            
            client = MilvusClient(
                uri=uri,
                token=connection_params["token"]
            )
            # Test by listing collections
            collections = client.list_collections()
            print(f"   ✓ Connection successful with MilvusClient!")
            print(f"   ✓ Can list collections: {len(collections)} found")
            if collections:
                print(f"      Collections: {collections}")
            client.close()
            connected = True
        except Exception as e2:
            last_error = e2
            print(f"   ✗ MilvusClient also failed: {e2}")
            
            # Method 3: Try alternative URI formats
            print("   Trying alternative URI formats...")
            alternative_uris = []
            
            # Try with .api. instead of .serverless.
            if ".serverless." in MILVUS_URI:
                alt_uri = MILVUS_URI.replace(".serverless.", ".api.")
                if alt_uri.endswith(".cloud.zilliz.com"):
                    alt_uri = alt_uri.replace(".cloud.zilliz.com", ".zillizcloud.com")
                if ":" not in alt_uri.split("//")[1]:
                    alt_uri = f"{alt_uri}:443"
                alternative_uris.append(("API format", alt_uri))
            
            # Try without port
            if ":443" in uri:
                alternative_uris.append(("Without port", uri.replace(":443", "")))
            
            for name, alt_uri in alternative_uris:
                try:
                    print(f"   Trying {name}: {alt_uri}")
                    test_client = MilvusClient(
                        uri=alt_uri,
                        token=connection_params["token"]
                    )
                    collections = test_client.list_collections()
                    print(f"   ✓ Connection successful with {name}!")
                    print(f"   → Use this URI format: {alt_uri}")
                    test_client.close()
                    connected = True
                    break
                except Exception as e3:
                    error_str = str(e3)
                    print(f"   ✗ {name} failed: {e3}")
                    # Check for specific error messages
                    if "STOPPED" in error_str or "cluster status" in error_str:
                        print(f"   ⚠️  CLUSTER IS STOPPED! You need to start it in Zilliz Cloud Console.")
                        print(f"   → Go to Zilliz Cloud → Your Cluster → Click 'Start' or 'Resume'")
                    elif "UNAUTHENTICATED" in error_str and "STOPPED" not in error_str:
                        print(f"   ⚠️  Authentication issue - check your token/permissions")
    
    if not connected:
        raise last_error
    
    # If we used connections.connect, verify it works
    if connected and 'connections' in locals():
        try:
            collections = utility.list_collections()
            print(f"   ✓ Can list collections: {len(collections)} found")
            if collections:
                print(f"      Collections: {collections}")
        except Exception as e:
            print(f"   ⚠️  Connected but cannot list collections: {e}")
            print("   → This might be a permissions issue")
        
        # Disconnect
        connections.disconnect("default")
    
    # Try to list collections
    try:
        collections = utility.list_collections()
        print(f"   ✓ Can list collections: {len(collections)} found")
        if collections:
            print(f"      Collections: {collections}")
    except Exception as e:
        print(f"   ⚠️  Connected but cannot list collections: {e}")
        print("   → This might be a permissions issue")
    
    # Disconnect
    connections.disconnect("default")
    print("   ✓ Connection test passed!")
    
except Exception as e:
    error_str = str(e)
    print(f"   ✗ Connection failed: {e}")
    print()
    
    # Check for specific error messages
    if "STOPPED" in error_str or "cluster status" in error_str:
        print("   ⚠️  ⚠️  ⚠️  CLUSTER IS STOPPED! ⚠️  ⚠️  ⚠️")
        print()
        print("   SOLUTION: Start your Zilliz Cloud cluster:")
        print("   1. Go to https://cloud.zilliz.com")
        print("   2. Navigate to your cluster")
        print("   3. Click 'Start' or 'Resume' button")
        print("   4. Wait for cluster to start (may take 1-2 minutes)")
        print("   5. Run this diagnostic again")
        print()
        print("   Note: Serverless clusters auto-pause after inactivity to save costs.")
        print("   They will auto-resume when you try to connect, but there may be a delay.")
        print()
    else:
        print("   Troubleshooting steps:")
        print("   1. Verify your MILVUS_URI is correct:")
        print("      - Should be from Zilliz Cloud Console → Cluster → Connect")
        print("      - Format: https://inxx-xxxxx.api.region.zillizcloud.com:443")
        print("      - The correct URI appears to be: https://in03-f6b457864ae8b12.api.gcp-us-west1.zillizcloud.com:443")
        print()
        print("   2. Verify your token/credentials:")
        print("      - API Key: Get from Zilliz Cloud Console → API Keys")
        print("      - Username/Password: From cluster creation (shown only once)")
        print()
        print("   3. Check if your cluster is running:")
        print("      - Go to Zilliz Cloud Console → Check cluster status")
        print("      - Make sure it shows 'Running' not 'Stopped' or 'Paused'")
        print()
        print("   4. Verify network access:")
        print("      - Ensure you can reach the Zilliz Cloud endpoint")
        print("      - Check firewall/proxy settings")
    
    sys.exit(1)

print()
print("=" * 60)
print("All checks passed! Your connection should work.")
print("=" * 60)
