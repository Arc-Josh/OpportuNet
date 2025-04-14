# File: server/create_tables.py
import asyncio
import asyncpg
from database.db import DB_URL

async def create_tables():
    conn = await asyncpg.connect(DB_URL)
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS resumes (
                id SERIAL PRIMARY KEY,
                user_email TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_data BYTEA NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("Tables created or already exist.")
    except Exception as e:
        print("Error creating tables:", e)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_tables())
