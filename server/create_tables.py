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

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_jobs (
                saved_id SERIAL PRIMARY KEY,
                user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
                job_id INT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, job_id)
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS scholarships (
                scholarship_id SERIAL PRIMARY KEY,
                scholarship_title TEXT NOT NULL,
                amount TEXT,
                deadline TEXT,
                description TEXT,
                details TEXT,
                eligibility TEXT,
                url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_scholarships (
                saved_id SERIAL PRIMARY KEY,
                user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
                scholarship_id INT NOT NULL REFERENCES scholarships(scholarship_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, scholarship_id)
            );
        """)
        
        print("Tables created or already exist.")
    except Exception as e:
        print("Error creating tables:", e)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_tables())
