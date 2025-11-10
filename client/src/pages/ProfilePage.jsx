import React, { useState, useEffect } from "react";
import "../styles/authStyles.css";

const ProfilePage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    education: "",
    bio: "",
    experience: "",
  });

  const [profilePic, setProfilePic] = useState(null);
  const [resume, setResume] = useState(null);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  //  Fetch saved profile data when component loads
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token"); // get token from localStorage
      if (!token) {
        console.warn("⚠️ No token found — please log in first.");
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/profile", {
          headers: {
            Authorization: `Bearer ${token}`, //  include token
          },
        });

        if (response.status === 401) {
          console.error("Unauthorized — please log in again.");
          setMessage("⚠️ Session expired. Please log in again.");
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setFormData({
            fullName: data.fullName || "",
            email: data.email || "",
            education: data.education || "",
            bio: data.bio || "",
            experience: data.experience || "",
          });
          setProfilePic(data.profilePic || null);
          setResume(data.resume ? `http://localhost:8000/${data.resume}` : null);
          setIsEditing(false);
        } else {
          console.error("Failed to fetch profile:", response.statusText);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  //  Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  //  Handle file uploads
  const handleProfilePicChange = (e) => setProfilePic(e.target.files[0]);
  const handleResumeChange = (e) => setResume(e.target.files[0]);

  //  Submit updated profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving...");

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) =>
      formDataToSend.append(key, value)
    );

    if (profilePic instanceof File)
      formDataToSend.append("profilePic", profilePic);
    if (resume instanceof File) formDataToSend.append("resume", resume);

    const token = localStorage.getItem("token"); // get token again

    try {
      const response = await fetch("http://localhost:8000/update_profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, //  include token here
        },
        body: formDataToSend,
      });

      if (response.status === 401) {
        setMessage("⚠️ Session expired. Please log in again.");
        return;
      }

      if (response.ok) {
        setMessage(" Profile updated successfully!");
        setIsEditing(false);
      } else {
        setMessage(" Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Error connecting to server.");
    }
  };

  //  Switch to edit mode
  const handleEdit = () => setIsEditing(true);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-title">My Profile</h2>

        {/* === Display Mode === */}
        {!isEditing ? (
          <div className="profile-view">
            {profilePic && (
              <img
                src={
                  typeof profilePic === "string"
                    ? profilePic
                    : URL.createObjectURL(profilePic)
                }
                alt="Profile"
                className="profile-display-pic"
              />
            )}

            <h3>{formData.fullName || "Your Name"}</h3>
            <p>
              <strong>Email:</strong> {formData.email}
            </p>
            <p>
              <strong>Education:</strong> {formData.education}
            </p>
            <p>
              <strong>Bio:</strong> {formData.bio}
            </p>
            <p>
              <strong>Experience:</strong> {formData.experience}
            </p>

            {resume && (
              <p>
                📄{" "}
                <a href={resume} target="_blank" rel="noreferrer">
                  View Resume
                </a>
              </p>
            )}

            <button className="save-btn" onClick={handleEdit}>
              Edit Profile
            </button>
          </div>
        ) : (
          // === Edit Mode (Form) ===
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Full Name:</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Education:</label>
              <input
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
                placeholder="e.g., B.S. Computer Science - University of North Texas"
              />
            </div>

            <div className="form-group">
              <label>Bio:</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                placeholder="Write a short summary about yourself..."
              />
            </div>

            <div className="form-group">
              <label>Experience:</label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your experience, e.g., internships, projects, or work history..."
              />
            </div>

            <div className="upload-section">
              <label>Profile Picture:</label>
              <input type="file" accept="image/*" onChange={handleProfilePicChange} />
              {profilePic && (
                <img
                  src={
                    typeof profilePic === "string"
                      ? profilePic
                      : URL.createObjectURL(profilePic)
                  }
                  alt="Profile Preview"
                  className="profile-preview"
                />
              )}
            </div>

            <div className="upload-section">
              <label>Upload Resume (PDF only):</label>
              <input type="file" accept=".pdf" onChange={handleResumeChange} />
              {resume && !(resume instanceof File) && (
                <p>
                  📄{" "}
                  <a href={resume} target="_blank" rel="noreferrer">
                    View Current Resume
                  </a>
                </p>
              )}
            </div>

            <button type="submit" className="save-btn">
              Save Changes
            </button>

            {message && <p className="status-message">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
