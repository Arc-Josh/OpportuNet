import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupForm from '../components/oldSignupForm';

const SignupPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const handleSignup = async(signupData) => {
    console.log('Signup data:', signupData);
    // TODO: Connect to backend
    const response = await fetch('http://localhost:8000/signup',{
      method: 'POST',
      headers: {
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        //credentials: 'include',
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        enabled: signupData.enabled 
      }),
    });
    const data = await response.json();
    if(response.ok){
      alert('Account created!')
      console.log('success')
    }else{
      alert(data.message || 'Failed to create account')
      console.log('failure')
    }
    navigate('/login'); // Will change this later
  };

  const toggleForm = () => {
    navigate('/login');
  };

  return (
    <div>
      <SignupForm onSignup={handleSignup} toggleForm={toggleForm} />
    </div>
  );
};

export default SignupPage;