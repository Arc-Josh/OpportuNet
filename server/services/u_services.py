from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd, get_user
from models.user import UserCreate, UserLogin, UserResponse, JobCreate, JobResponse
from models.user import ScholarshipCreate, ScholarshipResponse
from fastapi import HTTPException
import os
import json
from datetime import datetime, date

try:
    from dateutil import parser as dateutil_parser
except Exception:
    dateutil_parser = None


#any other user services, (IE database queries) will be added in this file
async def create_account(data=UserCreate):
    try:
        connected = await connect_db()
        if not connected:
            return {"status": "error", "message": "failed to connect to database"}
        hashed = hash_pwd(data.password)
        hashed_password = hashed.decode('utf-8')
        try:
            async with connected.transaction():
                await connected.execute(
                    'INSERT INTO users(full_name,email,password_hash) VALUES($1,$2,$3)',
                    data.name, data.email, hashed_password)
            return {"status": "success", "message": "Account Created!"}
        except Exception as l:
            return {"status": "failure", "message": f"Account NOTTTT Created!{l}"}
    except Exception as e:
        print(f"error occurred {e}")
        raise HTTPException(
            status_code=400,
            detail="Unavailable credentials"
        )
    finally:
        await connected.close()


async def login(data=UserLogin):
    try:
        connected = await connect_db()
        email_validated = await connected.fetchval(
            """SELECT email FROM users WHERE email = $1""", data.email
        )
        if email_validated:
            hashed = await connected.fetchval(
                """SELECT password_hash FROM users WHERE email = $1""", data.email
            )
            password_validated = verify_pwd(data.password, hashed)
            if password_validated:
                u_data = {"email": data.email}
                token = create_access_token(data=u_data)
                return {
                    "status": "success",
                    "message": "Successful Login",
                    "access_token": token,
                    "token_type": "bearer"
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid Password")
        else:
            raise HTTPException(status_code=400, detail="Email not found")
    except Exception as e:
        print(f"error occurred {e}")
        raise HTTPException(status_code=400, detail="Login Unsuccessful")
    finally:
        await connected.close()


async def change_password():
    return 0


def load_faqs():
    faq_path = os.path.join(os.path.dirname(__file__), "faqs.json")
    try:
        with open(faq_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        return []


faqs = load_faqs()


def get_faq_answer(question: str) -> str:
    lower_question = question.lower()
    for faq in faqs:
        keywords = faq.get("keywords", [])
        if any(keyword.lower() in lower_question for keyword in keywords):
            return faq.get("answer")
    return "I'm not sure how to answer that. You can ask about jobs, scholarships, or our application processes!"


async def create_job_entry(job: JobCreate):
    try:
        connected = await connect_db()
        query = """
            INSERT INTO jobs (
                job_name, location, salary, application_link, hr_contact_number,
                qualifications, preferences, benefits, mission_statement,
                company_name, description
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING job_id, job_name, location, salary, application_link,
                      hr_contact_number, qualifications, preferences,
                      benefits, mission_statement, created_at,
                      company_name, description
        """
        values = (
            job.job_name, job.location, job.salary, job.application_link,
            job.hr_contact_number, job.qualifications, job.preferences,
            job.benefits, job.mission_statement,
            job.company_name, job.description
        )
        result = await connected.fetchrow(query, *values)
        return JobResponse(**dict(result))
    except Exception as e:
        print(f"Error creating job: {e}")
        raise HTTPException(status_code=400, detail="Job creation failed")
    finally:
        await connected.close()


async def get_all_jobs():
    try:
        connected = await connect_db()
        query = "SELECT * FROM jobs ORDER BY created_at DESC"
        rows = await connected.fetch(query)
        return [JobResponse(**dict(row)) for row in rows]
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve jobs")
    finally:
        await connected.close()


async def save_job_for_user(user_email: str, job_id: int):
    conn = await connect_db()
    try:
        query = """
            INSERT INTO saved_jobs (user_email, job_id)
            VALUES ($1, $2)
            ON CONFLICT (user_email, job_id) DO NOTHING
            RETURNING saved_id;
        """
        saved_id = await conn.fetchval(query, user_email, job_id)
        return {"status": "success", "saved_id": saved_id}
    except Exception as e:
        print("Error saving job:", e)
        raise HTTPException(status_code=500, detail="Failed to save job")
    finally:
        await conn.close()


async def get_saved_jobs(user_email: str):
    conn = await connect_db()
    try:
        query = """
            SELECT j.job_id, j.job_name, j.location, j.salary, j.application_link,
                   j.company_name, j.description, j.qualifications, j.preferences,
                   j.benefits, j.mission_statement, j.hr_contact_number, s.created_at
            FROM saved_jobs s
            JOIN jobs j ON s.job_id = j.job_id
            WHERE s.user_email = $1
            ORDER BY s.created_at DESC;
        """
        rows = await conn.fetch(query, user_email)
        return [dict(row) for row in rows]
    except Exception as e:
        print("Error fetching saved jobs:", e)
        raise HTTPException(status_code=500, detail="Could not retrieve saved jobs")
    finally:
        await conn.close()


async def remove_saved_job(user_email: str, job_id: int):
    try:
        connected = await connect_db()
        query = "DELETE FROM saved_jobs WHERE user_email = $1 AND job_id = $2 RETURNING saved_id"
        result = await connected.fetchval(query, user_email, job_id)
        if not result:
            raise HTTPException(status_code=404, detail="Saved job not found")
        return {"status": "success", "message": "Job removed from saved list"}
    except Exception as e:
        print(f"Error removing saved job: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove saved job")
    finally:
        await connected.close()


async def create_scholarship_entry(scholarship: ScholarshipCreate):
    conn = await connect_db()
    try:
        # Only use canonical scholarship fields from the scraper
        allowed_cols = ['scholarship_title', 'amount', 'deadline', 'description', 'details', 'eligibility', 'url']

        # Parse deadline into a datetime.date if present to avoid asyncpg toordinal errors
        def _parse_deadline(deadline_str):
            if not deadline_str or not isinstance(deadline_str, str):
                return None
            # try dateutil if available
            if dateutil_parser:
                try:
                    dt = dateutil_parser.parse(deadline_str)
                    return dt.date() if isinstance(dt, datetime) else dt
                except Exception:
                    pass
            # common formats
            fmts = ["%B %d, %Y", "%b %d, %Y", "%m/%d/%Y", "%Y-%m-%d", "%B %d %Y"]
            for fmt in fmts:
                try:
                    return datetime.strptime(deadline_str.strip(), fmt).date()
                except Exception:
                    continue
            return None

        # Discover which allowed columns exist in the DB
        cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'scholarships'")
        existing = {r['column_name'] for r in cols}
        insert_cols = [c for c in allowed_cols if c in existing]

        # If the DB still uses legacy 'name' column as NOT NULL, include it and map from scholarship_title
        if 'name' in existing and 'scholarship_title' not in existing:
            # ensure 'name' is present in insert columns (and earlier than others for readability)
            if 'name' not in insert_cols:
                insert_cols.insert(0, 'name')

        if not insert_cols:
            raise HTTPException(status_code=500, detail='No compatible scholarship columns found in scholarships table')

        # Prepare values from the ScholarshipCreate model (map name<-scholarship_title if name is used)
        values = []
        for c in insert_cols:
            if c == 'deadline':
                parsed = _parse_deadline(scholarship.deadline)
                values.append(parsed)
            elif c == 'name':
                # map legacy name to the scraper's scholarship_title
                values.append(scholarship.scholarship_title)
            else:
                values.append(getattr(scholarship, c, None))

        cols_sql = ', '.join(insert_cols)
        placeholders = ', '.join([f'${i+1}' for i in range(len(insert_cols))])
        query = f"INSERT INTO scholarships ({cols_sql}) VALUES ({placeholders}) RETURNING *;"
        result = await conn.fetchrow(query, *values)

        if not result:
            raise HTTPException(status_code=400, detail='Insert returned no result')

        row = dict(result)
        # Normalize returned row to ScholarshipResponse fields
        # Convert deadline back to string (Pydantic expects str, not date)
        deadline_val = row.get('deadline')
        if isinstance(deadline_val, date):
            deadline_val = deadline_val.isoformat()
        resp = {
            'scholarship_id': row.get('scholarship_id'),
            'scholarship_title': row.get('scholarship_title') or row.get('name'),
            'amount': row.get('amount'),
            'deadline': deadline_val,
            'description': row.get('description'),
            'details': row.get('details'),
            'eligibility': row.get('eligibility'),
            'url': row.get('url'),
            'created_at': row.get('created_at')
        }
        return ScholarshipResponse(**resp)
    except HTTPException:
        raise
    except Exception as e:
        print('Error creating scholarship (dynamic insert):', repr(e))
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await conn.close()


async def get_all_scholarships():
    conn = await connect_db()
    try:
        query = "SELECT * FROM scholarships ORDER BY created_at DESC"
        rows = await conn.fetch(query)
        scholarships = []
        for row in rows:
            row_dict = dict(row)
            # Normalize legacy schema to canonical fields
            if 'name' in row_dict and 'scholarship_title' not in row_dict:
                row_dict['scholarship_title'] = row_dict.get('name')
            # Convert deadline date to string
            if 'deadline' in row_dict and isinstance(row_dict['deadline'], date):
                row_dict['deadline'] = row_dict['deadline'].isoformat()
            # Map details fallback
            if 'details' not in row_dict and 'field' in row_dict:
                row_dict['details'] = row_dict.get('field')
            scholarships.append(ScholarshipResponse(**row_dict))
        return scholarships
    except Exception as e:
        print("Error fetching scholarships:", e)
        raise HTTPException(status_code=500, detail="Could not retrieve scholarships")
    finally:
        await conn.close()


async def save_scholarship_for_user(user_email: str, scholarship_id: int):
    conn = await connect_db()
    try:
        query = """
            INSERT INTO saved_scholarships (user_email, scholarship_id)
            VALUES ($1, $2)
            ON CONFLICT (user_email, scholarship_id) DO NOTHING
            RETURNING saved_id;
        """
        saved_id = await conn.fetchval(query, user_email, scholarship_id)
        return {"status": "success", "saved_id": saved_id}
    except Exception as e:
        print("Error saving scholarship:", e)
        raise HTTPException(status_code=500, detail="Failed to save scholarship")
    finally:
        await conn.close()


async def get_saved_scholarships(user_email: str):
    conn = await connect_db()
    try:
        # Discover available columns in scholarships table
        cols_query = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'scholarships'")
        available_cols = {r['column_name'] for r in cols_query}
        
        # Build SELECT dynamically based on available columns
        select_parts = ['s.scholarship_id']
        if 'scholarship_title' in available_cols:
            select_parts.append('s.scholarship_title')
        elif 'name' in available_cols:
            select_parts.append('s.name as scholarship_title')
        
        select_parts.extend(['s.amount', 's.deadline', 's.description'])
        
        if 'details' in available_cols:
            select_parts.append('s.details')
        else:
            select_parts.append('NULL as details')
        
        select_parts.append('s.eligibility')
        
        if 'url' in available_cols:
            select_parts.append('s.url')
        else:
            select_parts.append('NULL as url')
        
        select_parts.append('ss.created_at')
        
        query = f"""
            SELECT {', '.join(select_parts)}
            FROM saved_scholarships ss
            JOIN scholarships s ON ss.scholarship_id = s.scholarship_id
            WHERE ss.user_email = $1
            ORDER BY ss.created_at DESC;
        """
        rows = await conn.fetch(query, user_email)
        # Normalize date fields to strings
        result = []
        for row in rows:
            row_dict = dict(row)
            if 'deadline' in row_dict and isinstance(row_dict['deadline'], date):
                row_dict['deadline'] = row_dict['deadline'].isoformat()
            result.append(row_dict)
        return result
    except Exception as e:
        print("Error fetching saved scholarships:", e)
        raise HTTPException(status_code=500, detail="Could not retrieve saved scholarships")
    finally:
        await conn.close()


async def remove_saved_scholarship(user_email: str, scholarship_id: int):
    conn = await connect_db()
    try:
        query = """
            DELETE FROM saved_scholarships
            WHERE user_email = $1 AND scholarship_id = $2
            RETURNING saved_id;
        """
        result = await conn.fetchval(query, user_email, scholarship_id)
        if not result:
            raise HTTPException(status_code=404, detail="Saved scholarship not found")
        return {"status": "success", "message": "Scholarship removed from saved list"}
    except Exception as e:
        print("Error removing scholarship:", e)
        raise HTTPException(status_code=500, detail="Failed to remove saved scholarship")
    finally:
        await conn.close()
