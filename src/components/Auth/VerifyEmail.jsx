import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const VerifyEmail = () => {
  const { id, hash } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verificando tu correo electrónico...');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/email/verify/${id}/${hash}`);
        setStatus('success');
        setMessage(res.data.message || '¡Tu correo ha sido verificado exitosamente!');
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'El enlace de verificación es inválido o ha expirado.');
      }
    };

    verify();
  }, [id, hash, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#fff', padding: '20px' }}>
      
      {status === 'loading' && <Loader size={60} color="#f26522" className="spinner" style={{ marginBottom: '20px', animation: 'spin 1s linear infinite' }} />}
      {status === 'success' && <CheckCircle size={60} color="#28a745" style={{ marginBottom: '20px' }} />}
      {status === 'error' && <XCircle size={60} color="#dc3545" style={{ marginBottom: '20px' }} />}
      
      <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', textAlign: 'center' }}>{message}</h1>
      
      {status === 'success' && (
        <p style={{ color: '#ccc', textAlign: 'center' }}>Redirigiendo al inicio de sesión...</p>
      )}

      {status === 'error' && (
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            marginTop: '20px', padding: '10px 20px', 
            backgroundColor: '#f26522', color: '#fff', border: 'none', borderRadius: '30px', 
            cursor: 'pointer' 
          }}
        >
          Volver al Inicio
        </button>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
