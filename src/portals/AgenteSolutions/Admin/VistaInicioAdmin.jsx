import React from 'react';
import '../../../styles/AgenteSolutions/Admin/VistaInicioAdmin.css';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/Shared/AdminHeader'; 
import { useAuth } from '../../../context/AuthContext';

const VistaInicioAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRoot = Number(user?.role_id) === 0;
  const rolTexto = isRoot ? "ROOT / SUPERADMIN" : "ADMINISTRADOR";

  // Módulos para ROOT vs ADMIN (Rol 1):
  // Admin tiene acceso a: Usuarios, Propiedades, Levantamientos, Reportes, Cotizaciones y Servicios.
  const menuItems = isRoot
    ? [
        { id: 0, title: 'GESTIÓN DE CUENTAS', icon: '🏢', path: '/gestion-autonomos' },
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
      ]
    : [
        { id: 1, title: 'USUARIOS', icon: '👤', path: '/usuarios' },
        { id: 2, title: 'PROPIEDADES', icon: '🏠', path: '/propiedades' },
        { id: 3, title: 'LEVANTAMIENTOS', icon: '📋', path: '/levantamientos' },
        { id: 4, title: 'REPORTES', icon: '📸', path: '/reportes-globales' },
        { id: 5, title: 'COTIZACIONES', icon: '🧾', path: '/vista-cotizaciones' },
        { id: 6, title: 'SERVICIOS', icon: '🔧', path: '/tablero-servicios' },
      ];

  return (
    <div className="main-container">
      <AdminHeader rolTexto={rolTexto} activeModule="inicio" />

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
    </div>
  );
};

export default VistaInicioAdmin;

