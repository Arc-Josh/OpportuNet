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

#aws keys for pdf storage and retrieval 
SECRET_KEY_AWS = "hidden"
ACCESS_KEY_AWS = "hidden"
BUCKET_AWS = "opportunet-capstone-pdf-storage"
REGION_AWS ="us-east-2"

s3_cli= boto3.client('s3',aws_access_key_id=ACCESS_KEY_AWS,aws_secret_access_key=SECRET_KEY_AWS,region_name=REGION_AWS)


app = FastAPI()

origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware,allow_origins = origins, allow_credentials = True, allow_methods = ["*"], allow_headers = ["*"],)

#create new user (POST)
@app.post("/signup")
async def signup(user:UserCreate):
    return await create_account(user)
#log in (POST)
@app.post("/login")
async def u_login(user:UserLogin):
    return await login(user)
#change password (PUT)
@app.put("/change-password")

#change email (PUT)
@app.put("/change-email")

#add resume (POST)
@app.post("/upload-resume")
async def upload_resume():
    return 0
#update or replace resume (PUT)
@app.put("/edit-resume")
async def edit_resume():
    return 0 
#delete account
app.delete("/delete-account")
async def delete_account():
    return 0

@app.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest):
    answer = get_faq_answer(request.question)
    return {"answer": answer}