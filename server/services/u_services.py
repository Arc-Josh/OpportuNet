from database.db import connect_db
from security.authorization import create_access_token, hash_pwd, verify_pwd
from models.user import UserCreate, UserLogin, UserResponse
from fastapi import HTTPException


async def create_account(data = UserCreate):
    try:
        connected = await connect_db()
        if not connected:
            return {"status":"error","message":"failed to connect to database"}
        hashed = hash_pwd(data.password)
        hashed_password = hashed.decode('utf-8')
        try:
            async with connected.transaction():
                await connected.execute('INSERT INTO users(name,email,password) VALUES($1,$2,$3)',data.name,data.email,hashed_password)
            
            return{"status":"success dawg","message":"Account Created!"}
        except Exception as l:
            return{"status":"failure","message":f"Account NOTTTT Created!{l}"}
    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code = 400,
            detail = "Unavailable credentials"
        )
        #return {"status":"error","message":"failed to create account"}
    finally:
        await connected.close()

async def login(data = UserLogin):
    try:
        connected = await connect_db()
        email_validated = await connected.fetchval("""SELECT email FROM users WHERE email = $1""",data.email)
        if email_validated:
            hashed = await connected.fetchval("""SELECT password FROM users WHERE email = $1""",data.email)
            password_validated = verify_pwd(data.password,hashed)
            if password_validated:
                u_data = {"email":data.email}
                token = create_access_token(data=u_data)
                return{"status":"success","message":"Successful Login","access_token":token}
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid password"
                )
                #return{"status":"failure","message":"Incorrect Password"}
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid Email"
            )
            return{"status":"failure","message":"Email Not Found"}

    except Exception as e:
        print(f"error occured {e}")
        raise HTTPException(
            status_code=400,
            detail="Login Unsuccessful"
        )
        #return {"status":"error","message":"Failed to Login"}
    finally:
        await connected.close()