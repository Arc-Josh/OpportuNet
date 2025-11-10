from database import db
from io import BytesIO
from PyPDF2 import PdfReader

def bytea_to_pdf_text(file_data: bytes) -> str:
    reader = PdfReader(BytesIO(file_data))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

get_info = {
    "name":"get_info",
    "description":"when a conversation is started, load the user info retrieved into the chat memory. Do not respond with the retrieved info, as it is just context",
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

#Here we got a simple async function that allows for the chatbot to retrieve our name from the database. 
#Simple, yes, but I really do think that this concept can be expanded upon and be the differentiator in our project.

async def get_user_info(email:str)->tuple[str,str]:
    try:
        connected = await db.connect_db()
        if connected:
            try:
                name = await connected.fetchrow("""SELECT full_name FROM users WHERE email = $1""",email)
                resume= await connected.fetchrow("""SELECT file_data FROM resumes WHERE user_email = $1""",email)
                if not resume:
                    resume_str = "upload a resume on the profile page."
                else:
                    resume_str = bytea_to_pdf_text(resume["file_data"])
                return resume_str, name["full_name"]
            
            except Exception as e:
                print("failed")
                return "failed"
            finally:
                await connected.close()

    except Exception as e:
        print("failed to connect to the database with error code:",e)
        return "couldnt retrieve name"
    finally:
        await connected.close()

