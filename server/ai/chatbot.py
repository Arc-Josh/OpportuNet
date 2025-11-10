import os
from google import genai
from google.genai import types
from google.genai.errors import ServerError
from dotenv import load_dotenv
import json
from .personality import instructions
from .toolkit import get_info, get_user_info
import asyncio

# Load environment variables
load_dotenv()

# Configure Gemini with API key
api_key = os.getenv("GOOGLE_API_KEY")
#genai.configure(api_key=api_key)

async def safe_send_message(chat, message, retries=3, delay=2):
    """
    Safely send a message to Gemini, retrying if the model is overloaded (503).
    """
    for attempt in range(retries):
        try:
            response = chat.send_message(message=message)
            return response
        except ServerError as e:
            if "503" in str(e):
                print(f"[WARN] Gemini model overloaded. Retrying in {delay}s... (Attempt {attempt + 1}/{retries})")
                await asyncio.sleep(delay)
            else:
                raise  # rethrow any non-503 errors
    raise Exception("Gemini model unavailable after multiple retries.")

async def chatbot(dialogue:str,email:str,chat = None):
    client = genai.Client()
    if chat is None:
        print("new chat memory, retrieving user info")
        user_resume, user_name = await get_user_info(email)
        context = (
            f"the users name is {user_name}"
            f"their resume is. it is provided for internal reference only:\n{user_resume}\n\n"
            "use this information to personalize the responses to the user"
        )
        context_instructions = f"{instructions}\n\n{context}"
        
        tools= types.Tool(function_declarations=[get_info])
        config = types.GenerateContentConfig(
            system_instruction = context_instructions,
            tools=[tools]
        )
        chat = client.chats.create(model = "gemini-2.5-flash",config=config)
    response = await safe_send_message(chat, f"User email: {email}\nQuestion: {dialogue}")
    
    part = response.candidates[0].content.parts[0]

    if hasattr(part,"function_call") and part.function_call:
        fn = part.function_call
        if fn.name == "get_info":
            user_data = await get_user_info(email)
            return user_data, chat
        
    return response.text, chat

def res_chatbot(dialogue: str):
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
         #Safe fallback (to prevent FastAPI crash)
        fallback_response = {
            "hard_skills": ["Python", "SQL", "Machine Learning"],
            "soft_skills": ["Teamwork", "Communication", "Problem Solving"],
            "recruiter_tips": "Highlight measurable achievements, tailor your resume to the role, and emphasize impact-driven results."
        }
        return json.dumps(fallback_response)
