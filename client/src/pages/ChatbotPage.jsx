import React from 'react';
import Chatbot from '../components/Chatbot';
import '../styles/chatbotStyles.css';
import { getToken } from '../storage/token';
import { NavLink, UNSAFE_decodeViaTurboStream, useNavigate } from 'react-router-dom';

const ChatbotPage = () => {
 
  return (
    <div className="chatbot-page">
      <Chatbot />
    </div>
  );
};

export default ChatbotPage;
