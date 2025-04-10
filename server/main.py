from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from models.user import UserCreate, UserLogin,UserResponse, ChatbotRequest
from services.u_services import create_account,login,get_faq_answer
import boto3
from security import authorization
from io import BytesIO
from pydantic import BaseModel 
import json
import os 
from fastapi.middleware.cors import CORSMiddleware
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
    user = await login(user)
    token = user.get("access_token")
    if token:
        return{"token":token}
    else:
        raise HTTPException(
            status_code=400,
            detail="no token acquired"
        )
#change password (PUT)
@app.put("/change-password")

#change email (PUT)
@app.put("/change-email")

#add resume (POST)
@app.post("/upload-resume")
async def upload_resume():
    return {"message": "Resume upload not yet implemented"}

@app.put("/edit-resume")
async def edit_resume():
    return {"message": "Resume update not yet implemented"}

@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest,token:str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    answer = get_faq_answer(request.question)
    return {"email":email,"answer": answer}

@app.get("/dashboard")
async def dashoard(token:str = Depends(authorization.oauth2_scheme)):
    email = authorization.get_user(token)
    return {"email":email}