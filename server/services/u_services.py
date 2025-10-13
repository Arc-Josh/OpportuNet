from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd, get_user
from models.user import UserCreate, UserLogin, UserResponse, JobCreate, JobResponse
from models.user import ScholarshipCreate, ScholarshipResponse
from fastapi import HTTPException
import os
import json


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
<<<<<<< HEAD
                await connected.execute(
                    'INSERT INTO users(full_name,email,password_hash) VALUES($1,$2,$3)',
                    data.name, data.email, hashed_password
=======
                await connected.execute('INSERT INTO users(full_name,email,password_hash,enabled_notifications) VALUES($1,$2,$3,$4::boolean)',data.name,data.email,hashed_password,data.enabled)
            
            return{"status":"success","message":"Account Created!"}
        except Exception as l:
            print(f"database error: {l}")
            return{"status":"failure","message":f"Account NOTTTT Created!{l}"}
    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code = 400,
            detail = "Unavailable credentials"
        )
    finally:
        await connected.close()

async def login(data = UserLogin):
    try:
        connected = await connect_db()
        email_validated = await connected.fetchval("""SELECT email FROM users WHERE email = $1""",data.email)
        if email_validated:
            hashed = await connected.fetchval("""SELECT password_hash FROM users WHERE email = $1""",data.email)
            password_validated = verify_pwd(data.password,hashed)
            if password_validated:
                u_data = {"email":data.email}
                token = create_access_token(data=u_data)
                
                return{"status":"success","message":"Successful Login","access_token":token,"token_type":"bearer"}
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid Password"
>>>>>>> 02240c7476d22e8dabbc82280dac0ac0dcb2a6ac
                )
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
        query = """
            INSERT INTO scholarships (
                name, provider, description, eligibility, field,
                deadline, gpa, location, amount, residency
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING scholarship_id, name, provider, description, eligibility,
                      field, deadline, gpa, location, amount, residency, created_at;
        """
        values = (
            scholarship.name, scholarship.provider, scholarship.description,
            scholarship.eligibility, scholarship.field,
            scholarship.deadline, scholarship.gpa, scholarship.location,
            scholarship.amount, scholarship.residency
        )
        result = await conn.fetchrow(query, *values)
        return ScholarshipResponse(**dict(result))
    except Exception as e:
        print("Error creating scholarship:", e)
        raise HTTPException(status_code=400, detail="Scholarship creation failed")
    finally:
        await conn.close()


async def get_all_scholarships():
    conn = await connect_db()
    try:
        query = "SELECT * FROM scholarships ORDER BY created_at DESC"
        rows = await conn.fetch(query)
        return [ScholarshipResponse(**dict(row)) for row in rows]
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
        query = """
            SELECT s.scholarship_id, s.name, s.provider, s.description,
                   s.eligibility, s.field, s.deadline, s.gpa, s.location,
                   s.amount, s.residency, ss.created_at
            FROM saved_scholarships ss
            JOIN scholarships s ON ss.scholarship_id = s.scholarship_id
            WHERE ss.user_email = $1
            ORDER BY ss.created_at DESC;
        """
        rows = await conn.fetch(query, user_email)
        return [dict(row) for row in rows]
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
