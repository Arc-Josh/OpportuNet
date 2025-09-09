from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd, get_user
from models.user import UserCreate, UserLogin, UserResponse, JobCreate, JobResponse
from fastapi import HTTPException
import os
import json


#any other user services, (IE database queries) will be added in this file 
async def create_account(data = UserCreate):
    try:
        connected = await connect_db()
        if not connected:
            return {"status":"error","message":"failed to connect to database"}
        hashed = hash_pwd(data.password)
        hashed_password = hashed.decode('utf-8')
        try:
            async with connected.transaction():
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
                )
                #return{"status":"failure","message":"Incorrect Password"}
        else:
            raise HTTPException(
                status_code=400,
                detail="Email not found"
            )
            return{"status":"failure","message":"Email Not Found"}

    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code=400,
            detail="Login Unsuccessful"
        )
    finally:
        await connected.close()

async def change_password():
    return 0

def load_faqs():
    """
    Load FAQ data from an external JSON file (faqs.json).
    """
    faq_path = os.path.join(os.path.dirname(__file__), "faqs.json")
    try:
        with open(faq_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        return []
    
faqs = load_faqs()

def get_faq_answer(question: str) -> str:
    """
    Return an answer by checking if any of the provided keywords exist in the question.
    """
    lower_question = question.lower()
    for faq in faqs:
        keywords = faq.get("keywords", [])
        if any(keyword.lower() in lower_question for keyword in keywords):
            return faq.get("answer")
    
    return (
        "I'm not sure how to answer that. You can ask about jobs, scholarships, or our application processes!"
    )
async def create_job_entry(job: JobCreate):
    try:
        connected = await connect_db()
        query = """
            INSERT INTO jobs (
                job_name, location, salary, position, hr_contact_number,
                qualifications, preferences, benefits, mission_statement
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING job_id, job_name, location, salary, position,
                      hr_contact_number, qualifications, preferences,
                      benefits, mission_statement, created_at
        """
        values = (
            job.job_name, job.location, job.salary, job.position,
            job.hr_contact_number, job.qualifications, job.preferences,
            job.benefits, job.mission_statement
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