from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd, get_user
from models.user import UserCreate, UserLogin, UserResponse
from fastapi import HTTPException
import os
import json


#any other user services, (IE database queries) will be added in this file 
async def create_account(data = UserCreate):
    try:
        connected = await connect_db()
        if not connected:
            return {"status":"error","message":"failed to connect to database"}
        hashed = hash_pwd(data.password)
        hashed_password = hashed.decode('utf-8')
        try:
            async with connected.transaction():
                await connected.execute('INSERT INTO users(full_name,email,password_hash) VALUES($1,$2,$3)',data.name,data.email,hashed_password)
            
            return{"status":"success","message":"Account Created!"}
        except Exception as l:
            return{"status":"failure","message":f"Account NOTTTT Created!{l}"}
    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code = 400,
            detail = "Unavailable credentials"
        )
    finally:
        await connected.close()

async def login(data = UserLogin):
    try:
        connected = await connect_db()
        email_validated = await connected.fetchval("""SELECT email FROM users WHERE email = $1""",data.email)
        if email_validated:
            hashed = await connected.fetchval("""SELECT password_hash FROM users WHERE email = $1""",data.email)
            password_validated = verify_pwd(data.password,hashed)
            if password_validated:
                u_data = {"email":data.email}
                token = create_access_token(data=u_data)
                
                return{"status":"success","message":"Successful Login","access_token":token,"token_type":"bearer"}
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid Password"
                )
                #return{"status":"failure","message":"Incorrect Password"}
        else:
            raise HTTPException(
                status_code=400,
                detail="Email not found"
            )
            return{"status":"failure","message":"Email Not Found"}

    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code=400,
            detail="Login Unsuccessful"
        )
    finally:
        await connected.close()

async def change_password():
    return 0

def load_faqs():
    """
    Load FAQ data from an external JSON file (faqs.json).
    """
    faq_path = os.path.join(os.path.dirname(__file__), "faqs.json")
    try:
        with open(faq_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading FAQs: {e}")
        return []
    
faqs = load_faqs()

def get_faq_answer(question: str) -> str:
    """
    Return an answer by checking if any of the provided keywords exist in the question.
    """
    lower_question = question.lower()
    for faq in faqs:
        keywords = faq.get("keywords", [])
        if any(keyword.lower() in lower_question for keyword in keywords):
            return faq.get("answer")
    
    return (
        "I'm not sure how to answer that. You can ask about jobs, scholarships, or our application processes!"
    )
