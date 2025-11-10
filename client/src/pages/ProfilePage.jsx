/*import React, { useState, useEffect } from "react";
import "../styles/authStyles.css";

const ProfilePage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    education: "",
    bio: "",
    experience: "",
  });

  const [profilePic, setProfilePic] = useState(null); // can be File or URL
  const [resume, setResume] = useState(null); // can be File or URL
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:8000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            fullName: data.full_name || "",
            email: data.email || "",
            education: data.education || "",
            bio: data.bio || "",
            experience: data.experience || "",
          });
          setProfilePic(data.profile_pic_url || null);
          setResume(data.resume_url || null);
          setIsEditing(false);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleProfilePicChange = (e) => setProfilePic(e.target.files[0]);
  const handleResumeChange = (e) => setResume(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving...");
    const formToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => formToSend.append(key, value));

    if (profilePic instanceof File) formToSend.append("profilePic", profilePic);
    if (resume instanceof File) formToSend.append("resume", resume);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:8000/update_profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formToSend,
      });
      if (res.ok) {
        const updatedData = await res.json();
        setProfilePic(updatedData.profile_pic_url || profilePic);
        setResume(updatedData.resume_url || resume);
        setMessage("Profile updated successfully!");
        setIsEditing(false);
      } else {
        setMessage("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server.");
    }
  };

  const handleEdit = () => setIsEditing(true);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-title">My Profile</h2>

        {!isEditing ? (
          <div className="profile-view">
            {profilePic && (
              <img
                src={typeof profilePic === "string" ? profilePic : URL.createObjectURL(profilePic)}
                alt="Profile"
                className="profile-display-pic"
              />
            )}
            <h3>{formData.fullName || "Your Name"}</h3>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Education:</strong> {formData.education}</p>
            <p><strong>Bio:</strong> {formData.bio}</p>
            <p><strong>Experience:</strong> {formData.experience}</p>

            {resume && (
              <p>
                📄 <a href={typeof resume === "string" ? resume : "#"} target="_blank" rel="noreferrer">View Resume</a>
              </p>
            )}

            <button className="save-btn" onClick={handleEdit}>Edit Profile</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
            <input type="text" name="education" value={formData.education} onChange={handleChange} />
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" />
            <textarea name="experience" value={formData.experience} onChange={handleChange} rows="4" />

            <div className="upload-section">
              <label>Profile Picture:</label>
              <input type="file" accept="image/*" onChange={handleProfilePicChange} />
              {profilePic && !(profilePic instanceof File) && (
                <img src={profilePic} alt="Profile Preview" className="profile-preview" />
              )}
            </div>

            <div className="upload-section">
              <label>Resume:</label>
              <input type="file" accept=".pdf" onChange={handleResumeChange} />
              {resume && !(resume instanceof File) && (
                <p>📄 <a href={resume} target="_blank" rel="noreferrer">View Current Resume</a></p>
              )}
            </div>

            <button type="submit" className="save-btn">Save Changes</button>
            {message && <p className="status-message">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
*/
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

  const [profilePic, setProfilePic] = useState(null); // string (S3 URL) or File
  const [resume, setResume] = useState(null); // string (S3 URL) or File
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  // Fetch profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:8000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setFormData({
            fullName: data.full_name || "",
            email: data.email || "",
            education: data.education || "",
            bio: data.bio || "",
            experience: data.experience || "",
          });
          setProfilePic(data.profile_pic_url || null);
          setResume(data.resume_url || null);
          setIsEditing(false);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // Form input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // File change handlers
  const handleProfilePicChange = (e) => setProfilePic(e.target.files[0]);
  const handleResumeChange = (e) => setResume(e.target.files[0]);

  // Submit updated profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving...");

    const formToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => formToSend.append(key, value));

    if (profilePic instanceof File) formToSend.append("profilePic", profilePic);
    if (resume instanceof File) formToSend.append("resume", resume);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:8000/update_profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formToSend,
      });

      if (res.ok) {
        const updatedData = await res.json();

        // Update S3 URLs after successful upload
        setProfilePic(updatedData.profile_pic_url || profilePic);
        setResume(updatedData.resume_url || resume);
        setMessage("Profile updated successfully!");
        setIsEditing(false);
      } else {
        setMessage("Failed to update profile.");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setMessage("Error connecting to server.");
    }
  };

  // Switch to edit mode
  const handleEdit = () => setIsEditing(true);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-title">My Profile</h2>

        {!isEditing ? (
          <div className="profile-view">
            {profilePic && (
              <img
                src={typeof profilePic === "string" ? profilePic : URL.createObjectURL(profilePic)}
                alt="Profile"
                className="profile-display-pic"
              />
            )}
            <h3>{formData.fullName || "Your Name"}</h3>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Education:</strong> {formData.education}</p>
            <p><strong>Bio:</strong> {formData.bio}</p>
            <p><strong>Experience:</strong> {formData.experience}</p>

            {resume && (
              <p>
                📄{" "}
                <a
                  href={typeof resume === "string" ? resume : "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Resume
                </a>
              </p>
            )}

            <button className="save-btn" onClick={handleEdit}>
              Edit Profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Email:</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Full Name:</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Education:</label>
              <input type="text" name="education" value={formData.education} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Bio:</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" />
            </div>

            <div className="form-group">
              <label>Experience:</label>
              <textarea name="experience" value={formData.experience} onChange={handleChange} rows="4" />
            </div>

            <div className="upload-section">
              <label>Profile Picture:</label>
              <input type="file" accept="image/*" onChange={handleProfilePicChange} />
              {profilePic && !(profilePic instanceof File) && (
                <img src={profilePic} alt="Profile Preview" className="profile-preview" />
              )}
            </div>

            <div className="upload-section">
              <label>Resume (PDF only):</label>
              <input type="file" accept=".pdf" onChange={handleResumeChange} />
              {resume && !(resume instanceof File) && (
                <p>
                  📄 <a href={resume} target="_blank" rel="noreferrer">View Current Resume</a>
                </p>
              )}
            </div>

            <button type="submit" className="save-btn">Save Changes</button>
            {message && <p className="status-message">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
