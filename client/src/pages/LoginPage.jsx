import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(true);

  const handleLogin = async(loginData) => {
    console.log('Login data:', loginData);
    // TODO: Connect to backend
    const response = await fetch('http://localhost:8000/login',{
      method: 'POST',
      headers: {
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        email: loginData.email,
        password: loginData.password,
      }),
    });
    const data = await response.json();
    if(response.ok){
      alert('Login succesfull')
      console.log('success')
      navigate('/dashboard');
    }else{
      alert(data.message || 'Failed to Login')
      console.log('failure')
    }
    //navigate('/dashboard'); // Will change this later
  };

  const toggleForm = () => {
    navigate('/signup');
  };

  return (
    <div>
      <LoginForm onLogin={handleLogin} toggleForm={toggleForm} />
    </div>
  );
};

export default LoginPage;