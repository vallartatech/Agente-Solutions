import React from 'react';
import '../../../styles/AgenteSolutions/Admin/VistaInicioAdmin.css';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Shared/Header'; 
import { useAuth } from '../../../context/AuthContext';

const VistaInicioAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRoot = user?.role_id === 0;
  const rolTexto = isRoot ? "ROOT / SUPERADMIN" : "ADMINISTRADOR";

  const menuItems = [
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
    { id: 11, title: 'SALA DE ESPERA', icon: '⏳', path: '/sala-espera-tecnicos' },
  ];

  if (isRoot) {
    menuItems.unshift({
      id: 0,
      title: 'GESTIÓN DE CUENTAS',
      icon: '🏢',
      path: '/gestion-autonomos'
    });
  }

  return (
    <div className="main-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto={rolTexto} />

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
    </div>
  );
};

export default VistaInicioAdmin;

