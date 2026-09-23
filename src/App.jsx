import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OneSignal from 'react-onesignal';
import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./context/ProtectedRoute";
import LoginAgente from "./components/Auth/Login";
import RegisterProperties from "./components/RegisterProperties";
import VistaInicioAdmin from "./portals/AgenteSolutions/Admin/VistaInicioAdmin";
import Profile from "./components/Shared/Profile";
import Map from "./components/Map";
import RegistroCliente from "./components/Auth/ClientRegister";
import ActivacionCuenta from "./components/Auth/ActivacionCuenta";
import CustomizeLogin from "./components/Auth/CustomizeLogin";
import AssignServiceForm from "./components/AssignServiceForm";
import VistaNotificaciones from "./components/Shared/VistaNotificaciones";
import RegistroZonas from "./portals/AgenteSolutions/Tecnico/RegistroZonas";
import CheckEmail from "./components/Auth/CheckEmail";
import VerifyEmail from "./components/Auth/VerifyEmail";
import ResetPassword from "./components/Auth/ResetPassword";

///Cliente
import MainLayoutCliente from "./portals/AgenteSolutions/Cliente/MainLayoutCliente";
import VistaInicioCliente from "./portals/AgenteSolutions/Cliente/VistaInicioCliente";

/* ------RUTAS DE LA VISTA DEL ADMIN ------*/
import DetalleReporte from "./portals/AgenteSolutions/Admin/DetalleReporte";
import ProductoDetalleView from "./portals/AgenteSolutions/Admin/ProductoDetalleView";
import ProductosView from "./portals/AgenteSolutions/Admin/ProductosView";
import VistaCotizaciones from "./portals/AgenteSolutions/Admin/VistaCotizaciones";
import VistaDashboard from "./portals/AgenteSolutions/Admin/VistaDashboard";
import VistaDetalleCliente from "./portals/AgenteSolutions/Admin/VistaDetalleCliente";
import VistaDetallePropiedadAdmin from "./portals/AgenteSolutions/Admin/VistaDetallePropiedad";
import VistaLevantamientos from "./portals/AgenteSolutions/Admin/VistaLevantamientos";
import VistaPropiedadesAdmin from "./portals/AgenteSolutions/Admin/VistaPropiedades";
import VistaUsuarios from "./portals/AgenteSolutions/Admin/VistaUsuarios";
import VistaBodeguero from "./portals/AgenteSolutions/Admin/VistaBodeguero";
import VistaServiciosAdmin from "./portals/AgenteSolutions/Admin/VistaServiciosAdmin";
import VistaReportesGlobal from "./portals/AgenteSolutions/Admin/VistaReportesGlobal";
import ReporteTrabajoAdmin from "./portals/AgenteSolutions/Admin/ReporteTrabajo";
import VistaGestionAutonomos from "./portals/AgenteSolutions/Admin/VistaGestionAutonomos";
import VistaSalaEsperaTecnicos from "./portals/AgenteSolutions/Admin/VistaSalaEsperaTecnicos";
import VistaCodigoAutonomo from "./portals/Autonomos/Admin/VistaCodigoAutonomo";
import VistaApoyoAutonomo from "./portals/Autonomos/Admin/VistaApoyoAutonomo";
import VistaPropiedadesAutonomo from "./portals/Autonomos/Admin/VistaPropiedades";
import VistaDetallePropiedadAutonomo from "./portals/Autonomos/Admin/DetallePropiedad";
import VistaRedAutonomo from "./portals/Autonomos/Admin/VistaRedAutonomo";
import FavoritosAutonomo from "./portals/Autonomos/Admin/FavoritosAutonomo";
import PerfilTecnicoRed from "./portals/Autonomos/Admin/PerfilTecnicoRed";

/* ------RUTAS DE LA VISTA DEL TECNICO ------*/
import VistaInicioTecnico from "./portals/AgenteSolutions/Tecnico/VistaInicioTecnico";
import MercadoTrabajos from "./portals/AgenteSolutions/Tecnico/MercadoTrabajos";
import TrabajosTecnico from "./portals/AgenteSolutions/Tecnico/TrabajosTecnico";
import CheckList from "./portals/AgenteSolutions/Tecnico/Checklist";
import DetalleTrabajo from "./portals/AgenteSolutions/Tecnico/DetalleTrabajo";
import GaleriaReportes from "./portals/AgenteSolutions/Tecnico/GaleriaReportes";
import ReporteIndividual from "./portals/AgenteSolutions/Tecnico/ReporteIndividual";
import NuevoReporte from "./portals/AgenteSolutions/Tecnico/NuevoReporte";
import TrabajoInicio from "./portals/AgenteSolutions/Tecnico/TrabajoInicio";
import TrabajoPropiedad from "./portals/AgenteSolutions/Tecnico/TrabajosPropiedad";
import VentaCruzada from "./portals/AgenteSolutions/Tecnico/VentaCruzada";
import RegistrarVentaCruzada from "./portals/AgenteSolutions/Tecnico/RegistrarVentaCruzada";
import LevantamientoPropiedad from "./portals/AgenteSolutions/Tecnico/LevantamientoPropiedad";
import VistaDetalleTecnico from "./portals/AgenteSolutions/Admin/VistaDetalleTecnico";


