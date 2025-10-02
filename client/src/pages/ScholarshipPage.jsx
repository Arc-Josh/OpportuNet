// pages/ScholarshipPage.jsx
import React, { useEffect, useState } from "react";
import Scholarship from "../components/Scholarship";
import { getToken } from "../storage/token";
import { useNavigate } from "react-router-dom";
import "../styles/dashboardStyles.css";

const ScholarshipPage = () => {
  const [email, setEmail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();

    if (token) {
      fetch("http://localhost:8000/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setEmail(data.email))
        .catch((err) => console.error("Error fetching dashboard data:", err));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="dashboard-page">
      <Scholarship />
    </div>
  );
};

export default ScholarshipPage;
