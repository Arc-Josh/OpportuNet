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

class JobCreate(BaseModel):
    job_name: str
    location: str
    salary: float
    position: str
    hr_contact_number: Optional[str] = None
    qualifications: Optional[str] = None
    preferences: Optional[str] = None
    benefits: Optional[str] = None
    mission_statement: Optional[str] = None

class JobResponse(JobCreate):
    job_id: int
    created_at: datetime