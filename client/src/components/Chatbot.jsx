import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/chatbotStyles.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../storage/token";

const Chatbot = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      console.log("no token found");
      navigate("/login");
      return;
    }

    const userMsg = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chatbot",
        { question },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const botMsg = { sender: "bot", text: response.data.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="chatbot-container">
      <header className="chatbot-header">Opie</header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}
          >
            {msg.sender === "bot" && (
              <div className="bot-icon">O</div>
            )}
            <div className="msg-text">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="message bot-msg">
            <div className="bot-icon">O</div>
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

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
    </div>
  );
};

export default Chatbot;
