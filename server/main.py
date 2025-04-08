# main.py

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from io import BytesIO
import os
import json

# Import your user models and services
from models.user import UserCreate, UserLogin, UserResponse
from services.u_services import create_account, login


SECRET_KEY_AWS = os.getenv("SECRET_KEY_AWS", "hidden")
ACCESS_KEY_AWS = os.getenv("ACCESS_KEY_AWS", "hidden")
BUCKET_AWS = os.getenv("BUCKET_AWS", "opportunet-capstone-pdf-storage")
REGION_AWS = os.getenv("REGION_AWS", "us-east-2")

s3_cli = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY_AWS,
    aws_secret_access_key=SECRET_KEY_AWS,
    region_name=REGION_AWS
)


app = FastAPI()

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/signup")
async def signup(user: UserCreate):
    return await create_account(user)

@app.post("/login")
async def u_login(user: UserLogin):
    return await login(user)

@app.put("/change-password")
async def change_pwd(new_password: str):
    return {"message": "Password change not yet implemented"}

@app.put("/change-username")
async def change_username(new_username: str):
    return {"message": "Username change not yet implemented"}

@app.put("/change-email")
async def change_email(new_email: str):
    return {"message": "Email change not yet implemented"}

@app.post("/upload-resume")
async def upload_resume():
    return {"message": "Resume upload not yet implemented"}

@app.put("/edit-resume")
async def edit_resume():
    return {"message": "Resume update not yet implemented"}

@app.delete("/delete-account")
async def delete_account():
    return {"message": "Account deletion not yet implemented"}


class ChatbotRequest(BaseModel):
    question: str

def load_faqs():

    faq_path = os.path.join(os.path.dirname(__file__), "faqs.json")
    try:
        with open(faq_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        
        return [
            {
                "keywords": ["job", "jobs", "position", "career"],
                "answer": "We offer a variety of tech job listings. Check out the dashboard for the latest positions."
            },
            {
                "keywords": ["scholarship", "financial aid", "grant"],
                "answer": "Our platform provides information on scholarships and financial aid opportunities."
            },
            {
                "keywords": ["application", "apply", "resume"],
                "answer": "Find tips and templates for resume building and learn how to improve your applications."
            },
            {
                "keywords": ["contact", "support", "help"],
                "answer": "For assistance, please visit our support section or contact us directly."
            },
            {
                "keywords": ["navigation", "how to use"],
                "answer": "You can navigate the app using the menu at the top. Explore job listings, FAQs, and more!"
            },
            {
                "keywords": ["pricing", "free", "cost"],
                "answer": "Our service is 100% free!"
            }
        ]


faqs = load_faqs()

def get_faq_answer(question: str) -> str:
    """
    Returns an appropriate answer by checking the question against each FAQ's keywords.
    If no match is found, returns a fallback answer.
    """
    lower_question = question.lower()
    for faq in faqs:
        keywords = faq.get("keywords", [])
        if any(keyword.lower() in lower_question for keyword in keywords):
            answer = faq.get("answer", "")
            if answer:
                return answer
    return (
        "I'm not sure how to answer that. You can ask about job postings, scholarships, or our application processes!"
    )

@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest):
    answer = get_faq_answer(request.question)
    return {"answer": answer}
