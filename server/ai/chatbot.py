import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json
from .personality import instructions
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

def chatbot(dialogue:str):
    client = genai.Client()
    config = types.GenerateContentConfig(
        system_instruction = instructions,
    )
    response = client.models.generate_content(
        model = 'gemini-2.5-flash',
        contents=dialogue,
        config = config,
        
    )
    return response.text

