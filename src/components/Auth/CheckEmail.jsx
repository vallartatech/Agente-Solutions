import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#fff', padding: '20px' }}>
      <Mail size={80} color="#f26522" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '10px', textAlign: 'center' }}>Revisa tu Bandeja de Entrada</h1>
      <p style={{ fontSize: '1.1rem', color: '#ccc', textAlign: 'center', maxWidth: '500px', marginBottom: '20px', lineHeight: '1.6' }}>
        Hemos enviado un enlace de confirmación a {email ? <strong style={{ color: '#fff' }}>{email}</strong> : 'tu correo electrónico'}. 
        Por favor, haz clic en el enlace para validar tu cuenta.
      </p>
      
      <p style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', maxWidth: '500px', marginBottom: '30px' }}>
        Si no encuentras el correo, asegúrate de revisar la carpeta de Spam o Correo no deseado.
      </p>

      <button 
        onClick={() => navigate('/')} 
        style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', 
          backgroundColor: '#f26522', color: '#fff', border: 'none', borderRadius: '30px', 
          fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.3s'
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#d25412'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#f26522'}
      >
        Ir al Inicio de Sesión <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default CheckEmail;
