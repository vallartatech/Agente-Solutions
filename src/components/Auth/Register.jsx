import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Lock, Mail, Phone, X, Wrench, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
// Mismo diseño "liquid glass" / bottom sheet que el modal Registrar Propiedad
import '../../styles/AgenteMarket/Cliente/ModalRegistroInmueble.css';
import '../../styles/Shared/LiquidGlass.css';

const RegisterModal = ({ isOpen = true, onClose, onSuccess }) => {
  const { user } = useAuth();

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

  // Gesto táctil: Arrastrar hacia abajo para cerrar (Swipe down to dismiss)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    if (!onClose || e.target.closest('button, input, select, textarea, a')) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) setDragY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!touchStartY.current) return;
    setIsDragging(false);
    if (dragY > 80) {
      setDragY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setDragY(0);
      }, 200);
    } else {
      setDragY(0);
    }
    touchStartY.current = 0;
  };

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

  const campos = [
    { name: 'first_name', type: 'text', label: 'Nombre(s)', placeholder: 'Ej. Juan Carlos', icon: User },
    { name: 'last_name', type: 'text', label: 'Apellidos', placeholder: 'Ej. Pérez López', icon: User },
    { name: 'email', type: 'email', label: 'Correo Electrónico', placeholder: 'Ej. tecnico@correo.com', icon: Mail },
    { name: 'phone_number', type: 'tel', label: 'Teléfono', placeholder: '10 dígitos', icon: Phone },
    { name: 'password', type: 'password', label: 'Contraseña', placeholder: 'Ingresa una contraseña', icon: Lock },
    { name: 'confirmPassword', type: 'password', label: 'Confirma Contraseña', placeholder: 'Repite la contraseña', icon: Lock },
  ];

  return createPortal(
    <div className="mri-overlay" onClick={onClose}>
      <style>{`
        .reg-role-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(242, 101, 34, 0.14);
          border: 1px solid rgba(255, 140, 66, 0.45);
          box-sizing: border-box;
        }
        .reg-role-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 140, 66, 0.18);
          border: 1px solid rgba(255, 140, 66, 0.35);
          color: #ff8c42;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .reg-role-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.4px;
        }
        .reg-role-desc {
          font-size: 0.76rem;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 2px;
        }
      `}</style>

      <div
        className="mri-card"
        onClick={e => e.stopPropagation()}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Mobile grabber pill táctil */}
        <div
          className="mri-grabber-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mri-grabber" />
        </div>

        <div
          className="mri-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mri-header-text">
            <span className="mri-tag">NUEVO USUARIO</span>
            <h2 className="mri-title">Registrar Técnico</h2>
          </div>
          {onClose && (
            <button className="mri-close-btn" onClick={onClose} title="Cerrar ventana" aria-label="Cerrar ventana" type="button">
              <X size={18} color="#ffffff" strokeWidth={2.6} />
            </button>
          )}
        </div>

        <form className="mri-body" onSubmit={handleRegistro}>
          <div className="mri-form-grid">

            {/* Rol único asignado: Técnico Agente */}
            <div className="mri-field-full">
              <label className="mri-label">
                <Wrench size={16} /> Rol Asignado (Equipo Interno):
              </label>
              <div className="reg-role-box">
                <div className="reg-role-icon">
                  <Wrench size={19} />
                </div>
                <div>
                  <div className="reg-role-title">{rolTecnico.label}</div>
                  <div className="reg-role-desc">{rolTecnico.desc}</div>
                </div>
              </div>
            </div>

            {campos.map(({ name, type, label, placeholder, icon: Icon }) => (
              <div className="mri-field-full" key={name}>
                <label className="mri-label">
                  <Icon size={16} /> {label}:
                </label>
                <input
                  name={name}
                  type={type}
                  className="mri-input"
                  placeholder={placeholder}
                  value={formData[name]}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

          </div>

          {mensaje && (
            <div className={`mri-msg ${tipoMensaje}`}>
              {mensaje}
            </div>
          )}

          <div className="mri-footer-sticky">
            <button type="submit" className="mri-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> REGISTRANDO TÉCNICO...
                </>
              ) : (
                'CREAR Y ACTIVAR CUENTA'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RegisterModal;
