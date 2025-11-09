from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from models.user import UserCreate, UserLogin, UserResponse, ChatbotRequest, JobCreate, JobResponse
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query
from services.u_services import create_account, login, get_faq_answer, create_job_entry, get_all_jobs
from services.resume_services import extract_text_stub
from ai.chatbot import chatbot
from security import authorization
import json
from fastapi.middleware.cors import CORSMiddleware
from services.u_services import get_jobs_filtered
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import os
import services.email_services
from database.db import connect_db 
from services.u_services import remove_saved_job
from models.user import ScholarshipCreate, ScholarshipResponse
from services.ai_resume_service import analyze_resume_service
from services.u_services import (
    create_scholarship_entry, get_all_scholarships,
    save_scholarship_for_user, get_saved_scholarships,
    remove_saved_scholarship
)

# ---------------------------
# AWS S3 Config
# ---------------------------

chat_sesh = {}

app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.post("/signup")
async def signup(user: UserCreate):
    new_user = await create_account(user)
    if user.enabled:
        try:
            await services.email_services.send_test_email(user.email)
            return new_user
        except Exception as e:
            print("Email services error:", e)
    return new_user


@app.post("/login")
async def u_login(user: UserLogin):
    global chat_sesh
    chat_sesh = {}
    user = await login(user)
    
    token = user.get("access_token")
    if token:
        return {"token": token}
    raise HTTPException(status_code=400, detail="no token acquired")


@app.put("/change-password")
async def change_password():
    return {"message": "Change password not implemented yet."}


@app.put("/change-email")
async def change_email():
    return {"message": "Change email not implemented yet."}


# ---------------------------
# Resume Upload + AI Analyzer
# ---------------------------

@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    token: str = Depends(authorization.oauth2_scheme)
):
    return await analyze_resume_service(file, job_description)



@app.put("/edit-resume")
async def edit_resume():
    return {"message": "Resume update not yet implemented"}


# ---------------------------
# Chatbot
# ---------------------------
@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest, token: str = Depends(authorization.oauth2_scheme)):
    global chat_sesh
    email = authorization.get_user(token)
    chat = chat_sesh.get(email)
    answer, new_chat = await chatbot(request.question,email,chat)
    print(answer)
    if not chat_sesh:
        answer = "Hello I am Opie, how can I help you today?"
    print(chat_sesh)
    chat_sesh[email] = new_chat
    print(chat_sesh)
    return {"email": email, "answer":answer}


# ---------------------------
# Dashboard + Jobs
# ---------------------------

@app.get("/dashboard")
async def dashboard(token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    return {"email": email}


@app.post("/jobs-create", response_model=JobResponse)
async def create_job(job: JobCreate):
    return await create_job_entry(job)


@app.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    search: Optional[str] = Query(None, description="keyword in title/company/description"),
    company: Optional[str] = Query(None),
    position: Optional[str] = Query(None, description="e.g., Frontend/Backend/Fullstack/Intern"),
    location: Optional[str] = Query(None),
    location_type: Optional[str] = Query(None, description="Remote/Hybrid/On-site"),
    min_salary: Optional[int] = Query(None),
    max_salary: Optional[int] = Query(None),
    sort: Optional[str] = Query("new", description="new|salary_high|salary_low"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    return await get_jobs_filtered(
        search=search,
        company=company,
        position=position,
        location=location,
        location_type=location_type,
        min_salary=min_salary,
        max_salary=max_salary,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@app.post("/save-job/{job_id}")
async def save_job(job_id: int, token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    conn = await connect_db()
    try:
        query = """
            INSERT INTO saved_jobs (user_email, job_id)
            VALUES ($1, $2)
            ON CONFLICT (user_email, job_id) DO NOTHING
        """
        await conn.execute(query, email, job_id)
        return {"status": "success", "message": f"Job {job_id} saved"}
    finally:
        await conn.close()


@app.get("/saved-jobs")
async def list_saved_jobs(token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    conn = await connect_db()
    try:
        query = """
            SELECT j.*
            FROM saved_jobs sj
            JOIN jobs j ON sj.job_id = j.job_id
            WHERE sj.user_email = $1
            ORDER BY sj.created_at DESC
        """
        rows = await conn.fetch(query, email)
        return [dict(row) for row in rows]
    except Exception as e:
        print("error with the query or somethin: ",e)
    finally:
        await conn.close()


@app.delete("/saved-jobs/{job_id}")
async def delete_saved_job(job_id: int, token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    return await remove_saved_job(email, job_id)


# ---------------------------
# Scholarships
# ---------------------------

@app.post("/scholarships-create", response_model=ScholarshipResponse)
async def create_scholarship(scholarship: ScholarshipCreate):
    return await create_scholarship_entry(scholarship)


@app.get("/scholarships", response_model=list[ScholarshipResponse])
async def list_scholarships(
    field: list[str] = Query(None),
    deadline: str = Query(None),
    gpa: float = Query(None),
    location: str = Query(None),
    amount: int = Query(None),
    residency: str = Query(None),
):
    all_scholarships = await get_all_scholarships()
    results = all_scholarships
    if field:
        results = [s for s in results if any(f in (s.field or []) for f in field)]
    if deadline:
        results = [s for s in results if str(s.deadline) <= deadline]
    if gpa:
        results = [s for s in results if s.gpa and s.gpa >= gpa]
    if location:
        results = [s for s in results if s.location and location.lower() in s.location.lower()]
    if amount:
        results = [s for s in results if s.amount and s.amount >= amount]
    if residency:
        results = [s for s in results if s.residency and residency.lower() in s.residency.lower()]
    return results


@app.post("/save-scholarship/{scholarship_id}")
async def save_scholarship(scholarship_id: int, token: str = Depends(authorization.oauth2_scheme)):
    user_email = authorization.get_user(token)
    return await save_scholarship_for_user(user_email, scholarship_id)


@app.get("/saved-scholarships")
async def list_saved_scholarships(token: str = Depends(authorization.oauth2_scheme)):
    user_email = authorization.get_user(token)
    return await get_saved_scholarships(user_email)


@app.delete("/saved-scholarships/{scholarship_id}")
async def delete_saved_scholarship(scholarship_id: int, token: str = Depends(authorization.oauth2_scheme)):
    user_email = authorization.get_user(token)
    return await remove_saved_scholarship(user_email, scholarship_id)


# ---------------------------
# OpenAI for job info
# ---------------------------

router = APIRouter()

class RawDescription(BaseModel):
    text: str

@router.post("/parse-job-description")
async def parse_job_description(data: RawDescription):
    prompt = f"""
    You are a job description parsing assistant. Extract and format the job posting into clean fields.

    INPUT TEXT:
    {data.text}

    OUTPUT FORMAT (JSON):
    {{
      "description": "...",
      "responsibilities": ["...","..."],
      "qualifications": ["...","..."],
      "preferences": ["...","..."],
      "benefits": ["...","..."]
    }}

    Rules:
    - Do NOT lose meaning.
    - Keep bullet items whole (no splitting mid-sentence).
    - Remove prefixes like "-", "*" and "•"
    - Make every bullet start with Capital letter.
    - If a section is missing, return an empty list.
    """

    completion = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    
    parsed = completion.choices[0].message.content
    return json.loads(parsed)

app.include_router(router)