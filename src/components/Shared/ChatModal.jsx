import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, X, MessageSquare, ShieldCheck, User as UserIcon } from 'lucide-react';
import '../../styles/Shared/ChatModal.css';

const ChatModal = ({
  quoteId,
  isNetworkQuote = true,
  jobTitle = 'Trabajo en la Red',
  otherPartyName = 'Usuario',
  otherPartyRole = 'Técnico de la Red',
  onClose,
  initialMessages = []
}) => {
  const [messages, setMessages] = useState(initialMessages || []);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
  const currentUserId = session?.userData?.id;

  const getCleanQuoteId = () => {
    if (!quoteId) return null;
    return String(quoteId).replace(/^net_/, '');
  };

  const fetchChatHistory = async () => {
    const cleanId = getCleanQuoteId();
    if (!cleanId) return;

    try {
      const token = localStorage.getItem('agente_token');
      const url = isNetworkQuote
        ? `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${cleanId}/chat`
        : `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cleanId}`;

      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.chat_history) {
        setMessages(res.data.chat_history);
      } else if (res.data?.quote?.chat_history) {
        setMessages(res.data.quote.chat_history);
      }
    } catch (e) {
      console.warn("No se pudo actualizar el chat en vivo:", e);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    const interval = setInterval(fetchChatHistory, 3000);
    return () => clearInterval(interval);
  }, [quoteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    const cleanId = getCleanQuoteId();

    const optimisticMsg = {
      sender_id: currentUserId,
      sender_name: session?.userData?.name || session?.userData?.first_name || 'Yo',
      sender_role: session?.userData?.role_id === 3 ? 'Cliente' : (session?.userData?.role_id === 4 ? 'Autónomo' : 'Técnico'),
      message: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setSending(true);

    try {
      const token = localStorage.getItem('agente_token');
      const url = isNetworkQuote
        ? `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${cleanId}/chat`
        : `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cleanId}/chat`;

      const res = await axios.post(
        url,
        { message: textToSend },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.chat_history) {
        setMessages(res.data.chat_history);
      }
    } catch (err) {
      console.error("Error al enviar mensaje de chat:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="chat-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chat-modal-container">
        {/* Header */}
        <div className="chat-modal-header">
          <div className="chat-header-user">
            <div className="chat-user-avatar">
              {otherPartyName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="chat-user-info">
              <h3 className="chat-user-name">
                {otherPartyName}
                <span className="chat-user-role-badge">
                  <ShieldCheck size={11} style={{ marginRight: 2 }} />
                  {otherPartyRole}
                </span>
              </h3>
              <p className="chat-job-subtitle" title={jobTitle}>
                📋 {jobTitle}
              </p>
            </div>
          </div>
          <button className="chat-btn-close" onClick={onClose} title="Cerrar Chat">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="chat-messages-body">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <div className="chat-empty-title">Inicia la conversación</div>
              <div className="chat-empty-desc">
                Coordina dudas sobre el trabajo, materiales o tiempos de llegada con {otherPartyName}.
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = String(msg.sender_id) === String(currentUserId) || msg.sender_role === 'Yo';
              return (
                <div key={idx} className={`chat-message-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && (
                    <span className="chat-message-sender">
                      {msg.sender_name || otherPartyName} ({msg.sender_role || otherPartyRole})
                    </span>
                  )}
                  <div className="chat-bubble">
                    {msg.message}
                  </div>
                  <span className="chat-message-time">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="chat-modal-footer">
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input-field"
              placeholder="Escribe un mensaje aquí..."
              value={inputText}
              onFocus={handleInputFocus}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
              autoFocus
            />
            <button
              type="submit"
              className="chat-btn-send"
              disabled={!inputText.trim() || sending}
              title="Enviar Mensaje"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
