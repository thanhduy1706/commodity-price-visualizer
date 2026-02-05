"""
Test PostgreSQL database connection and basic operations
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': '100.105.169.18',
    'port': 5432,
    'database': 'commodity_data',
    'user': 'libadmin',
    'password': 'Jentle1706'
}

def test_connection():
    """Test database connection"""
    try:
        print("[DB] Testing connection...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Connected to PostgreSQL!")
        print(f"   Version: {version[0][:50]}...")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

def check_tables():
    """Check if tables exist"""
    try:
        print("\n[DB] Checking tables...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()

        if tables:
            print(f"✅ Found {len(tables)} tables:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("⚠️  No tables found. Run setup.sql first!")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error checking tables: {str(e)}")
        return False

def check_commodities():
    """Check commodities data"""
    try:
        print("\n[DB] Checking commodities...")
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cursor = conn.cursor()

        cursor.execute("SELECT code, name, unit FROM commodities ORDER BY code;")
        commodities = cursor.fetchall()

        if commodities:
            print(f"✅ Found {len(commodities)} commodities:")
            for comm in commodities:
                print(f"   - {comm['code']}: {comm['name']} ({comm['unit']})")
        else:
            print("⚠️  No commodities found. Run setup.sql first!")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error checking commodities: {str(e)}")
        return False

def check_data():
    """Check price data"""
    try:
        print("\n[DB] Checking price data...")
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                c.code,
                COUNT(*) as record_count,
                MIN(cp.price_date) as earliest_date,
                MAX(cp.price_date) as latest_date
            FROM commodity_prices cp
            JOIN commodities c ON cp.commodity_id = c.id
            GROUP BY c.code
            ORDER BY c.code;
        """)

        results = cursor.fetchall()

        if results:
            print(f"✅ Found price data:")
            for row in results:
                print(f"   - {row['code']}: {row['record_count']} records ({row['earliest_date']} to {row['latest_date']})")
        else:
            print("⚠️  No price data yet. Start fetching data from LME!")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error checking data: {str(e)}")
        return False

def insert_test_data():
    """Insert a test record"""
    try:
        print("\n[DB] Inserting test data...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO commodity_prices (
                commodity_id,
                price_date,
                price_value
            ) VALUES (
                (SELECT id FROM commodities WHERE code = 'COPPER'),
                CURRENT_DATE,
                8500.00
            )
            ON CONFLICT (commodity_id, price_date)
            DO UPDATE SET
                price_value = EXCLUDED.price_value,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, price_date, price_value;
        """)

        result = cursor.fetchone()
        conn.commit()

        print(f"✅ Test data inserted/updated:")
        print(f"   ID: {result[0]}, Date: {result[1]}, Price: ${result[2]}")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error inserting test data: {str(e)}")
        return False

if __name__ == "__main__":
    print("="*50)
    print("PostgreSQL Database Connection Test")
    print("="*50)

    # Run tests
    test_connection()
    check_tables()
    check_commodities()
    check_data()
    insert_test_data()

    print("\n" + "="*50)
    print("Test complete!")
    print("="*50)
