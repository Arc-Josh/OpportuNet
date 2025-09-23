import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

def chatbot(dialogue: str) -> str:
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(dialogue)
        return response.text if response and response.text else "⚠️ No response generated."
    except Exception as e:
        return f"❌ Error: {str(e)}"
