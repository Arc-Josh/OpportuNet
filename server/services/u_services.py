from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd, get_user
from models.user import UserCreate, UserLogin, UserResponse, JobCreate, JobResponse
from models.user import ScholarshipCreate, ScholarshipResponse
from models.user import UserProfileResponse, UserProfileUpdate
from fastapi import HTTPException
import os
import json
from typing import Optional, List
import re
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
        allowed_cols = ['scholarship_title', 'amount', 'deadline', 'description', 'details', 'eligibility', 'url']

        def _parse_deadline(deadline_str):
            if not deadline_str or not isinstance(deadline_str, str):
                return None
            if dateutil_parser:
                try:
                    dt = dateutil_parser.parse(deadline_str)
                    return dt.date() if isinstance(dt, datetime) else dt
                except Exception:
                    pass

            fmts = ["%B %d, %Y", "%b %d, %Y", "%m/%d/%Y", "%Y-%m-%d", "%B %d %Y"]
            for fmt in fmts:
                try:
                    return datetime.strptime(deadline_str.strip(), fmt).date()
                except Exception:
                    continue
            return None


        cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'scholarships'")
        existing = {r['column_name'] for r in cols}
        insert_cols = [c for c in allowed_cols if c in existing]


        if 'name' in existing and 'scholarship_title' not in existing:
    
            if 'name' not in insert_cols:
                insert_cols.insert(0, 'name')

        if not insert_cols:
            raise HTTPException(status_code=500, detail='No compatible scholarship columns found in scholarships table')


        values = []
        for c in insert_cols:
            if c == 'deadline':
                parsed = _parse_deadline(scholarship.deadline)
                values.append(parsed)
            elif c == 'name':
    
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
      
            if 'name' in row_dict and 'scholarship_title' not in row_dict:
                row_dict['scholarship_title'] = row_dict.get('name')
          
            if 'deadline' in row_dict and isinstance(row_dict['deadline'], date):
                row_dict['deadline'] = row_dict['deadline'].isoformat()
 
            if 'details' not in row_dict and 'field' in row_dict:
                row_dict['details'] = row_dict.get('field')
            
            if 'application_link' in row_dict and 'url' not in row_dict:
                row_dict['url'] = row_dict['application_link']

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
   
        cols_query = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'scholarships'")
        available_cols = {r['column_name'] for r in cols_query}
        
    
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
        
        if 'application_link' in available_cols:
            select_parts.append('s.application_link AS url')
        else:
            select_parts.append('NULL AS url')
        
        select_parts.append('ss.created_at')
        
        query = f"""
            SELECT {', '.join(select_parts)}
            FROM saved_scholarships ss
            JOIN scholarships s ON ss.scholarship_id = s.scholarship_id
            WHERE ss.user_email = $1
            ORDER BY ss.created_at DESC;
        """
        rows = await conn.fetch(query, user_email)
    
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

# ---------------------------
# Profile Services
# ---------------------------

async def get_user_profile(user_email: str):
    conn = await connect_db()
    try:
        query = """
            SELECT p.profile_id, p.user_id, u.email, p.bio, p.avatar, p.created_at, p.updated_at
            FROM profiles p
            JOIN users u ON p.user_id = u.id
            WHERE u.email = $1
        """
        row = await conn.fetchrow(query, user_email)
        if not row:
            # Create an empty profile if not found
            user_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", user_email)
            if not user_id:
                raise HTTPException(status_code=404, detail="User not found")
            await conn.execute("INSERT INTO profiles (user_id, bio) VALUES ($1, $2)", user_id, "")
            return UserProfileResponse(profile_id=None, user_id=user_id, email=user_email, bio="", avatar=None)
        return UserProfileResponse(**dict(row))
    except Exception as e:
        print("Error fetching profile:", e)
        raise HTTPException(status_code=500, detail="Could not fetch profile")
    finally:
        await conn.close()


async def update_user_profile(user_email: str, data: UserProfileUpdate):
    conn = await connect_db()
    try:
        user_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", user_email)
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        query = """
            UPDATE profiles
            SET bio = $1, avatar = $2, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3
            RETURNING profile_id, user_id, $4 as email, bio, avatar, created_at, updated_at
        """
        row = await conn.fetchrow(query, data.bio, data.avatar, user_id, user_email)
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return UserProfileResponse(**dict(row))
    except Exception as e:
        print("Error updating profile:", e)
        raise HTTPException(status_code=500, detail="Could not update profile")
    
    finally:
        await conn.close()

        from fastapi import HTTPException

