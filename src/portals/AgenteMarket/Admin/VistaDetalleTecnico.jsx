import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, User, Mail, MapPin, ArrowRight, ShieldCheck, X, Save, Phone, Lock, CheckCircle, Briefcase, Clipboard, FileText, Clock
} from 'lucide-react';
import '../../../styles/AgenteMarket/Admin/VistaDetalleCliente.css';
import { mostrarAviso } from '../../../utils/dialogos';

const ESPECIALIDADES_CATALOGO = [
  { id: 1, name: "Electricidad", icon: "⚡" },
  { id: 2, name: "Plomería", icon: "🚰" },
  { id: 3, name: "Aire Acondicionado (HVAC)", icon: "❄️" },
  { id: 4, name: "Pintura e Impermeabilización", icon: "🎨" },
  { id: 5, name: "Albañilería y Remodelación", icon: "🧱" },
  { id: 6, name: "Carpintería y Muebles", icon: "🪚" },
  { id: 7, name: "Cerrajería y Seguridad", icon: "🔑" },
  { id: 8, name: "Limpieza y Mantenimiento", icon: "🧹" },
  { id: 9, name: "Multi-técnico / General", icon: "🧰" },
  { id: 10, name: "Electrodomésticos y Equipos", icon: "🔌" },
  { id: 11, name: "Jardinería y Exteriores", icon: "🪴" },
  { id: 12, name: "Redes y CCTV", icon: "🖥️" }
];

