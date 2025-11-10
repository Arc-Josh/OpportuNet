import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { storeToken } from '../storage/token';
import { AuthContext } from '../context/AuthContext'; // ✅ import the context
import '../styles/authStyles.css'; 
import logo from '../assets/logo.png';  


const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // ✅ get login() from context

  const handleLogin = async (loginData) => {
    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok) {
        const token = data.access_token || data.token;
        if (!token) {
          alert("Login succeeded but no token returned from server!");
          return false;
        }

        //  Save to localStorage as before
        storeToken(token);

        //  Update global auth state so Navbar re-renders immediately
        login(token);

        //  Redirect after login
        navigate("/dashboard");
        return true;
      } else {
        alert(data.detail || "Invalid login credentials");
        return false;
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Error connecting to server");
      return false;
    }
  };

  const toggleForm = () => {
    navigate('/signup');
  };

  return (
    <div className="login-page">
      {/* LEFT SIDE: Image or Gradient */}
      <div className="login-hero">
        <div className="overlay">
          <h1>Welcome Back 👋</h1>
          <p>Sign in to explore new CS & IT opportunities through Opportunet.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="login-panel">
        <div className="auth-container">
          <div className="login-brand">
          <img src={logo} alt="Opportunet Logo" className="brand-logo" />
          <h2 className="brand-heading">Opportunet</h2>
        </div>
          <LoginForm onLogin={handleLogin} toggleForm={toggleForm} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
