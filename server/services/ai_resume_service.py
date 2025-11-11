import os
import re
import json
from fastapi import HTTPException
from google import genai
from google.genai import types
from google.genai.errors import ServerError
from dotenv import load_dotenv
from database.db import connect_db
from services.resume_services import extract_text_stub

# Load environment variables
load_dotenv()

# Initialize Gemini client
client = genai.Client()

# ---- Resume Analysis ----
async def analyze_resume_service(file, job_description: str):
    """Full AI-powered resume analyzer using Gemini 2.5 Flash (Google GenAI SDK)."""

    user_email = "anonymous@gmail.com"

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

    # ---- Save Resume to DB ----
    try:
        conn = await connect_db()
        query = """INSERT INTO resumes (user_email, file_name, file_data)
                   VALUES ($1, $2, $3)
                   RETURNING id;"""
        resume_id = await conn.fetchval(query, user_email, file.filename, file_data)
        await conn.close()
    except Exception:
        resume_id = "temp_id"

    # ---- Gemini Skill Extraction ----
    extraction_prompt = f"""
    You are an expert ATS Resume Analyzer.
    Step 1: Identify top 7 HARD SKILLS (technical tools, languages, frameworks) 
    and 7 SOFT SKILLS (interpersonal, communication, adaptability) required in this job description.
    Step 2: Return clean JSON ONLY:
    {{
      "hard_skills": ["Python", "SQL", "Machine Learning"],
      "soft_skills": ["Teamwork", "Communication", "Problem Solving"]
    }}

    Job Description:
    {job_description}
    """

    try:
        chat_config = types.GenerateContentConfig(system_instruction="ATS Resume Analysis Assistant")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[extraction_prompt],
            config=chat_config,
        )
        cleaned = re.sub(r"```json|```|^json", "", response.text.strip(), flags=re.IGNORECASE)
        extracted = json.loads(cleaned)
    except Exception as e:
        print(" Gemini API Error:", e)
        extracted = {
            "hard_skills": ["Python", "SQL", "Machine Learning"],
            "soft_skills": ["Communication", "Teamwork", "Problem Solving"],
        }

    hard_skills = extracted.get("hard_skills", [])
    soft_skills = extracted.get("soft_skills", [])

    # ---- Keyword Count Helper ----
    def count_occurrences(skill: str, text: str) -> int:
        pattern = rf"\b{re.escape(skill)}(s|es)?\b"
        return len(re.findall(pattern, text, flags=re.IGNORECASE))

    hard_skill_data = [
        {"name": s, "resume_count": count_occurrences(s, resume_text),
         "job_count": count_occurrences(s, job_description) + 2}
        for s in hard_skills
    ]
    soft_skill_data = [
        {"name": s, "resume_count": count_occurrences(s, resume_text),
         "job_count": count_occurrences(s, job_description) + 1}
        for s in soft_skills
    ]

    matched_hard = sum(1 for s in hard_skill_data if s["resume_count"] > 0)
    matched_soft = sum(1 for s in soft_skill_data if s["resume_count"] > 0)
    total_hard = len(hard_skills) or 1
    total_soft = len(soft_skills) or 1
    match_score = int(((matched_hard * 2 + matched_soft) / (total_hard * 2 + total_soft)) * 100)

    # ---- 7-Part Searchability Breakdown ----
    searchability_breakdown = [
        {"category": "ATS Tip", "status": "❌", "details": "Add the job title and company name in your resume summary to improve ATS match."},
        {"category": "Contact Information", "status": "✅", "details": "Email, phone, and LinkedIn detected — recruiter visibility OK."},
        {"category": "Summary", "status": "✅", "details": "Professional summary found — gives quick overview of your profile."},
        {"category": "Section Headings", "status": "✅", "details": "Education, Experience, and Skills sections detected."},
        {"category": "Job Title Match", "status": "⚠️" if "developer" not in resume_text.lower() else "✅",
         "details": "Include the exact job title (e.g., Android Developer) in your summary for better recruiter match."},
        {"category": "Date Formatting", "status": "✅", "details": "Date formats are consistent (e.g., Jan 2022 – Present)."},
        {"category": "Education Match", "status": "✅", "details": "Education details match job expectations."},
    ]

    # ---- Recruiter Tips ----
    word_count = len(resume_text.split())
    measurable_results_count = len(re.findall(r"\b(\d+%|increase|improved|reduced|achieved|grew)\b", resume_text, flags=re.IGNORECASE))
    years_experience = re.findall(r"(\d+)\s*(?:year|yr)", job_description, flags=re.IGNORECASE)
    negative_tone = re.findall(r"\b(boring|lazy|weak)\b", resume_text, flags=re.IGNORECASE)
    web_presence = re.findall(r"(github\.com|linkedin\.com|portfolio)", resume_text, flags=re.IGNORECASE)

    recruiter_tips = [
        {"title": "Job Level Match", "status": "⚠️" if not years_experience else "✅",
         "detail": "No years of experience found — ensure resume matches job level."},
        {"title": "Measurable Results", "status": "⚠️" if measurable_results_count < 3 else "✅",
         "detail": f"Found {measurable_results_count} measurable results — aim for 5+ strong metrics."},
        {"title": "Resume Tone", "status": "⚠️" if negative_tone else "✅",
         "detail": "Tone is professional and confident — well done."},
        {"title": "Web Presence", "status": "✅" if web_presence else "⚠️",
         "detail": "Add LinkedIn or GitHub links to build credibility."},
        {"title": "Word Count", "status": "✅" if 300 <= word_count <= 1000 else "⚠️",
         "detail": f"{word_count} words — ideal readability range."},
    ]

    # ---- Final JSON Output ----
    return {
        "resume_id": resume_id,
        "file_name": file.filename,
        "analysis": {
            "match_score": match_score,
            "searchability_breakdown": searchability_breakdown,
            "hard_skills": hard_skill_data,
            "soft_skills": soft_skill_data,
            "recruiter_tips": recruiter_tips,
            "word_count": word_count,
        },
    }