async def save_user_resume(email: str, file_name: str, file_data: bytes):
    conn = await connect_db()
    try:
        query = """
            INSERT INTO resumes (user_email, file_name, file_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_email) DO UPDATE
            SET file_name = EXCLUDED.file_name,
                file_data = EXCLUDED.file_data,
                uploaded_at = NOW()
            RETURNING id, file_name;
        """
        result = await conn.fetchrow(query, email, file_name, file_data)
        return dict(result)
    finally:
        await conn.close()


def _normalize_sort(sort: Optional[str]) -> str:
    if not sort:
        return "new"
    s = sort.lower().strip()
    return s if s in {"new", "salary_high", "salary_low"} else "new"

async def get_jobs_filtered(
    search: Optional[str] = None,
    company: Optional[str] = None,
    position: Optional[str] = None,
    location: Optional[str] = None,
    location_type: Optional[str] = None, 
    min_salary: Optional[int] = None,
    max_salary: Optional[int] = None,
    sort: Optional[str] = "new",
    page: int = 1,
    page_size: int = 25,
) -> List[JobResponse]:
    conn = await connect_db()
    try:
        where = []
        args = []
        i = 1

        # keyword search across job_name, company_name, description
        if search:
            where.append(f"(job_name ILIKE ${i} OR company_name ILIKE ${i} OR description ILIKE ${i})")
            args.append(f"%{search}%"); i += 1

        if company:
            where.append(f"(company_name ILIKE ${i})")
            args.append(f"%{company}%"); i += 1

        if location:
            where.append(f"(location ILIKE ${i})")
            args.append(f"%{location}%"); i += 1

        # position filter (no schema change) -> infer from job_name
        # ex: Frontend/Backend/Fullstack/Intern or any text passed
        if position:
            where.append(f"(job_name ILIKE ${i})")
            args.append(f"%{position}%"); i += 1

        # location_type filter -> match in location/description text
        # allowed: Remote / Hybrid / On-site
        if location_type:
            lt = location_type.lower()
            if lt in ("remote", "hybrid", "on-site", "onsite"):
                like_val = "on-site" if lt in ("on-site", "onsite") else lt
                where.append(f"(location ILIKE ${i} OR description ILIKE ${i})")
                args.append(f"%{like_val}%"); i += 1

        # Salary range — extract numeric digits from salary TEXT and cast to INT
        # This works for '70,000 - 100,000 a year', '$120k - $140k' etc.
        # If the salary text has multiple numbers, we take the first one (MIN edge).
        # NOTE: If you later add numeric columns, we can upgrade this easily.
        if min_salary is not None:
            where.append(
                """(
                     salary ~ '\\d' -- contains any digit
                     AND CAST(NULLIF(regexp_replace(salary, '[^0-9]', '', 'g'), '') AS INT) >= $%s
                   )""" % i
            )
            args.append(min_salary); i += 1

        if max_salary is not None:
            where.append(
                """(
                     salary ~ '\\d' 
                     AND CAST(NULLIF(regexp_replace(salary, '[^0-9]', '', 'g'), '') AS INT) <= $%s
                   )""" % i
            )
            args.append(max_salary); i += 1

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""
        s = _normalize_sort(sort)
        if s == "new":
            order_sql = "ORDER BY created_at DESC"
        elif s == "salary_high":
            order_sql = """ORDER BY 
                CASE WHEN salary ~ '\\d' 
                     THEN CAST(NULLIF(regexp_replace(salary, '[^0-9]', '', 'g'), '') AS INT)
                     ELSE NULL END DESC NULLS LAST, created_at DESC"""
        else:  # salary_low
            order_sql = """ORDER BY 
                CASE WHEN salary ~ '\\d' 
                     THEN CAST(NULLIF(regexp_replace(salary, '[^0-9]', '', 'g'), '') AS INT)
                     ELSE NULL END ASC NULLS LAST, created_at DESC"""

        offset = (page - 1) * page_size
        query = f"""
            SELECT job_id, job_name, location, salary, application_link, hr_contact_number,
                   qualifications, preferences, benefits, mission_statement, created_at,
                   company_name, description
            FROM jobs
            {where_sql}
            {order_sql}
            LIMIT $%s OFFSET $%s
        """ % (i, i+1)
        args.extend([page_size, offset])

        rows = await conn.fetch(query, *args)
        return [JobResponse(**dict(r)) for r in rows]
    except Exception as e:
        print("Error filtering jobs:", e)
        raise HTTPException(status_code=500, detail="Could not retrieve jobs")
    finally:
        await conn.close()