import React from 'react';
import { useAuth } from '../../context/AuthContext';
import PerfilTecnico from '../../portals/AgenteMarket/Tecnico/PerfilTecnico';
import PerfilCliente from '../../portals/AgenteMarket/Cliente/PerfilCliente';

const Profile = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);

  // Roles Técnicos y Proveedores de Servicio (2: Técnico Agente, 6: Contratista, 8: Técnico de la Red)
  if ([2, 6, 8].includes(roleId)) {
    return <PerfilTecnico />;
  }

  // Roles Cliente y Propietarios de Inmuebles (3: Cliente, 4: Negocio / Autónomo Empresarial, 5: Autónomo Personal, 7: Admin Propiedades, 0/1: Admin)
  return <PerfilCliente />;
};

export default Profile;