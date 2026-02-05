# Database Setup Guide

## 🗄️ Database: `commodity_data`

PostgreSQL database for storing commodity price data (Copper, Zinc, Oil).

---

## 📁 Files

- `setup.sql` - Initial database setup (tables, indexes, views)
- `queries.sql` - Useful queries for daily operations
- `README.md` - This file

---

## 🚀 Quick Start

### 1. Connect to PostgreSQL

```bash
psql -h 100.105.169.18 -U libadmin -d postgres
```

### 2. Create Database

```sql
CREATE DATABASE commodity_data;
```

### 3. Connect to New Database

```bash
psql -h 100.105.169.18 -U libadmin -d commodity_data
```

Or in psql:

```sql
\c commodity_data
```

### 4. Run Setup Script

```bash
psql -h 100.105.169.18 -U libadmin -d commodity_data -f setup.sql
```

---

## 📊 Database Schema

### Tables

#### 1. `commodities`

Reference table for commodity types

- `id` - Primary key
- `code` - Unique code (COPPER, ZINC, OIL)
- `name` - Display name
- `description` - Description
- `unit` - Price unit (USD/tonne, USD/barrel)

#### 2. `commodity_prices`

Main price data table

- `id` - Primary key
- `commodity_id` - Foreign key to commodities
- `price_date` - Date of price
- `price_value` - Main price value
- `cash_bid`, `cash_offer` - Bid/offer prices
- `three_month_bid`, `three_month_offer` - 3-month prices
- `change_value`, `change_percent` - Price changes
- `source` - Data source (LME, etc.)
- `fetched_at` - When data was fetched

#### 3. `fetch_logs`

Track data fetching operations

- `id` - Primary key
- `commodity_id` - Which commodity
- `fetch_status` - success/failure
- `records_fetched` - Number of records
- `error_message` - Error details if failed
- `fetch_duration_ms` - How long it took

### Views

#### `v_latest_prices`

Latest price for each commodity

#### `v_price_history`

Complete price history with commodity names

---

## 🔍 Common Queries

### Check what's in the database

```sql
-- See all commodities
SELECT * FROM commodities;

-- Count records per commodity
SELECT
    c.code,
    COUNT(*) as records,
    MIN(cp.price_date) as earliest,
    MAX(cp.price_date) as latest
FROM commodity_prices cp
JOIN commodities c ON cp.commodity_id = c.id
GROUP BY c.code;
```

### Get latest prices

```sql
SELECT * FROM v_latest_prices;
```

### Get price history

```sql
-- Last 30 days
SELECT *
FROM v_price_history
WHERE price_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY price_date DESC;
```

### Insert new price

```sql
INSERT INTO commodity_prices (
    commodity_id,
    price_date,
    price_value
) VALUES (
    (SELECT id FROM commodities WHERE code = 'COPPER'),
    '2026-02-04',
    8542.50
) ON CONFLICT (commodity_id, price_date)
DO UPDATE SET price_value = EXCLUDED.price_value;
```

---

## 🔧 Maintenance

### Check database size

```sql
SELECT pg_size_pretty(pg_database_size('commodity_data'));
```

### Vacuum and analyze

```sql
VACUUM ANALYZE commodity_prices;
VACUUM ANALYZE fetch_logs;
```

### Backup database

```bash
pg_dump -h 100.105.169.18 -U libadmin -d commodity_data > backup_$(date +%Y%m%d).sql
```

### Restore database

```bash
psql -h 100.105.169.18 -U libadmin -d commodity_data < backup_20260204.sql
```

---

## 📈 Integration with Python Backend

Add these queries to your `backend/main.py`:

```python
import psycopg2
from psycopg2.extras import execute_values

# Connection
conn = psycopg2.connect(
    host="100.105.169.18",
    port=5432,
    database="commodity_data",
    user="libadmin",
    password="Jentle1706"
)

# Insert data
def save_to_database(commodity_code, data):
    cursor = conn.cursor()

    # Get commodity ID
    cursor.execute(
        "SELECT id FROM commodities WHERE code = %s",
        (commodity_code,)
    )
    commodity_id = cursor.fetchone()[0]

    # Prepare data for bulk insert
    values = [
        (commodity_id, item['date'], item['value'])
        for item in data
    ]

    # Bulk insert
    execute_values(
        cursor,
        """
        INSERT INTO commodity_prices (commodity_id, price_date, price_value)
        VALUES %s
        ON CONFLICT (commodity_id, price_date)
        DO UPDATE SET price_value = EXCLUDED.price_value
        """,
        values
    )

    conn.commit()
    cursor.close()

# Query data
def get_chart_data():
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            c.code,
            TO_CHAR(cp.price_date, 'YYYY-MM-DD') as date,
            cp.price_value
        FROM commodity_prices cp
        JOIN commodities c ON cp.commodity_id = c.id
        WHERE cp.price_date >= '2023-01-01'
        ORDER BY cp.price_date, c.code
    """)

    results = cursor.fetchall()
    cursor.close()

    return results
```

---

## ✅ Verify Setup

Run these checks after setup:

```sql
-- 1. Check tables exist
\dt

-- 2. Check commodities are loaded
SELECT * FROM commodities;

-- 3. Check views work
SELECT * FROM v_latest_prices;

-- 4. Test insert
INSERT INTO commodity_prices (
    commodity_id,
    price_date,
    price_value
) VALUES (
    (SELECT id FROM commodities WHERE code = 'COPPER'),
    CURRENT_DATE,
    8500.00
);

-- 5. Verify insert
SELECT * FROM commodity_prices ORDER BY created_at DESC LIMIT 1;
```

---

## 🎯 Next Steps

1. ✅ Run `setup.sql` to create all tables
2. ✅ Verify with the checks above
3. ✅ Integrate with Python backend to auto-save fetched data
4. ✅ Set up daily cron job to fetch and store data
5. ✅ Create backup routine

---

## 📞 Connection Details

- **Host:** 100.105.169.18
- **Port:** 5432
- **Database:** commodity_data
- **Username:** libadmin
- **Password:** (in .env file)

---

**Database ready for use!** 🎊
