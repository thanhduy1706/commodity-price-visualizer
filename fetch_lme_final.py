#!/usr/bin/env python3
"""
LME Copper Data Fetcher - Final Solution
Bypasses Cloudflare protection by running locally
"""

import requests
import pandas as pd
from datetime import datetime
import sys

# PASTE YOUR COOKIES HERE (from cURL command)
COOKIES = """
PASTE_YOUR_COOKIES_HERE
""".strip()

# LME API Configuration
START_DATE = "2023-01-01"
END_DATE = datetime.now().strftime("%Y-%m-%d")
DATASOURCE_ID = "39fabad0-95ca-491b-a733-bcef31818b16"  # Official Prices

def fetch_lme_data(cookies_string):
    """Fetch data from LME API"""

    url = f"https://www.lme.com/api/trading-data/chart-data"
    params = {
        "datasourceId": DATASOURCE_ID,
        "startDate": START_DATE,
        "endDate": END_DATE
    }

    headers = {
        "accept": "*/*",
        "accept-language": "en-GB,en;q=0.9,vi;q=0.8",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://www.lme.com/metals/non-ferrous/lme-copper",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    }

    # Convert cookie string to dictionary
    cookie_dict = {}
    for cookie in cookies_string.split(";"):
        if "=" in cookie:
            key, value = cookie.strip().split("=", 1)
            cookie_dict[key] = value

    print(f"[OK] Fetching data from {START_DATE} to {END_DATE}...")
    print(f"[OK] Using {len(cookie_dict)} cookies")

    response = requests.get(url, params=params, headers=headers, cookies=cookie_dict)

    if response.status_code != 200:
        print(f"[ERROR] HTTP {response.status_code}")
        if "Just a moment" in response.text:
            print("[ERROR] Cloudflare protection detected!")
            print("[HINT] Make sure you're using FRESH cookies from your browser")
        else:
            print(f"[ERROR] Response: {response.text[:200]}")
        sys.exit(1)

    print(f"[OK] Data received successfully!")
    return response.json()

def process_to_excel(data):
    """Convert LME data to Excel"""

    labels = data.get("Labels", [])
    datasets = data.get("Datasets", [])

    if not labels:
        print("[ERROR] No data received!")
        sys.exit(1)

    print(f"[OK] Processing {len(labels)} data points...")

    # Create DataFrame
    df_data = {"Date": labels}

    # Add all datasets
    for dataset in datasets:
        row_title = dataset.get("RowTitle", "Unknown")
        label = dataset.get("Label", "")
        column_name = f"{row_title} - {label}" if label else row_title
        df_data[column_name] = dataset.get("Data", [])

    df = pd.DataFrame(df_data)

    # Generate filename
    filename = f"LME_Copper_Official_Prices_{datetime.now().strftime('%Y_%m_%d')}.xlsx"

    # Save to Excel
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Official Prices', index=False)

        # Auto-adjust column widths
        worksheet = writer.sheets['Official Prices']
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).apply(len).max(),
                len(col)
            ) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = max_length

    print(f"[OK] Excel file created: {filename}")
    print(f"[OK] Total records: {len(df)}")
    return filename

def main():
    """Main function"""

    print("=" * 60)
    print("LME Copper Data Fetcher - Final Solution")
    print("=" * 60)
    print()

    # Check if cookies are provided
    if COOKIES == "PASTE_YOUR_COOKIES_HERE" or not COOKIES:
        print("[ERROR] No cookies provided!")
        print()
        print("Please:")
        print("1. Open the script in a text editor")
        print("2. Replace 'PASTE_YOUR_COOKIES_HERE' with your cookies")
        print("3. Get fresh cookies from: https://www.lme.com/metals/non-ferrous/lme-copper")
        print("   (F12 → Network → chart-data → Copy as cURL → Extract cookies)")
        print()
        sys.exit(1)

    try:
        # Fetch data
        data = fetch_lme_data(COOKIES)

        # Process and save
        filename = process_to_excel(data)

        print()
        print("=" * 60)
        print("[SUCCESS] Data fetched and saved successfully!")
        print(f"[FILE] {filename}")
        print("=" * 60)

    except Exception as e:
        print()
        print("[ERROR] Failed:", str(e))
        print()
        print("Troubleshooting:")
        print("1. Get FRESH cookies (they expire quickly!)")
        print("2. Make sure you're copying the entire cookie string")
        print("3. Visit LME website first, then get cookies immediately")
        sys.exit(1)

if __name__ == "__main__":
    main()
