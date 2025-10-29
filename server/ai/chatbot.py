import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
from .personality import instructions

# Load environment variables
load_dotenv()

# Configure Gemini with API key
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

def chatbot(dialogue: str):
    """
    Sends dialogue + system instructions to Gemini 2.5 Flash 
    and returns the AI-generated response text.
    """
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=instructions
        )
        response = model.generate_content(dialogue)
        return response.text
    except Exception as e:
        print("⚠️ Gemini API Error:", e)
        # Safe fallback (to prevent FastAPI crash)
        fallback_response = {
            "hard_skills": ["Python", "SQL", "Machine Learning"],
            "soft_skills": ["Teamwork", "Communication", "Problem Solving"],
            "recruiter_tips": "Highlight measurable achievements, tailor your resume to the role, and emphasize impact-driven results."
        }
        return json.dumps(fallback_response)
