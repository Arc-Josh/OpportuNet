import os
import google.generativeai as genai
from google.generativeai import types
from dotenv import load_dotenv
import json
from .personality import instructions
from .toolkit import get_info, get_user_info

# Load environment variables
load_dotenv()

# Configure Gemini with API key
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

async def chatbot(dialogue:str,email:str,chat = None):
    client = genai.Client()

    tools= types.Tool(function_declarations=[get_info])
    config = types.GenerateContentConfig(
        system_instruction = instructions,
        tools=[tools]
    )
    response = chat
    if chat is None:
        chat = client.chats.create(model = "gemini-2.5-flash",config=config)
        print("new chat memory...")
        response = chat.send_message(message =f"User email: {email}\nQuestion: {dialogue}")
    else:
        response = chat.send_message(message =f"User email: {email}\nQuestion: {dialogue}")
    part = response.candidates[0].content.parts[0]

    if hasattr(part,"function_call") and part.function_call:
        fn = part.function_call
        if fn.name == "get_info":
            user_data = await get_user_info(email)
            return user_data, chat
        
    return response.text, chat

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