// 👇 1. IMPORTAMOS AXIOS Y CONFIGURAMOS EL TOKEN GLOBAL 👇
import axios from "axios";
import TrabajosAsignados from "./portals/AgenteSolutions/Tecnico/TrabajosAsignados";
import Cotizaciones from "./portals/AgenteSolutions/Cliente/Cotizaciones";
import CotizacionesPendientes from "./portals/AgenteSolutions/Cliente/CotizacionesPendientes";

import Pago from "./portals/AgenteSolutions/Cliente/Pago";
import SOSView from "./portals/AgenteSolutions/Cliente/SOSView";
import TableroScrum from "./portals/AgenteSolutions/Cliente/TableroScrum";
import DetallePropiedad from "./portals/AgenteSolutions/Cliente/DetallePropiedad";
import ReporteTrabajo from "./portals/AgenteSolutions/Cliente/ReporteTrabajo";
import DetallePropiedadadmin from "./portals/AgenteSolutions/Admin/DetallePropiedad";
import VistaDetallePropiedadCliente from "./portals/AgenteSolutions/Cliente/VistaDetallePropiedad";

import RegisteRoot from "./components/Auth/Register";
import VistaCotizacionPrint from "./portals/AgenteSolutions/Admin/VistaCotizacionPrint";


axios.defaults.headers.common["Accept"] = "application/json";

const PropiedadesWrapper = () => {
  const { user } = useAuth();
  if (user?.role_id === 1) return <VistaPropiedadesAdmin />;
  return <VistaPropiedadesAutonomo />;
};

const DetallePropiedadWrapper = () => {
  const { user } = useAuth();
  if (user?.role_id === 1) return <VistaDetallePropiedadAdmin />;
  return <VistaDetallePropiedadAutonomo />;
};

