import google.generativeai as genai
import json

api_key=""


def chatbot(dialogue:str):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    response = model.generate_content(dialogue)
    return response.text
