from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name:str
    email:str
    password:str

class UserLogin(BaseModel):
    email:str
    password:str

class UserResponse(BaseModel):
    email:str
    name:str
    message:str

class ChatbotRequest(BaseModel):
    question: str