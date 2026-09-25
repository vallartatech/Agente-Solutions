import React, { useEffect, useState } from 'react';
import '../../../styles/AgenteSolutions/Admin/VistaInicioAdmin.css';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header'; 
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ModalCompraEspacios from '../../../components/Shared/ModalCompraEspacios';

const LiveCountdown = ({ targetDate, fallbackDays }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    const calculateTime = () => {
      const end = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('¡PRUEBA VENCIDA!');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d : ${hours < 10 ? '0' + hours : hours}h : ${mins < 10 ? '0' + mins : mins}m : ${secs < 10 ? '0' + secs : secs}s`);
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return <span>⏳ {fallbackDays ?? 180} días restantes</span>;
  return <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.5px', color: '#4ADE80' }}>⏱️ {timeLeft || `${fallbackDays} días restantes`}</span>;
};

const VistaInicioAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subInfo, setSubInfo] = useState(null);
  const [mostrarModalCompraEspacios, setMostrarModalCompraEspacios] = useState(false);

  const isRoot     = user?.role_id === 0;
  const isEmpresa  = user?.role_id === 4;
  const isPersonal = user?.role_id === 5;
  const isAutonomo = isEmpresa || isPersonal;

  useEffect(() => {
    if (isAutonomo || user?.role_id === 2) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenant/subscription-status`)
        .then(r => { if (r.data.success) setSubInfo(r.data); })
        .catch(() => {});
    }
  }, [isAutonomo, user?.role_id]);

  let rolTexto = "ADMINISTRADOR";
  if (isRoot) rolTexto = "ROOT / SUPERADMIN";
  else if (isEmpresa) rolTexto = "EMPRESA / AUTÓNOMO EMPRESARIAL";
  else if (isPersonal) rolTexto = "PROPIETARIO / AUTÓNOMO PERSONAL";
  else if (user?.role_id === 2) rolTexto = "TÉCNICO / PROVEEDOR";
  else if (user?.role_id === 7) rolTexto = "ADMINISTRADOR DE PROPIEDADES";

  const menuItems = [
    { id: 1, title: isPersonal ? 'TÉCNICOS Y PROVEEDORES' : 'USUARIOS', icon: '👤', path: '/usuarios'}, 
    { id: 2, title: 'PROPIEDADES', icon: '🏠',  path: '/propiedades' },
    { id: 3, title: 'LEVANTAMIENTOS', icon: '📋', path: '/levantamientos' },
    { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
    { id: 5, title: 'COTIZACIONES', icon: '🧾' , path: '/vista-cotizaciones'},
    { id: 6, title: 'SERVICIOS', icon: '🔧', path: '/tablero-servicios' },
    { id: 8, title: 'PRODUCTOS', icon: '📦', path: '/vista-producto' },
    { id: 9, title: 'DASHBOARD', icon: '📊',  path: '/dashboard'},
  ];

  if (user?.role_id !== 7) {
    menuItems.push({ id: 10, title: 'PERSONALIZAR', icon: '🎨', path: '/customize-login' });
  }

  if (!isPersonal) {
    menuItems.splice(6, 0, { id: 7, title: 'BODEGA', icon: '🏭', path: '/bodeguero' });
  }

  if (isRoot) {
    menuItems.unshift({
      id: 11,
      title: 'AUTÓNOMOS Y CARTERA',
      icon: '🏢',
      path: '/gestion-autonomos'
    });
  }

  if (isRoot || isAutonomo || user?.role_id === 1) {
    menuItems.push({
      id: 12,
      title: 'SALA DE ESPERA',
      icon: '⏳',
      path: '/sala-espera-tecnicos'
    });
  }

  if (isAutonomo) {
    const codeDisplay = subInfo?.tenant?.code || (isPersonal ? 'AUT_P' : 'AUT_E');
    menuItems.push({
      id: 13,
      title: `MI CÓDIGO (${codeDisplay})`,
      icon: '📲',
      path: '/mi-codigo-autonomo'
    });
    menuItems.push({
      id: 14,
      title: '¿NECESITAS AYUDA?',
      icon: '🤝',
      path: '/apoyo-autonomo'
    });
    menuItems.push({
      id: 15,
      title: 'MERCADO / RED',
      icon: '🗺️',
      path: '/red-autonomos'
    });
  }

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto={rolTexto} />

      {(isAutonomo || user?.role_id === 2) && subInfo && (
        <div style={{
          maxWidth: '1150px', margin: '20px auto 10px auto', padding: '20px 26px',
          background: '#111827', border: '2px solid #FF6600',
          borderRadius: '18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '18px', boxShadow: '0 12px 35px rgba(0,0,0,0.5)'
        }}>
          <div>
            <span style={{ color: '#FF6600', fontWeight: 900, fontStyle: 'italic', fontSize: '1.08rem', display: 'block', marginBottom: '8px', letterSpacing: '0.6px' }}>
              {user?.role_id === 2
                ? '🛠️ TÉCNICO EXTERNO | 1 AÑO DE PRUEBA GRATIS ($99 MXN/mes tras prueba)'
                : subInfo?.tenant?.membership_type === 'autonomo_fundador'
                  ? '🌟 PLAN FUNDADOR | 6 MESES GRATIS ($659 MXN/mes tras prueba)'
                  : isPersonal
                    ? '👑 PLAN PERSONAL | 6 MESES GRATIS ($299 MXN/mes tras prueba)'
                    : '🏢 PLAN EMPRESARIAL | 6 MESES GRATIS ($935 MXN/mes tras prueba)'}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#F3F4F6', fontSize: '0.9rem', alignItems: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)' }}>
                📅 Vence: <strong style={{ color: '#FFFFFF' }}>{subInfo.subscription_expires_at ? new Date(subInfo.subscription_expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Indefinido'}</strong>
              </span>
              {isAutonomo && (
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)' }}>
                  🏠 Propiedades: <strong style={{ color: (subInfo.properties_count >= (subInfo.max_properties + subInfo.extra_properties_count)) ? '#F87171' : '#4ADE80' }}>
                    {subInfo.properties_count ?? 0} / {(subInfo.max_properties ?? 3) + (subInfo.extra_properties_count ?? 0)}
                  </strong>
                </span>
              )}
              {isEmpresa && (
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)' }}>
                  👥 Clientes: <strong style={{ color: (subInfo.clients_count >= (subInfo.max_clients ?? 30)) ? '#F87171' : '#4ADE80' }}>
                    {subInfo.clients_count ?? 0} / {subInfo.max_clients ?? 30}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(0,0,0,0.45)', border: `2px solid ${(subInfo.days_remaining <= 30) ? '#F87171' : '#4ADE80'}`, padding: '8px 18px', borderRadius: '50px', fontWeight: 'bold' }}>
              <LiveCountdown targetDate={subInfo.subscription_expires_at} fallbackDays={subInfo.days_remaining} />
            </div>

            {isAutonomo && (
              <button 
                onClick={() => setMostrarModalCompraEspacios(true)}
                title="Adquiere cupo para propiedades extras por $79.99 MXN c/u"
                style={{ 
                  padding: '10px 18px', 
                  borderRadius: '50px', 
                  border: '2px solid #FF6600', 
                  background: 'linear-gradient(135deg, #FF6600 0%, #d94e00 100%)', 
                  color: '#FFFFFF', 
                  fontWeight: 900, 
                  cursor: 'pointer', 
                  fontSize: '0.86rem', 
                  boxShadow: '0 4px 15px rgba(255,102,0,0.5)', 
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ➕ COMPRAR PROPIEDAD EXTRA ($79.99)
              </button>
            )}

            {(subInfo.days_remaining <= 45 || user?.role_id === 2) && (
              <button onClick={() => navigate(`/activacion-cuenta?${user?.role_id === 2 ? `user_id=${user.id}&type=technician` : `tenant_id=${subInfo.tenant?.id}`}`)}
                style={{ padding: '10px 20px', borderRadius: '50px', border: 'none', background: '#3B82F6', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 15px rgba(59,130,246,0.5)' }}>
                🔄 RENOVAR / ACTIVAR
              </button>
            )}
          </div>
        </div>
      )}

      <div className="admin-grid">
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            className="menu-card"
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              }
            }}
          >
            <div className="card-inner">
              <span className="card-icon-large">{item.icon}</span>
              <span className="card-title">{item.title}</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="footer-watermark">
        <img src="/logo-faded.png" alt="Watermark" className="watermark-img" />
      </footer>

      {/* Modal Compra de Espacios para Autónomos (Personal y Empresarial) */}
      <ModalCompraEspacios
        isOpen={mostrarModalCompraEspacios}
        onClose={() => setMostrarModalCompraEspacios(false)}
        tenantId={subInfo?.tenant?.id || user?.tenant_id || 1}
        userId={user?.id}
        planName={isPersonal ? 'Personal' : (isEmpresa ? 'Empresarial' : 'Autónomo')}
      />
    </div>
  );
};

export default VistaInicioAdmin;
