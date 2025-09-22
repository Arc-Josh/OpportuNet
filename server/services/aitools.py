import google.generativeai as genai
import json

api_key="AIzaSyBor6BlxGPBjuW06EUNO_aHLJts81EAuXk"

def chatbot(dialogue:str):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    response = model.generate_content(dialogue)
    return response.text
