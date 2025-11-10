import os
from fastapi import UploadFile, HTTPException
from database.db import connect_db

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def get_profile(email: str):
    """Fetch the profile for the given user."""
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


async def save_profile(fullName, email, education, bio, experience, profilePic=None, resume=None):
    """Save or update the user profile and uploaded files."""
    conn = await connect_db()
    try:
        # Handle file uploads
        profile_pic_path = None
        resume_path = None

        if profilePic:
            profile_pic_path = os.path.join(UPLOAD_DIR, profilePic.filename)
            with open(profile_pic_path, "wb") as f:
                f.write(await profilePic.read())

        if resume:
            resume_path = os.path.join(UPLOAD_DIR, resume.filename)
            with open(resume_path, "wb") as f:
                f.write(await resume.read())

       
        query = """
            INSERT INTO profiles (full_name, email, education, bio, experience, profile_pic, resume)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE
            SET full_name = EXCLUDED.full_name,
                education = EXCLUDED.education,
                bio = EXCLUDED.bio,
                experience = EXCLUDED.experience,
                profile_pic = EXCLUDED.profile_pic,
                resume = EXCLUDED.resume,
                updated_at = NOW()
            RETURNING *;
        """
        result = await conn.fetchrow(
            query, fullName, email, education, bio, experience, profile_pic_path, resume_path
        )

        return dict(result)
    except Exception as e:
        print("Profile save error:", e)
        raise HTTPException(status_code=500, detail="Error saving profile")
    finally:
        await conn.close()
