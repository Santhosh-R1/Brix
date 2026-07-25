import sys
import psycopg2

sys.stdout.reconfigure(encoding='utf-8')

DATABASE_URL = "postgresql://brix_db_user:FIOZOOCTvpadwVfTlT5dgIsrYGZO6EuS@dpg-d98a3d7aqgkc73d98830-a.ohio-postgres.render.com/brix_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    query = """
    SELECT code, description FROM resources
    WHERE description ILIKE '%compound wall%'
    """
    cur.execute(query)
    rows = cur.fetchall()
    if rows:
        for row in rows:
            print(f"Code: {row[0]}\nDescription: {row[1]}\n")
    else:
        print("No results found.")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
