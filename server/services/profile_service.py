import os
from fastapi import UploadFile, HTTPException
from database.db import connect_db
import boto3

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Load env vars
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)
"""
async def get_profile(email: str):
    conn = await connect_db()
    try:
        query = "SELECT * FROM profiles WHERE email = $1 LIMIT 1"
        row = await conn.fetchrow(query, email)
        if not row:
            return {}
        return dict(row)
    except Exception as e:
        print("Profile fetch error:", e)
        raise HTTPException(status_code=500, detail="Error fetching profile")
    finally:
        await conn.close()
"""
async def get_profile(email: str):
    """Fetch the profile for the given user from the users table."""
    conn = await connect_db()
    try:
        query = """
            SELECT 
                full_name, 
                email, 
                enabled_notifications, 
                profile_pic_url, 
                resume_url, 
                created_at
            FROM users 
            WHERE email = $1 
            LIMIT 1;
        """
        row = await conn.fetchrow(query, email)
        if not row:
            return {}
        return dict(row)
    except Exception as e:
        print("Profile fetch error:", e)
        raise HTTPException(status_code=500, detail="Error fetching profile")
    finally:
        await conn.close()

async def save_profile(fullName, email, profilePic=None, resume=None):
    """Upload files to S3 and save their URLs in the users table."""
    conn = await connect_db()
    try:
        profile_pic_url = None
        resume_url = None

        # Upload profile picture to S3 (if provided)
        if profilePic is not None:
            pic_filename = f"profile_pics/{email}_{profilePic.filename}"
            s3_client.upload_fileobj(profilePic.file, S3_BUCKET_NAME, pic_filename)
            profile_pic_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{pic_filename}"

        # Upload resume to S3 (if provided)
        if resume is not None:
            resume_filename = f"resumes/{email}_{resume.filename}"
            s3_client.upload_fileobj(resume.file, S3_BUCKET_NAME, resume_filename)
            resume_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{resume_filename}"

        # Update user record in database
        query = """
            UPDATE users
            SET full_name = $1,
                profile_pic_url = COALESCE($2, profile_pic_url),
                resume_url = COALESCE($3, resume_url)
            WHERE email = $4
            RETURNING *;
        """
        result = await conn.fetchrow(query, fullName, profile_pic_url, resume_url, email)

        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        return dict(result)

    except Exception as e:
        print("Profile save error:", e)
        raise HTTPException(status_code=500, detail=f"Error saving profile: {e}")
    finally:
        await conn.close()
