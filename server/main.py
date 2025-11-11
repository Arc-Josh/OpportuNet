from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import APIRouter
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import os
import re

# Models
from models.user import (
    UserCreate, UserLogin, UserResponse, ChatbotRequest,
    JobCreate, JobResponse, ScholarshipCreate, ScholarshipResponse
)

# Services
from services.u_services import (
    create_account, login, get_faq_answer, create_job_entry, get_all_jobs,
    remove_saved_job, create_scholarship_entry, get_all_scholarships,
    save_scholarship_for_user, get_saved_scholarships, remove_saved_scholarship, get_jobs_filtered
)
from services.ai_resume_service import analyze_resume_service
from services.profile_service import get_profile, save_profile
from services.resume_services import extract_text_stub
from ai.chatbot import chatbot
from database.db import connect_db
from security import authorization
import json
from fastapi.middleware.cors import CORSMiddleware
import services.email_services
from typing import Optional


# ---------------------------
# App Initialization
# ---------------------------
app = FastAPI()


origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/signup")
async def signup(user: UserCreate):
    new_user = await create_account(user)
    if user.enabled:
        try:
            await services.email_services.send_test_email(user.email)
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
    raise HTTPException(status_code=400, detail="No token acquired")


# ---------------------------
# Resume Analyzer (AI)
# ---------------------------
@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    token: str = Depends(authorization.oauth2_scheme)
):
    return await analyze_resume_service(file, job_description)


# ---------------------------
# Chatbot
# ---------------------------
@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest, token: str = Depends(authorization.oauth2_scheme)):
    global chat_sesh
    email = authorization.get_user(token)
    chat = chat_sesh.get(email)
    answer, new_chat = await chatbot(request.question,email,chat)
    print(chat_sesh)
    if not chat_sesh:
        answer = "Hello, I am Opie. How can I help you today?"
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
    q: str = Query(None),
    min_amount: int = Query(None),
    max_amount: int = Query(None),
    deadline_before: str = Query(None),
):
    all_scholarships = await get_all_scholarships()
    results = all_scholarships

    # Keyword search in title or description
    if q:
        q_lower = q.lower()
        results = [
            s for s in results
            if q_lower in (s.scholarship_title or "").lower()
            or q_lower in (s.description or "").lower()
        ]

    # Convert amount "$250,000" → 250000 safely
    def parse_amount(amount_str):
        try:
            return int("".join(filter(str.isdigit, amount_str)))
        except:
            return None

    # Filter by minimum amount
    if min_amount is not None:
        results = [
            s for s in results
            if s.amount and parse_amount(s.amount) is not None
            and parse_amount(s.amount) >= min_amount
        ]

    # Filter by maximum amount
    if max_amount is not None:
        results = [
            s for s in results
            if s.amount and parse_amount(s.amount) is not None
            and parse_amount(s.amount) <= max_amount
        ]

    # Deadline filter (ISO formatted date comparison)
    if deadline_before:
        results = [
            s for s in results
            if s.deadline and str(s.deadline) <= deadline_before
        ]

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
# Profile
# ---------------------------

@app.get("/profile")
async def profile_get(token: str = Depends(authorization.oauth2_scheme)):
    """Fetch user profile data"""
    email = authorization.get_user(token)
    try:
        return await get_profile(email)
    except Exception as e:
        print("Error fetching profile:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@app.post("/update_profile")
async def profile_update(
  fullName: str = Form(...),
    email: str = Form(...),
    profilePic: UploadFile = File(None),
    resume: UploadFile = File(None),
):
    """Save or update user's profile and upload files to S3."""
    try:
        return await save_profile(
            fullName=fullName,
            email=email,
            profilePic=profilePic,
            resume=resume,
        )
    except Exception as e:
        print("Error saving profile:", e)
        raise HTTPException(status_code=500, detail="Failed to save profile")


# ---------------------------
# OpenAI job parser
# ---------------------------

router = APIRouter()

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

class RawDescription(BaseModel):
    text: str


SYSTEM_PROMPT = """You are a deterministic parser that restructures raw job descriptions into clean sections for a job board UI.

GOALS
- Before the editing copy the entire job description text and display it as it would appear on the original job posting.
- Reorganize only the given text into these sections, in this exact order:
  Description, Responsibilities, Qualifications, Preferences, Benefits.
- Do not invent content. If a section is missing, return an empty list (or an empty string for Description).
- If description is an empty string, do not send to backend.
- If a job doesn't have a description send that job to the failedJobs = [];
- Exclude jobs from front-end with no salary information.
- Exclude jobs from front-end with no job description.
- If job description is less than 100 words, send that job to the failedJobs = [];
- If job description is more than 500 words, truncate the first 500 words only.
- If job description, responsibilities, description, qualifications, and preferences are empty, send that job to the failedJobs = [];
- Keep original wording. You may join hard/soft wraps so sentences read naturally.

LIST RULES
- If the source had bullets, keep bullets; otherwise, keep paragraphs.
- Convert runs of short orphan lines (e.g., 'R', 'Java', 'Scala', 'AWS', 'Azure', 'Statistics', 'Mathematics', 'Physics')
  into a single bullet as a comma-separated phrase appended to the previous bullet or sentence.
- Never output a bullet that is a single word or an incomplete phrase.

FORMATTING
- Output valid JSON only, exactly in this schema:
{
  "description": "<string>",
  "responsibilities": ["<bullet or full line>", ...],
  "qualifications": ["<bullet or full line>", ...],
  "preferences": ["<bullet or full line>", ...],
  "benefits": ["<bullet or full line>", ...]
}
- Preserve original order; collapse multiple blank lines to one.
"""

@router.post("/parse-job-description")
async def parse_job_description(data: RawDescription):
    text = (data.text or "").strip()
    # normalize whitespace and count words
    words = re.findall(r"\S+", text)
    word_count = len(words)

    # if too short, signal caller so job is excluded from frontend
    if word_count < 60:
        raise HTTPException(status_code=422, detail="Job description too short (<60 words)")

    # truncate to first 300 words if too long
    if word_count > 300:
        text = " ".join(words[:300])

    try:
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.0,
        )
        parsed = completion.choices[0].message.content
        parsed_json = json.loads(parsed)

        # Normalize lists to arrays and remove empty entries
        for k in ("responsibilities", "qualifications", "preferences", "benefits"):
            v = parsed_json.get(k)
            if isinstance(v, str):
                parsed_json[k] = [line.strip() for line in v.splitlines() if line.strip()]
            elif isinstance(v, list):
                parsed_json[k] = [str(x).strip() for x in v if str(x).strip()]
            else:
                parsed_json[k] = []

        # require a non-empty qualifications section; reject if missing
        if not parsed_json.get("qualifications") or len(parsed_json["qualifications"]) == 0:
            raise HTTPException(status_code=422, detail="Parsed content missing qualifications - exclude from frontend")

        # ensure description present (fallback to truncated input if needed)
        if not parsed_json.get("description") or not str(parsed_json.get("description")).strip():
            parsed_json["description"] = text

        return parsed_json
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parser error: {str(e)[:300]}")

app.include_router(router)
