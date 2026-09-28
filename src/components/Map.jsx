import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoAgente from '../assets/Logo_simple.png';
import Header from './Shared/Header';
import { ChevronLeft, RefreshCw, Radio, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
//hola 

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 210px)',
  minHeight: '450px',
  borderRadius: '16px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  overflow: 'hidden'
};

const Map = () => {
  const [propiedades, setPropiedades] = useState([]);
  const [techniciansLive, setTechniciansLive] = useState([]);
  const [marcadorActivo, setMarcadorActivo] = useState(null);
  const [tecnicoActivo, setTecnicoActivo] = useState(null);
  const [center, setCenter] = useState({ lat: 20.8822, lng: -89.7468 }); 
  const [miUbicacion, setMiUbicacion] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tenantLogo, setTenantLogo] = useState(null);
  const isRoot = [0, 1].includes(Number(user?.role_id));

  const formatHora12 = (dateStr) => {
    if (!dateStr) return '';
    const timePart = String(dateStr).includes(' ') 
      ? String(dateStr).split(' ')[1] 
      : (String(dateStr).includes('T') ? String(dateStr).split('T')[1] : dateStr);
    
    if (!timePart) return String(dateStr);
    const parts = timePart.split(':');
    if (parts.length < 2) return dateStr;
    
    let hour = parseInt(parts[0], 10);
    const min = parts[1];
    if (isNaN(hour)) return dateStr;
    
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
    hour = hour % 12 || 12;
    return `${hour}:${min} ${ampm}`;
  };

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("dynamic_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.appLogo) setTenantLogo(parsed.appLogo);
      }
    } catch (e) {
      console.error("Error leyendo dynamic_settings para Map:", e);
    }
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const cargarDatos = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/map`);
      setPropiedades(res.data);

      if (isRoot) {
        try {
          const liveRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/root/technicians-live-map`);
          if (liveRes.data && liveRes.data.data) {
            setTechniciansLive(liveRes.data.data);
          }
        } catch (liveErr) {
          console.warn("No se pudieron cargar los datos de rastreo en vivo:", liveErr);
        }
      }
    } catch (error) {
      console.error("Error cargando los marcadores:", error);
    }
  };

  useEffect(() => {
    cargarDatos();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const ubicacionActual = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenter(ubicacionActual); 
          setMiUbicacion(ubicacionActual); 
        },
        (error) => {
          console.warn("El usuario no dio permiso de ubicación o hubo un error:", error);
        }
      );
    }

    if (isRoot) {
      const intervalId = setInterval(cargarDatos, 15000);
      return () => clearInterval(intervalId);
    }
  }, [user, isRoot]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const techId = params.get('techId') || params.get('userId');
    if (techId && techniciansLive.length > 0) {
      const tech = techniciansLive.find(t => String(t.user_id) === String(techId));
      if (tech) {
        setTecnicoActivo(tech);
        setMarcadorActivo(null);
        const lat = parseFloat(tech.latitude);
        const lng = parseFloat(tech.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCenter({ lat, lng });
        }
      }
    }
  }, [techniciansLive]);

  if (!isLoaded) return <div style={{ padding: 20, textAlign: 'center' }}>Cargando el mapa...</div>;

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Header titulo="MAPA DE MONITOREO GPS" />

      <div style={{ padding: '15px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* BARRA SUPERIOR RESPONSIVA */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '15px' 
        }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: '#F26522', 
              color: 'white', 
              padding: '8px 20px', 
              borderRadius: '25px', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: '800', 
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(242,101,34,0.25)',
              transition: 'transform 0.2s'
            }}
          >
            <ChevronLeft size={18} />
            <span>REGRESAR</span>
          </button>

          {isRoot && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontWeight: '800',
                fontSize: '0.8rem',
                border: '1px solid #bfdbfe'
              }}>
                <Radio size={15} className="animate-pulse" color="#2563eb" />
                <span>Rastreo GPS Root ({techniciansLive.length} Técnicos)</span>
              </span>

              <button
                type="button"
                onClick={cargarDatos}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#1e293b',
                  color: 'white',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                <RefreshCw size={14} /> Actualizar
              </button>
            </div>
          )}
        </div>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13} 
        >
          {miUbicacion && (
            <Marker
              position={miUbicacion}
              title="¡Estás aquí!"
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' 
              }}
            />
          )}

          {/* MARCADORES DE PROPIEDADES */}
          {propiedades.map((prop) => {
            const pinUrl = prop.tenant_logo_url || (!isRoot && tenantLogo ? tenantLogo : logoAgente);
            return (
              <Marker
                key={`prop-${prop.id}`}
                position={{ lat: parseFloat(prop.lat), lng: parseFloat(prop.lng) }}
                onClick={() => {
                  setMarcadorActivo(prop);
                  setTecnicoActivo(null);
                }}
                icon={{
                  url: pinUrl, 
                  scaledSize: new window.google.maps.Size(42, 42), 
                  origin: new window.google.maps.Point(0, 0),
                  anchor: new window.google.maps.Point(21, 42)
                }}
              />
            );
          })}

          {/* MARCADORES DE TÉCNICOS EN TIEMPO REAL (SOLO ROOT) */}
          {isRoot && techniciansLive.map((tech) => {
            const lat = parseFloat(tech.latitude);
            const lng = parseFloat(tech.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            const tieneArribo = tech.assigned_jobs && tech.assigned_jobs.some(j => j.arrival_status === 'EN_SITIO');

            return (
              <React.Fragment key={`tech-${tech.user_id}`}>
                <Marker
                  position={{ lat, lng }}
                  title={`${tech.first_name} ${tech.last_name}`}
                  onClick={() => {
                    setTecnicoActivo(tech);
                    setMarcadorActivo(null);
                  }}
                  icon={{
                    path: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
                    fillColor: tieneArribo ? '#10b981' : '#f26522',
                    fillOpacity: 1,
                    strokeWeight: 1.5,
                    strokeColor: '#ffffff',
                    scale: 1.6,
                    anchor: (window.google && window.google.maps) ? new window.google.maps.Point(12, 12) : undefined
                  }}
                />

                {/* Línea conectora a la propiedad del trabajo asignado */}
                {tech.assigned_jobs && tech.assigned_jobs.map((job) => {
                  const propLat = parseFloat(job.property_latitude);
                  const propLng = parseFloat(job.property_longitude);
                  if (isNaN(propLat) || isNaN(propLng)) return null;

                  return (
                    <Polyline
                      key={`line-${tech.user_id}-${job.id}`}
                      path={[
                        { lat, lng },
                        { lat: propLat, lng: propLng }
                      ]}
                      options={{
                        strokeColor: job.arrival_status === 'EN_SITIO' ? '#10b981' : '#f26522',
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        icons: [{
                          icon: { path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW },
                          offset: '50%'
                        }]
                      }}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* INFO WINDOW CLIENTE */}
          {marcadorActivo && (
            <InfoWindow
              position={{ lat: parseFloat(marcadorActivo.lat), lng: parseFloat(marcadorActivo.lng) }}
              onCloseClick={() => setMarcadorActivo(null)}
            >
              <div style={{ display: 'flex', gap: '12px', width: '280px', maxWidth: 'calc(100vw - 70px)', padding: '4px', alignItems: 'center' }}>
                <div>
                  <img 
                    src={marcadorActivo.picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                    alt="Perfil del Cliente" 
                    style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6600', flexShrink: 0 }} 
                  />
                </div>

                <div style={{ color: '#333', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <h4 style={{ margin: 0, color: '#FF6600', fontSize: '1rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {marcadorActivo.owner_name || 'Cliente sin nombre'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 'bold' }}>
                    📞 {marcadorActivo.phone || 'Sin teléfono'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', lineHeight: '1.2' }}>
                    📍 {marcadorActivo.address}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button 
                      onClick={() => {
                        const clienteData = {
                          id: marcadorActivo.client_id,
                          name: marcadorActivo.owner_name,
                          nombre: marcadorActivo.owner_name,
                          email: marcadorActivo.email,
                          correo: marcadorActivo.email,
                          phone: marcadorActivo.phone,
                          telefono: marcadorActivo.phone,
                          profile_picture: marcadorActivo.picture,
                          profile_picture_url: marcadorActivo.picture,
                          address: marcadorActivo.address,
                          direccion: marcadorActivo.address,
                          rol: 'CLIENTE'
                        };
                        navigate('/detalle-cliente', { state: { cliente: clienteData } });
                      }}
                      style={{
                        backgroundColor: '#1e293b', 
                        color: 'white', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        flex: 1
                      }}>
                      Detalles
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${marcadorActivo.lat},${marcadorActivo.lng}`)}
                      style={{
                        backgroundColor: '#F26522', 
                        color: 'white', 
                        border: 'none', 
                        padding: '6px 10px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        flex: 1
                      }}>
                      Llegar
                    </button>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* INFO WINDOW TÉCNICO EN VIVO (SOLO ROOT) */}
          {tecnicoActivo && (
            <InfoWindow
              position={{ lat: parseFloat(tecnicoActivo.latitude), lng: parseFloat(tecnicoActivo.longitude) }}
              onCloseClick={() => setTecnicoActivo(null)}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                width: '310px', 
                maxWidth: 'calc(100vw - 70px)', 
                padding: '4px',
                boxSizing: 'border-box'
              }}>
                {/* Encabezado del Técnico */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <img 
                    src={tecnicoActivo.profile_picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                    alt="Técnico" 
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F26522', flexShrink: 0 }} 
                  />
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🛠️ {tecnicoActivo.first_name} {tecnicoActivo.last_name}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
                      📞 {tecnicoActivo.phone_number || 'Sin teléfono'}
                    </p>
                    {tecnicoActivo.last_gps_update && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                        Última señal: {formatHora12(tecnicoActivo.last_gps_update)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lista de Trabajos con Scroll Controlado */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Trabajos Asignados Hoy ({tecnicoActivo.assigned_jobs?.length || 0}):
                  </div>

                  {(!tecnicoActivo.assigned_jobs || tecnicoActivo.assigned_jobs.length === 0) ? (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin trabajos agendados hoy</p>
                  ) : (
                    <div style={{ 
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      paddingRight: '4px'
                    }}>
                      {tecnicoActivo.assigned_jobs.map((job) => (
                        <div key={job.composite_id} style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>
                              #{job.id} - {job.property_name || job.address}
                            </span>
                            {job.arrival_status === 'EN_SITIO' ? (
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#d1fae5', color: '#065f46', flexShrink: 0 }}>
                                🟢 En el lugar
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#fff3ed', color: '#f26522', flexShrink: 0 }}>
                                🟠 En camino
                              </span>
                            )}
                          </div>
                          
                          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                            Cliente: <strong style={{ color: '#334155' }}>{job.client_name || 'Desconocido'}</strong> ({job.client_phone || 'Sin tel'})
                          </p>

                          {job.arrived_at && (
                            <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#059669', fontWeight: '800' }}>
                              Llegada confirmada: {formatHora12(job.arrived_at)}
                            </p>
                          )}

                          <button 
                            onClick={() => {
                              const realId = String(job.id).replace('work_order-', '').replace('servicio-', '');
                              navigate(`/tablero-servicios?jobId=${realId}`);
                            }}
                            style={{
                              marginTop: '6px',
                              background: '#ffffff',
                              color: '#F26522',
                              border: '1px solid #fed7aa',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink size={12} /> Ver Orden #{job.id}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export default Map;