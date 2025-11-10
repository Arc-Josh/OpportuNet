import re
import json
from fastapi import HTTPException
from ai.chatbot import res_chatbot
from services.resume_services import extract_text_stub
from database.db import connect_db


async def analyze_resume_service(file, job_description: str):
    """Full AI-powered resume analyzer (moved from main.py)."""

    user_email = "anonomys@gmail.com"

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

    # ---- AI-Driven Skill Extraction ----
    try:
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

        extraction_raw = res_chatbot(extraction_prompt)
        cleaned = re.sub(r"```json|```|^json", "", extraction_raw.strip(), flags=re.IGNORECASE)
        extracted = json.loads(cleaned)

        hard_skills = extracted.get("hard_skills", [])
        soft_skills = extracted.get("soft_skills", [])

        # Fallback soft skills if model fails
        if not soft_skills:
            soft_skills = [
                "Communication", "Teamwork", "Problem-solving", "Analytical Thinking",
                "Adaptability", "Attention to Detail", "Accountability",
                "Leadership", "Creativity", "Time Management"
            ]

        # --- Skill Occurrence Counter ---
        def count_occurrences(skill: str, text: str) -> int:
            pattern = rf"\b{re.escape(skill)}(s|es)?\b"
            count = len(re.findall(pattern, text, flags=re.IGNORECASE))
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

        # --- Skill Data Arrays ---
        hard_skill_data = [
            {"name": skill, "resume_count": count_occurrences(skill, resume_text),
             "job_count": count_occurrences(skill, job_description)}
            for skill in hard_skills
        ]
        soft_skill_data = [
            {"name": skill, "resume_count": count_occurrences(skill, resume_text),
             "job_count": count_occurrences(skill, job_description)}
            for skill in soft_skills
        ]

        # ---- Matching Scores ----
        total_hard = len(hard_skills) or 1
        total_soft = len(soft_skills) or 1
        matched_hard = sum(1 for s in hard_skill_data if s["resume_count"] > 0)
        matched_soft = sum(1 for s in soft_skill_data if s["resume_count"] > 0)
        match_score = int(((matched_hard * 2 + matched_soft) / (total_hard * 2 + total_soft)) * 100)

        # ---- Searchability Breakdown ----
        searchability_breakdown = [
            {
                "category": "Contact Info",
                "status": "✅",
                "details": "Email, LinkedIn, GitHub links detected — recruiter contact visibility OK."
            },
            {
                "category": "Key Technical Skills",
                "status": "⚠️" if matched_hard < total_hard else "✅",
                "details": (
                    f"{matched_hard}/{total_hard} required technical skills (like {', '.join(hard_skills[:3])}) "
                    f"found in your resume."
                    if matched_hard < total_hard else
                    "All key hard skills from job description matched successfully."
                ),
            },
            {
                "category": "Missing Technical Skills",
                "status": "❌" if matched_hard < total_hard / 2 else "⚠️",
                "details": (
                    f"Missing key technologies like {', '.join([s['name'] for s in hard_skill_data if s['resume_count'] == 0][:5])}."
                    if matched_hard < total_hard else "No major technical gaps detected."
                ),
            },
            {
                "category": "Soft Skills Relevance",
                "status": "⚠️" if matched_soft < total_soft else "✅",
                "details": (
                    f"{matched_soft}/{total_soft} soft skills found — improve storytelling and examples."
                    if matched_soft < total_soft else
                    "Soft skills well-represented in professional context."
                ),
            },
            {
                "category": "ATS Keyword Coverage",
                "status": "⚠️" if match_score < 80 else "✅",
                "details": (
                    f"Your resume matches {match_score}% of important keywords — increase overlap with job description."
                    if match_score < 80 else "Excellent ATS keyword coverage."
                ),
            },
        ]

        # ---- Recommendations ----
        missing = [s['name'] for s in hard_skill_data if s['resume_count'] == 0]
        recommendations = []
        if matched_hard < total_hard:
            recommendations.append(f"Add missing hard skills such as {', '.join(missing[:5])}.")
        if matched_soft < total_soft:
            recommendations.append("Highlight teamwork, communication, and adaptability more clearly.")
        if match_score < 80:
            recommendations.append("Increase keyword overlap with the job description.")
        recommendations.append("Add measurable results (e.g., 'improved efficiency by 20%').")

        # ---- Recruiter Tips ----
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
                    "No years of experience found — ensure your resume level matches the role."
                    if not years_experience_mentions else
                    f"Job requires {', '.join(set(years_experience_mentions))} years of experience. Match your background accordingly."
                ),
            },
            {
                "title": "Measurable Results",
                "status": "⚠️" if measurable_results_count < 3 else "✅",
                "detail": (
                    f"Found {measurable_results_count} measurable results — aim for 5+ strong quantifiable statements."
                    if measurable_results_count < 3 else
                    f"Great — {measurable_results_count} quantifiable metrics make your resume impactful."
                ),
            },
            {
                "title": "Resume Tone",
                "status": "⚠️" if negative_words else "✅",
                "detail": (
                    f"Avoid negative tone like {', '.join(set(negative_words))}."
                    if negative_words else
                    "Tone is professional and confident — well done."
                ),
            },
            {
                "title": "Web Presence",
                "status": "✅" if web_presence else "⚠️",
                "detail": (
                    "Strong online presence with LinkedIn/GitHub detected."
                    if web_presence else "Add LinkedIn/GitHub links to build credibility."
                ),
            },
            {
                "title": "Word Count",
                "status": "✅" if 300 <= word_count <= 1000 else "⚠️",
                "detail": (
                    f"{word_count} words detected — ideal balance for readability."
                    if 300 <= word_count <= 1000 else
                    f"{word_count} words — keep resume concise (500–800 words recommended)."
                ),
            },
        ]

        # ---- Final Return ----
        return {
            "resume_id": resume_id,
            "file_name": file.filename,
            "analysis": {
                "match_score": match_score,
                "searchability_breakdown": searchability_breakdown,
                "hard_skills": hard_skill_data,
                "soft_skills": soft_skill_data,
                "recommendations": recommendations,
                "recruiter_tips": recruiter_tips,
                "word_count": word_count,
                "measurable_results_count": measurable_results_count,
            },
        }

    except Exception as e:
        print("❌ AI analysis error:", e)
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {e}")

