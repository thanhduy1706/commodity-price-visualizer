-- ============================================
-- USEFUL QUERIES FOR COMMODITY DATA
-- ============================================

-- ============================================
-- 1. INSERT DATA
-- ============================================

-- Insert Copper price
INSERT INTO commodity_prices (
    commodity_id,
    price_date,
    price_value,
    cash_bid,
    cash_offer,
    three_month_bid,
    three_month_offer
) VALUES (
    (SELECT id FROM commodities WHERE code = 'COPPER'),
    '2026-02-04',
    8542.50,
    8540.00,
    8545.00,
    8600.00,
    8605.00
) ON CONFLICT (commodity_id, price_date)
DO UPDATE SET
    price_value = EXCLUDED.price_value,
    cash_bid = EXCLUDED.cash_bid,
    cash_offer = EXCLUDED.cash_offer,
    three_month_bid = EXCLUDED.three_month_bid,
    three_month_offer = EXCLUDED.three_month_offer,
    updated_at = CURRENT_TIMESTAMP;

-- Bulk insert (from JSON data)
-- Use this template with your Python/Node.js backend
/*
INSERT INTO commodity_prices (commodity_id, price_date, price_value, cash_bid)
SELECT
    (SELECT id FROM commodities WHERE code = 'COPPER'),
    date_col,
    value_col,
    bid_col
FROM json_populate_recordset(null::record, '[
    {"date": "2023-01-01", "value": 8542.50, "bid": 8540.00},
    {"date": "2023-01-02", "value": 8598.00, "bid": 8595.00}
]'::json) AS (date_col date, value_col numeric, bid_col numeric)
ON CONFLICT (commodity_id, price_date) DO NOTHING;
*/

-- ============================================
-- 2. SELECT QUERIES
-- ============================================

-- Get all latest prices
SELECT * FROM v_latest_prices;

-- Get all Copper prices from 2023 onwards
SELECT
    price_date,
    price_value,
    cash_bid,
    cash_offer
FROM commodity_prices
WHERE commodity_id = (SELECT id FROM commodities WHERE code = 'COPPER')
  AND price_date >= '2023-01-01'
ORDER BY price_date DESC;

-- Get price comparison (all commodities on same dates)
SELECT
    cp.price_date,
    MAX(CASE WHEN c.code = 'COPPER' THEN cp.price_value END) as copper_price,
    MAX(CASE WHEN c.code = 'ZINC' THEN cp.price_value END) as zinc_price,
    MAX(CASE WHEN c.code = 'OIL' THEN cp.price_value END) as oil_price
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
WHERE cp.price_date >= '2023-01-01'
GROUP BY cp.price_date
ORDER BY cp.price_date DESC;

-- Get price statistics (last 30 days)
SELECT
    c.code,
    c.name,
    COUNT(*) as data_points,
    MIN(cp.price_value) as min_price,
    MAX(cp.price_value) as max_price,
    AVG(cp.price_value) as avg_price,
    STDDEV(cp.price_value) as std_deviation
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
WHERE cp.price_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.code, c.name
ORDER BY c.code;

-- Get price changes (day-over-day)
SELECT
    c.code,
    cp.price_date,
    cp.price_value,
    LAG(cp.price_value) OVER (PARTITION BY c.code ORDER BY cp.price_date) as prev_price,
    cp.price_value - LAG(cp.price_value) OVER (PARTITION BY c.code ORDER BY cp.price_date) as change,
    ROUND(
        ((cp.price_value - LAG(cp.price_value) OVER (PARTITION BY c.code ORDER BY cp.price_date)) /
        LAG(cp.price_value) OVER (PARTITION BY c.code ORDER BY cp.price_date) * 100),
        2
    ) as change_percent
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
WHERE cp.price_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.code, cp.price_date DESC;

-- Get data for chart (last 90 days, all commodities)
SELECT
    TO_CHAR(cp.price_date, 'YYYY-MM-DD') as date,
    c.code,
    cp.price_value
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
WHERE cp.price_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY cp.price_date DESC, c.code;

-- ============================================
-- 3. UPDATE QUERIES
-- ============================================

-- Update a specific price
UPDATE commodity_prices
SET
    price_value = 8600.00,
    cash_bid = 8598.00,
    cash_offer = 8602.00
WHERE commodity_id = (SELECT id FROM commodities WHERE code = 'COPPER')
  AND price_date = '2026-02-04';

-- ============================================
-- 4. DELETE QUERIES
-- ============================================

-- Delete old data (older than 2 years)
DELETE FROM commodity_prices
WHERE price_date < CURRENT_DATE - INTERVAL '2 years';

-- Delete specific commodity data
DELETE FROM commodity_prices
WHERE commodity_id = (SELECT id FROM commodities WHERE code = 'OIL')
  AND price_date < '2023-01-01';

-- ============================================
-- 5. MAINTENANCE QUERIES
-- ============================================

-- Check data count per commodity
SELECT
    c.code,
    c.name,
    COUNT(*) as total_records,
    MIN(cp.price_date) as earliest_date,
    MAX(cp.price_date) as latest_date
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
GROUP BY c.code, c.name
ORDER BY c.code;

-- Find missing dates (gaps in data)
SELECT
    c.code,
    date_series.date as missing_date
FROM commodities c
CROSS JOIN GENERATE_SERIES(
    '2023-01-01'::date,
    CURRENT_DATE,
    '1 day'::interval
) AS date_series(date)
LEFT JOIN commodity_prices cp ON
    cp.commodity_id = c.id AND
    cp.price_date = date_series.date
WHERE cp.id IS NULL
  AND EXTRACT(DOW FROM date_series.date) NOT IN (0, 6) -- Exclude weekends
ORDER BY c.code, date_series.date;

-- Check recent fetch logs
SELECT
    fl.id,
    c.code,
    fl.fetch_status,
    fl.records_fetched,
    fl.fetch_duration_ms,
    fl.fetched_at,
    fl.error_message
FROM fetch_logs fl
LEFT JOIN commodities c ON fl.commodity_id = c.id
ORDER BY fl.fetched_at DESC
LIMIT 20;

-- Database size and table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze (maintenance)
-- VACUUM ANALYZE commodity_prices;
-- VACUUM ANALYZE fetch_logs;

-- ============================================
-- 6. EXPORT QUERIES
-- ============================================

-- Export to CSV (run in psql)
-- \copy (SELECT * FROM v_price_history WHERE price_date >= '2023-01-01') TO 'commodity_prices.csv' CSV HEADER;

-- Export latest prices to JSON-like format
SELECT
    json_agg(
        json_build_object(
            'code', code,
            'name', name,
            'date', price_date,
            'price', price_value,
            'change', change_value,
            'change_percent', change_percent
        )
    )
FROM v_latest_prices;

-- ============================================
-- End of queries
-- ============================================
