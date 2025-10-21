from database import db

get_name = {
    "name":"get_name",
    "description":"if a user asks to be identified, identify them by full name",
    "parameters":{
        "type":"object",
        "properties":{
            "email":{
                "type":"string",
                "description":"user's email retrieved from the auth token "
            }
        }
    }
}

async def get_full_name(email:str)->str:
    try:
        connected = await db.connect_db()
        if connected:
            try:
                name = await connected.fetchrow("""SELECT full_name FROM users WHERE email = $1""",email)
                return name["full_name"]
            except Exception as e:
                print("failed")
                return "failed"

    except Exception as e:
        print("failed to connect to the database with error code:",e)
        return "couldnt retrieve name"