const AppRoutes = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const reasonStr = String(event.reason?.message || event.reason || '');
      if (reasonStr.includes('Permission blocked') || reasonStr.includes('OneSignal')) {
        event.preventDefault();
        console.warn('OneSignal Push Notification permission blocked or skipped:', reasonStr);
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const initOneSignal = async () => {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'denied') {
            console.warn("OneSignal notifications permission is blocked by browser.");
            return;
          }
        }
        await OneSignal.init({
          appId: "632781ba-8ada-42ea-a894-b53f1618b204",
          allowLocalhostAsSecureOrigin: true,
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: false,
                  text: {
                    actionMessage: "Nos gustaría enviarte notificaciones para mantenerte al día con tus servicios y cotizaciones.",
                    acceptButton: "Permitir",
                    cancelButton: "Más tarde"
                  }
                }
              ]
            }
          }
        });
      } catch (err) {
        console.warn("OneSignal initialization blocked/failed gracefully:", err);
      }
    };

    initOneSignal();

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  const { user, initialized } = useAuth();


  if (!initialized) return null;

  return (
    <Routes>
      <Route path="/" element={<LoginAgente />} />
      <Route path="/registro-cliente" element={<RegistroCliente />} />
      <Route path="/activacion-cuenta" element={<ActivacionCuenta />} />
      <Route path="/revisa-tu-correo" element={<CheckEmail />} />
      <Route path="/email/verify/:id/:hash" element={<VerifyEmail />} />
      <Route path="/recuperar-password" element={<ResetPassword />} />

      {/* RUTA COMPARTIDA PROPIEDADES */}
      <Route path="/propiedades" element={
        user?.role_id === 3 ? <MainLayoutCliente><VistaPropiedadesAdmin /></MainLayoutCliente> : <PropiedadesWrapper />
      } />

      {/* RUTA COMPARTIDA DETALLE REPORTE */}
      <Route path="/detalle-reporte/:id" element={
        user?.role_id === 3
          ? <MainLayoutCliente><DetalleReporte /></MainLayoutCliente>
          : <DetalleReporte />
      } />

      <Route path="/VistaRoot" element={<VistaInicioAdmin />} />
      <Route path="/VistaAdmin" element={<VistaInicioAdmin />} />
      <Route path="/VistaTecnico" element={<VistaInicioTecnico />} />

      <Route
        path="/registro-propiedades"
        element={
          user?.role_id === 3 ? <MainLayoutCliente><RegisterProperties /></MainLayoutCliente> : <RegisterProperties />
        }
      />

      {/* ------RUTAS DE LA VISTA DEL TECNICO (LIBERADAS) ------*/}
      <Route path="/trabajos-tecnico" element={<TrabajosTecnico />} />
      <Route path="/Checklist/:id" element={<CheckList />} />
      <Route path="/detalleTrabajo/:id" element={<DetalleTrabajo />} />
      <Route path="/galeria-reportes/:id?" element={<GaleriaReportes />} />
      <Route path="/reporte-individual/:id?" element={<ReporteIndividual />} />
      <Route path="/nuevo-reporte" element={<NuevoReporte />} />
      <Route path="/trabajo-inicio/:id" element={<TrabajoInicio />} />
      <Route path="/trabajo-propiedad/:id" element={<TrabajoPropiedad />} />
      <Route path="/trabajo_propiedad/:id" element={<TrabajoPropiedad />} />
      <Route path="/venta-cruzada" element={<VentaCruzada />} />
      <Route path="/registrar-venta-cruzada" element={<RegistrarVentaCruzada />} />
      <Route path="/levantamiento-propiedad" element={<LevantamientoPropiedad />} />
      <Route path="/RegistroZonas/:curp" element={<RegistroZonas />} />

      {/* ------RUTAS DE LA VISTA DEL ADMIN (LIBERADAS) ------*/}
      <Route path="/vista-cotizaciones" element={
        user?.role_id === 3 ? <MainLayoutCliente><VistaCotizaciones /></MainLayoutCliente> : <VistaCotizaciones />
      } />
      <Route path="/levantamientos" element={
        user?.role_id === 3 ? <MainLayoutCliente><VistaLevantamientos /></MainLayoutCliente> : <VistaLevantamientos />
      } />
      <Route path="/mi-perfil" element={
        user?.role_id === 3 ? <MainLayoutCliente><Profile /></MainLayoutCliente> : <Profile />
      } />


      <Route path="/detalle-producto" element={<ProductoDetalleView />} />
      <Route path="/vista-producto" element={<ProductosView />} />
      <Route path="/dashboard" element={<VistaDashboard />} />
      <Route path="/detalle-cliente" element={<VistaDetalleCliente />} />
      <Route path="/usuarios" element={<VistaUsuarios />} />
      <Route path="/gestion-autonomos" element={<VistaGestionAutonomos />} />
      <Route path="/sala-espera-tecnicos" element={<VistaSalaEsperaTecnicos />} />
      <Route path="/mi-codigo-autonomo" element={<VistaCodigoAutonomo />} />
      <Route path="/apoyo-autonomo" element={<VistaApoyoAutonomo />} />
      <Route path="/red-autonomos" element={<VistaRedAutonomo />} />
      <Route path="/mis-favoritos" element={<FavoritosAutonomo />} />
      <Route path="/tecnico-perfil/:id" element={<PerfilTecnicoRed />} />
      <Route path="/mercado-trabajos" element={<MercadoTrabajos />} />


      <Route path="/map" element={<Map />} />
      <Route path="/customize-login" element={<CustomizeLogin />} />
      <Route path="/assign-service" element={<AssignServiceForm />} />
      <Route path="/bodeguero" element={<VistaBodeguero />} />
      <Route path="/detalle-propiedad/:id" element={<DetallePropiedadWrapper />} />
      <Route path="/tablero-servicios" element={<VistaServiciosAdmin />} />
      <Route path="/detalle-tecnico" element={<VistaDetalleTecnico />} />
      <Route path="/reportes-globales" element={<VistaReportesGlobal />} />
      <Route path="/reporte-trabajo-admin/:id?" element={<ReporteTrabajoAdmin />} />

      <Route path="/notificaciones" element={<VistaNotificaciones />} />
      <Route path="/trabajos-asignados" element={<TrabajosAsignados />} />

      {/* Vista de inicio del cliente sin Sidebar */}
      <Route path="/VistaInicioCliente" element={<VistaInicioCliente />} />

      {/* Rutas del cliente con Sidebar */}
      <Route path="/Cotizaciones" element={<MainLayoutCliente><Cotizaciones /></MainLayoutCliente>} />
      <Route path="/cotizaciones-pendientes" element={<MainLayoutCliente><CotizacionesPendientes /></MainLayoutCliente>} />
      <Route path="/Pago" element={<MainLayoutCliente><Pago /></MainLayoutCliente>} />
      <Route path="/SOSView" element={<MainLayoutCliente><SOSView /></MainLayoutCliente>} />
      <Route path="/propiedad/:id/tablero" element={<DetallePropiedadadmin />} />
      <Route path="/DetallePropiedad/:id" element={<MainLayoutCliente><VistaDetallePropiedadCliente /></MainLayoutCliente>} />
      <Route path="/ReporteTrabajo" element={<MainLayoutCliente><ReporteTrabajo /></MainLayoutCliente>} />
      <Route path="/VistaDetallePropiedad" element={<MainLayoutCliente><VistaDetallePropiedadCliente /></MainLayoutCliente>} />
      <Route path="/propiedad/:id" element={<MainLayoutCliente><VistaDetallePropiedadCliente /></MainLayoutCliente>} />


      <Route path="/registro" element={<RegistroCliente />} />
      <Route path="/imprimir-cotizacion" element={<VistaCotizacionPrint />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
