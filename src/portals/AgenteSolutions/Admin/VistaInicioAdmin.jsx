import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminHeader from '../../../components/Shared/AdminHeader';
import ModalRegistroInmueble from '../../../components/Shared/ModalRegistroInmueble';
import { useAuth } from '../../../context/AuthContext';
import defaultPropImg from '../../../assets/propiedad_ejemplo.jpg';
import '../../../styles/AgenteMarket/Cliente/VistaClienteParticular.css';
import '../../../styles/AgenteSolutions/Admin/VistaInicioAdmin.css';

import {
  User,
  ClipboardList,
  MapPin,
  Navigation,
  ExternalLink,
  LayoutDashboard,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Share2,
  Building2,
  Edit3,
  Calendar,
  Wrench,
  Receipt,
  Camera,
  Layers,
  ChevronRight
} from 'lucide-react';

// Propiedades de demostración con fotografías arquitectónicas si aún no hay registros en la base de datos
const FALLBACK_PROPERTIES = [
  {
    id: 1,
    nombre_propiedad: "Villa Paraíso Residencial",
    direccion: "Zona Hotelera Km 14.5, Cancún, Q.R.",
    tipo: "RESIDENCIAL",
    cliente: "Agente Solutions Corporativo",
    curp: "INM-0001-CUN",
    lat: 21.0991,
    lng: -86.7645,
    imagen: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85"
  },
  {
    id: 2,
    nombre_propiedad: "Condominios Torre Marina",
    direccion: "Av. Bonampak Sm 4, Benito Juárez",
    tipo: "DEPARTAMENTO",
    cliente: "Desarrollos Náuticos",
    curp: "INM-0002-MRN",
    lat: 21.1619,
    lng: -86.8278,
    imagen: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85"
  },
  {
    id: 3,
    nombre_propiedad: "Residencial Las Palmas",
    direccion: "Calle del Sol 210, Playa del Carmen",
    tipo: "CASA",
    cliente: "Familia González",
    curp: "INM-0003-PLM",
    lat: 20.6296,
    lng: -87.0739,
    imagen: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85"
  },
  {
    id: 4,
    nombre_propiedad: "Penthouse Blue Horizon",
    direccion: "Blvd. Kukulcán Lote 8, Cancún",
    tipo: "PENTHOUSE",
    cliente: "Inmobiliaria Mar Azul",
    curp: "INM-0004-HRZ",
    lat: 21.1350,
    lng: -86.7490,
    imagen: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=85"
  }
];

const VistaInicioAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRoot = Number(user?.role_id) === 0;
  const rolTexto = isRoot ? "ROOT / SUPERADMIN" : "ADMINISTRADOR";
  const userFullName = user?.first_name 
    ? `${user.first_name} ${user?.last_name || ''}`.trim().toUpperCase() 
    : (user?.name?.toUpperCase() || 'ADMINISTRADOR');

  const [propiedades, setPropiedades] = useState(FALLBACK_PROPERTIES);
  const [selectedPropId, setSelectedPropId] = useState(null);
  const [propertyStats, setPropertyStats] = useState({ sos: 0, pendientes: 0, proceso: 0, listos: 0 });
  const [copiedToast, setCopiedToast] = useState(false);
  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);

  // Cargar propiedades de Agente Solutions
  const fetchPropiedades = useCallback(async (autoSelectId = null) => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const allList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Rol 1: Aislar únicamente las propiedades registradas en el sistema base de Agente Solutions
      const userTenantId = Number(user?.tenant_id || 1);
      const list = allList.filter(p => !p.tenant_id || Number(p.tenant_id) === 1 || Number(p.tenant_id) === userTenantId);

      if (list.length > 0) {
        setPropiedades(list);
        if (autoSelectId && list.some(p => p.id === autoSelectId)) {
          setSelectedPropId(autoSelectId);
        } else {
          setSelectedPropId(prev => (prev && list.some(p => p.id === prev) ? prev : list[0].id));
        }
      } else {
        setPropiedades(FALLBACK_PROPERTIES);
        setSelectedPropId(FALLBACK_PROPERTIES[0].id);
      }
    } catch (err) {
      setPropiedades(FALLBACK_PROPERTIES);
      setSelectedPropId(FALLBACK_PROPERTIES[0].id);
    }
  }, [user]);

  useEffect(() => {
    fetchPropiedades();
  }, [fetchPropiedades]);

  // Propiedad activa seleccionada
  const activeProperty = useMemo(() => {
    return propiedades.find(p => p.id === selectedPropId) || propiedades[0] || FALLBACK_PROPERTIES[0];
  }, [propiedades, selectedPropId]);

  // Cargar estadísticas / órdenes de la propiedad activa
  useEffect(() => {
    if (!activeProperty?.id) return;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('agente_token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${activeProperty.id}/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data?.stats) {
          setPropertyStats({
            sos: res.data.stats.sos || 0,
            pendientes: res.data.stats.pendientes || 0,
            proceso: res.data.stats.proceso || 0,
            listos: res.data.stats.listos || 0,
          });
        } else {
          setPropertyStats({ sos: 1, pendientes: 2, proceso: 1, listos: 5 });
        }
      } catch {
        setPropertyStats({ sos: 0, pendientes: 1, proceso: 2, listos: 4 });
      }
    };
    fetchStats();
  }, [activeProperty?.id]);

  const getPropImage = (prop) => {
    if (!prop) return defaultPropImg;
    const img = 
      prop.foto_url || 
      prop.facade_photo_path || 
      prop.foto_fachada || 
      prop.imagen || 
      prop.foto || 
      prop.photo_url || 
      prop.image_url || 
      prop.imagen_url ||
      prop.image;

    if (img && typeof img === 'string' && img.trim() !== '') {
      if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('blob:')) return img;
      return `${import.meta.env.VITE_API_BASE_URL}/storage/${img.replace(/^\/+/, '')}`;
    }
    return defaultPropImg;
  };

  const heroBgImage = getPropImage(activeProperty);

  const extractPropertyGps = (prop) => {
    if (!prop) return null;

    // Si viene la cadena 'coordenadas' o 'coordinates' ("20.9673, -89.5925") desde la base de datos
    const coordStr = prop.coordenadas || prop.coordinates;
    if (coordStr && typeof coordStr === 'string' && coordStr.includes(',')) {
      const parts = coordStr.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
          return { lat, lng, formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        }
      }
    }

    const candidates = [prop.lat, prop.latitude, prop.latitud];
    const lngCandidates = [prop.lng, prop.longitude, prop.longitud];
    for (let i = 0; i < candidates.length; i++) {
      const lat = parseFloat(candidates[i]);
      const lng = parseFloat(lngCandidates[i]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
        return { lat, lng, formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
      }
    }
    return null;
  };

  const handleOpenMaps = () => {
    const coords = extractPropertyGps(activeProperty);
    if (coords) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
      return;
    }
    const address = activeProperty?.address || activeProperty?.direccion || activeProperty?.calle;
    if (address && typeof address === 'string' && address.trim() !== '') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`, '_blank');
      return;
    }
    window.open(`https://www.google.com/maps`, '_blank');
  };

  const handleShareProperty = () => {
    const textToCopy = `Propiedad: ${activeProperty?.nombre_propiedad || 'Inmueble'} | Dirección: ${activeProperty?.address || activeProperty?.direccion || 'Mérida'}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const clientNameDisplay = activeProperty?.propietario
    || activeProperty?.cliente?.nombre 
    || activeProperty?.cliente?.name 
    || activeProperty?.client_name 
    || activeProperty?.empresa
    || activeProperty?.company_name
    || activeProperty?.cliente 
    || 'Agente Solutions';

  return (
    <div className="vcp-root">
      {/* Fachada arquitectónica a pantalla completa con desenfoque dinámico */}
      <div 
        className="vcp-hero-bg-layer" 
        style={{ backgroundImage: `url("${heroBgImage}")` }}
      />
      <div className="vcp-hero-bg-overlay" />

      {/* ── TOP NAVBAR DEL ADMINISTRADOR (ROL 1 CON TODAS SUS RUTAS Y FUNCIONES) ── */}
      <AdminHeader rolTexto={rolTexto} activeModule="inicio" />

      {/* ── CUERPO PRINCIPAL: VITRINA DE PROPIEDADES (ESTILO LA RED) ── */}
      <main className="vcp-body-layout">
        {/* ── COLUMNA IZQUIERDA: HERO DEL INMUEBLE Y CARRUSEL INFERIOR DE MINIATURAS ── */}
        <section className="vcp-hero-side">
          {/* Badge Superior Flotante */}
          <div className="vcp-plan-floating-badge is-collapsed" style={{ top: '16px', left: '0' }}>
            <div className="vcp-plan-pill-toggle-btn" style={{ cursor: 'default' }}>
              <Building2 size={15} style={{ color: '#f26522' }} />
              <span className="vcp-plan-pill-text">
                CATÁLOGO DE INMUEBLES ({propiedades.length} ACTIVOS)
              </span>
            </div>
          </div>

          {/* Sección Inferior Izquierda: Título y Carrusel de Miniaturas */}
          <div className="vcp-hero-bottom">
            {/* Título de la Propiedad */}
            <div className="vcp-prop-header-block">
              <div className="vcp-prop-owner-tag">
                {activeProperty?.tipo || 'RESIDENCIAL'} • 🏢 {clientNameDisplay} • ID #{activeProperty?.id || '01'}
              </div>

              <div className="vcp-title-edit-row">
                <h1 className="vcp-prop-main-title">
                  {activeProperty?.nombre_propiedad || activeProperty?.nombre || 'MI PROPIEDAD'}
                </h1>
                <button
                  type="button"
                  className="vcp-title-edit-btn"
                  onClick={() => navigate('/propiedades')}
                  title="Administrar propiedades en el catálogo completo"
                >
                  <Edit3 size={16} />
                  <span>GESTIONAR</span>
                </button>
              </div>
            </div>

            {/* Carrusel Horizontal de Miniaturas (Selector de Inmuebles) */}
            <div className="vcp-prop-carousel-block">
              <div className="vcp-prop-category-label">
                CAMBIAR INMUEBLE ({propiedades.length})
              </div>

              <div className="vcp-thumbs-track">
                {propiedades.map((prop, idx) => {
                  const isActive = prop.id === activeProperty?.id;
                  const thumbImg = getPropImage(prop);
                  return (
                    <div 
                      key={prop.id || idx}
                      className={`vcp-thumb-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedPropId(prop.id)}
                      title={`Haz clic para ver:\n${prop.nombre_propiedad || prop.nombre || `Propiedad #${prop.id}`}\n🏢 ${prop.propietario || prop.cliente || 'Agente Solutions'}`}
                    >
                      <img 
                        src={thumbImg} 
                        alt={prop.nombre_propiedad || 'Propiedad'} 
                        className="vcp-thumb-img" 
                        draggable={false}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultPropImg;
                        }}
                      />
                      {isActive && (
                        <div className="vcp-thumb-main-badge" title="Propiedad Activa en Pantalla">
                          ★
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Botón para registrar nueva propiedad (Abre el Modal Liquid Glass directamente) */}
                <div 
                  className="vcp-thumb-add-tile"
                  title="Registrar / Agregar Nuevo Inmueble"
                  onClick={() => setMostrarModalRegistro(true)}
                >
                  <Plus size={26} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COLUMNA DERECHA: PANEL DE PERFIL DE LA PROPIEDAD (LIQUID GLASS) ── */}
        <aside className="vcp-panel-side">
          <div className="vcp-property-profile-inner">
            {/* Cabecera del Panel */}
            <div className="vcp-panel-header">
              <div className="vcp-panel-header-icon" style={{ background: 'rgba(242, 101, 34, 0.2)', color: '#f26522', border: '1px solid rgba(242, 101, 34, 0.4)' }}>
                <Building2 size={18} />
              </div>
              <div className="vcp-panel-header-texts">
                <h2 className="vcp-panel-title">PERFIL DE LA PROPIEDAD</h2>
                <span className="vcp-panel-id-badge">
                  REGISTRO: #{activeProperty?.id || '001'}
                </span>
              </div>
              <button
                type="button"
                className="vcp-panel-edit-text-btn"
                onClick={() => navigate('/propiedades')}
                title="Ver ficha completa en catálogo"
              >
                <span>VER TODO</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Lista de Campos Técnicos */}
            <div className="vcp-fields-list">
              {/* Empresa o Titular */}
              <div className="vcp-field-item">
                <div className="vcp-field-icon-wrap">
                  <Building2 size={16} />
                </div>
                <div className="vcp-field-content">
                  <span className="vcp-field-label">EMPRESA / TITULAR</span>
                  <span className="vcp-field-value" style={{ fontWeight: 800, color: '#f26522' }}>
                    🏢 {clientNameDisplay}
                  </span>
                </div>
              </div>

              {/* CURP / Código Inmueble */}
              <div className="vcp-field-item">
                <div className="vcp-field-icon-wrap">
                  <ClipboardList size={16} />
                </div>
                <div className="vcp-field-content">
                  <span className="vcp-field-label">CÓDIGO INMUEBLE</span>
                  <span className="vcp-curp-pill">
                    {activeProperty?.curp || activeProperty?.codigo || `INM-${String(activeProperty?.id || 1).padStart(4, '0')}-AG`}
                  </span>
                </div>
              </div>

              {/* Dirección */}
              <div className="vcp-field-item">
                <div className="vcp-field-icon-wrap">
                  <MapPin size={16} />
                </div>
                <div className="vcp-field-content">
                  <span className="vcp-field-label">DIRECCIÓN</span>
                  <span className="vcp-field-value">
                    {activeProperty?.address || activeProperty?.direccion || activeProperty?.calle || 'Mérida, Yucatán'}
                  </span>
                </div>
              </div>

              {/* Ubicación GPS con Enlace a Google Maps */}
              <div className="vcp-field-item">
                <div className="vcp-field-icon-wrap">
                  <Navigation size={16} />
                </div>
                <div className="vcp-field-content">
                  <span className="vcp-field-label">UBICACIÓN GPS</span>
                  <div className="vcp-gps-row" onClick={handleOpenMaps} title="Abrir en Google Maps">
                    <span>
                      {extractPropertyGps(activeProperty)
                        ? `📍 ${extractPropertyGps(activeProperty).formatted}`
                        : '📍 Ver en Google Maps'}
                    </span>
                    <ExternalLink size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget del Tablero de Control de la Propiedad */}
            <div className="vcp-tablero-card">
              <div className="vcp-tablero-header">
                <div className="vcp-tablero-icon-wrap">
                  <LayoutDashboard size={18} />
                </div>
                <h3 className="vcp-tablero-title">Tablero Operativo de la Propiedad</h3>
              </div>

              <div className="vcp-tablero-grid">
                {/* SOS */}
                <div 
                  className="vcp-stat-box vcp-stat-sos"
                  onClick={() => navigate('/SOSView', { state: { propiedad: activeProperty } })}
                  title="Ver o Gestionar Emergencias SOS"
                >
                  <div className="vcp-stat-icon-wrapper">
                    <AlertCircle size={20} className="vcp-stat-icon" />
                  </div>
                  <span className="vcp-stat-count">{propertyStats.sos}</span>
                  <span className="vcp-stat-label">SOS</span>
                </div>

                {/* POR HACER */}
                <div 
                  className="vcp-stat-box vcp-stat-todo"
                  onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                  title="Servicios Por Hacer"
                >
                  <div className="vcp-stat-icon-wrapper">
                    <ClipboardList size={20} className="vcp-stat-icon" />
                  </div>
                  <span className="vcp-stat-count">{propertyStats.pendientes}</span>
                  <span className="vcp-stat-label">POR HACER</span>
                </div>

                {/* PROCESO */}
                <div 
                  className="vcp-stat-box vcp-stat-process"
                  onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                  title="Servicios en Proceso"
                >
                  <div className="vcp-stat-icon-wrapper">
                    <Clock size={20} className="vcp-stat-icon" />
                  </div>
                  <span className="vcp-stat-count">{propertyStats.proceso}</span>
                  <span className="vcp-stat-label">PROCESO</span>
                </div>

                {/* LISTOS */}
                <div 
                  className="vcp-stat-box vcp-stat-done"
                  onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                  title="Servicios Concluidos"
                >
                  <div className="vcp-stat-icon-wrapper">
                    <CheckCircle2 size={20} className="vcp-stat-icon" />
                  </div>
                  <span className="vcp-stat-count">{propertyStats.listos}</span>
                  <span className="vcp-stat-label">LISTOS</span>
                </div>
              </div>

              <div className="vcp-tablero-btn-wrap">
                <button 
                  className="vcp-btn-tablero-detail"
                  onClick={() => navigate(`/propiedad/${activeProperty?.id}/tablero`, { state: { propiedad: activeProperty } })}
                  title="Ver Tablero Detallado de Órdenes de esta Propiedad"
                >
                  VER TABLERO DETALLADO
                </button>
              </div>
            </div>

            {/* Botones de Acción Operativa de la Propiedad */}
            <div className="vcp-actions-grid">
              {/* SOS */}
              <button 
                className="vcp-btn vcp-btn-sos"
                onClick={() => navigate('/SOSView', { state: { propiedad: activeProperty } })}
                title="Gestión de Emergencias SOS"
              >
                <AlertTriangle size={17} /> SOS
              </button>

              {/* Asignar Servicio */}
              <button 
                className="vcp-btn vcp-btn-service"
                onClick={() => navigate('/assign-service', { state: { propiedad: activeProperty } })}
                title="Asignar o Crear Nueva Orden de Servicio"
              >
                <Wrench size={17} /> ASIGNAR SERVICIO
              </button>

              {/* Compartir Ficha */}
              <button 
                className="vcp-btn vcp-btn-share"
                onClick={handleShareProperty}
                title="Copiar datos de la propiedad"
              >
                {copiedToast ? (
                  <>
                    <CheckCircle2 size={17} /> ¡COPIADO!
                  </>
                ) : (
                  <>
                    <Share2 size={17} /> COMPARTIR
                  </>
                )}
              </button>

              {/* Ver Levantamiento */}
              <button 
                className="vcp-btn vcp-btn-survey"
                onClick={() => navigate('/levantamientos', { state: { selectedPropId: activeProperty?.id } })}
                title="Ver Levantamientos Técnicos de esta Propiedad"
              >
                <ClipboardList size={17} /> LEVANTAMIENTO
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL REGISTRO DE INMUEBLE (ULTRA LIQUID GLASS) */}
      <ModalRegistroInmueble
        isOpen={mostrarModalRegistro}
        onClose={() => setMostrarModalRegistro(false)}
        onSuccess={(createdProp) => {
          fetchPropiedades(createdProp?.id);
          setMostrarModalRegistro(false);
        }}
        user={user}
      />
    </div>
  );
};

export default VistaInicioAdmin;
