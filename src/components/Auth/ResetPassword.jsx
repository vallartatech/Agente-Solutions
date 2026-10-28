import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const token = queryParams.get('token');
  const email = queryParams.get('email');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/reset-password`, {
        token,
        email,
        password,
      });

      setIsSuccess(true);
      setMessage(res.data.message || 'Contraseña restablecida exitosamente.');
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'El enlace es inválido o ha expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111', color: '#fff' }}>
        <h2>Enlace de recuperación inválido.</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#fff', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '40px 30px', borderRadius: '15px', backdropFilter: 'blur(10px)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontStyle: 'italic' }}>NUEVA CONTRASEÑA</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Lock size={20} color="#888" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%', padding: '12px 45px', borderRadius: '30px', 
                border: 'none', backgroundColor: '#fff', color: '#111', fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || isSuccess}
            style={{ 
              padding: '12px', borderRadius: '30px', backgroundColor: '#f26522', 
              color: '#fff', fontWeight: 'bold', fontSize: '1rem', border: 'none', 
              cursor: (isLoading || isSuccess) ? 'not-allowed' : 'pointer', transition: 'background 0.3s'
            }}
          >
            {isLoading ? 'GUARDANDO...' : 'RESTABLECER CONTRASEÑA'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '20px', textAlign: 'center', color: isSuccess ? '#28a745' : '#dc3545', fontSize: '0.95rem' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
