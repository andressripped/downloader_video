import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "usage_history.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usage_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            ip_address TEXT,
            country TEXT,
            city TEXT,
            action TEXT,
            url TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_usage(ip_address: str, country: str, city: str, action: str, url: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Format datetime for better readability
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO usage_history (timestamp, ip_address, country, city, action, url)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (now, ip_address, country, city, action, url))
    conn.commit()
    conn.close()

def get_history(limit=200):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT timestamp, ip_address, country, city, action, url 
        FROM usage_history 
        ORDER BY id DESC 
        LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        result.append({
            "timestamp": row[0],
            "ip_address": row[1],
            "country": row[2],
            "city": row[3],
            "action": row[4],
            "url": row[5]
        })
    return result
