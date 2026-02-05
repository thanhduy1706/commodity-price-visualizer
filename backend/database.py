"""
Database connection and operations for commodity data
"""
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
# Try multiple paths for .env
env_paths = ['.env', '../.env']
env_loaded = False
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(path)
        env_loaded = True
        break

if not env_loaded:
    print("[DB] Warning: No .env file found")

# Database configuration
DB_HOST = os.getenv('DATABASE_HOST', 'localhost')

# DOCKER FIX: If running in Docker and host is localhost, switch to host.docker.internal
# Check for .dockerenv file or common Docker environment variables
is_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER', False)

if is_docker and (DB_HOST == 'localhost' or DB_HOST == '127.0.0.1'):
    print(f"[DB] Docker detected: Swapping host '{DB_HOST}' to 'host.docker.internal'")
    DB_HOST = 'host.docker.internal'

DB_CONFIG = {
    'host': DB_HOST,
    'port': int(os.getenv('DATABASE_PORT', 5432)),
    'database': os.getenv('DATABASE_NAME', 'commodity_data'),
    'user': os.getenv('DATABASE_USERNAME', 'libadmin'),
    'password': os.getenv('DATABASE_PASSWORD', '')
}

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"[DB] Connection error: {str(e)}")
        raise

def get_commodity_id(commodity_code: str) -> Optional[int]:
    """Get commodity ID by code"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM commodities WHERE code = %s",
            (commodity_code.upper(),)
        )

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        return result[0] if result else None
    except Exception as e:
        print(f"[DB] Error getting commodity ID: {str(e)}")
        return None

def save_commodity_prices(commodity_code: str, prices: List[Dict]) -> int:
    """
    Save commodity prices to database

    Args:
        commodity_code: Commodity code (COPPER, ZINC, OIL)
        prices: List of price data dictionaries

    Returns:
        Number of records saved
    """
    try:
        print(f"[DB] Saving {len(prices)} prices for {commodity_code}...")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Get commodity ID
        commodity_id = get_commodity_id(commodity_code)
        if not commodity_id:
            print(f"[DB] Commodity {commodity_code} not found!")
            cursor.close()
            conn.close()
            return 0

        # Prepare data for bulk insert
        values = []
        for price in prices:
            values.append((
                commodity_id,
                price.get('date'),
                float(price.get('value', 0)),
                float(price.get('cashBid', 0)) if price.get('cashBid') else None,
                float(price.get('cashOffer', 0)) if price.get('cashOffer') else None,
                float(price.get('threeMonthBid', 0)) if price.get('threeMonthBid') else None,
                float(price.get('threeMonthOffer', 0)) if price.get('threeMonthOffer') else None,
                price.get('source', 'LME')
            ))

        # Bulk insert with conflict handling
        execute_values(
            cursor,
            """
            INSERT INTO commodity_prices (
                commodity_id,
                price_date,
                price_value,
                cash_bid,
                cash_offer,
                three_month_bid,
                three_month_offer,
                source
            ) VALUES %s
            ON CONFLICT (commodity_id, price_date)
            DO UPDATE SET
                price_value = EXCLUDED.price_value,
                cash_bid = EXCLUDED.cash_bid,
                cash_offer = EXCLUDED.cash_offer,
                three_month_bid = EXCLUDED.three_month_bid,
                three_month_offer = EXCLUDED.three_month_offer,
                updated_at = CURRENT_TIMESTAMP
            """,
            values
        )

        conn.commit()
        rows_affected = cursor.rowcount

        print(f"[DB] Saved {rows_affected} records for {commodity_code}")

        cursor.close()
        conn.close()

        return rows_affected

    except Exception as e:
        print(f"[DB] Error saving prices: {str(e)}")
        return 0

def log_fetch_operation(commodity_code: str, status: str, records_fetched: int = 0,
                        error_message: str = None, duration_ms: int = None):
    """Log fetch operation to database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        commodity_id = get_commodity_id(commodity_code)

        cursor.execute("""
            INSERT INTO fetch_logs (
                commodity_id,
                fetch_status,
                records_fetched,
                error_message,
                fetch_duration_ms
            ) VALUES (%s, %s, %s, %s, %s)
        """, (commodity_id, status, records_fetched, error_message, duration_ms))

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[DB] Error logging fetch operation: {str(e)}")

def get_all_commodity_data(start_date: str = '2023-01-01') -> List[Dict]:
    """
    Get all commodity data from database for chart display

    Args:
        start_date: Start date in YYYY-MM-DD format

    Returns:
        List of price data with commodity info
    """
    try:
        print(f"[DB] Loading data from {start_date}...")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT
                c.code as commodity_code,
                c.name as commodity_name,
                TO_CHAR(cp.price_date, 'YYYY-MM-DD') as date,
                cp.price_value,
                cp.cash_bid,
                cp.cash_offer,
                cp.three_month_bid,
                cp.three_month_offer,
                cp.source
            FROM commodity_prices cp
            INNER JOIN commodities c ON cp.commodity_id = c.id
            WHERE cp.price_date >= %s
            ORDER BY cp.price_date, c.code
        """, (start_date,))

        results = cursor.fetchall()

        # Convert to list of dicts
        data = [dict(row) for row in results]

        print(f"[DB] Loaded {len(data)} records")

        cursor.close()
        conn.close()

        return data

    except Exception as e:
        print(f"[DB] Error loading data: {str(e)}")
        return []

def get_latest_prices() -> List[Dict]:
    """Get latest prices for all commodities"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM v_latest_prices")

        results = cursor.fetchall()
        data = [dict(row) for row in results]

        cursor.close()
        conn.close()

        return data

    except Exception as e:
        print(f"[DB] Error getting latest prices: {str(e)}")
        return []

def get_data_summary() -> Dict:
    """Get summary of data in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT
                c.code,
                c.name,
                COUNT(*) as record_count,
                MIN(cp.price_date) as earliest_date,
                MAX(cp.price_date) as latest_date
            FROM commodity_prices cp
            INNER JOIN commodities c ON cp.commodity_id = c.id
            GROUP BY c.code, c.name
            ORDER BY c.code
        """)

        results = cursor.fetchall()

        summary = {
            'total_commodities': len(results),
            'commodities': [dict(row) for row in results]
        }

        cursor.close()
        conn.close()

        return summary

    except Exception as e:
        print(f"[DB] Error getting summary: {str(e)}")
        return {'total_commodities': 0, 'commodities': []}
