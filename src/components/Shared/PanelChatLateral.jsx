import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import '../../styles/Shared/PanelChatLateral.css';

// Chat en un panel lateral izquierdo que se muestra y oculta con su pestaña, como en el mapa.
// Se monta en body para quedar encima de los modales.
const PanelChatLateral = ({ abierto, onToggle, contador = 0, children }) => createPortal(
  <div className={`chat-lateral ${abierto ? 'abierto' : ''}`} onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      className="chat-lateral-tab"
      onClick={onToggle}
      title={abierto ? 'Ocultar conversación' : 'Mostrar conversación'}
      aria-label={abierto ? 'Ocultar conversación' : 'Mostrar conversación'}
      aria-expanded={abierto}
    >
      {abierto ? <ChevronLeft size={22} strokeWidth={2.8} /> : <ChevronRight size={22} strokeWidth={2.8} />}
      <MessageCircle size={16} />
      {!abierto && contador > 0 && <span className="chat-lateral-tab-count">{contador}</span>}
    </button>

    <div className="chat-lateral-contenido">
      <div className="chat-lateral-vidrio">{children}</div>
    </div>
  </div>,
  document.body
);

export default PanelChatLateral;
