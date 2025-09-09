import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { storeToken } from '../storage/token';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = async(loginData) => {
    try {
      const response = await fetch('http://localhost:8000/login',{
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if(response.ok){
        storeToken(data.token);
        navigate('/dashboard');
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const toggleForm = () => {
    navigate('/signup');
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <LoginForm onLogin={handleLogin} toggleForm={toggleForm} />
      </div>
    </div>
  );
};

export default LoginPage;
