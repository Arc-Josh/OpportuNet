import React, { useEffect, useState } from "react";

const ProfilePage = () => {
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token"); // stored on login

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setEmail(data.email);
      setBio(data.bio || "");
      if (data.avatar) {
        // backend sends avatar as base64 (if you implement it)
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
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Save profile
  const handleSave = async () => {
    const formData = new FormData();
    formData.append("bio", bio);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      const res = await fetch("http://localhost:8000/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to save profile");
      await fetchProfile(); // reload profile after saving
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
      <p><strong>Email:</strong> {email}</p>

      <div style={{ margin: "1rem 0" }}>
        <label>Bio (max 2000 chars)</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows="5"
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label>Avatar</label>
        <br />
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Avatar preview"
            style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px" }}
          />
        )}
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
      </div>

      <button onClick={handleSave} style={{ padding: "10px 20px" }}>
        Save Changes
      </button>
    </div>
  );
};

export default ProfilePage;
