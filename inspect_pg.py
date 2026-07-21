import psycopg2
import os

DATABASE_URL = "postgresql://brix_db_user:FIOZOOCTvpadwVfTlT5dgIsrYGZO6EuS@dpg-d98a3d7aqgkc73d98830-a.ohio-postgres.render.com/brix_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM resources")
    count = cur.fetchone()[0]
    print(f"Total resources: {count}")
    
    if count > 0:
        cur.execute("SELECT code, description FROM resources LIMIT 20")
        rows = cur.fetchall()
        for row in rows:
            print(f" - {row[0]}: {row[1]}")
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
