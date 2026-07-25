import sqlite3
conn = sqlite3.connect('database.sqlite')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for table in tables:
    table_name = table[0]
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        for col in columns:
            if col != 'id':
                query = f"SELECT * FROM {table_name} WHERE \"{col}\" LIKE '%levelling%'"
                cursor.execute(query)
                rows = cursor.fetchall()
                for row in rows:
                    print(f"Found in {table_name}, column {col}: {row}")
    except Exception as e:
        print(f"Error querying {table_name}: {e}")
