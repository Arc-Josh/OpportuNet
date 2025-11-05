import os
import shutil
from fastapi import UploadFile

# In-memory store for now — replace with database later
user_profile = {
    "email": "",
    "fullName": "",
    "education": "",
    "bio": "",
    "experience": "",
    "profilePic": None,
    "resume": None,
}

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_profile():
    """
    Retrieve the user profile details.
    """
    return user_profile


def save_profile(
    fullName: str,
    email: str,
    education: str = "",
    bio: str = "",
    experience: str = "",
    profilePic: UploadFile = None,
    resume: UploadFile = None,
):
    """
    Save or update the user's profile details, profile picture, and resume.
    """

    try:
        profile_path = None
        resume_path = None

        # Save profile picture
        if profilePic:
            profile_path = os.path.join(UPLOAD_DIR, profilePic.filename)
            with open(profile_path, "wb") as buffer:
                shutil.copyfileobj(profilePic.file, buffer)
            user_profile["profilePic"] = profile_path

        # Save resume file
        if resume:
            resume_path = os.path.join(UPLOAD_DIR, resume.filename)
            with open(resume_path, "wb") as buffer:
                shutil.copyfileobj(resume.file, buffer)
            user_profile["resume"] = resume_path

        # Update remaining fields
        user_profile.update(
            {
                "email": email,
                "fullName": fullName,
                "education": education,
                "bio": bio,
                "experience": experience,
            }
        )

        return {"message": "Profile updated successfully"}

    except Exception as e:
        print("Error in save_profile:", e)
        return {"error": str(e)}
