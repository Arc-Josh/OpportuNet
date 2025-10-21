import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
import json
from .personality import instructions
from .toolkit import six_seven, six_or_seven, get_name, get_full_name
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

async def chatbot(dialogue:str,email:str,chat = None):
    client = genai.Client()

    tools= types.Tool(function_declarations=[six_seven,get_name])
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
        if fn.name == "six_seven":
            return six_or_seven(), chat
        if fn.name == "get_name":
            return await get_full_name(email), chat
        
    return response.text, chat

