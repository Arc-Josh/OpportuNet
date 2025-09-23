import os
from dotenv import load_dotenv
from google import genai
import json

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

def chatbot(dialogue:str):
    client = genai.Client()
    response = client.models.generate_content(
        model = 'gemini-2.5-flash',
        contents=dialogue,
    )
    return response.text

