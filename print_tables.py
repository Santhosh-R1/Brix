import sqlite3
c = sqlite3.connect('database.sqlite')
print([t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()])
