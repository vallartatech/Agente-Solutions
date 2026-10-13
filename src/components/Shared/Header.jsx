import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TecnicoHeader from './TecnicoHeader';
import AdminHeader from './AdminHeader';
import ClienteHeader from './ClienteHeader';

const Header = ({ activeModule, titulo, rolTexto, ...restProps }) => {
  const { user } = useAuth();
  const location = useLocation();

  const roleId = Number(user?.role_id);

  // ROOT (0) y ADMIN (1) usan AdminHeader
  if (roleId === 0 || roleId === 1) {
    return <AdminHeader activeModule={activeModule} titulo={titulo} rolTexto={rolTexto} {...restProps} />;
  }

  const isTechnician = Boolean(
    roleId === 6 || 
    roleId === 8 || 
    roleId === 2 || 
    location.pathname.includes('/galeria-reportes') || 
    location.pathname.includes('/nuevo-reporte') ||
    location.pathname.includes('/mercado-trabajos')
  );

  if (isTechnician) {
    const isVistaTecnico = location.pathname.toLowerCase() === '/vistatecnico';
    return <TecnicoHeader activeTab={activeModule || (isVistaTecnico ? 'inicio' : 'tablero')} />;
  }

  // Clientes y Autónomos (3, 4, 5, 7) usan ClienteHeader
  return <ClienteHeader activeModule={activeModule} titulo={titulo} rolTexto={rolTexto} {...restProps} />;
};

export default Header;