from typing import Union
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from pydantic import BaseModel
import asyncpg
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import boto3
from io import BytesIO
#token keys 
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
#heroku database url
DB_URL = "place-db-url-here"
#aws keys for pdf storage and retrieval 
SECRET_KEY_AWS = "hidden"
ACCESS_KEY_AWS = "hidden"
BUCKET_AWS = "opportunet-capstone-pdf-storage"
REGION_AWS ="us-east-2"

s3_cli= boto3.client('s3',aws_access_id=ACCESS_KEY_AWS,aws_secret_access_key=SECRET_KEY_AWS,region_name=REGION_AWS)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "token")

app = FastAPI()

def create_access_token(data:dict, expires_delta:timedelta=timedelta(minutes=15)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc)+expires_delta
    to_encode.update({"exp":expire})
    encoded_jwt = jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)
    return encoded_jwt

def get_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        email:str = payload.get("email")
        if email is None:
            raise
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail = "token is invalid or expired",
        )
    return 0
async def connect_db():
    return await asyncpg.connect(DB_URL)

#create new user (POST)
@app.post("/create-account")
async def create_account(first_name:str,last_name:str,password:str,email:str):
    try:
        connected = await connect_db()
        hashed = bcrypt.hashpw(password.encode('utf-8'),bcrypt.gensalt())
        connected.execute("""INSERT INTO user(name,email,password) VALUES($1,$2,$3)""",first_name+"_"+last_name,email,hashed)
        return{"status":"success","message":"Account Created!"}
    except Exception as e:
        print(f"error occured {e}")
        return {"status":"error","message":"failed to create account"}
    finally:
        await connected.close()
#log in (GET)
@app.get("/login")
async def login(email:str,password:str):
    try:
        connected = await connect_db()
        email_validated = connected.fetchval("""SELECT email FROM user WHERE email = $1""",email)
        if email_validated:
            hashed = connected.fetchval("""SELECT password FROM user WHERE email = $1""",email)
            password_validated = bcrypt.checkpw(password.encode('utf8'),hashed.encode('utf8'))
            if password_validated:
                u_data = {"email":email}
                token = create_access_token(data=u_data)
                return{"status":"success","message":"Successful Login","access_token":token}
            else:
                return{"status":"failure","message":"Incorrect Password"}
        else:
            return{"status":"failure","message":"Email Not Found"}

    except Exception as e:
        print(f"error occured {e}")
        return {"status":"error","message":"Failed to Login"}
    finally:
        await connected.close()
#change password (PUT)
@app.put("change-password")
async def change_pwd(new_password:str):
    try:
        connected = await connect_db()
        
    except Exception as e:
        print(f"error occured {e}")
        return {"status":"error","message":"Failed to Login"}
    finally:
        await connected.close()
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
async def upload_resume(file:UploadFile = File(...)):
    try:
        file = await file.read()
        s3_cli.put_object(Bucket = BUCKET_AWS,Key = file.filename, Body = file)
        return{"status":"success","message":"Successful Resume Upload"}
    except Exception as e:
        return{"status":"error","message":"Unsuccessful Resume Upload"}
#update or replace resume (PUT)
@app.put("/edit-resume")
async def edit_resume():
    return 0 
#delete account
app.delete("/delete-account")
async def delete_account():
    return 0

