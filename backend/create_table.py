
import psycopg2
import os
from dotenv import load_dotenv

# Load env from .env or ../.env
if os.path.exists('.env'):
    load_dotenv('.env')
elif os.path.exists('../.env'):
    load_dotenv('../.env')

DB_CONFIG = {
    'host': os.getenv('DATABASE_HOST', 'localhost'),
    'port': int(os.getenv('DATABASE_PORT', 5432)),
    'database': os.getenv('DATABASE_NAME', 'commodity_data'),
    'user': os.getenv('DATABASE_USERNAME', 'libadmin'),
    'password': os.getenv('DATABASE_PASSWORD', '')
}

sql = """
CREATE TABLE IF NOT EXISTS change_logs (
    id SERIAL PRIMARY KEY,
    summary TEXT NOT NULL,
    details TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON change_logs(created_at DESC);
"""

try:
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    print("Table change_logs created successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