const VistaDetalleTecnico = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [tecnico, setTecnico] = useState(location.state?.tecnico || location.state?.u || null);
  const [trabajos, setTrabajos] = useState([]);
  const [levantamientos, setLevantamientos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState(() => {
    const specs = location.state?.tecnico?.specialties || location.state?.u?.specialties || [];
    return specs.map(s => typeof s === 'string' ? s : s.name);
  });
  const [formData, setFormData] = useState({
    nombre: tecnico?.name || tecnico?.nombre || '',
    correo: tecnico?.email || tecnico?.correo || '',
    telefono: tecnico?.phone || tecnico?.telefono || '',
    direccion: tecnico?.address || tecnico?.direccion || '',
    estado: tecnico?.estado || 'Activo',
    password: '',
  });

  useEffect(() => {
    if (!tecnico) return;

    const cargarDatosTecnico = async () => {
      try {
        // Limpiamos el ID por si viene con prefijos como "u_32" desde VistaUsuarios
        const rawId = String(tecnico.id || tecnico.user_id).replace(/[^\d]/g, '');
        const id = parseInt(rawId, 10);
        
        // 1. Obtener TODO el tablero (Igual que en VistaServiciosAdmin)
        const [resWorkOrders, resReportes, resCotizaciones] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/work-orders/all`).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/reportes-globales`).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`).catch(() => ({ data: [] }))
        ]);

        const todosWorkOrders = resWorkOrders.data || [];
        const reportesGlobales = resReportes.data || [];
        const todasCotizaciones = resCotizaciones.data || [];

        // 2. Filtrar solo los que le pertenecen al técnico actual
        const misWorkOrders = todosWorkOrders.filter(w => {
          const asignadoDirecto = w.tecnico_id == id || w.assigned_to == id;
          const enEquipo = w.technicians && w.technicians.some(t => parseInt(t.id, 10) === id);
          return asignadoDirecto || enEquipo;
        }).map(w => ({
          ...w,
          id: w.id,
          tipo_registro: 'work_order',
          composite_id: `work_order-${w.id}`,
          title: `${w.zone} - ${w.equipment || 'General'}`,
          property_name: w.property?.property_name || w.property?.nombre_propiedad || w.property?.address || 'N/A',
          address: w.property?.address || 'N/A',
          cliente: w.property?.client?.name || 'Sin Cliente',
          scheduled_start: w.scheduled_at,
          status: w.status
        }));

        const todoElTrabajo = [...misWorkOrders];

        // 3. Agrupar evidencias fotográficas por ID de trabajo
        const evidenciasPorTrabajo = {};
        reportesGlobales.forEach(r => {
          const trabajoId = r.service_id || r.work_order_id;
          if (trabajoId) {
            if (!evidenciasPorTrabajo[trabajoId]) evidenciasPorTrabajo[trabajoId] = [];
            if (r.image_url || r.image_path) {
              evidenciasPorTrabajo[trabajoId].push(r.image_url || r.image_path);
            }
          }
        });

        // 4. Separar en Trabajos y Levantamientos
        const trabajosArr = [];
        const levantamientosArr = [];

        todoElTrabajo.forEach(item => {
          const titulo = (item.title || item.type || item.description || 'Mantenimiento').toLowerCase();
          const itemConFotos = { ...item, evidencias: evidenciasPorTrabajo[item.id] || [] };
          
          if (titulo.includes('levantamiento')) {
            levantamientosArr.push(itemConFotos);
          } else {
            trabajosArr.push(itemConFotos);
          }
        });

        // 5. Filtrar Cotizaciones estrictamente
        const validWorkOrderIds = new Set(trabajosArr.map(w => w.id));
        const validServiceIds = new Set(levantamientosArr.map(l => l.id));

        const cotizacionesArr = todasCotizaciones.filter(c => 
          (c.work_order_id && validWorkOrderIds.has(c.work_order_id)) || 
          (c.service_id && validServiceIds.has(c.service_id))
        );

        setTrabajos(trabajosArr);
        setLevantamientos(levantamientosArr);
        setCotizaciones(cotizacionesArr);

      } catch (error) {
        console.error('Error al reconstruir datos del técnico:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosTecnico();
  }, [tecnico]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const [seccionAbierta, setSeccionAbierta] = useState('trabajos');
  const toggleSeccion = (seccion) => setSeccionAbierta(seccionAbierta === seccion ? null : seccion);

  const guardarCambios = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id: tecnico.id,
        first_name: formData.nombre.split(' ')[0] || '',
        last_name: formData.nombre.split(' ').slice(1).join(' ') || '',
        email: formData.correo,
        phone_number: formData.telefono,
        address: formData.direccion,
        is_active: formData.estado === 'Activo' ? 1 : 0,
      };
      if (formData.password) payload.password = formData.password;

      const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/usuarios/update-profile`, payload);
      
      const rawId = String(tecnico.id || tecnico.user_id).replace(/[^\d]/g, '');
      const token = localStorage.getItem('agente_token');
      let updatedSpecs = tecnico.specialties || [];
      try {
        const specRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/u_${rawId}/specialties`, {
          specialties: selectedSpecialties
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        if (specRes.data?.specialties) updatedSpecs = specRes.data.specialties;
      } catch (err) { console.error('Error sincronizando especialidades:', err); }

      setTecnico({ ...tecnico, ...formData, specialties: updatedSpecs });
      setIsModalOpen(false);
      mostrarAviso(data.message || '¡Perfil actualizado con éxito!');
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      mostrarAviso('No se pudieron guardar los cambios: ' + (error.response?.data?.message || error.message));
    }
  };

  if (!tecnico) return <div className="text-center p-10">Cargando expediente...</div>;

  const renderCard = (item, type) => {
    const isCompleted = ['finalizado', 'completado', 'completed', 'listo', 'aprobado'].includes((item.status || '').toLowerCase());
    const isPending = ['en proceso', 'en progreso', 'programado', 'por hacer', 'asignado', 'pendiente'].includes((item.status || '').toLowerCase());
    
    let statusColor = '#888';
    if (isCompleted) statusColor = '#16a34a'; 
    else if (isPending) statusColor = '#F26522'; 
    else if ((item.status || '').toLowerCase().includes('rechazado')) statusColor = '#ef4444'; 

    const handleCardClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'cotizacion') {
        navigate(`/vista-cotizaciones?quoteId=${item.id}`);
      } else {
        navigate(`/tablero-servicios?jobId=${item.id}`);
      }
    };

    return (
      <details key={item.composite_id || item.id} className="history-log-card" style={{ borderLeft: `4px solid ${statusColor}`, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <summary style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', outline: 'none' }}>
          <div className="log-status" style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isCompleted ? <CheckCircle size={14}/> : <Clock size={14}/>} 
            <span>{item.status ? item.status.toUpperCase() : 'ASIGNADO'}</span>
          </div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
            {item.title || item.type || item.description || (type === 'cotizacion' ? `Cotización #${item.folio}` : `Trabajo #${item.id}`)}
          </h4>
          
          {(item.property_name || item.address || item.cliente) && (
             <div style={{fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '5px'}}>
               <MapPin size={14} color="#F26522" style={{ marginTop: '2px', flexShrink: 0 }} />
               <span><strong>{item.property_name || item.cliente || 'Sin nombre'}</strong> <br/> {item.address || 'Sin dirección'}</span>
             </div>
          )}
          
          <div style={{fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}>
            <Clock size={12}/> Fecha: {item.fecha || item.created_at?.split('T')[0] || '---'}
          </div>
        </summary>
        
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          <button onClick={handleCardClick} style={{ background: '#F26522', color: 'white', padding: '8px 15px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '15px' }}>
            VER DETALLES EN TABLERO
          </button>
          
          {item.evidencias && item.evidencias.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Evidencias Fotográficas:</p>
              {item.evidencias.map((img, idx) => (
                <img key={idx} src={img} alt="evidencia" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              ))}
            </div>
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="detalle-cliente-container">
      <header className="detalle-header">
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
          <ChevronLeft size={20} /> REGRESAR
        </button>
        <div className="header-title">
          <h1>Expediente del Técnico</h1>
        </div>
      </header>

      <div className="detalle-main-wrapper">
        <aside className="cliente-data-card">
          <div className="avatar-header-section">
            <div className="avatar-container-large">
              {tecnico.profile_picture_url || tecnico.profile_picture ? (
                <img src={tecnico.profile_picture_url || tecnico.profile_picture} alt="Perfil" className="perfil-photo-circle-large" onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=User'; }} />
              ) : (
                <User size={50} />
              )}
            </div>
            <h2>{tecnico.name || tecnico.nombre}</h2>
            <span className="badge-role-center">{tecnico.rol || 'Técnico'}</span>
          </div>

          <div className="dossier-info-list">
            <div className="info-row-stack">
              <Mail size={18} className="icon-orange" />
              <div><label>CORREO ELECTRÓNICO</label><p>{tecnico.email || tecnico.correo}</p></div>
            </div>
            <div className="info-row-stack">
              <Phone size={18} className="icon-orange" />
              <div><label>TELÉFONO</label><p>{tecnico.phone || tecnico.telefono || 'Sin registrar'}</p></div>
            </div>
            <div className="info-row-stack">
              <MapPin size={18} className="icon-orange" />
              <div><label>DIRECCIÓN PARTICULAR</label><p>{tecnico.address || tecnico.direccion || 'No especificada'}</p></div>
            </div>
            <div className="info-row-stack">
              <ShieldCheck size={18} className="icon-orange" />
              <div><label>ID DE EXPEDIENTE</label><p>#{String(tecnico.id).replace(/[^\d]/g, '')}</p></div>
            </div>
            <div className="info-row-stack" style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <div>
                <label style={{ color: '#F26522', fontWeight: 'bold' }}>🛠️ ESPECIALIDADES REGISTRADAS</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {tecnico.specialties && tecnico.specialties.length > 0 ? (
                    tecnico.specialties.map((s, idx) => (
                      <span key={idx} style={{ padding: '4px 10px', borderRadius: '14px', background: '#fff7ed', border: '1px solid #f97316', color: '#c2410c', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {typeof s === 'string' ? s : `${s.icon || '⚡'} ${s.name}`}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>No tiene especialidades seleccionadas</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button className="btn-editar-perfil-new" onClick={() => setIsModalOpen(true)}>MODIFICAR PERFIL Y ESPECIALIDADES</button>
        </aside>

        <main className="propiedades-section">
          <div className={`accordion-item ${seccionAbierta === 'trabajos' ? 'is-open' : ''}`}>
            <div className="section-header clickable" onClick={() => toggleSeccion('trabajos')}>
              <h3><Briefcase size={22} /> TRABAJOS ASIGNADOS Y REALIZADOS</h3><ChevronLeft className="arrow-icon" size={20} />
            </div>
            <div className="accordion-content">
              {cargando ? <p className="text-center p-5">Cargando trabajos... ⏳</p> : trabajos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const pendingTrabajos = trabajos.filter(t => !['finalizado', 'completado', 'completed', 'listo'].includes((t.status || '').toLowerCase()));
                    const completedTrabajos = trabajos.filter(t => ['finalizado', 'completado', 'completed', 'listo'].includes((t.status || '').toLowerCase()));
                    return (
                      <>
                        {pendingTrabajos.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#F26522', cursor: 'pointer', marginBottom: '10px' }}>⏳ POR HACER ({pendingTrabajos.length})</summary>
                            <div className="history-grid-layout">
                              {pendingTrabajos.map(t => renderCard(t, 'trabajo'))}
                            </div>
                          </details>
                        )}
                        {completedTrabajos.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#16a34a', cursor: 'pointer', marginBottom: '10px' }}>✅ FINALIZADOS ({completedTrabajos.length})</summary>
                            <div className="history-grid-layout">
                              {completedTrabajos.map(t => renderCard(t, 'trabajo'))}
                            </div>
                          </details>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1', margin: '15px' }}>
                  <div style={{ color: '#94a3b8', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}><Briefcase size={50} /></div>
                  <h4 style={{ color: '#334155', margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Sin trabajos asignados</h4>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Este técnico no tiene historial de trabajos ni está asignado a ninguno actualmente.
                  </p>
                  <button onClick={() => navigate('/tablero-servicios')} style={{ background: '#F26522', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(242, 101, 34, 0.2)' }}>
                    IR AL TABLERO A ASIGNAR TRABAJO
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`accordion-item ${seccionAbierta === 'levantamientos' ? 'is-open' : ''}`}>
            <div className="section-header clickable" onClick={() => toggleSeccion('levantamientos')}>
              <h3><Clipboard size={22} /> LEVANTAMIENTOS ASIGNADOS Y REALIZADOS</h3><ChevronLeft className="arrow-icon" size={20} />
            </div>
            <div className="accordion-content">
              {cargando ? null : levantamientos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const pendingL = levantamientos.filter(t => !['finalizado', 'completado', 'completed', 'listo'].includes((t.status || '').toLowerCase()));
                    const completedL = levantamientos.filter(t => ['finalizado', 'completado', 'completed', 'listo'].includes((t.status || '').toLowerCase()));
                    return (
                      <>
                        {pendingL.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#F26522', cursor: 'pointer', marginBottom: '10px' }}>⏳ POR HACER ({pendingL.length})</summary>
                            <div className="history-grid-layout">
                              {pendingL.map(l => renderCard(l, 'levantamiento'))}
                            </div>
                          </details>
                        )}
                        {completedL.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#16a34a', cursor: 'pointer', marginBottom: '10px' }}>✅ FINALIZADOS ({completedL.length})</summary>
                            <div className="history-grid-layout">
                              {completedL.map(l => renderCard(l, 'levantamiento'))}
                            </div>
                          </details>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1', margin: '15px' }}>
                  <div style={{ color: '#94a3b8', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}><Clipboard size={50} /></div>
                  <h4 style={{ color: '#334155', margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Sin levantamientos en su historial</h4>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                    No hay registros de visitas técnicas previas (levantamientos) a cargo de este usuario.
                  </p>
                  <button onClick={() => navigate('/tablero-servicios')} style={{ background: '#3498db', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(52, 152, 219, 0.2)' }}>
                    IR A GESTIÓN DE LEVANTAMIENTOS
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`accordion-item ${seccionAbierta === 'cotizaciones' ? 'is-open' : ''}`}>
            <div className="section-header clickable" onClick={() => toggleSeccion('cotizaciones')}>
              <h3><FileText size={22} /> COTIZACIONES REALIZADAS</h3><ChevronLeft className="arrow-icon" size={20} />
            </div>
            <div className="accordion-content">
              {cargando ? null : cotizaciones.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const pendingC = cotizaciones.filter(t => ['en proceso', 'pendiente', 'pendiente de admin'].includes((t.status || '').toLowerCase()));
                    const completedC = cotizaciones.filter(t => !['en proceso', 'pendiente', 'pendiente de admin'].includes((t.status || '').toLowerCase()));
                    return (
                      <>
                        {pendingC.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#F26522', cursor: 'pointer', marginBottom: '10px' }}>⏳ PENDIENTES DE REVISIÓN ({pendingC.length})</summary>
                            <div className="history-grid-layout">
                              {pendingC.map(c => renderCard(c, 'cotizacion'))}
                            </div>
                          </details>
                        )}
                        {completedC.length > 0 && (
                          <details open style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                            <summary style={{ fontWeight: 'bold', color: '#16a34a', cursor: 'pointer', marginBottom: '10px' }}>✅ FINALIZADAS / APROBADAS ({completedC.length})</summary>
                            <div className="history-grid-layout">
                              {completedC.map(c => renderCard(c, 'cotizacion'))}
                            </div>
                          </details>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1', margin: '15px' }}>
                  <div style={{ color: '#94a3b8', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}><FileText size={50} /></div>
                  <h4 style={{ color: '#334155', margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Cero cotizaciones</h4>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 20px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Este técnico todavía no ha enviado ninguna propuesta o presupuesto al administrador.
                  </p>
                  <button onClick={() => navigate('/cotizaciones-admin')} style={{ background: '#2ecc71', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(46, 204, 113, 0.2)' }}>
                    VER TODAS LAS COTIZACIONES
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {isModalOpen && (
          <div className="modal-overlay-new">
            <div className="modal-card-new">
              <div className="modal-header-new">
                <div className="header-icon-box"><User size={24} /></div>
                <div><h3>Editar Perfil</h3><p>Actualizando información de {tecnico.nombre || tecnico.name}</p></div>
                <button className="btn-close-new" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={guardarCambios} className="modal-body-new">
                <div className="input-grid-new">
                  <div className="input-box-new"><label><User size={14} /> Nombre Completo</label><input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required /></div>
                  <div className="input-box-new"><label><Mail size={14} /> Correo Electrónico</label><input type="email" name="correo" value={formData.correo} onChange={handleInputChange} required /></div>
                  <div className="input-box-new"><label><Phone size={14} /> Número de Teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} /></div>
                  <div className="input-box-new"><label><Lock size={14} /> Nueva Contraseña</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="En blanco para no cambiar" /></div>
                  <div className="input-box-new full-width"><label><MapPin size={14} /> Dirección Particular</label><input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} placeholder="Ej. Calle 23..." /></div>
                  <div className="input-box-new full-width">
                    <label><CheckCircle size={14} /> Estatus del Técnico</label>
                    <select name="estado" value={formData.estado} onChange={handleInputChange}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div className="input-box-new full-width">
                    <label style={{ color: '#F26522', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>🛠️ Especialidades Asignadas:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                      {ESPECIALIDADES_CATALOGO.map(spec => {
                        const isSelected = selectedSpecialties.includes(spec.name);
                        return (
                          <button
                            key={spec.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedSpecialties.length > 1) {
                                  setSelectedSpecialties(prev => prev.filter(s => s !== spec.name));
                                }
                              } else {
                                setSelectedSpecialties(prev => [...prev, spec.name]);
                              }
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                              border: isSelected ? '1px solid #FF6600' : '1px solid #cbd5e1',
                              background: isSelected ? 'linear-gradient(135deg, #FF6600 0%, #d94e00 100%)' : '#ffffff',
                              color: isSelected ? '#fff' : '#475569',
                              fontWeight: isSelected ? 'bold' : 'normal', fontSize: '0.78rem',
                              display: 'flex', alignItems: 'center', gap: '5px'
                            }}
                          >
                            <span>{spec.icon}</span> <span>{spec.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="modal-actions-new">
                  <button type="button" className="btn-secondary-new" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary-new"><Save size={18} /> Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default VistaDetalleTecnico;
