import React, { useState, useEffect} from 'react';
import axios from 'axios';
import '../styles/chatbotStyles.css';
import { NavLink, UNSAFE_decodeViaTurboStream, useNavigate } from 'react-router-dom';
import { getToken } from '../storage/token';

const Chatbot = () => {
  const [email, setEmail] = useState(null);

  const navigate = useNavigate()
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] =useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if(!token) {
      console.log("no token found");
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/chatbot', { question },
      {headers:{'Authorization':`Bearer ${token}`}
    });
      setAnswer(response.data.answer);
      setQuestion("");
    } catch (error) {
      console.error(error);
      setAnswer("Sorry, something went wrong. Please try again.");
    }finally {
      setLoading(false);
    }

  };

  return (
    <div className="chatbot-container">
      <h2>Chat with our Bot</h2>
      <form onSubmit={handleSubmit} className="chatbot-form">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Ask me a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" className="chatbot-button">Send</button>
      </form>
      {loading && (
          <div className="bot-msg loading">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      {answer && !loading &&(
        <div className="chatbot-answer">
          <p>{JSON.stringify(answer)}</p>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
