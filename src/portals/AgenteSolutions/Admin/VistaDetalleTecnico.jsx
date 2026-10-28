import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, User, Mail, MapPin, ArrowRight, ShieldCheck, X, Save, Phone, Lock, CheckCircle,
  Briefcase, Clipboard, FileText, Clock, Calendar, Hourglass, Wrench, Edit3
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import '../../../styles/AgenteSolutions/Admin/ExpedienteTecnico.css';
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
    const estado = (item.status || '').toLowerCase();
    const isCompleted = ['finalizado', 'completado', 'completed', 'listo', 'aprobado'].includes(estado);
    const isRejected = estado.includes('rechazado');
    const tono = isCompleted ? 'is-done' : isRejected ? 'is-rejected' : 'is-pending';

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
      <details key={item.composite_id || item.id} className={`dt-job ${tono}`}>
        <summary className="dt-job-summary">
          <span className="dt-job-status">
            {isCompleted ? <CheckCircle size={13} /> : <Clock size={13} />}
            {item.status ? item.status.toUpperCase() : 'ASIGNADO'}
          </span>
          <h4 className="dt-job-title">
            {item.title || item.type || item.description || (type === 'cotizacion' ? `Cotización #${item.folio}` : `Trabajo #${item.id}`)}
          </h4>

          {(item.property_name || item.address || item.cliente) && (
            <div className="dt-job-place">
              <MapPin size={14} />
              <span><strong>{item.property_name || item.cliente || 'Sin nombre'}</strong><br />{item.address || 'Sin dirección'}</span>
            </div>
          )}

          <div className="dt-job-date">
            <Calendar size={12} /> Fecha: {item.fecha || item.created_at?.split('T')[0] || '---'}
          </div>
        </summary>

        <div className="dt-job-body">
          <button type="button" className="dt-btn-primary" onClick={handleCardClick}>
            VER DETALLES EN TABLERO <ArrowRight size={15} />
          </button>

          {item.evidencias && item.evidencias.length > 0 && (
            <div className="dt-job-evidencias">
              <p>Evidencias fotográficas</p>
              {item.evidencias.map((img, idx) => (
                <img key={idx} src={img} alt="evidencia" />
              ))}
            </div>
          )}
        </div>
      </details>
    );
  };

  // Grupo plegable (por hacer / finalizados) dentro de una sección
  const renderGrupo = (titulo, items, type, tono) => items.length > 0 && (
    <details open className={`dt-group ${tono}`}>
      <summary className="dt-group-summary">
        <ChevronDown size={16} className="dt-group-chevron" />
        {tono === 'is-done' ? <CheckCircle size={16} /> : <Hourglass size={16} />}
        <span>{titulo}</span>
        <span className="dt-group-count">{items.length}</span>
      </summary>
      <div className="dt-job-grid">
        {items.map(i => renderCard(i, type))}
      </div>
    </details>
  );

  const renderVacio = (Icono, titulo, texto, boton, ruta) => (
    <div className="dt-empty">
      <div className="dt-empty-icon"><Icono size={30} /></div>
      <h4>{titulo}</h4>
      <p>{texto}</p>
      <button type="button" className="dt-btn-primary" onClick={() => navigate(ruta)}>{boton}</button>
    </div>
  );

  const renderSeccion = (clave, Icono, titulo, total, contenido) => (
    <section className={`dt-card dt-section ${seccionAbierta === clave ? 'is-open' : ''}`}>
      <button type="button" className="dt-section-header" onClick={() => toggleSeccion(clave)}>
        <span className="dt-section-icon"><Icono size={18} /></span>
        <span className="dt-section-title">{titulo}</span>
        {!cargando && <span className="dt-count-pill">{total}</span>}
        <ChevronDown size={20} className="dt-section-chevron" />
      </button>
      {seccionAbierta === clave && <div className="dt-section-body">{contenido}</div>}
    </section>
  );

  const TERMINADOS = ['finalizado', 'completado', 'completed', 'listo'];
  const COTIZ_PENDIENTES = ['en proceso', 'pendiente', 'pendiente de admin'];
  const esTerminado = (t) => TERMINADOS.includes((t.status || '').toLowerCase());
  const esCotizPendiente = (c) => COTIZ_PENDIENTES.includes((c.status || '').toLowerCase());

  const fotoPerfil = tecnico.profile_picture_url || tecnico.profile_picture;
  const nombreTecnico = tecnico.name || tecnico.nombre || 'Técnico';
  const iniciales = nombreTecnico.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="dt-root">
      <Header activeModule="usuarios" />

      <main className="dt-main">
        <div className="dt-action-bar">
          <button type="button" className="dt-back-btn" onClick={() => navigate(-1)} title="Regresar">
            <ChevronLeft size={20} />
          </button>
          <div className="dt-page-title-badge">
            <User size={18} className="dt-title-icon" />
            <span>EXPEDIENTE DEL TÉCNICO</span>
          </div>
        </div>

        <div className="dt-layout">
          <aside className="dt-card dt-profile">
            <div className="dt-profile-main">
              <div className="dt-avatar">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Perfil" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span>{iniciales || <User size={36} />}</span>
                )}
              </div>
              <h2 className="dt-name">{nombreTecnico}</h2>
              <span className="dt-role-pill">{tecnico.rol || 'Técnico'}</span>
            </div>

            <div className="dt-details">
              <div className="dt-detail-item">
                <Mail size={18} className="dt-detail-icon" />
                <div><label>CORREO ELECTRÓNICO</label><p>{tecnico.email || tecnico.correo || 'Sin registrar'}</p></div>
              </div>
              <div className="dt-detail-item">
                <Phone size={18} className="dt-detail-icon" />
                <div><label>TELÉFONO</label><p>{tecnico.phone || tecnico.telefono || 'Sin registrar'}</p></div>
              </div>
              <div className="dt-detail-item">
                <MapPin size={18} className="dt-detail-icon" />
                <div><label>DIRECCIÓN PARTICULAR</label><p>{tecnico.address || tecnico.direccion || 'No especificada'}</p></div>
              </div>
              <div className="dt-detail-item">
                <ShieldCheck size={18} className="dt-detail-icon" />
                <div><label>ID DE EXPEDIENTE</label><p>#{String(tecnico.id).replace(/[^\d]/g, '')}</p></div>
              </div>
            </div>

            <div className="dt-specialties">
              <label className="dt-specialties-label"><Wrench size={14} /> ESPECIALIDADES REGISTRADAS</label>
              <div className="dt-chip-list">
                {tecnico.specialties && tecnico.specialties.length > 0 ? (
                  tecnico.specialties.map((s, idx) => (
                    <span key={idx} className="dt-chip">
                      {typeof s === 'string' ? s : `${s.icon || ''} ${s.name}`.trim()}
                    </span>
                  ))
                ) : (
                  <span className="dt-chip-empty">No tiene especialidades seleccionadas</span>
                )}
              </div>
            </div>

            <button type="button" className="dt-btn-glass" onClick={() => setIsModalOpen(true)}>
              <Edit3 size={16} /> MODIFICAR PERFIL Y ESPECIALIDADES
            </button>
          </aside>

          <div className="dt-sections">
            {renderSeccion('trabajos', Briefcase, 'TRABAJOS ASIGNADOS Y REALIZADOS', trabajos.length,
              cargando ? <p className="dt-loading">Cargando trabajos...</p> : trabajos.length > 0 ? (
                <>
                  {renderGrupo('POR HACER', trabajos.filter(t => !esTerminado(t)), 'trabajo', 'is-pending')}
                  {renderGrupo('FINALIZADOS', trabajos.filter(esTerminado), 'trabajo', 'is-done')}
                </>
              ) : renderVacio(Briefcase, 'Sin trabajos asignados',
                'Este técnico no tiene historial de trabajos ni está asignado a ninguno actualmente.',
                'IR AL TABLERO A ASIGNAR TRABAJO', '/tablero-servicios')
            )}

            {renderSeccion('levantamientos', Clipboard, 'LEVANTAMIENTOS ASIGNADOS Y REALIZADOS', levantamientos.length,
              cargando ? <p className="dt-loading">Cargando levantamientos...</p> : levantamientos.length > 0 ? (
                <>
                  {renderGrupo('POR HACER', levantamientos.filter(t => !esTerminado(t)), 'levantamiento', 'is-pending')}
                  {renderGrupo('FINALIZADOS', levantamientos.filter(esTerminado), 'levantamiento', 'is-done')}
                </>
              ) : renderVacio(Clipboard, 'Sin levantamientos en su historial',
                'No hay registros de visitas técnicas previas (levantamientos) a cargo de este usuario.',
                'IR A GESTIÓN DE LEVANTAMIENTOS', '/tablero-servicios')
            )}

            {renderSeccion('cotizaciones', FileText, 'COTIZACIONES REALIZADAS', cotizaciones.length,
              cargando ? <p className="dt-loading">Cargando cotizaciones...</p> : cotizaciones.length > 0 ? (
                <>
                  {renderGrupo('PENDIENTES DE REVISIÓN', cotizaciones.filter(esCotizPendiente), 'cotizacion', 'is-pending')}
                  {renderGrupo('FINALIZADAS / APROBADAS', cotizaciones.filter(c => !esCotizPendiente(c)), 'cotizacion', 'is-done')}
                </>
              ) : renderVacio(FileText, 'Cero cotizaciones',
                'Este técnico todavía no ha enviado ninguna propuesta o presupuesto al administrador.',
                'VER TODAS LAS COTIZACIONES', '/cotizaciones-admin')
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="dt-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="dt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dt-modal-header">
              <div className="dt-modal-header-icon"><User size={20} /></div>
              <div>
                <h3>Editar perfil</h3>
                <p>Actualizando información de {tecnico.nombre || tecnico.name}</p>
              </div>
              <button type="button" className="dt-modal-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form onSubmit={guardarCambios} className="dt-modal-body">
              <div className="dt-input-grid">
                <div className="dt-input-box"><label><User size={14} /> Nombre completo</label><input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required /></div>
                <div className="dt-input-box"><label><Mail size={14} /> Correo electrónico</label><input type="email" name="correo" value={formData.correo} onChange={handleInputChange} required /></div>
                <div className="dt-input-box"><label><Phone size={14} /> Número de teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} /></div>
                <div className="dt-input-box"><label><Lock size={14} /> Nueva contraseña</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="En blanco para no cambiar" /></div>
                <div className="dt-input-box dt-full"><label><MapPin size={14} /> Dirección particular</label><input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} placeholder="Ej. Calle 23..." /></div>
                <div className="dt-input-box dt-full">
                  <label><CheckCircle size={14} /> Estatus del técnico</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="dt-input-box dt-full">
                  <label><Wrench size={14} /> Especialidades asignadas</label>
                  <div className="dt-spec-picker">
                    {ESPECIALIDADES_CATALOGO.map(spec => {
                      const isSelected = selectedSpecialties.includes(spec.name);
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          className={`dt-spec-option ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              if (selectedSpecialties.length > 1) {
                                setSelectedSpecialties(prev => prev.filter(s => s !== spec.name));
                              }
                            } else {
                              setSelectedSpecialties(prev => [...prev, spec.name]);
                            }
                          }}
                        >
                          <span>{spec.icon}</span> <span>{spec.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="dt-modal-actions">
                <button type="button" className="dt-btn-glass" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="dt-btn-primary"><Save size={17} /> Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default VistaDetalleTecnico;
