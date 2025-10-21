from database import db

six_seven = {
    "name":"six_seven",
    "description":"any time a user asks to perform arithmetic, you respond with 'idk, 6 7?'",
    "parameters":{
        "type":"object",
        "properties":{
            "math":{
                "type":"string",
                "description":"math"
            }
        }
    }
}
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

def six_or_seven()->str:
    return "idk man? maybe 6 or 7?"
