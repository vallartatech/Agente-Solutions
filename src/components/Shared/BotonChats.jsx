import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChatNoLeidos } from './chatService';

// Botón 💬 del encabezado con el contador de mensajes sin leer.
// Solo para el equipo (root, admins y técnicos), igual que el chat.
const BotonChats = ({ className = 'vcp-nav-icon-btn' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const esEquipo = [0, 1, 2].includes(Number(user?.role_id));
  const noLeidos = useChatNoLeidos(esEquipo);

  if (!esEquipo) return null;

  return (
    <button
      type="button"
      className={`${className} vcp-chat-btn ${pathname.startsWith('/chats') ? 'activo' : ''}`}
      title="Chats del equipo"
      aria-label={noLeidos ? `Chats: ${noLeidos} sin leer` : 'Chats'}
      onClick={() => navigate('/chats')}
    >
      <MessageCircle size={18} color="#ffffff" strokeWidth={2.2} />
      {noLeidos > 0 && <span className="vcp-chat-badge">{noLeidos > 9 ? '9+' : noLeidos}</span>}
    </button>
  );
};

export default BotonChats;
