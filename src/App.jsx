import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { iniciarOneSignal, vincularUsuarioOneSignal } from "./components/Shared/oneSignalPush";
import { useEffect, lazy, Suspense } from "react";
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
import UpdateModal from "./components/Shared/UpdateModal";
import InstallPrompt from "./components/Shared/InstallPrompt";
import LocationSharing from "./components/Shared/LocationSharing";
import IndicadorSubida from "./components/Shared/IndicadorSubida";
import { instalarProgresoSubida } from "./components/Shared/progresoSubida";

// Decoración de temporada: el código del fantasma solo se descarga del 15 oct al 2 nov
const HalloweenGhost = lazy(() => import("./components/Shared/HalloweenGhost"));
const esTemporadaHalloween = () => {
  const hoy = new Date();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();
  return (mes === 9 && dia >= 15) || (mes === 10 && dia <= 2);
};
import VistaMapaEquipo from "./portals/AgenteSolutions/Admin/VistaMapaEquipo";
import VistaComprobantes from "./portals/AgenteSolutions/Shared/VistaComprobantes";
import VistaChats from "./portals/AgenteSolutions/Shared/VistaChats";
import RegistroZonas from "./portals/AgenteSolutions/Tecnico/RegistroZonas";
import CheckEmail from "./components/Auth/CheckEmail";
import VerifyEmail from "./components/Auth/VerifyEmail";
import ResetPassword from "./components/Auth/ResetPassword";
import PoliticaPrivacidad from "./components/Legal/PoliticaPrivacidad";
import EliminarCuenta from "./components/Legal/EliminarCuenta";

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
import VistaTrabajoPropiedad from "./portals/AgenteSolutions/Admin/Expediente/VistaTrabajoPropiedad";
import VistaLevantamientos from "./portals/AgenteSolutions/Admin/VistaLevantamientos";
import VistaPropiedadesAdmin from "./portals/AgenteSolutions/Admin/VistaPropiedades";
import VistaUsuarios from "./portals/AgenteSolutions/Admin/VistaUsuarios";
import VistaBodeguero from "./portals/AgenteSolutions/Admin/VistaBodeguero";
import VistaServiciosAdmin from "./portals/AgenteSolutions/Admin/VistaServiciosAdmin";
import VistaReportesGlobal from "./portals/AgenteSolutions/Admin/VistaReportesGlobal";
import ReporteTrabajoAdmin from "./portals/AgenteSolutions/Admin/ReporteTrabajo";
import VistaGestionAutonomos from "./portals/AgenteSolutions/Admin/VistaGestionAutonomos";
import VistaSalaEsperaTecnicos from "./portals/AgenteSolutions/Admin/VistaSalaEsperaTecnicos";
import VistaCodigoAutonomo from "./portals/AgenteMarket/Admin/VistaCodigoAutonomo";
import VistaApoyoAutonomo from "./portals/AgenteMarket/Admin/VistaApoyoAutonomo";
import VistaPropiedadesAutonomo from "./portals/AgenteMarket/Admin/VistaPropiedades";
import VistaDetallePropiedadAutonomo from "./portals/AgenteMarket/Admin/DetallePropiedad";
import VistaRedAutonomo from "./portals/AgenteMarket/Admin/VistaRedAutonomo";
import FavoritosAutonomo from "./portals/AgenteMarket/Admin/FavoritosAutonomo";
import PerfilTecnicoRed from "./portals/AgenteMarket/Admin/PerfilTecnicoRed";
import VistaInicioMarket from "./portals/AgenteMarket/Admin/VistaInicioMarket";
import CalendarioCliente from "./portals/AgenteMarket/Cliente/CalendarioCliente";
import CalendarioSolutions from "./portals/AgenteSolutions/Shared/CalendarioSolutions";

/* ------RUTAS DE LA VISTA DEL TECNICO ------*/
import VistaInicioTecnico from "./portals/AgenteSolutions/Tecnico/VistaInicioTecnico";
import MercadoTrabajos from "./portals/AgenteMarket/Tecnico/MercadoTrabajos";
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
import ReporteTrabajo from "./portals/AgenteSolutions/Cliente/ReporteTrabajo";
import DetallePropiedadadmin from "./portals/AgenteSolutions/Admin/DetallePropiedad";
import VistaDetallePropiedadCliente from "./portals/AgenteSolutions/Cliente/VistaDetallePropiedad";

import VistaCotizacionPrint from "./portals/AgenteSolutions/Admin/VistaCotizacionPrint";
import CasaLoader from "./components/Shared/CasaLoader";
import { esRed } from "./utils/entorno";

