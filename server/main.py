from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from models.user import UserCreate, UserLogin,UserResponse
from services.u_services import create_account,login
import boto3
from io import BytesIO

from fastapi.middleware.cors import CORSMiddleware

#aws keys for pdf storage and retrieval 
SECRET_KEY_AWS = "+2P5umaOJvK8XIKDdrsonIdvoHSEuF2dwW6UVcHA"
ACCESS_KEY_AWS = "AKIATBLTXXJJJYVVQSN7"
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
@app.put("change-password")
async def change_pwd(new_password:str):
    return 0
#change username (PUT)
@app.put("/change-username")
async def change_username(new_username:str):
    return 0 
#change email (PUT)
@app.put("/change-email")
async def change_email(new_email:str):
    return 0
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

