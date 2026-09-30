import React, { useEffect, useState } from 'react';
import '../../../styles/AgenteMarket/Admin/VistaInicioMarket.css';
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

  const roleId = Number(user?.role_id);
  const isRoot = roleId === 0;
  const isClienteParticular = roleId === 4;
  const isGestorInmobiliario = roleId === 5;
  const isTecnicoIndependiente = roleId === 6;
  const isContratista = roleId === 7;
  const isTecnicoCuadrilla = roleId === 8;
  const isMarketAccount = [4, 5, 6, 7, 8].includes(roleId);

  useEffect(() => {
    if (isMarketAccount || roleId === 2) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenant/subscription-status`)
        .then(r => { if (r.data.success) setSubInfo(r.data); })
        .catch(() => {});
    }
  }, [isMarketAccount, roleId]);

  let rolTexto = "CLIENTE PARTICULAR";
  if (isRoot) rolTexto = "ROOT / SUPERADMIN";
  else if (isClienteParticular) rolTexto = "CLIENTE PARTICULAR";
  else if (isGestorInmobiliario) rolTexto = "GESTOR INMOBILIARIO";
  else if (isTecnicoIndependiente) rolTexto = "TÉCNICO INDEPENDIENTE";
  else if (isContratista) rolTexto = "CONTRATISTA / LÍDER";
  else if (isTecnicoCuadrilla) rolTexto = "TÉCNICO DE CUADRILLA";

  // ── CONFIGURACIÓN ESPECÍFICA DE BOTONES POR ROL ──
  let menuItems = [];

  if (isClienteParticular) {
    // 🏡 ROL 4: CLIENTE PARTICULAR (8 BOTONES SELECCIONADOS)
    menuItems = [
      { id: 1, title: 'USUARIOS', icon: '👤', path: '/usuarios' },
      { id: 2, title: 'PROPIEDADES', icon: '🏠', path: '/propiedades' },
      { id: 3, title: 'LEVANTAMIENTOS', icon: '📋', path: '/levantamientos' },
      { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
      { id: 5, title: 'COTIZACIONES', icon: '🧾', path: '/vista-cotizaciones' },
      { id: 6, title: 'SERVICIOS', icon: '🔧', path: '/tablero-servicios' },
      { id: 7, title: '¿NECESITAS AYUDA?', icon: '🤝', path: '/apoyo-autonomo' },
      { id: 8, title: 'MERCADO / RED', icon: '🗺️', path: '/red-autonomos' },
    ];
  } else if (isGestorInmobiliario) {
    // 🏢 ROL 5: GESTOR INMOBILIARIO (ADMIN PRO COMPLETO)
    const codeDisplay = subInfo?.tenant?.code || 'AUT_E';
    menuItems = [
      { id: 1, title: 'USUARIOS', icon: '👤', path: '/usuarios' },
      { id: 2, title: 'PROPIEDADES', icon: '🏠', path: '/propiedades' },
      { id: 3, title: 'LEVANTAMIENTOS', icon: '📋', path: '/levantamientos' },
      { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
      { id: 5, title: 'COTIZACIONES', icon: '🧾', path: '/vista-cotizaciones' },
      { id: 6, title: 'SERVICIOS', icon: '🔧', path: '/tablero-servicios' },
      { id: 7, title: 'BODEGA', icon: '🏭', path: '/bodeguero' },
      { id: 8, title: 'PRODUCTOS', icon: '📦', path: '/vista-producto' },
      { id: 9, title: 'DASHBOARD', icon: '📊', path: '/dashboard' },
      { id: 10, title: 'PERSONALIZAR', icon: '🎨', path: '/customize-login' },
      { id: 12, title: 'SALA DE ESPERA', icon: '⏳', path: '/sala-espera-tecnicos' },
      { id: 13, title: `MI CÓDIGO (${codeDisplay})`, icon: '📲', path: '/mi-codigo-autonomo' },
      { id: 14, title: '¿NECESITAS AYUDA?', icon: '🤝', path: '/apoyo-autonomo' },
      { id: 15, title: 'MERCADO / RED', icon: '🗺️', path: '/red-autonomos' },
    ];
  } else if (isContratista) {
    // 🏗️ ROL 7: CONTRATISTA / LÍDER
    const codeDisplay = subInfo?.tenant?.code || 'AUT_C';
    menuItems = [
      { id: 1, title: 'MI CUADRILLA', icon: '👥', path: '/usuarios' },
      { id: 2, title: 'COTIZACIONES RED', icon: '🧾', path: '/vista-cotizaciones' },
      { id: 3, title: 'TRABAJOS Y ÓRDENES', icon: '🔧', path: '/tablero-servicios' },
      { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
      { id: 5, title: 'MERCADO / RED', icon: '🗺️', path: '/red-autonomos' },
      { id: 6, title: 'SALA DE ESPERA CUADRILLA', icon: '⏳', path: '/sala-espera-tecnicos' },
      { id: 7, title: `CÓDIGO CUADRILLA (${codeDisplay})`, icon: '📲', path: '/mi-codigo-autonomo' },
      { id: 8, title: '¿NECESITAS AYUDA?', icon: '🤝', path: '/apoyo-autonomo' },
    ];
  } else {
    // DEFAULT
    menuItems = [
      { id: 1, title: 'USUARIOS', icon: '👤', path: '/usuarios' },
      { id: 2, title: 'PROPIEDADES', icon: '🏠', path: '/propiedades' },
      { id: 3, title: 'LEVANTAMIENTOS', icon: '📋', path: '/levantamientos' },
      { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
      { id: 5, title: 'COTIZACIONES', icon: '🧾', path: '/vista-cotizaciones' },
      { id: 6, title: 'SERVICIOS', icon: '🔧', path: '/tablero-servicios' },
      { id: 14, title: '¿NECESITAS AYUDA?', icon: '🤝', path: '/apoyo-autonomo' },
      { id: 15, title: 'MERCADO / RED', icon: '🗺️', path: '/red-autonomos' },
    ];
  }

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto={rolTexto} />

      {/* ── BANNER DE SUSCRIPCIÓN DINÁMICO SEGÚN ROL ── */}
      {isMarketAccount && subInfo && (
        <div style={{
          maxWidth: '1150px', margin: '20px auto 10px auto', padding: '20px 26px',
          background: '#111827', border: '2px solid #FF6600',
          borderRadius: '18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '18px', boxShadow: '0 12px 35px rgba(0,0,0,0.5)'
        }}>
          <div>
            <span style={{ color: '#FF6600', fontWeight: 900, fontStyle: 'italic', fontSize: '1.08rem', display: 'block', marginBottom: '8px', letterSpacing: '0.6px' }}>
              {isClienteParticular
                ? '🏡 PLAN PARTICULAR | 6 MESES GRATIS ($299 MXN/mes tras prueba)'
                : isGestorInmobiliario
                  ? '🏢 PLAN GESTOR INMOBILIARIO | 6 MESES GRATIS ($935 MXN/mes tras prueba)'
                  : isContratista
                    ? '🏗️ PLAN CONTRATISTA | 6 MESES GRATIS ($935 MXN/mes tras prueba)'
                    : isTecnicoIndependiente
                      ? '🧑‍🔧 PLAN TÉCNICO INDEPENDIENTE | 1 AÑO GRATIS ($99 MXN/mes tras prueba)'
                      : '🌟 PERIODO DE PRUEBA ACTIVO'}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#F3F4F6', fontSize: '0.9rem', alignItems: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)' }}>
                📅 Vence: <strong style={{ color: '#FFFFFF' }}>{subInfo.subscription_expires_at ? new Date(subInfo.subscription_expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Indefinido'}</strong>
              </span>
              {(isClienteParticular || isGestorInmobiliario) && (
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)' }}>
                  🏠 Propiedades: <strong style={{ color: (subInfo.properties_count >= (subInfo.max_properties + subInfo.extra_properties_count)) ? '#F87171' : '#4ADE80' }}>
                    {subInfo.properties_count ?? 0} / {(subInfo.max_properties ?? (isClienteParticular ? 3 : 30)) + (subInfo.extra_properties_count ?? 0)}
                  </strong>
                </span>
              )}
              {isGestorInmobiliario && (
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

            {(isClienteParticular || isGestorInmobiliario) && (
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

            {subInfo.days_remaining <= 45 && (
              <button onClick={() => navigate(`/activacion-cuenta?tenant_id=${subInfo.tenant?.id}`)}
                style={{ padding: '10px 20px', borderRadius: '50px', border: 'none', background: '#3B82F6', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 15px rgba(59,130,246,0.5)' }}>
                🔄 RENOVAR / ACTIVAR
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CUADRÍCULA DE BOTONES DEL MENÚ ── */}
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

      {/* Modal Compra de Espacios */}
      <ModalCompraEspacios
        isOpen={mostrarModalCompraEspacios}
        onClose={() => setMostrarModalCompraEspacios(false)}
        tenantId={subInfo?.tenant?.id || user?.tenant_id || 1}
        userId={user?.id}
        planName={isClienteParticular ? 'Personal' : (isGestorInmobiliario ? 'Empresarial' : 'Autónomo')}
      />
    </div>
  );
};

export default VistaInicioAdmin;
