import React, { useState } from 'react';
import { User, Lock, Mail, Phone, Shield, X, Wrench } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RegisterModal = ({ isOpen = true, onClose, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    role_id: 2 // TÉCNICO AGENTE
  });

  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rol permitido según requerimiento: Técnico asignado
  const isRoot = user?.role_id === 0 || user?.role_id === 1;
  const rolTecnico = {
    id: 2,
    label: isRoot ? 'TÉCNICO AGENTE' : 'TÉCNICO DE MI EQUIPO',
    desc: isRoot ? 'Técnico directo de Agente Solutions' : 'Técnico vinculado a tu cuenta y servicios directos',
    color: '#F26522'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'role_id' ? parseInt(value) : value
    }));
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setMensaje('');
    setTipoMensaje('');

    if (formData.password !== formData.confirmPassword) {
      setMensaje('Error: Las contraseñas no coinciden.');
      setTipoMensaje('error');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/registro-usuario`,
        {
          ...formData,
          role_id: 2,
          tenant_id: user?.tenant_id || undefined,
          from_admin: true,
          captcha_token: 'from_admin_bypass'
        },
        { headers }
      );

      setMensaje(`¡Técnico ${res.data.user?.first_name || ''} registrado con éxito!`);
      setTipoMensaje('success');

      setTimeout(() => {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          password: '',
          confirmPassword: '',
          role_id: 2
        });
        setIsLoading(false);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1500);

    } catch (error) {
      setIsLoading(false);
      setTipoMensaje('error');
      if (error.response && error.response.data && error.response.data.errors) {
        const errs = error.response.data.errors;
        const msg = Object.values(errs).flat().join(' ');
        setMensaje(msg || 'Error: Datos inválidos o correo/teléfono ya registrado.');
      } else {
        setMensaje('Error al conectar con el servidor.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="root-register-overlay">
      <style>{`
        .root-register-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 14, 23, 0.82);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
          box-sizing: border-box;
          animation: fadeInOverlay 0.2s ease-out;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .root-register-card {
          background: rgba(18, 24, 38, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 30px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 35px rgba(242, 101, 34, 0.18);
          position: relative;
          color: white;
          font-family: 'Outfit', -apple-system, sans-serif;
        }

        .root-register-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 14px;
        }

        .root-register-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.5px;
        }

        .root-close-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94a3b8;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .root-close-btn:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          transform: rotate(90deg);
        }

        .role-single-box {
          background: rgba(242, 101, 34, 0.12);
          border: 2px solid #F26522;
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
          box-shadow: 0 4px 20px rgba(242, 101, 34, 0.2);
        }

        .role-single-icon {
          font-size: 1.8rem;
          line-height: 1;
        }

        .role-single-info-title {
          font-weight: 900;
          font-size: 1rem;
          color: #ffffff;
          letter-spacing: 0.5px;
        }

        .role-single-info-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 2px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .form-input-box {
          position: relative;
        }

        .form-input-box input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          border-radius: 12px;
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          background: rgba(11, 16, 26, 0.85);
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input-box input::placeholder {
          color: #64748b;
          font-weight: 500;
          font-size: 0.85rem;
        }

        .form-input-box input:focus {
          border-color: #F26522;
          background: rgba(11, 16, 26, 0.95);
          box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.25);
        }

        .form-input-box .input-icon-svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .btn-submit-root {
          width: 100%;
          padding: 13px;
          border-radius: 50px;
          border: none;
          background: linear-gradient(135deg, #F26522 0%, #d84e0c 100%);
          color: white;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(242, 101, 34, 0.35);
          transition: all 0.2s;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-submit-root:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(242, 101, 34, 0.5);
          background: linear-gradient(135deg, #ff7233 0%, #e05300 100%);
        }

        .btn-submit-root:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
          .root-register-card {
            padding: 20px;
          }
        }
      `}</style>

      <div className="root-register-card">
        <div className="root-register-header">
          <div className="root-register-title">
            <Shield size={22} color="#F26522" />
            <span>REGISTRO DE USUARIO (TÉCNICO AGENTE)</span>
          </div>
          {onClose && (
            <button className="root-close-btn" onClick={onClose} type="button" title="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Rol único seleccionado: Técnico Agente */}
        <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
          ROL ASIGNADO (EQUIPO INTERNO):
        </label>
        <div className="role-single-box">
          <Wrench size={26} color="#F26522" className="role-single-icon" />
          <div>
            <div className="role-single-info-title">{rolTecnico.label}</div>
            <div className="role-single-info-desc">{rolTecnico.desc}</div>
          </div>
        </div>

        <form onSubmit={handleRegistro}>
          <div className="form-grid-2">
            <div className="form-input-box">
              <User className="input-icon-svg" size={17} />
              <input
                name="first_name"
                required
                type="text"
                placeholder="NOMBRE(S)"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-input-box">
              <User className="input-icon-svg" size={17} />
              <input
                name="last_name"
                required
                type="text"
                placeholder="APELLIDOS"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-input-box">
              <Mail className="input-icon-svg" size={17} />
              <input
                name="email"
                required
                type="email"
                placeholder="CORREO ELECTRÓNICO"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-input-box">
              <Phone className="input-icon-svg" size={17} />
              <input
                name="phone_number"
                required
                type="tel"
                placeholder="TELÉFONO (10 DÍGITOS)"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-input-box">
              <Lock className="input-icon-svg" size={17} />
              <input
                name="password"
                required
                type="password"
                placeholder="CONTRASEÑA"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-input-box">
              <Lock className="input-icon-svg" size={17} />
              <input
                name="confirmPassword"
                required
                type="password"
                placeholder="CONFIRMA CONTRASEÑA"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn-submit-root" disabled={isLoading}>
            {isLoading ? 'REGISTRANDO TÉCNICO...' : 'CREAR Y ACTIVAR CUENTA'}
          </button>
        </form>

        {mensaje && (
          <div style={{
            marginTop: '18px',
            padding: '12px 16px',
            borderRadius: '12px',
            textAlign: 'center',
            fontWeight: '800',
            fontSize: '0.9rem',
            color: 'white',
            backgroundColor: tipoMensaje === 'error' ? '#ef4444' : '#10b981',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
          }}>
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;