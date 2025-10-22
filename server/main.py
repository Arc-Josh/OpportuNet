from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from models.user import UserCreate, UserLogin, UserResponse, ChatbotRequest, JobCreate, JobResponse
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query
from services.u_services import create_account, login, get_faq_answer, create_job_entry, get_all_jobs
from services.resume_services import extract_text_stub
from ai.chatbot import chatbot
import boto3
from security import authorization
import os
import json
from fastapi.middleware.cors import CORSMiddleware
import services.email_services
from database.db import connect_db 
from services.u_services import remove_saved_job
from models.user import ScholarshipCreate, ScholarshipResponse
from services.u_services import (
    create_scholarship_entry, get_all_scholarships,
    save_scholarship_for_user, get_saved_scholarships,
    remove_saved_scholarship
)

# ---------------------------
# AWS S3 Config
# ---------------------------
SECRET_KEY_AWS = os.getenv("SECRET_KEY_AWS", "hidden")
ACCESS_KEY_AWS = os.getenv("ACCESS_KEY_AWS", "hidden")
BUCKET_AWS = os.getenv("BUCKET_AWS", "opportunet-capstone-pdf-storage")
REGION_AWS = os.getenv("REGION_AWS", "us-east-2")
chat_sesh = {}
s3_cli = boto3.client(
    "s3",
    aws_access_key_id=ACCESS_KEY_AWS,
    aws_secret_access_key=SECRET_KEY_AWS,
    region_name=REGION_AWS,
)

app = FastAPI()

# Allow frontend calls
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Auth + User Management
# ---------------------------

@app.post("/signup")
async def signup(user: UserCreate):
    new_user = await create_account(user)

    if user.enabled == True:
        try:
            await services.email_services.send_test_email(user.email)
            return new_user
        except Exception as e:
            print("email services error:",e)
    else:
        return new_user
@app.post("/login")
async def u_login(user: UserLogin):
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
    user_email = authorization.get_user(token)

    if not file.filename.lower().endswith((".pdf", ".doc", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .doc, .docx, and .pdf allowed.",
        )

    file_data = await file.read()
    resume_text = extract_text_stub(file.filename, file_data)
    if not resume_text:
        raise HTTPException(
            status_code=500, detail="Could not extract text from resume."
        )

    conn = await connect_db()
    try:
        query = """
            INSERT INTO resumes (user_email, file_name, file_data)
            VALUES ($1, $2, $3)
            RETURNING id;
        """
        resume_id = await conn.fetchval(query, user_email, file.filename, file_data)
    except Exception as e:
        print("failed to execute insert into database:", e)
    finally:
        print("resume successfully loaded into database")
        await conn.close()

    try:
        prompt = f"""
        You are an ATS-style resume analyzer.
        Compare the resume to the job description.

        Resume:
        {resume_text[:4000]}

        Job Description:
        {job_description}

        Respond ONLY in valid JSON.
        {{
          "match_score": number (0-100),
          "top_matching_skills": ["skill1", "skill2"],
          "missing_skills": ["skillA", "skillB"],
          "recommendations": ["short bullet", "another bullet"]
        }}
        """
        try:
            raw_analysis_response = await chatbot(prompt,user_email)
            raw_analysis = raw_analysis_response[0]
        except Exception as e:
            raise HTTPException(status_code=500,detail="chatbot request failed")
        
        parsed = None
        try:
            parsed = json.loads(raw_analysis)
        except Exception as e:
            print("found the problem its right here in this block: ", e)
            start = raw_analysis.find("{")
            end = raw_analysis.rfind("}")
            if start != -1 and end != -1:
                try:
                    parsed = json.loads(raw_analysis[start:end+1])
                except Exception:
                    pass
        if not parsed:
            from services.resume_services import basic_resume_analysis
            fallback = basic_resume_analysis(resume_text, job_description)
            parsed = {
                "match_score": int(fallback.get("match_score", "0%").replace("%", "")),
                "top_matching_skills": [kw["keyword"] for kw in fallback.get("keyword_gap_table", []) if kw["resume_count"] > 0],
                "missing_skills": [kw["keyword"] for kw in fallback.get("keyword_gap_table", []) if kw["resume_count"] == 0],
                "recommendations": fallback.get("content_suggestions", ["Fallback analysis only."])
            }
    except Exception:
        raise HTTPException(status_code=500, detail="Resume analysis failed.")

    return {
        "resume_id": resume_id,
        "file_name": file.filename,
        "analysis": parsed,
        "job_description": job_description,
    }


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
    print(chat_sesh)
    chat_sesh[email] = new_chat
    return {"email": email, "answer": answer}


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
async def list_jobs():
    return await get_all_jobs()


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


@app.get("/scholarship-urls")
async def scholarship_urls():
    scholarships = await get_all_scholarships()
    return [
        {
            "scholarship_title": s.scholarship_title,
            "url": getattr(s, "url", None)
        }
        for s in scholarships
    ]
