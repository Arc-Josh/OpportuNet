
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Form
from models.user import UserCreate, UserLogin, UserResponse, ChatbotRequest, JobCreate, JobResponse
from services.u_services import create_account, login, get_faq_answer, create_job_entry, get_all_jobs
from services.resume_services import tailor_resume, extract_text_stub, basic_resume_analysis
from services.aitools import chatbot
import boto3
from security import authorization
from io import BytesIO
from pydantic import BaseModel 
import json
import os 
from fastapi.middleware.cors import CORSMiddleware
import services.email_services

# Import your user models and services (redundant imports preserved)
from models.user import UserCreate, UserLogin, UserResponse
from services.u_services import create_account, login

# AWS S3 configuration
SECRET_KEY_AWS = os.getenv("SECRET_KEY_AWS", "hidden")
ACCESS_KEY_AWS = os.getenv("ACCESS_KEY_AWS", "hidden")
BUCKET_AWS = os.getenv("BUCKET_AWS", "opportunet-capstone-pdf-storage")
REGION_AWS = os.getenv("REGION_AWS", "us-east-2")

s3_cli = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY_AWS,
    aws_secret_access_key=SECRET_KEY_AWS,
    region_name=REGION_AWS
)

app = FastAPI()

origins = ["http://localhost:3000"]
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
    else:
        raise HTTPException(
            status_code=400,
            detail="no token acquired"
        )

# Change password (PUT)
@app.put("/change-password")
async def change_password():
    return {"message": "Change password not implemented yet."}

# Change email (PUT)
@app.put("/change-email")
async def change_email():
    return {"message": "Change email not implemented yet."}

# Add resume (POST) – Updated for resume analysis and storage
@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_text: str = Form(...)
):
    # For now, we use a default user as no auth is required.
    user_email = "anonymous@example.com"
    
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Only .doc, .docx, and .pdf allowed."
        )
    
    # Read file data and extract text from the resume
    file_data = await file.read()
    resume_text = extract_text_stub(file.filename, file_data)
    
    # Optionally log extracted text for debugging (remove or comment out in production)
    print("DEBUG: EXTRACTED TEXT:", resume_text)
    
    # Store the resume file in the database
    from database.db import connect_db
    conn = await connect_db()
    try:
        query = """
            INSERT INTO resumes (user_email, file_name, file_data)
            VALUES ($1, $2, $3)
            RETURNING id;
        """
        resume_id = await conn.fetchval(query, user_email, file.filename, file_data)
    except Exception as e:
        print("Database insert error:", e)
        raise HTTPException(status_code=500, detail="Failed to store resume in database.")
    finally:
        await conn.close()
    
    # Run analysis comparing the resume text with the job description.
    analysis = basic_resume_analysis(resume_text, job_text)
    
    return {
        "analysis": analysis,
        "resume_id": resume_id
    }

@app.put("/edit-resume")
async def edit_resume():
    return {"message": "Resume update not yet implemented"}

@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest, token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    answer = chatbot(request.question)
    return {"email": email, "answer": answer}

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
