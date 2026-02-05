-- ============================================
-- Commodity Data Database Setup
-- Database: commodity_data
-- ============================================

-- 1. CREATE DATABASE (run this first if database doesn't exist)
-- CREATE DATABASE commodity_data;

-- Connect to the database
-- \c commodity_data

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Table: commodities (reference table)
CREATE TABLE IF NOT EXISTS commodities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(20) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: commodity_prices (main data table)
CREATE TABLE IF NOT EXISTS commodity_prices (
    id SERIAL PRIMARY KEY,
    commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    price_date DATE NOT NULL,
    price_value DECIMAL(12, 2) NOT NULL,
    cash_bid DECIMAL(12, 2),
    cash_offer DECIMAL(12, 2),
    three_month_bid DECIMAL(12, 2),
    three_month_offer DECIMAL(12, 2),
    change_value DECIMAL(12, 2),
    change_percent DECIMAL(8, 4),
    source VARCHAR(50) DEFAULT 'LME',
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(commodity_id, price_date)
);

-- Table: fetch_logs (track data fetching)
CREATE TABLE IF NOT EXISTS fetch_logs (
    id SERIAL PRIMARY KEY,
    commodity_id INTEGER REFERENCES commodities(id) ON DELETE SET NULL,
    fetch_status VARCHAR(20) NOT NULL,
    records_fetched INTEGER DEFAULT 0,
    error_message TEXT,
    fetch_duration_ms INTEGER,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX idx_commodity_prices_date ON commodity_prices(price_date DESC);
CREATE INDEX idx_commodity_prices_commodity ON commodity_prices(commodity_id);
CREATE INDEX idx_commodity_prices_combo ON commodity_prices(commodity_id, price_date DESC);
CREATE INDEX idx_fetch_logs_date ON fetch_logs(fetched_at DESC);

-- Table: change_logs (track application level data changes)
CREATE TABLE IF NOT EXISTS change_logs (
    id SERIAL PRIMARY KEY,
    summary TEXT NOT NULL,
    details TEXT[], -- Array of strings for detailed lines
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON change_logs(created_at DESC);

-- ============================================
-- 4. INSERT REFERENCE DATA
-- ============================================

INSERT INTO commodities (code, name, description, unit) VALUES
    ('COPPER', 'Copper', 'LME Copper Official Prices', 'USD/tonne'),
    ('ZINC', 'Zinc', 'LME Zinc Official Prices', 'USD/tonne'),
    ('OIL', 'Oil (WTI)', 'WTI Crude Oil Prices', 'USD/barrel')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. CREATE FUNCTIONS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on commodity_prices
DROP TRIGGER IF EXISTS trigger_update_commodity_prices_updated_at ON commodity_prices;
CREATE TRIGGER trigger_update_commodity_prices_updated_at
    BEFORE UPDATE ON commodity_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CREATE VIEWS
-- ============================================

-- View: Latest prices for all commodities
CREATE OR REPLACE VIEW v_latest_prices AS
SELECT
    c.code,
    c.name,
    cp.price_date,
    cp.price_value,
    cp.change_value,
    cp.change_percent,
    cp.fetched_at
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
WHERE cp.price_date = (
    SELECT MAX(price_date)
    FROM commodity_prices
    WHERE commodity_id = cp.commodity_id
);

-- View: Price history with commodity names
CREATE OR REPLACE VIEW v_price_history AS
SELECT
    c.code as commodity_code,
    c.name as commodity_name,
    cp.price_date,
    cp.price_value,
    cp.cash_bid,
    cp.cash_offer,
    cp.three_month_bid,
    cp.three_month_offer,
    cp.change_value,
    cp.change_percent,
    cp.source,
    cp.fetched_at
FROM commodity_prices cp
INNER JOIN commodities c ON cp.commodity_id = c.id
ORDER BY c.code, cp.price_date DESC;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO libadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO libadmin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO libadmin;

-- ============================================
-- Database setup complete!
-- ============================================
