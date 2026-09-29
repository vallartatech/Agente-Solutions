import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import { useAuth } from "../../../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import "../../../styles/AgenteMarket/Tecnico/TrabajosTecnico.css";
import { 
  Search, Package, Wrench, CheckCircle2, Lock, Settings, 
  Calendar, Clock, MapPin, AlertTriangle, ChevronRight, X, ChevronLeft
} from 'lucide-react';
import Header from "../../../components/Shared/Header";
import UniversalSearch from '../../../components/Shared/UniversalSearch';

const TrabajosTecnico = () => {
  const [mostrarModalChecklist, setMostrarModalChecklist] = useState(false);
  const [filtroFechaAtrasados, setFiltroFechaAtrasados] = useState(null); 
  const [serviciosFiltrados, setServiciosFiltrados] = useState([]);
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy', 'futuros', 'finalizados'
  const dateInputRef = React.useRef(null);
  
  // Estado para controlar si el material fue recibido
  const [materialRecibido, setMaterialRecibido] = useState(false);
  
  // Estado para los items individuales del checklist
  const [itemsCheck, setItemsCheck] = useState({
    materiales: [false, false, false, false],
    equipo: [false, false, false, false],
    herramientas: [false, false, false, false]
  });

  const { user } = useAuth();
  const [servicios, setServicios] = useState([]);
  const [checklistDinamico, setChecklistDinamico] = useState(null);
  const navigate = useNavigate();

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const effectiveRole = Number(user?.role_id ?? storedUser?.role_id ?? 0);
  const isTecnicoRed = effectiveRole === 8 || user?.role_id === 8 || user?.role_id === '8' || storedUser?.role_id === 8;

  useEffect(() => {
    // Si es técnico de la red (role 8), NO requiere materiales y se desbloquea automáticamente
    if (isTecnicoRed) {
      setMaterialRecibido(true);
    } else if (user?.id || storedUser?.id) {
      const uId = user?.id || storedUser?.id;
      const hoyStr = getDayStr(new Date());
      const statusKey = `materialRecibido_${uId}_${hoyStr}`;
      const status = localStorage.getItem(statusKey);
      
      if (status === 'true') {
        setMaterialRecibido(true);
      } else {
        setMaterialRecibido(false);
      }
    }
    
    fetchServicios();
    fetchChecklistTemplate();
  }, [user, isTecnicoRed]);

  // GPS Tracking Loop: envía la ubicación GPS cada 30 segundos si el usuario es técnico o contratista
  useEffect(() => {
    if (!user || (user.role_id !== 2 && user.role_id !== 5 && user.role_id !== 0 && user.role_id !== 8)) return;

    const sendLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await axios.post(`${import.meta.env.VITE_API_BASE_URL}/technician/update-location`, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            } catch (err) {
              console.warn("No se pudo actualizar la ubicación GPS:", err);
            }
          },
          (error) => {
            console.warn("Error obteniendo ubicación GPS:", error.message);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    };

    sendLocation();
    const intervalId = setInterval(sendLocation, 30000);

    return () => clearInterval(intervalId);
  }, [user]);

  const handleConfirmArrival = async (e, item) => {
    e.stopPropagation();
    const confirmacion = window.confirm(`¿Confirmas que ya has llegado a la propiedad ${item.property_name || ''}?`);
    if (!confirmacion) return;

    let lat = null;
    let lng = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("No se obtuvo GPS para confirmación de llegada:", err);
      }
    }

    try {
      const compositeId = item.composite_id || item.id;
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${compositeId}/confirm-arrival`, {
        latitude: lat,
        longitude: lng
      });

      alert("📍 ¡Llegada confirmada correctamente!");
      fetchServicios();
    } catch (error) {
      console.error("Error al confirmar llegada:", error);
      alert("No se pudo registrar la llegada. Intenta de nuevo.");
    }
  };

  // Nuevo useEffect para agregar los checklists de los trabajos de hoy
  const [checklistAgregado, setChecklistAgregado] = useState(null);

  useEffect(() => {
    if (servicios.length > 0) {
      const hoyStr = getDayStr(new Date());
      
      // Filtrar trabajos de HOY y SOS
      const trabajosHoy = servicios.filter(s => {
        const fStr = getDayStr(s.scheduled_start || s.created_at);
        return fStr === hoyStr || s.priority === 'Urgente';
      });

      const aggregated = {
        materiales: [],
        equipo: [],
        herramientas: []
      };

      trabajosHoy.forEach(job => {
        if (job.custom_checklist) {
          const cl = typeof job.custom_checklist === 'string' 
            ? JSON.parse(job.custom_checklist) 
            : job.custom_checklist;
          
          const materialList = cl.materiales || cl.material || [];
          const equipoList = cl.equipo || [];
          const herramientasList = cl.herramientas || [];

          materialList.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.task || item.nombre || item.concepto;
            if (itemName && !aggregated.materiales.includes(itemName)) {
              aggregated.materiales.push(itemName);
            }
          });

          equipoList.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.task || item.nombre || item.concepto;
            if (itemName && !aggregated.equipo.includes(itemName)) {
              aggregated.equipo.push(itemName);
            }
          });

          herramientasList.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.task || item.nombre || item.concepto;
            if (itemName && !aggregated.herramientas.includes(itemName)) {
              aggregated.herramientas.push(itemName);
            }
          });
        }
      });

      const hasItems = aggregated.materiales.length > 0 || 
                       aggregated.equipo.length > 0 || 
                       aggregated.herramientas.length > 0;

      if (hasItems) {
        setChecklistAgregado(aggregated);
        const hoyStrCheck = getDayStr(new Date());
        const isConfirmed = localStorage.getItem(`materialRecibido_${user?.id}_${hoyStrCheck}`) === 'true';
        setItemsCheck({
          materiales: new Array(aggregated.materiales.length).fill(isConfirmed),
          equipo: new Array(aggregated.equipo.length).fill(isConfirmed),
          herramientas: new Array(aggregated.herramientas.length).fill(isConfirmed)
        });
      } else {
        setChecklistAgregado(null);
        // Si no hay trabajos para hoy, desbloqueamos automáticamente
        if (trabajosHoy.length === 0) {
          const hoyStr = getDayStr(new Date());
          localStorage.setItem(`materialRecibido_${user.id}_${hoyStr}`, "true");
          setMaterialRecibido(true);
        }
      }
    }
  }, [servicios, user, materialRecibido]);

  const fetchServicios = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tecnico/${user.id}/servicios`);
      const filtrados = res.data.filter(s => s.status !== 'Rechazado' && s.status !== 'Cancelado');
      setServicios(filtrados);
    } catch (error) {
      console.error("Error al obtener trabajos:", error);
    }
  };

  const fetchChecklistTemplate = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/checklist-templates`);
      if (res.data && res.data.length > 0) {
        // Intentamos buscar uno de "materiales", si no, agarramos el primero disponible ("Checklist asigando")
        const template = res.data.find(t => 
          t.name.toLowerCase().includes('material') || 
          t.name.toLowerCase().includes('recepción')
        ) || res.data[0];

        if (template) {
          const content = typeof template.content === 'string' ? JSON.parse(template.content) : template.content;
          setChecklistDinamico(content);
          
          const hoyStrCheck = getDayStr(new Date());
          const isConfirmed = localStorage.getItem(`materialRecibido_${user?.id}_${hoyStrCheck}`) === 'true';

          setItemsCheck({
            materiales: new Array(content.materiales?.length || content.material?.length || 0).fill(isConfirmed),
            equipo: new Array(content.equipo?.length || 0).fill(isConfirmed),
            herramientas: new Array(content.herramientas?.length || 0).fill(isConfirmed)
          });
        }
      }
    } catch (error) {
      console.error("Error al obtener templates:", error);
    }
  };

  const checklistGeneral = {
    materiales: ["Foco LED 12W", "Cable Calibre 12 (5m)", "Cinta de aislar", "Socket cerámico"],
    equipo: ["Multímetro", "Escalera de tijera", "Taladro inalámbrico", "Kit de desarmadores"],
    herramientas: []
  };

  // Usar el agregado si existe, si no el dinámico del template, si no el hardcoded
  const checklistARenderizar = checklistAgregado || checklistDinamico || checklistGeneral;

  const getDayStr = (d) => {
    if (!d) return '';
    // Si ya es YYYY-MM-DD
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.substring(0, 10);
    }
    // Fallback robusto
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  // Lógica de clasificación para el tablero (Simplificado a 3 columnas principales)
  const clasificarPorTablero = () => {
    const gruposTablero = {
      asignados: [], // SOS + Atrasados + Hoy
      futuros: [],   // Mañana + Futuros (con filtro)
      done: []       // Finalizados
    };

    const hoyStr = getDayStr(new Date());
    const dManana = new Date();
    dManana.setDate(dManana.getDate() + 1);
    const mananaStr = getDayStr(dManana);

    serviciosFiltrados.forEach(s => {
      const status = s.status?.toLowerCase();
      const isDone = ['completed', 'finalizado', 'listo'].includes(status);
      const fechaServicio = s.scheduled_start || s.created_at;
      const fStr = getDayStr(fechaServicio);

      if (isDone) {
        gruposTablero.done.push(s);
      } else if (fStr >= mananaStr) {
        // El filtro de fecha aplica específicamente a la columna de Futuros/Mañana
        if (filtroFechaAtrasados) {
          if (fStr === filtroFechaAtrasados) {
            gruposTablero.futuros.push(s);
          }
        } else {
          gruposTablero.futuros.push(s);
        }
      } else {
        gruposTablero.asignados.push(s);
      }
    });

    return gruposTablero;
  };

  const agruparAsignados = (items) => {
    const hoyStr = getDayStr(new Date());
    const grupos = {
      'HOY': [],
      'ATRASADOS / NO REALIZADOS': []
    };

    items.forEach(s => {
      const fStr = getDayStr(s.scheduled_start || s.created_at);
      if (fStr < hoyStr) grupos['ATRASADOS / NO REALIZADOS'].push(s);
      else grupos['HOY'].push(s);
    });

    return Object.entries(grupos).filter(([_, val]) => val.length > 0);
  };

  const agruparFuturos = (items) => {
    const hoyStr = getDayStr(new Date());
    const dManana = new Date();
    dManana.setDate(dManana.getDate() + 1);
    const mananaStr = getDayStr(dManana);

    const grupos = {
      'MAÑANA': [],
      'PRÓXIMOS': []
    };

    items.forEach(s => {
      const fStr = getDayStr(s.scheduled_start || s.created_at);
      // Aquí ya no filtramos de nuevo, porque clasificarPorTablero ya lo hizo
      if (fStr === mananaStr) grupos['MAÑANA'].push(s);
      else grupos['PRÓXIMOS'].push(s);
    });

    return Object.entries(grupos).filter(([_, val]) => val.length > 0);
  };

  const tableroData = clasificarPorTablero();
  const asignadosAgrupados = agruparAsignados(tableroData.asignados);
  const futurosAgrupados = agruparFuturos(tableroData.futuros);
  const finalizadosFiltrados = tableroData.done;

  const formatFriendlyDate = (dateInput) => {
    if (!dateInput) return "Sin fecha";
    const date = new Date(dateInput);
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    const fStr = getDayStr(date);
    const hStr = getDayStr(hoy);
    const mStr = getDayStr(manana);

    const options = { weekday: 'long', day: 'numeric' };
    const datePart = date.toLocaleDateString('es-ES', options);

    if (fStr === hStr) return `Hoy ${datePart}`;
    if (fStr === mStr) return `Mañana ${datePart}`;
    if (fStr < hStr) return `La fecha de visita fue: ${date.toLocaleDateString('es-ES')}`;
    
    return `Visita: ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  };

  const renderCard = (item, index) => (
    <motion.div
      key={item.id || index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="tt-card-wrapper"
    >
      <button 
        type="button"
        className={`tt-task-card ${item.priority === 'Urgente' ? 'is-sos' : ''}`}
        onClick={() => {
          if (isTecnicoRed || materialRecibido) {
            navigate(`/trabajo-propiedad/${item.composite_id || item.id}`);
          }
        }}
        disabled={!isTecnicoRed && !materialRecibido}
      >
        <div className="tt-col tt-col-folio">
          <span className="tt-folio-badge">#{item.id}</span>
          {item.priority === 'Urgente' && (
            <span className="tt-sos-tag"><AlertTriangle size={12}/> SOS</span>
          )}
        </div>
        
        <div className="tt-col tt-col-main">
          <h4 className="tt-property-title">{item.property_name || "Sin Nombre"}</h4>
        </div>

        <div className="tt-col tt-col-info">
          <div className="tt-info-row">
            <MapPin size={12} />
            <span>Zona: {item.zone || 'General'}</span>
          </div>
          <div className="tt-info-row">
            <Clock size={12} />
            <span>Hora de visita: {new Date(item.scheduled_start || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div style={{ marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
            {item.arrival_status === 'EN_SITIO' ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                border: '1px solid #10b981'
              }}>
                🟢 En el lugar {item.arrived_at ? `(${new Date(item.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => handleConfirmArrival(e, item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#fff3ed',
                  color: '#f26522',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  border: '1px solid #f26522',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📍 ¡Ya llegué al lugar!
              </button>
            )}
          </div>
        </div>

        <div className="tt-col tt-col-date">
           <span className="tt-date-text">
             {formatFriendlyDate(item.scheduled_start || item.created_at)}
           </span>
        </div>

        <div className="tt-col tt-col-arrow">
           <ChevronRight size={18} className="tt-arrow-icon" />
        </div>
      </button>
    </motion.div>
  );

  const toggleItem = (tipo, index) => {
    const nuevosItems = { ...itemsCheck };
    nuevosItems[tipo][index] = !nuevosItems[tipo][index];
    setItemsCheck(nuevosItems);
  };

  const todoMarcado = [
    ...itemsCheck.materiales, 
    ...itemsCheck.equipo, 
    ...itemsCheck.herramientas
  ].every(item => item === true);

  const confirmarRecepcion = () => {
    setMaterialRecibido(true);
    if (user?.id) {
      const hoyStr = getDayStr(new Date());
      localStorage.setItem(`materialRecibido_${user.id}_${hoyStr}`, 'true');
    }
    setMostrarModalChecklist(false);
  };

  return (
    <>
    <Header />
    <div className="tt-body">
      
      {/* BOTÓN REGRESAR */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          <ChevronLeft size={18} />
          <span>REGRESAR</span>
        </button>
      </div>

      <div className="tt-search-row">
        <div className="tt-search-wrapper-super">
          <UniversalSearch 
            data={servicios}
            setFilteredData={setServiciosFiltrados}
            placeholder="BUSCAR POR FOLIO, PROPIEDAD O CLIENTE..."
            type="TECNICO_TABLERO"
          />
        </div>
        
        {!isTecnicoRed && (
          <button 
              className={`btn-open-checklist ${materialRecibido ? 'recibido' : 'pendiente'}`}
              onClick={() => {
                if (materialRecibido) {
                  const updated = { ...itemsCheck };
                  Object.keys(updated).forEach(k => {
                    if (Array.isArray(updated[k])) {
                      updated[k] = updated[k].map(() => true);
                    }
                  });
                  setItemsCheck(updated);
                }
                setMostrarModalChecklist(true);
              }}
            >
            {materialRecibido ? <CheckCircle2 size={20} /> : <Package size={20} />}
            <span>{materialRecibido ? "MATERIAL LISTO" : "LISTA DE RUTA"}</span>
          </button>
        )}
      </div>

      <div className="tt-mobile-tabs">
        <button 
          className={`tt-m-tab-btn ${activeTab === 'hoy' ? 'active' : ''}`} 
          onClick={() => setActiveTab('hoy')}
        >
          <div className="tab-icon-wrapper"><Clock size={20} /></div>
          <span>HOY</span>
          {tableroData.asignados.length > 0 && <span className="tab-badge">{tableroData.asignados.length}</span>}
        </button>
        <button 
          className={`tt-m-tab-btn ${activeTab === 'futuros' ? 'active' : ''}`} 
          onClick={() => setActiveTab('futuros')}
        >
          <div className="tab-icon-wrapper"><Calendar size={20} /></div>
          <span>MAÑANA</span>
          {tableroData.futuros.length > 0 && <span className="tab-badge">{tableroData.futuros.length}</span>}
        </button>
        <button 
          className={`tt-m-tab-btn ${activeTab === 'finalizados' ? 'active' : ''}`} 
          onClick={() => setActiveTab('finalizados')}
        >
          <div className="tab-icon-wrapper"><CheckCircle2 size={20} /></div>
          <span>LISTO</span>
          {tableroData.done.length > 0 && <span className="tab-badge">{tableroData.done.length}</span>}
        </button>
      </div>

      <div className={`tt-board-container-kanban ${(!materialRecibido && !isTecnicoRed) ? 'table-locked' : ''} active-${activeTab}`}>
        
        {/* COLUMNA 1: ASIGNADOS (INCLUYE SOS, AYER Y HOY) */}
        <div className={`tt-kanban-col col-todo ${activeTab === 'hoy' ? 'm-active' : 'm-hidden'}`}>
          <div className="tt-col-header">
            <span>TRABAJOS ASIGNADOS</span>
            <span className="count-pill">{tableroData.asignados.length}</span>
          </div>
          <div className="tt-col-content">
            {asignadosAgrupados.map(([nombreGrupo, items]) => (
              <div key={nombreGrupo} className="tt-date-subgroup">
                <div className="tt-subgroup-label">
                  {nombreGrupo === 'ATRASADOS / AYER' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                  {nombreGrupo}
                </div>
                {items.map((item, idx) => renderCard(item, idx))}
              </div>
            ))}
            {tableroData.asignados.length === 0 && <div className="empty-mini">Sin trabajos pendientes</div>}
          </div>
        </div>

        {/* COLUMNA 2: MAÑANA / PRÓXIMOS (CON FILTRO) */}
        <div className={`tt-kanban-col col-futuros ${activeTab === 'futuros' ? 'm-active' : 'm-hidden'}`}>
          <div className="tt-col-header header-with-filter">
            <div className="header-label-group">
              <span>MAÑANA / HISTÓRICO</span>
              <span className="count-pill">{tableroData.futuros.length}</span>
            </div>
            
            <div className="tt-filter-date-wrapper-mini">
              <button 
                className="tt-date-button-trigger-mini"
                onClick={() => dateInputRef.current && dateInputRef.current.showPicker()}
              >
                <Calendar size={12}/>
                {filtroFechaAtrasados || 'Cambiar fecha'}
              </button>
              <input 
                type="date" 
                ref={dateInputRef}
                className="tt-date-picker-hidden" 
                onChange={(e) => setFiltroFechaAtrasados(e.target.value)} 
              />
              {filtroFechaAtrasados && (
                <button className="btn-clear-filter-mini" onClick={() => setFiltroFechaAtrasados(null)}>
                  <X size={12}/>
                </button>
              )}
            </div>
          </div>
          <div className="tt-col-content">
            {futurosAgrupados.map(([nombreGrupo, items]) => (
              <div key={nombreGrupo} className="tt-date-subgroup">
                <div className="tt-subgroup-label">
                  <Calendar size={12} />
                  {nombreGrupo}
                </div>
                {items.map((item, idx) => renderCard(item, idx))}
              </div>
            ))}
            {tableroData.futuros.length === 0 && <div className="empty-mini">Sin trabajos programados</div>}
          </div>
        </div>

        {/* COLUMNA 3: FINALIZADOS */}
        <div className={`tt-kanban-col col-done ${activeTab === 'finalizados' ? 'm-active' : 'm-hidden'}`}>
          <div className="tt-col-header">
            <span>FINALIZADOS</span>
            <span className="count-pill">{finalizadosFiltrados.length}</span>
          </div>
          <div className="tt-col-content">
            {finalizadosFiltrados.map((item, idx) => renderCard(item, idx))}
            {finalizadosFiltrados.length === 0 && <div className="empty-mini">Sin registros</div>}
          </div>
        </div>

      </div>
        {(!materialRecibido && !isTecnicoRed) && (
          <div className="lock-overlay-msg">Debe confirmar recepción de material para desbloquear</div>
        )}

      {!isTecnicoRed && (
        <AnimatePresence>
          {mostrarModalChecklist && (
            <div className="tt-modal-overlay">
              <motion.div 
                className="tt-modal-content"
                initial={{ scale: 0.9, opacity: 0 }} // Usamos motion aquí
                animate={{ scale: 1, opacity: 1 }}   // Usamos motion aquí
                exit={{ scale: 0.9, opacity: 0 }}    // Usamos motion aquí
              >
                <div className="tt-modal-header">
                  <h3>📦 CONFIRMACIÓN DE MATERIAL</h3>
                  {!materialRecibido && <span className="pills-alert">Obligatorio</span>}
                </div>
              
              <div className="tt-modal-body">
                <p className="modal-instruction">Marque los elementos que ya tiene en su unidad:</p>
                
                <div className="checklist-section">
                  <h4><Package size={14} /> Materiales</h4>
                  <div className="items-check-grid">
                    {(checklistARenderizar.materiales || checklistARenderizar.material || []).map((m, i) => (
                      <label key={i} className={`check-item ${itemsCheck.materiales[i] ? 'checked' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={itemsCheck.materiales[i]} 
                          onChange={() => toggleItem('materiales', i)}
                        />
                        <span>{typeof m === 'string' ? m : m.nombre || m.task || m.concepto}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="checklist-section">
                  <h4><Wrench size={14} /> Equipo</h4>
                  <div className="items-check-grid">
                    {(checklistARenderizar.equipo || []).map((e, i) => (
                      <label key={i} className={`check-item ${itemsCheck.equipo[i] ? 'checked' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={itemsCheck.equipo[i]} 
                          onChange={() => toggleItem('equipo', i)}
                        />
                        <span>{typeof e === 'string' ? e : e.nombre || e.task || e.concepto}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {checklistARenderizar.herramientas && checklistARenderizar.herramientas.length > 0 && (
                  <div className="checklist-section">
                    <h4><Settings size={14} /> Herramientas</h4>
                    <div className="items-check-grid">
                      {checklistARenderizar.herramientas.map((h, i) => (
                        <label key={i} className={`check-item ${itemsCheck.herramientas[i] ? 'checked' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={itemsCheck.herramientas[i]} 
                            onChange={() => toggleItem('herramientas', i)}
                          />
                          <span>{typeof h === 'string' ? h : h.nombre || h.task || h.concepto}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="tt-modal-footer">
                <button 
                  className={`btn-confirmar ${todoMarcado ? 'ready' : 'disabled'}`}
                  disabled={!todoMarcado}
                  onClick={confirmarRecepcion}
                >
                  {todoMarcado ? "CONFIRMAR Y DESBLOQUEAR" : "FALTA MARCAR MATERIAL"}
                </button>
                <button className="btn-cancelar-modal" onClick={() => setMostrarModalChecklist(false)}>
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      )}
    </div>
    </>
  );
};

export default TrabajosTecnico;
