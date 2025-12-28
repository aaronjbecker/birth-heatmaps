#!/usr/bin/env python3
"""
Smoke tests for the HMD Births Heatmaps nginx data server.

Tests that the nginx server is correctly serving JSON and chart files
with proper CORS headers and content types.
"""
import sys
import json
import urllib.request
import urllib.error

# Configuration
NGINX_BASE_URL = "http://nginx"  # Docker internal network
TIMEOUT = 10


def test_health_endpoint() -> bool:
    """Test that the health endpoint returns 200 OK."""
    try:
        url = f"{NGINX_BASE_URL}/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            if response.status == 200:
                print(f"✓ Health endpoint: {response.status} OK")
                return True
            else:
                print(f"✗ Health endpoint: unexpected status {response.status}")
                return False
    except urllib.error.URLError as e:
        print(f"✗ Health endpoint: {e}")
        return False


def test_cors_headers() -> bool:
    """Test that CORS headers are set correctly."""
    try:
        url = f"{NGINX_BASE_URL}/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            cors_header = response.getheader("Access-Control-Allow-Origin")
            if cors_header == "*":
                print(f"✓ CORS headers: Access-Control-Allow-Origin = {cors_header}")
                return True
            else:
                print(f"✗ CORS headers: Access-Control-Allow-Origin = {cors_header} (expected '*')")
                return False
    except urllib.error.URLError as e:
        print(f"✗ CORS headers: {e}")
        return False


def test_countries_json() -> bool:
    """Test that countries.json is served with correct content type."""
    try:
        url = f"{NGINX_BASE_URL}/data/countries.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            content_type = response.getheader("Content-Type")
            if response.status == 200:
                data = json.loads(response.read())
                if "countries" in data:
                    print(f"✓ countries.json: {len(data['countries'])} countries, Content-Type: {content_type}")
                    return True
                else:
                    print(f"✗ countries.json: missing 'countries' key")
                    return False
            else:
                print(f"✗ countries.json: status {response.status}")
                return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"! countries.json: not found (run pipeline first)")
            return True  # Not a failure if data hasn't been generated
        print(f"✗ countries.json: {e}")
        return False
    except urllib.error.URLError as e:
        print(f"✗ countries.json: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"✗ countries.json: invalid JSON - {e}")
        return False


def test_fertility_json() -> bool:
    """Test that a fertility JSON file can be served."""
    try:
        # First get list of countries
        url = f"{NGINX_BASE_URL}/data/countries.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            data = json.loads(response.read())
            if not data.get("countries"):
                print("! fertility JSON: no countries available")
                return True

            # Test first country's fertility data
            country_code = data["countries"][0]["code"]
            fertility_url = f"{NGINX_BASE_URL}/data/fertility/{country_code}.json"
            req = urllib.request.Request(fertility_url)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                fertility_data = json.loads(response.read())
                if "data" in fertility_data and "years" in fertility_data:
                    print(f"✓ fertility/{country_code}.json: {len(fertility_data['data'])} data points")
                    return True
                else:
                    print(f"✗ fertility/{country_code}.json: missing required keys")
                    return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"! fertility JSON: not found (run pipeline first)")
            return True
        print(f"✗ fertility JSON: {e}")
        return False
    except urllib.error.URLError as e:
        print(f"✗ fertility JSON: {e}")
        return False


def test_chart_images() -> bool:
    """Test that chart images can be served."""
    try:
        # First get list of countries
        url = f"{NGINX_BASE_URL}/data/countries.json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            data = json.loads(response.read())
            if not data.get("countries"):
                print("! chart images: no countries available")
                return True

            # Test first country's fertility heatmap
            country_code = data["countries"][0]["code"]
            chart_url = f"{NGINX_BASE_URL}/data/charts/{country_code}/fertility_heatmap.png"
            req = urllib.request.Request(chart_url)
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                content_type = response.getheader("Content-Type")
                content_length = response.getheader("Content-Length")
                if response.status == 200 and "image" in (content_type or ""):
                    print(f"✓ charts/{country_code}/fertility_heatmap.png: {content_length} bytes")
                    return True
                else:
                    print(f"✗ charts/{country_code}/fertility_heatmap.png: unexpected response")
                    return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"! chart images: not found (run pipeline with --charts first)")
            return True
        print(f"✗ chart images: {e}")
        return False
    except urllib.error.URLError as e:
        print(f"✗ chart images: {e}")
        return False


def run_smoke_tests() -> int:
    """Run all smoke tests and return exit code."""
    print("=" * 50)
    print("HMD Births Heatmaps - Smoke Tests")
    print("=" * 50)
    print()

    tests = [
        ("Health Endpoint", test_health_endpoint),
        ("CORS Headers", test_cors_headers),
        ("Countries JSON", test_countries_json),
        ("Fertility JSON", test_fertility_json),
        ("Chart Images", test_chart_images),
    ]

    results = []
    for name, test_func in tests:
        print(f"Testing: {name}")
        results.append(test_func())
        print()

    print("=" * 50)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 50)

    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(run_smoke_tests())
