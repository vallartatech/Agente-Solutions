import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

// Página pública requerida por Google Play: permite solicitar la eliminación de la cuenta sin tener la app instalada
const CORREO_SOPORTE = 'soporte@agentesolutions.com';

const estiloInput = {
  width: '100%', padding: '12px 45px', borderRadius: '30px',
  border: 'none', backgroundColor: '#fff', color: '#111', fontSize: '1rem',
  boxSizing: 'border-box'
};
const estiloIcono = { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' };

const EliminarCuenta = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmado) {
      setMessage('Debes confirmar que entiendes que esta acción no se puede deshacer.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const api = import.meta.env.VITE_API_BASE_URL;
      const login = await axios.post(`${api}/login`, { email, password });
      const token = login.data?.token;
      if (!token) throw new Error('Sin token');

      const res = await axios.delete(`${api}/users/delete-my-account`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsSuccess(true);
      setMessage(res.data?.message || 'Tu cuenta fue eliminada.');
    } catch (error) {
      setIsSuccess(false);
      const data = error.response?.data;
      setMessage(data?.error || data?.message || `No se pudo eliminar la cuenta. Escríbenos a ${CORREO_SOPORTE}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: '#111', color: '#fff', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.05)', padding: '36px 24px', borderRadius: '15px', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '16px', fontStyle: 'italic' }}>ELIMINAR MI CUENTA</h2>

        <div style={{ color: '#ccc', fontSize: '0.93rem', lineHeight: 1.6, marginBottom: '24px' }}>
          <p>Al eliminar tu cuenta de <b>Agente Solutions</b>:</p>
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Tu acceso se desactiva de inmediato y se cierran todas tus sesiones.</li>
            <li>Tus datos personales se eliminan o anonimizan en un máximo de 90 días.</li>
            <li>Se conservan los registros que la ley exige (por ejemplo, fiscales) y los reportes de servicios que pertenecen a la empresa que los contrató.</li>
          </ul>
          <p>
            También puedes eliminarla desde tu perfil dentro de la app. Consulta el <Link to="/privacidad" style={{ color: '#f26522' }}>aviso de privacidad</Link>.
          </p>
        </div>

        {isSuccess ? (
          <p style={{ textAlign: 'center', color: '#28a745', fontSize: '1rem' }}>{message}</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Mail size={20} color="#888" style={estiloIcono} />
              <input
                type="text"
                placeholder="Correo o teléfono"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={estiloInput}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={20} color="#888" style={estiloIcono} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={estiloInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
              </button>
            </div>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem', color: '#ccc', cursor: 'pointer' }}>
              <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} style={{ marginTop: '3px' }} />
              Entiendo que esta acción no se puede deshacer.
            </label>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px', borderRadius: '30px', backgroundColor: '#dc3545',
                color: '#fff', fontWeight: 'bold', fontSize: '1rem', border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'ELIMINANDO...' : 'ELIMINAR MI CUENTA'}
            </button>
          </form>
        )}

        {message && !isSuccess && (
          <p style={{ marginTop: '20px', textAlign: 'center', color: '#dc3545', fontSize: '0.95rem' }}>{message}</p>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: '#999' }}>
          ¿No puedes iniciar sesión? Solicita la eliminación escribiendo desde tu correo registrado a{' '}
          <a href={`mailto:${CORREO_SOPORTE}?subject=Eliminar%20mi%20cuenta`} style={{ color: '#f26522' }}>{CORREO_SOPORTE}</a>.
        </p>

        <p style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#f26522', fontWeight: 'bold' }}>← Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
};

export default EliminarCuenta;
