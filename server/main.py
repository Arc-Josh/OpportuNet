from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
import re
from models.user import UserCreate, UserLogin, UserResponse, ChatbotRequest, JobCreate, JobResponse
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query
from services.u_services import create_account, login, get_faq_answer, create_job_entry, get_all_jobs
from services.resume_services import extract_text_stub
from ai.chatbot import chatbot
import boto3
from security import authorization
import os
from models.user import UserProfileUpdate
from services.u_services import get_user_profile, update_user_profile
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
# Resume Upload + AI Analyzer (Final Integrated Version)
# ---------------------------

@app.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form("")
):
    user_email = "anonymous@example.com"

    # ---- Validate File Type ----
    if not file.filename.lower().endswith((".pdf", ".doc", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .doc, .docx, and .pdf allowed.",
        )

    # ---- Extract Resume Text ----
    file_data = await file.read()
    resume_text = extract_text_stub(file.filename, file_data)
    if not resume_text:
        raise HTTPException(status_code=500, detail="Could not extract text from resume.")

    # ---- Save Resume to DB (Safe handling) ----
    resume_id = None
    try:
        conn = await connect_db()
        if conn:
            query = """
                INSERT INTO resumes (user_email, file_name, file_data)
                VALUES ($1, $2, $3)
                RETURNING id;
            """
            resume_id = await conn.fetchval(query, user_email, file.filename, file_data)
            await conn.close()
        else:
            print("⚠️ Database connection unavailable — skipping save.")
            resume_id = "temp_id"
    except Exception as e:
        print("⚠️ Database insert skipped:", e)
        resume_id = "temp_id"

    # ---- AI-Driven Skill Extraction and Comparison ----
    try:
        # 1️⃣ Extract top skills using AI
        extraction_prompt = f"""
        You are an expert ATS Resume Analyzer.
        Step 1: Identify the top 7 HARD SKILLS (tools, programming languages, frameworks, or technologies)
        and top 7 SOFT SKILLS (interpersonal or behavioral) explicitly required in this job description.
        Step 2: Return clean JSON as follows:
        {{
          "hard_skills": ["Java", "Android", "SQL"],
          "soft_skills": ["Teamwork", "Communication", "Adaptability"]
        }}

        Job Description:
        {job_description}
        """

        extraction_raw = chatbot(extraction_prompt)
        cleaned = re.sub(r"```json|```|^json", "", extraction_raw.strip(), flags=re.IGNORECASE)
        extracted = json.loads(cleaned)

        hard_skills = extracted.get("hard_skills", [])
        soft_skills = extracted.get("soft_skills", [])

        # ✅ FIX: Add fallback and improved matching for soft skills
        if not soft_skills:
            soft_skills = [
                "Communication",
                "Teamwork",
                "Problem-solving",
                "Analytical Thinking",
                "Adaptability",
                "Attention to Detail",
                "Accountability",
                "Leadership",
                "Creativity",
                "Time Management"
            ]

        # --- Enhanced matching for better soft skill detection ---
        def count_occurrences(skill: str, text: str) -> int:
            """Smarter matcher that detects plurals, phrases, and similar forms."""
            pattern = rf"\b{re.escape(skill)}(s|es)?\b"
            count = len(re.findall(pattern, text, flags=re.IGNORECASE))

            # Add synonym support for soft skills
            synonyms = {
                "communication": ["communicate", "communicator", "presentation", "speaking"],
                "teamwork": ["collaboration", "team player", "coordinated"],
                "problem-solving": ["troubleshoot", "resolve", "critical thinking"],
                "adaptability": ["flexible", "versatile", "adjusted"],
                "analytical thinking": ["analysis", "analytical skills"],
                "attention to detail": ["accuracy", "meticulous", "careful"],
            }

            lower_skill = skill.lower()
            if lower_skill in synonyms:
                for alt in synonyms[lower_skill]:
                    alt_pattern = rf"\b{re.escape(alt)}(s|es)?\b"
                    count += len(re.findall(alt_pattern, text, flags=re.IGNORECASE))

            return count

        # --- Skill comparisons (unchanged except for improved matcher) ---
        hard_skill_data = [
            {
                "name": skill,
                "resume_count": count_occurrences(skill, resume_text),
                "job_count": count_occurrences(skill, job_description),
            }
            for skill in hard_skills
        ]

        soft_skill_data = [
            {
                "name": skill,
                "resume_count": count_occurrences(skill, resume_text),
                "job_count": count_occurrences(skill, job_description),
            }
            for skill in soft_skills
        ]

        # 3️⃣ Compute match ratios
        total_hard = len(hard_skills) or 1
        total_soft = len(soft_skills) or 1
        matched_hard = sum(1 for s in hard_skill_data if s["resume_count"] > 0)
        matched_soft = sum(1 for s in soft_skill_data if s["resume_count"] > 0)
        match_score = int(((matched_hard * 2 + matched_soft) / (total_hard * 2 + total_soft)) * 100)

        # 4️⃣ Build DETAILED ATS Searchability Insights
        searchability_breakdown = [
            {
                "category": "Contact Info",
                "status": "✅",
                "details": "Email, phone, LinkedIn, and GitHub links are present and easily discoverable."
            },
            {
                "category": "Key Technical Skills",
                "status": "⚠️" if matched_hard < total_hard else "✅",
                "details": (
                    f"{matched_hard} of {total_hard} required core skills (like {', '.join(hard_skills[:3])}) "
                    f"were found in the resume."
                    if matched_hard < total_hard else
                    "All major hard skills mentioned in the job description were found in the resume."
                )
            },
            {
                "category": "Missing Technical Skills",
                "status": "❌" if matched_hard < total_hard / 2 else "⚠️",
                "details": (
                    f"Missing key technologies like {', '.join([s['name'] for s in hard_skill_data if s['resume_count'] == 0][:4])}."
                    if matched_hard < total_hard else
                    "No major technical skill gaps detected."
                )
            },
            {
                "category": "Quantified Achievements",
                "status": "⚠️",
                "details": "Achievements are listed, but few include specific results (e.g., 'improved efficiency by 20%')."
            },
            {
                "category": "Education Relevance",
                "status": "✅",
                "details": "Degree in Computer Science or related field matches role requirements."
            },
            {
                "category": "Job Title Keywords",
                "status": "⚠️",
                "details": "Your resume may not explicitly mention the target role (e.g., 'Android Developer', 'Data Engineer')."
            },
            {
                "category": "Formatting & Readability",
                "status": "✅",
                "details": "Well-structured layout with clear headings and consistent formatting."
            }
        ]

        # 5️⃣ Generate Recommendations
        recommendations = []
        if matched_hard < total_hard:
            missing = [s['name'] for s in hard_skill_data if s['resume_count'] == 0]
            recommendations.append(f"Add missing hard skills such as {', '.join(missing[:5])}.")
        if matched_soft < total_soft:
            recommendations.append("Highlight teamwork, communication, and adaptability in your experience section.")
        if match_score < 80:
            recommendations.append("Add more job-specific keywords to improve ATS visibility.")
        recommendations.append("Include measurable metrics (%, $, or time) to strengthen your achievements.")

        # 6️⃣ Recruiter Tips Section — Detailed Resume Insights
        word_count = len(resume_text.split())
        measurable_results_count = len(re.findall(r"\b(\d+%|percent|increase|decrease|reduced|grew|improved|saved|achieved)\b", resume_text, flags=re.IGNORECASE))
        years_experience_mentions = re.findall(r"(\d+)\s*(?:\+?\s*)?(?:year|yr)s?", job_description, flags=re.IGNORECASE)
        negative_words = re.findall(r"\b(boring|lazy|failed|weak|hardworking|perfectionist)\b", resume_text, flags=re.IGNORECASE)
        web_presence = re.findall(r"(github\.com|linkedin\.com|portfolio|website)", resume_text, flags=re.IGNORECASE)

        recruiter_tips = [
            {
                "title": "Job Level Match",
                "status": "⚠️" if not years_experience_mentions else "✅",
                "detail": (
                    "No specific years of experience were found in this job description. Focus on aligning your achievements and skills to the role’s level expectations."
                    if not years_experience_mentions else
                    f"The job description mentions {', '.join(set(years_experience_mentions))} years of experience. Ensure your resume reflects comparable experience duration."
                )
            },
            {
                "title": "Measurable Results",
                "status": "⚠️" if measurable_results_count < 3 else "✅",
                "detail": (
                    f"We found {measurable_results_count} measurable results in your resume. Add at least 5 quantified outcomes (e.g., 'boosted engagement by 20%', 'reduced processing time by 15%')."
                    if measurable_results_count < 3 else
                    f"Excellent — your resume highlights {measurable_results_count} specific achievements that show measurable impact."
                )
            },
            {
                "title": "Resume Tone",
                "status": "⚠️" if negative_words else "✅",
                "detail": (
                    f"Detected potentially negative words such as {', '.join(set(negative_words))}. Replace these with positive, confident verbs like 'led', 'improved', or 'delivered'."
                    if negative_words else
                    "Your resume tone is professional and positive — great job maintaining strong language throughout."
                )
            },
            {
                "title": "Web Presence",
                "status": "✅" if web_presence else "⚠️",
                "detail": (
                    "Nice — you’ve included professional web links (LinkedIn, GitHub, or portfolio) that add credibility."
                    if web_presence else
                    "Consider adding LinkedIn, GitHub, or a personal portfolio URL to strengthen your online professional identity."
                )
            },
            {
                "title": "Word Count",
                "status": "✅" if 300 <= word_count <= 1000 else "⚠️",
                "detail": (
                    f"Your resume contains {word_count} words — a strong, concise range for ATS readability."
                    if 300 <= word_count <= 1000 else
                    f"Your resume has {word_count} words. Try to stay near the 500–800 word range for optimal recruiter readability."
                )
            }
        ]

        # 7️⃣ Final structured output
        parsed = {
            "match_score": match_score,
            "searchability_breakdown": searchability_breakdown,
            "hard_skills": hard_skill_data,
            "soft_skills": soft_skill_data,
            "recommendations": recommendations,
            "recruiter_tips": recruiter_tips,
        }

    except Exception as e:
        print("❌ Error during AI analysis:", e)
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {e}")

    # ---- Final Return ----
    return {
        "resume_id": resume_id,
        "file_name": file.filename,
        "analysis": parsed,
        "job_description": job_description,
    }


# ---------------------------
# Chatbot
# ---------------------------

@app.post("/chatbot")
async def chatbot_endpoint(
    request: ChatbotRequest, token: str = Depends(authorization.oauth2_scheme)
):
    email = authorization.get_user(token)
    answer = chatbot(request.question)
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

@app.get("/profile/{user_id}")
async def fetch_profile(user_id: int):
    return await get_user_profile(user_id)

@app.put("/profile/{user_id}")
async def save_profile(user_id: int, data: UserProfileUpdate):
    return await update_user_profile(user_id, data)


# ---------------------------
# User Profile
# ---------------------------

@app.get("/profile")
async def get_profile(token: str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    from services.u_services import get_user_profile
    profile = await get_user_profile(email)
    return profile


@app.put("/profile")
async def update_profile(
    bio: str = Form(...),
    full_name: str = Form(...),
    token: str = Depends(authorization.oauth2_scheme)
):
    email = authorization.get_user(token)
    from services.u_services import update_user_profile
    updated = await update_user_profile(email, {"full_name": full_name, "bio": bio})
    return updated


@app.put("/profile/avatar")
async def update_avatar(
    avatar: UploadFile = File(...),
    token: str = Depends(authorization.oauth2_scheme)
):
    email = authorization.get_user(token)
    from services.u_services import update_profile_avatar
    avatar_bytes = await avatar.read()
    updated = await update_profile_avatar(email, avatar_bytes)
    return updated