from google import genai
import json

api_key="AIzaSyBor6BlxGPBjuW06EUNO_aHLJts81EAuXk"

def chatbot(dialogue:str):
    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=dialogue
    )
    return response.text
