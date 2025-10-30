import React, { useEffect, useState } from "react";

const ProfilePage = () => {
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [resume, setResume] = useState(null);
  const [resumeName, setResumeName] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setEmail(data.email);
      setBio(data.bio || "");
      if (data.avatar) {
        const base64 = `data:image/jpeg;base64,${data.avatar}`;
        setAvatarPreview(base64);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Handle resume file selection
  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setResume(file);
    } else {
      alert("Please upload a PDF file only.");
    }
  };

  // Upload resume
const handleResumeUpload = async () => {
  if (!resume) {
    alert("Please select a PDF file first.");
    return;
  }

  const formData = new FormData();
  formData.append("file", resume);       
  formData.append("email", email);       

  try {
    const res = await fetch("http://localhost:8000/profile/resume", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Resume uploaded successfully!");
      setResumeName(data.file_name || resume.name);
    } else {
      alert("❌ Failed to upload resume: " + data.detail);
    }
  } catch (err) {
    console.error("Error uploading resume:", err);
    alert("❌ Error uploading resume.");
  }
};


  // Save bio + avatar
  const handleSave = async () => {
    const formData = new FormData();
    formData.append("bio", bio);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      const res = await fetch("http://localhost:8000/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to save profile");
      await fetchProfile();
      alert("Profile updated!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save changes.");
    }
  };

  if (loading) return <p>Loading profile...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "2rem" }}>
      <h2>My Profile</h2>
      <p>
        <strong>Email:</strong> {email}
      </p>

      {/* Bio Section */}
      <div style={{ margin: "1rem 0" }}>
        <label>Bio (max 2000 chars)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows="5"
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      {/* Avatar Upload */}
      <div style={{ margin: "1rem 0" }}>
        <label>Avatar</label>
        <br />
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Avatar preview"
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "8px",
            }}
          />
        )}
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
      </div>

      {/* Resume Upload */}
      <div style={{ margin: "1rem 0" }}>
        <label>Upload Resume (PDF only)</label>
        <br />
        <input type="file" accept=".pdf" onChange={handleResumeChange} />
        <button
          onClick={handleResumeUpload}
          style={{
            marginLeft: "10px",
            padding: "6px 12px",
            backgroundColor: "#1e90ff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Upload
        </button>
        {resumeName && (
          <p style={{ marginTop: "10px" }}>
            ✅ Uploaded Resume: <strong>{resumeName}</strong>
          </p>
        )}
      </div>

      {/* Save Changes */}
      <button
        onClick={handleSave}
        style={{
          padding: "10px 20px",
          backgroundColor: "#2e8b57",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save Changes
      </button>
    </div>
  );
};

export default ProfilePage;