/* ------PANTALLAS PROPIAS DE LA RED (AgenteMarket) ------*/
// Copias de las pantallas internas que también usa la red: se editan sin afectar al uso interno.
// Carga diferida: su código y su CSS solo se descargan cuando entra un usuario de la red.
const RedUsuarios = lazy(() => import("./portals/AgenteMarket/Admin/VistaUsuarios"));
const RedLevantamientos = lazy(() => import("./portals/AgenteMarket/Admin/VistaLevantamientos"));
const RedReportesGlobal = lazy(() => import("./portals/AgenteMarket/Admin/VistaReportesGlobal"));
const RedCotizaciones = lazy(() => import("./portals/AgenteMarket/Admin/VistaCotizaciones"));
const RedServiciosAdmin = lazy(() => import("./portals/AgenteMarket/Admin/VistaServiciosAdmin"));
const RedBodeguero = lazy(() => import("./portals/AgenteMarket/Admin/VistaBodeguero"));
const RedProductos = lazy(() => import("./portals/AgenteMarket/Admin/ProductosView"));
const RedProductoDetalle = lazy(() => import("./portals/AgenteMarket/Admin/ProductoDetalleView"));
const RedDashboard = lazy(() => import("./portals/AgenteMarket/Admin/VistaDashboard"));
const RedSalaEsperaTecnicos = lazy(() => import("./portals/AgenteMarket/Admin/VistaSalaEsperaTecnicos"));
const RedDetalleReporte = lazy(() => import("./portals/AgenteMarket/Admin/DetalleReporte"));
const RedReporteTrabajoAdmin = lazy(() => import("./portals/AgenteMarket/Admin/ReporteTrabajo"));
const RedDetalleCliente = lazy(() => import("./portals/AgenteMarket/Admin/VistaDetalleCliente"));
const RedDetalleTecnico = lazy(() => import("./portals/AgenteMarket/Admin/VistaDetalleTecnico"));
const RedCotizacionPrint = lazy(() => import("./portals/AgenteMarket/Admin/VistaCotizacionPrint"));
const RedTrabajosTecnico = lazy(() => import("./portals/AgenteMarket/Tecnico/TrabajosTecnico"));
const RedTrabajoPropiedad = lazy(() => import("./portals/AgenteMarket/Tecnico/TrabajosPropiedad"));
const RedGaleriaReportes = lazy(() => import("./portals/AgenteMarket/Tecnico/GaleriaReportes"));
const RedNuevoReporte = lazy(() => import("./portals/AgenteMarket/Tecnico/NuevoReporte"));
const RedReporteIndividual = lazy(() => import("./portals/AgenteMarket/Tecnico/ReporteIndividual"));
const RedDetalleTrabajo = lazy(() => import("./portals/AgenteMarket/Tecnico/DetalleTrabajo"));
const RedCheckList = lazy(() => import("./portals/AgenteMarket/Tecnico/Checklist"));
const RedTrabajoInicio = lazy(() => import("./portals/AgenteMarket/Tecnico/TrabajoInicio"));
const RedTrabajosAsignados = lazy(() => import("./portals/AgenteMarket/Tecnico/TrabajosAsignados"));
const RedRegistroZonas = lazy(() => import("./portals/AgenteMarket/Tecnico/RegistroZonas"));
const RedLevantamientoPropiedad = lazy(() => import("./portals/AgenteMarket/Tecnico/LevantamientoPropiedad"));


axios.defaults.headers.common["Accept"] = "application/json";
// "Subiendo… 45%" en cualquier pantalla que suba fotos, videos o archivos
instalarProgresoSubida();

const PropiedadesWrapper = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);
  if (roleId === 0 || roleId === 1) return <VistaPropiedadesAdmin />;
  return <VistaPropiedadesAutonomo />;
};

const DetallePropiedadWrapper = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);
  if (roleId === 0 || roleId === 1) return <VistaDetallePropiedadAdmin />;
  return <VistaDetallePropiedadAutonomo />;
};

// Detalle de un trabajo dentro del expediente de la propiedad: solo Root (0) y Admin (1)
const TrabajoPropiedadWrapper = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);
  if (roleId === 0 || roleId === 1) return <VistaTrabajoPropiedad />;
  return <Navigate to="/propiedades" replace />;
};

// Misma URL para los dos entornos: la red (roles 4-8) recibe su propia copia de la pantalla
const PorEntorno = ({ interno, red }) => {
  const { user } = useAuth();
  if (!esRed(user)) return interno;
  return <Suspense fallback={<CasaLoader />}>{red}</Suspense>;
};

