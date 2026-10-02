import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Calendar } from 'lucide-react'; // ✅ Importamos íconos de casita y calendario
import logo from '../../assets/Logo3.png'; 
import NotificationBell from '../Shared/NotificationBell'; 
import ModalCalendarioCliente from '../../portals/AgenteMarket/Cliente/ModalCalendarioCliente'; // ✅ Modal de Calendario
import axios from 'axios';

const Header = ({ rolTexto = "USUARIO", titulo }) => {
  const { user, logoutGlobal } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [appLogo, setAppLogo] = useState(logo);

  const fetchDynamicSettings = async () => {
    try {
      const resSettings = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`);
      if (resSettings.data.success && resSettings.data.settings.appLogo) {
        setAppLogo(resSettings.data.settings.appLogo);
      }
    } catch (error) {
      console.error("Error fetching dynamic header settings", error);
    }
  };

  useEffect(() => {
    fetchDynamicSettings();
    window.addEventListener('settings-updated', fetchDynamicSettings);
    return () => window.removeEventListener('settings-updated', fetchDynamicSettings);
  }, []);

  const handleCerrarSesion = () => {
    logoutGlobal();
    navigate("/");
  };

  // ✅ Función para regresar al panel correcto según el tipo de usuario
  const irAlInicio = () => {
    if (!user) return;
    const role = Number(user.role_id);
    if (role === 0 || role === 1) navigate('/VistaRoot');
    else if (role === 4 || role === 5 || role === 7) navigate('/VistaMarket');
    else if (role === 2) navigate('/VistaTecnico');
    else if (role === 6 || role === 8) navigate('/mercado-trabajos');
    else if (role === 3) navigate('/VistaInicioCliente');
    else navigate('/');
  };

  return (
    <header className="header-content">
      
      {/* SECCIÓN IZQUIERDA: Logo, Casita y Calendario */}
      <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img src={appLogo} alt="Logo" className="main-logo" style={{ objectFit: 'contain' }} />
        
        {/* BOTÓN DE INICIO (Casita) */}
        <button 
          onClick={irAlInicio}
          title="Ir al Inicio"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px',
            color: '#FF6600', // Color naranja para que resalte
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease-in-out' // Pequeña animación
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Home size={34} strokeWidth={2.5} />
        </button>

        {/* BOTÓN DE CALENDARIO (Abre Modal Interactivo) */}
        <button 
          onClick={() => setMostrarCalendario(true)}
          title="Ver Calendario de Visitas y Servicios"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '5px',
            color: '#FF6600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease-in-out'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Calendar size={32} strokeWidth={2.5} />
        </button>
      </div>

      {/* SECCIÓN CENTRAL: Título Dinámico */}
      <div className="center-title-section">
        <h1 className="welcome-title">
          {titulo ? titulo.toUpperCase() : 
            (Number(user?.role_id) === 7 && user?.tenant?.name) 
              ? `BIENVENIDO ${(user?.first_name || user?.name)?.toUpperCase()} (EQUIPO DE ${user.tenant.name.toUpperCase()})` 
              : `BIENVENIDO ${(user?.first_name || user?.name) ? (user.first_name || user.name).toUpperCase() : rolTexto}`}
        </h1>
      </div>

      {/* SECCIÓN DERECHA: Notificaciones y Perfil */}
      <div className="user-controls" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        
        {/* <NotificationBell /> */}

        <div style={{ position: "relative" }}>
          <button
            className="icon-btn"
            style={{ padding: 0, overflow: "hidden", display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%' }}
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt="Foto de perfil"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>👤</span>
            )}
          </button>

          {menuAbierto && (
            <>
              <div 
                className="profile-backdrop" 
                onClick={() => setMenuAbierto(false)} 
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 90 }} 
              />
              <div className="profile-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuAbierto(false); navigate("/mi-perfil"); }}
                >
                  👤 Mi Perfil
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout"
                  onClick={handleCerrarSesion}
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL GLOBAL DE CALENDARIO DE CLIENTE */}
      <ModalCalendarioCliente 
        isOpen={mostrarCalendario} 
        onClose={() => setMostrarCalendario(false)} 
      />
    </header>
  );
};

export default Header;