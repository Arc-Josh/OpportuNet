from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name:str
    email:str
    password:str
    enabled:bool

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
    salary: str
    description: Optional[str] = None
    company_name: Optional[str] = None
    application_link:str
    hr_contact_number: Optional[str] = None
    qualifications: Optional[str] = None
    preferences: Optional[str] = None
    benefits: Optional[str] = None
    mission_statement: Optional[str] = None

class JobResponse(JobCreate):
    job_id: int
    created_at: datetime

class ScholarshipCreate(BaseModel):
    name: str
    provider: Optional[str] = None
    amount: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    application_link: str
    eligibility: Optional[str] = None

class ScholarshipResponse(ScholarshipCreate):
    scholarship_id: int
    created_at: datetime