const CalendarioWrapper = () => {
  const { user } = useAuth();
  const roleId = Number(user?.role_id);
  if (roleId <= 3) return <CalendarioSolutions />;
  return <CalendarioCliente />;
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

    iniciarOneSignal();

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const { user, initialized } = useAuth();

  // Vincular el dispositivo al usuario en OneSignal (espera a que termine init)
  useEffect(() => {
    if (user?.id) vincularUsuarioOneSignal(user.id);
  }, [user?.id]);

  if (!initialized) return null;

  return (
    <Routes>
      <Route path="/" element={<LoginAgente />} />
      <Route path="/registro-cliente" element={<RegistroCliente />} />
      <Route path="/activacion-cuenta" element={<ActivacionCuenta />} />
      <Route path="/revisa-tu-correo" element={<CheckEmail />} />
      <Route path="/email/verify/:id/:hash" element={<VerifyEmail />} />
      <Route path="/recuperar-password" element={<ResetPassword />} />
      <Route path="/privacidad" element={<PoliticaPrivacidad />} />
      <Route path="/eliminar-cuenta" element={<EliminarCuenta />} />

      {/* RUTA COMPARTIDA PROPIEDADES */}
      <Route path="/propiedades" element={
        user?.role_id === 3 ? <MainLayoutCliente><VistaPropiedadesAdmin /></MainLayoutCliente> : <PropiedadesWrapper />
      } />

      {/* RUTA COMPARTIDA DETALLE REPORTE */}
      <Route path="/detalle-reporte/:id" element={
        user?.role_id === 3
          ? <MainLayoutCliente><DetalleReporte /></MainLayoutCliente>
          : <PorEntorno interno={<DetalleReporte />} red={<RedDetalleReporte />} />
      } />

      <Route path="/VistaRoot" element={<VistaInicioAdmin />} />
      <Route path="/VistaAdmin" element={<VistaInicioAdmin />} />
      <Route path="/VistaMarket" element={<VistaInicioMarket />} />
      <Route path="/VistaTecnico" element={<VistaInicioTecnico />} />

      <Route
        path="/registro-propiedades"
        element={
          user?.role_id === 3 ? <MainLayoutCliente><RegisterProperties /></MainLayoutCliente> : <RegisterProperties />
        }
      />

      {/* ------RUTAS DE LA VISTA DEL TECNICO (LIBERADAS) ------*/}
      <Route path="/trabajos-tecnico" element={<PorEntorno interno={<TrabajosTecnico />} red={<RedTrabajosTecnico />} />} />
      <Route path="/Checklist/:id" element={<PorEntorno interno={<CheckList />} red={<RedCheckList />} />} />
      <Route path="/detalleTrabajo/:id" element={<PorEntorno interno={<DetalleTrabajo />} red={<RedDetalleTrabajo />} />} />
      <Route path="/galeria-reportes/:id?" element={<PorEntorno interno={<GaleriaReportes />} red={<RedGaleriaReportes />} />} />
      <Route path="/reporte-individual/:id?" element={<PorEntorno interno={<ReporteIndividual />} red={<RedReporteIndividual />} />} />
      <Route path="/nuevo-reporte" element={<PorEntorno interno={<NuevoReporte />} red={<RedNuevoReporte />} />} />
      <Route path="/trabajo-inicio/:id" element={<PorEntorno interno={<TrabajoInicio />} red={<RedTrabajoInicio />} />} />
      <Route path="/trabajo-propiedad/:id" element={<PorEntorno interno={<TrabajoPropiedad />} red={<RedTrabajoPropiedad />} />} />
      <Route path="/trabajo_propiedad/:id" element={<PorEntorno interno={<TrabajoPropiedad />} red={<RedTrabajoPropiedad />} />} />
      <Route path="/venta-cruzada" element={<VentaCruzada />} />
      <Route path="/registrar-venta-cruzada" element={<RegistrarVentaCruzada />} />
      <Route path="/levantamiento-propiedad" element={<PorEntorno interno={<LevantamientoPropiedad />} red={<RedLevantamientoPropiedad />} />} />
      <Route path="/RegistroZonas/:curp" element={<PorEntorno interno={<RegistroZonas />} red={<RedRegistroZonas />} />} />

      {/* ------RUTAS DE LA VISTA DEL ADMIN (LIBERADAS) ------*/}
      <Route path="/vista-cotizaciones" element={
        user?.role_id === 3
          ? <MainLayoutCliente><VistaCotizaciones /></MainLayoutCliente>
          : <PorEntorno interno={<VistaCotizaciones />} red={<RedCotizaciones />} />
      } />
      <Route path="/levantamientos" element={
        user?.role_id === 3
          ? <MainLayoutCliente><VistaLevantamientos /></MainLayoutCliente>
          : <PorEntorno interno={<VistaLevantamientos />} red={<RedLevantamientos />} />
      } />
      <Route path="/mi-perfil" element={<Profile />} />
      <Route path="/profile" element={<Profile />} />


      <Route path="/detalle-producto" element={<PorEntorno interno={<ProductoDetalleView />} red={<RedProductoDetalle />} />} />
      <Route path="/vista-producto" element={<PorEntorno interno={<ProductosView />} red={<RedProductos />} />} />
      <Route path="/dashboard" element={<PorEntorno interno={<VistaDashboard />} red={<RedDashboard />} />} />
      <Route path="/detalle-cliente" element={<PorEntorno interno={<VistaDetalleCliente />} red={<RedDetalleCliente />} />} />
      <Route path="/usuarios" element={<PorEntorno interno={<VistaUsuarios />} red={<RedUsuarios />} />} />
      <Route path="/gestion-autonomos" element={<VistaGestionAutonomos />} />
      <Route path="/sala-espera-tecnicos" element={<PorEntorno interno={<VistaSalaEsperaTecnicos />} red={<RedSalaEsperaTecnicos />} />} />
      <Route path="/mi-codigo-autonomo" element={<VistaCodigoAutonomo />} />
      <Route path="/apoyo-autonomo" element={<VistaApoyoAutonomo />} />
      <Route path="/red-autonomos" element={<VistaRedAutonomo />} />
      <Route path="/calendario-cliente" element={<CalendarioWrapper />} />
      <Route path="/calendario" element={<CalendarioWrapper />} />
      <Route path="/mis-favoritos" element={<FavoritosAutonomo />} />
      <Route path="/tecnico-perfil/:id" element={<PerfilTecnicoRed />} />
      <Route path="/mercado-trabajos" element={<MercadoTrabajos />} />
      <Route path="/mercado_trabajos" element={<MercadoTrabajos />} />


      <Route path="/map" element={<Map />} />
      <Route path="/customize-login" element={<CustomizeLogin />} />
      <Route path="/assign-service" element={<AssignServiceForm />} />
      <Route path="/bodeguero" element={<PorEntorno interno={<VistaBodeguero />} red={<RedBodeguero />} />} />
      <Route path="/detalle-propiedad/:id" element={<DetallePropiedadWrapper />} />
      <Route path="/detalle-propiedad/:id/trabajo/:uid" element={<TrabajoPropiedadWrapper />} />
      <Route path="/tablero-servicios" element={<PorEntorno interno={<VistaServiciosAdmin />} red={<RedServiciosAdmin />} />} />
      <Route path="/detalle-tecnico" element={<PorEntorno interno={<VistaDetalleTecnico />} red={<RedDetalleTecnico />} />} />
      <Route path="/reportes-globales" element={<PorEntorno interno={<VistaReportesGlobal />} red={<RedReportesGlobal />} />} />
      <Route path="/reporte-trabajo-admin/:id?" element={<PorEntorno interno={<ReporteTrabajoAdmin />} red={<RedReporteTrabajoAdmin />} />} />

      <Route path="/notificaciones" element={<VistaNotificaciones />} />
      <Route path="/mapa-equipo" element={<VistaMapaEquipo />} />
      {/* El mapa de propiedades se unió al Mapa en vivo */}
      <Route path="/mapa-propiedades" element={<Navigate to="/mapa-equipo?capa=propiedades" replace />} />
      <Route path="/comprobantes" element={<ProtectedRoute><VistaComprobantes /></ProtectedRoute>} />
      <Route path="/chats" element={<ProtectedRoute><VistaChats /></ProtectedRoute>} />
      <Route path="/chats/:id" element={<ProtectedRoute><VistaChats /></ProtectedRoute>} />
      <Route path="/trabajos-asignados" element={<PorEntorno interno={<TrabajosAsignados />} red={<RedTrabajosAsignados />} />} />

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
      <Route path="/imprimir-cotizacion" element={<PorEntorno interno={<VistaCotizacionPrint />} red={<RedCotizacionPrint />} />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <UpdateModal />
        <InstallPrompt />
        <LocationSharing />
        <IndicadorSubida />
        {esTemporadaHalloween() && (
          <Suspense fallback={null}>
            <HalloweenGhost />
          </Suspense>
        )}
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
