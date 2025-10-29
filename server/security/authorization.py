from datetime import datetime, timedelta, timezone
from jose import jwt ,JWTError
import bcrypt
from typing import Dict
from fastapi.security import OAuth2PasswordBearer 
from fastapi import Depends, HTTPException, status


SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "token")

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
            raise HTTPException(
                status_code = status.HTTP_401_UNAUTHORIZED,
                detail = "Token invalid or expired"
            )
        return {"email": email}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail = "token is invalid or expired"
        )
 
def hash_pwd(password:str):
    return bcrypt.hashpw(password.encode('utf8'),bcrypt.gensalt())

def verify_pwd(password:str,hashed:str):
    return bcrypt.checkpw(password.encode('utf8'),hashed.encode('utf8'))