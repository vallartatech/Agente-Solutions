import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  X, FileText, Home, Wrench, MessageSquare, Camera, Trash2, PlusCircle, Globe, Users, Shield, AlertCircle, CheckCircle2, UserCheck, Clock, Calendar, Check, HelpCircle, Sparkles
} from 'lucide-react';
import { IconoEspecialidad } from '../Shared/iconoEspecialidad';
import '../../../styles/AgenteMarket/Admin/ModalServicioAutonomo.css';
import '../../../styles/AgenteMarket/Shared/SelectorFechaRed.css';
import { mostrarAviso } from '../../../utils/dialogos';
import CampoFechaHora from '../../../components/Shared/CampoFechaHora';
import { useAuth } from '../../../context/AuthContext';
import { esTecnicoRed, esRed } from '../../../utils/entorno';

// ── Fecha estimada ("Programar") ──
// Es la fecha en que el cliente necesita el trabajo, no una cita confirmada: el técnico propone la cita después.
// Fecha local YYYY-MM-DD (toISOString usa UTC y en la noche de México ya marca el día siguiente)
const fechaLocal = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fechaLocal(d); };
// Sábado de esta semana (si hoy ya es sábado o domingo, el de la próxima)
const finDeSemana = () => { const d = new Date(); const dia = d.getDay(); d.setDate(d.getDate() + (dia === 6 ? 7 : 6 - dia)); return fechaLocal(d); };
// Lunes de la próxima semana
const proximaSemana = () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); return fechaLocal(d); };

const ATAJOS_FECHA = [
  { key: 'manana', label: 'Mañana', fecha: () => enDias(1) },
  { key: 'pasado', label: 'Pasado mañana', fecha: () => enDias(2) },
  { key: 'finde', label: 'Este fin de semana', fecha: finDeSemana },
  { key: 'semana', label: 'Próxima semana', fecha: proximaSemana },
];

// Hora preferida: 'HH:MM' elegida con el reloj, o 'Cualquier hora'
const CUALQUIER_HORA = 'Cualquier hora';
const HORA_POR_DEFECTO = '09:00';
const esHoraExacta = (h) => /^\d{2}:\d{2}$/.test(String(h || ''));
// '14:30' → '2:30 PM' (así lo guarda la nota y lo leen los técnicos)
const hora12 = (hhmm) => {
  if (!esHoraExacta(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const textoHorario = (h) => (esHoraExacta(h) ? hora12(h) : CUALQUIER_HORA);

// "Sábado 8 de noviembre"
const fechaLarga = (yyyyMmDd) => {
  if (!yyyyMmDd) return '';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const txt = new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

// ── Habilidad que necesita el trabajo ──
// Con ella, el trabajo solo les aparece a los técnicos que tienen esa habilidad.
// 'ninguna' = "No estoy seguro": se manda sin habilidad y le aparece a todos.
const SIN_HABILIDAD = 'ninguna';

const SERVICIO_VACIO = {
  tipo: '', zona: '', area_id: '', equipo: '', descripcion: '',
  urgencia: 'urgente', fechaProgramada: '', horarioPreferido: '', fotos: [],
  especialidadId: '',        // '' sin elegir | SIN_HABILIDAD | id del catálogo
  especialidadAuto: false,   // true si se eligió sola por el equipo
};

// Categoría del equipo de la propiedad → habilidad del catálogo (se busca por nombre)
const HABILIDAD_POR_CATEGORIA = [
  [/climatiz/i, /aire acondicionado|hvac/i],
  [/refriger/i, /refriger/i],
  [/hidr[aá]ul|plomer/i, /plomer/i],
  [/el[eé]ctric/i, /electricidad/i],
  [/l[ií]nea blanca|electrodom/i, /electrodom/i],
  [/tecnolog|cctv|redes/i, /redes|cctv/i],
  [/seguridad y acceso|cerrajer/i, /cerrajer/i],
  [/alba[nñ]il|obra/i, /alba[nñ]il/i],
  [/carpinter/i, /carpinter/i],
  [/pintura|acabado/i, /pintura/i],
  [/limpieza/i, /limpieza/i],
  [/exterior|jard[ií]n/i, /jard[ií]n|exterior/i],
];

// Las que se muestran primero; "+N más" despliega el resto
const HABILIDADES_PRINCIPALES = [/electricidad/i, /plomer/i, /aire acondicionado|hvac/i, /electrodom/i, /alba[nñ]il/i, /pintura/i];

const habilidadPorCategoria = (categoria, catalogo) => {
  const regla = HABILIDAD_POR_CATEGORIA.find(([cat]) => cat.test(categoria || ''));
  return regla ? catalogo.find(e => regla[1].test(e.name)) || null : null;
};

const ModalServicioAutonomo = ({ propertyId, onClose, onSuccess }) => {
  // Cliente particular de la red (rol 4): "A mis técnicos" son sus favoritos (máx. 3) y la solicitud
  // va dirigida: queda en la red pero solo la ve ese técnico, que la cotiza y sigue el flujo normal.
  const { user } = useAuth();
  const esClienteRed = Number(user?.role_id) === 4;

  const [propiedades, setPropiedades] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
  const [loadingPropiedades, setLoadingPropiedades] = useState(false);

  // Técnicos vinculados
  const [tecnicos, setTecnicos] = useState([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [destinoEnvio, setDestinoEnvio] = useState('red'); // 'red' | 'mis_tecnicos'

  const [nuevoServicio, setNuevoServicio] = useState({ ...SERVICIO_VACIO });
  const [carritoServicios, setCarritoServicios] = useState([]);
  const [catalogoHabilidades, setCatalogoHabilidades] = useState([]);
  const [verTodasHabilidades, setVerTodasHabilidades] = useState(false);
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState({});
  const [loadingZonas, setLoadingZonas] = useState(false);
  // Propiedad cuyas zonas ya se cargaron bien (para no esconder campos mientras carga o si falló)
  const [zonasCargadasDe, setZonasCargadasDe] = useState(null);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Cargar propiedades si no viene propertyId o si es necesario
  useEffect(() => {
    cargarPropiedades();
    cargarTecnicosVinculados();
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/specialties`)
      .then(res => setCatalogoHabilidades(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCatalogoHabilidades([]));
  }, []);

  // Equipo afectado: también sugiere la habilidad según su categoría (si el cliente no eligió otra a mano)
  const elegirEquipo = (valor) => {
    let categoria = '';
    for (const [seccion, items] of Object.entries(equiposDisponibles)) {
      if (items.some(item => `${item.sub_category} ${item.brand ? `(${item.brand})` : ''}` === valor)) {
        categoria = seccion;
        break;
      }
    }
    const sugerida = habilidadPorCategoria(categoria, catalogoHabilidades);
    const puedeCambiar = nuevoServicio.especialidadId === '' || nuevoServicio.especialidadAuto;
    setNuevoServicio({
      ...nuevoServicio,
      equipo: valor,
      ...(sugerida && puedeCambiar ? { especialidadId: sugerida.id, especialidadAuto: true } : {}),
    });
  };

  const elegirHabilidad = (id) => setNuevoServicio({ ...nuevoServicio, especialidadId: id, especialidadAuto: false });

  const nombreHabilidad = (id) => {
    if (id === SIN_HABILIDAD) return 'Cualquier técnico';
    return catalogoHabilidades.find(e => e.id === id)?.name || '';
  };

  useEffect(() => {
    if (propertyId) {
      setSelectedPropertyId(propertyId);
    }
  }, [propertyId]);

  // Cargar zonas cuando se selecciona o cambia la propiedad
  useEffect(() => {
    if (selectedPropertyId) {
      cargarZonas(selectedPropertyId);
    } else {
      setZonasDisponibles([]);
      setEquiposDisponibles({});
    }
  }, [selectedPropertyId]);

  const cargarPropiedades = async () => {
    setLoadingPropiedades(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPropiedades(raw);
      if (!selectedPropertyId && raw.length > 0) {
        setSelectedPropertyId(raw[0].id);
      }
    } catch (error) {
      console.error("Error al cargar propiedades:", error);
    } finally {
      setLoadingPropiedades(false);
    }
  };

  const cargarTecnicosVinculados = async () => {
    setLoadingTecnicos(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (esClienteRed) {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mis-tecnicos`, { headers });
        const favoritos = (res.data?.tecnicos || [])
          .filter(t => t.estado === 'favorito')
          .map(t => ({ id: t.id, name: t.nombre, profile_picture: t.foto, rolTexto: t.rol, especialidades: t.especialidades || [] }));
        setTecnicos(favoritos);
        if (favoritos.length > 0) setSelectedTechId(favoritos[0].id);
        return;
      }

      // La red solo asigna técnicos de la red: los Técnicos Agente (rol 2) son de uso interno
      const soloTecnicosRed = (lista) => lista.filter(u => esTecnicoRed(u));

      // Intentar primero endpoint de técnicos vinculados
      let techs = [];
      try {
        const resTecnicos = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, { headers });
        if (Array.isArray(resTecnicos.data)) {
          techs = soloTecnicosRed(resTecnicos.data);
        }
      } catch {
        // Fallback a /usuarios
      }

      if (techs.length === 0) {
        const resUsuarios = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios`, { headers });
        const all = Array.isArray(resUsuarios.data) ? resUsuarios.data : [];
        techs = soloTecnicosRed(all);
      }

      setTecnicos(techs);
      if (techs.length > 0) {
        setSelectedTechId(techs[0].id);
      }
    } catch (err) {
      console.error("Error al cargar técnicos vinculados:", err);
    } finally {
      setLoadingTecnicos(false);
    }
  };

  const cargarZonas = async (pId) => {
    setLoadingZonas(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${pId}/areas`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setZonasDisponibles(res.data || []);
      setZonasCargadasDe(pId);
    } catch (error) {
      console.error("Error al cargar zonas:", error);
    } finally {
      setLoadingZonas(false);
    }
  };

  const handleZonaChange = async (areaId) => {
    if (areaId === 'otro') {
      setNuevoServicio({ 
        ...nuevoServicio, 
        area_id: 'otro', 
        zona: 'Otro', 
        equipo: '' 
      });
      setEquiposDisponibles({});
      return;
    }

    let selectedArea = zonasDisponibles.find(z => z.id === parseInt(areaId));
    if (!selectedArea) {
      for (const zona of zonasDisponibles) {
        const sub = (zona.sub_areas || zona.subAreas || []).find(s => s.id === parseInt(areaId));
        if (sub) {
          selectedArea = { ...sub, name: `${zona.name} - ${sub.name}` };
          break;
        }
      }
    }

    setNuevoServicio({ 
      ...nuevoServicio, 
      area_id: areaId, 
      zona: selectedArea ? selectedArea.name : '', 
      equipo: '' 
    });
    
    if (areaId) {
      setLoadingEquipos(true);
      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/areas/${areaId}/components`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        const componentes = res.data || [];
        const agrupados = componentes.reduce((acc, curr) => {
          const cat = curr.category || 'General';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(curr);
          return acc;
        }, {});
        
        setEquiposDisponibles(agrupados);
      } catch (error) {
        console.error("Error cargando equipos:", error);
        setEquiposDisponibles({});
      } finally {
        setLoadingEquipos(false);
      }
    } else {
      setEquiposDisponibles({});
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const nuevasFotos = [...nuevoServicio.fotos, ...files].slice(0, 2);
    setNuevoServicio({ ...nuevoServicio, fotos: nuevasFotos });
    setIsPhotoMenuOpen(false);
  };

  const removeFoto = (index) => {
    const nuevasFotos = nuevoServicio.fotos.filter((_, i) => i !== index);
    setNuevoServicio({ ...nuevoServicio, fotos: nuevasFotos });
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera' && cameraRef.current) {
      cameraRef.current.click();
    } else if (galleryRef.current) {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  // Red: si la propiedad no tiene levantamiento (no hay zonas registradas),
  // no se muestran "Zona de la propiedad" ni "Equipo afectado"
  const sinLevantamiento = esRed(user)
    && !!selectedPropertyId
    && !loadingZonas
    && String(zonasCargadasDe) === String(selectedPropertyId)
    && zonasDisponibles.length === 0;

  // Problema escrito y listo para enviar (sin levantamiento la zona no se pide)
  const formularioCompleto = !!(nuevoServicio.tipo && (sinLevantamiento || nuevoServicio.area_id) && nuevoServicio.descripcion);

  const handleAnadirAlCarrito = (e) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      mostrarAviso("Por favor selecciona una propiedad primero.");
      return;
    }
    if (!nuevoServicio.tipo || (!sinLevantamiento && !nuevoServicio.area_id) || !nuevoServicio.descripcion) {
      mostrarAviso(sinLevantamiento
        ? "Por favor completa los campos obligatorios (Tipo y Descripción)."
        : "Por favor completa los campos obligatorios (Tipo, Zona y Descripción).");
      return;
    }
    if (nuevoServicio.especialidadId === '') {
      mostrarAviso("Elige qué técnico necesitas. Si no sabes, toca «No estoy seguro».");
      return;
    }
    // Sin levantamiento no hay zonas: el trabajo va a la propiedad en general
    const servicio = sinLevantamiento
      ? { ...nuevoServicio, area_id: '', zona: 'Área General', equipo: '' }
      : { ...nuevoServicio };
    setCarritoServicios([...carritoServicios, servicio]);
    setNuevoServicio({ ...SERVICIO_VACIO });
  };

  const handleSubmitBatch = async (forcedMode = null) => {
    const mode = forcedMode || destinoEnvio;

    if (!selectedPropertyId) {
      mostrarAviso("Por favor selecciona una propiedad primero.");
      return;
    }

    let lote = [...carritoServicios];
    if (formularioCompleto) {
      if (nuevoServicio.especialidadId === '') {
        mostrarAviso("Elige qué técnico necesitas. Si no sabes, toca «No estoy seguro».");
        return;
      }
      lote.push(sinLevantamiento
        ? { ...nuevoServicio, area_id: '', zona: 'Área General', equipo: '' }
        : { ...nuevoServicio });
    }

    if (lote.length === 0) {
      mostrarAviso("Por favor ingresa o añade al menos un problema a reportar.");
      return;
    }

    const isToNetwork = mode === 'red';
    const targetTechId = (!isToNetwork && selectedTechId) ? selectedTechId : null;

    if (!isToNetwork && tecnicos.length === 0) {
      mostrarAviso("No cuentas con técnicos vinculados actualmente. Te recomendamos enviarlo al Mercado de Técnicos.");
      return;
    }

    setLoadingSubmit(true);
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const loteId = `LOTE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const total = lote.length;

    try {
      await Promise.all(lote.map(async (item, index) => {
        const formData = new FormData();
        formData.append('property_id', selectedPropertyId);
        formData.append('type', item.tipo);
        formData.append('zone', item.zona);
        formData.append('equipment', item.equipo || '');
        // Habilidad que necesita: solo la ven los técnicos que la tienen ("No estoy seguro" va sin ella)
        if (item.especialidadId && item.especialidadId !== SIN_HABILIDAD) {
          formData.append('specialty_id', item.especialidadId);
        }
        
        let scheduleNote = '';
        if (item.urgencia === 'programado' && item.fechaProgramada) {
          // Fecha estimada: no se manda scheduled_at, porque eso es la cita que acuerda el técnico.
          // Los técnicos la ven como etiqueta "Lo necesita: …" (se lee de esta nota).
          // La columna priority solo acepta Normal/Urgente; lo "programado" vive en la nota de fecha.
          formData.append('priority', 'Normal');
          scheduleNote = `\n\n[FECHA / HORARIO DESEADO]: ${item.fechaProgramada} - ${textoHorario(item.horarioPreferido)}`;
          // Mercado: el técnico cotiza con este horario (sin hora = a cualquier hora del día)
          formData.append('fecha_deseada', item.fechaProgramada);
          if (esHoraExacta(item.horarioPreferido)) formData.append('hora_deseada', item.horarioPreferido);
        } else {
          formData.append('priority', 'Urgente');
          scheduleNote = `\n\n[URGENCIA]: ⚡ Atención Urgente - Hoy Mismo`;
        }

        const hasValidEquipo = item.equipo && item.equipo.toLowerCase() !== 'otro' && item.equipo.toLowerCase() !== 'ninguno';
        const descBase = hasValidEquipo 
          ? `${item.descripcion}\n\n[EQUIPO AFECTADO]: ${item.equipo}${scheduleNote}`
          : `${item.descripcion}${scheduleNote}`;
        const descFinal = total > 1
          ? `[${loteId}] (${index + 1}/${total})\n${descBase}`
          : descBase;
        
        formData.append('description', descFinal);
        if (total > 1) {
          formData.append('batch_id', loteId);
        }

        if (isToNetwork) {
          formData.append('publish_network', '1');
        } else if (targetTechId && esClienteRed) {
          formData.append('tecnico_dirigido_id', targetTechId);
          formData.append('publish_network', '1');
        } else if (targetTechId) {
          formData.append('tecnico_id', targetTechId);
          formData.append('assigned_technician_id', targetTechId);
          formData.append('publish_network', '0');
        }
        
        item.fotos.forEach((foto, i) => {
          formData.append(`evidence_${i + 1}`, foto);
        });

        return axios.post(`${import.meta.env.VITE_API_BASE_URL}/work-orders/cliente`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
      }));

      const techObj = tecnicos.find(t => String(t.id) === String(targetTechId));
      const techName = techObj ? `${techObj.first_name || techObj.name || ''} ${techObj.last_name || ''}`.trim() : 'tu técnico';
      const propObj = propiedades.find(p => String(p.id) === String(selectedPropertyId));
      const propName = propObj ? (propObj.nombre_propiedad || propObj.nombre || propObj.address || `Propiedad #${propObj.id}`) : 'Mi Propiedad';

      // Mostramos la elegante Ficha de Solicitud en vez del alert del navegador
      const exitosaData = {
        isToNetwork,
        esDirigida: !isToNetwork && esClienteRed,
        techName,
        propiedadNombre: propName,
        totalSolicitudes: total,
        primerServicio: lote[0],
        loteId: total > 1 ? loteId : null,
        fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      setSolicitudExitosa(exitosaData);
    } catch (error) {
      console.error("Error enviando lote:", error);
      setErrorEnvio(error.response?.data?.message || "Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleFinalizarExito = () => {
    setSolicitudExitosa(null);
    setCarritoServicios([]);
    setNuevoServicio({ ...SERVICIO_VACIO });
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const totalItemsCount = carritoServicios.length + (formularioCompleto ? 1 : 0);

  return createPortal(
    <>
      <div className="msa-overlay" onClick={onClose}>
        <div className="msa-content" onClick={e => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className="msa-header">
            <div className="msa-header-left">
              <div className="msa-badge-tag">
                <Shield size={12} /> NUEVA SOLICITUD DE SERVICIO
              </div>
              <h2 className="msa-title">Reportar Problema</h2>
              <p className="msa-subtitle">Especifica los detalles del servicio y elige el destino de envío</p>
            </div>
            <button className="msa-close-btn" onClick={onClose} title="Cerrar modal" type="button" aria-label="Cerrar">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* BODY WITH 2-COLUMN RESPONSIVE GRID */}
          <div className="msa-body">
            <div className="msa-grid-layout">
              
              {/* ══════════════════════════════════════════
                  COLUMNA IZQUIERDA: DETALLES DEL PROBLEMA
                  ══════════════════════════════════════════ */}
              <div className="msa-col-left">
                
                {/* SELECTOR DE PROPIEDAD */}
                <div className="msa-form-group">
                  <label className="msa-label">
                    <Home size={14} color="#ea580c" /> Seleccionar Propiedad *
                  </label>
                  <select 
                    required 
                    className="msa-select"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    disabled={loadingPropiedades}
                  >
                    <option value="">{loadingPropiedades ? "Cargando propiedades..." : "Selecciona tu propiedad..."}</option>
                    {propiedades.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_propiedad || p.nombre || p.address || `Propiedad #${p.id}`}</option>
                    ))}
                  </select>
                </div>

                <form onSubmit={handleAnadirAlCarrito}>
                  {/* TIPO DE SERVICIO */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <FileText size={14} color="#ea580c" /> Tipo de Servicio *
                    </label>
                    <select 
                      required 
                      className="msa-select"
                      value={nuevoServicio.tipo}
                      onChange={(e) => setNuevoServicio({...nuevoServicio, tipo: e.target.value})}
                      disabled={!selectedPropertyId}
                    >
                      <option value="">Selecciona el tipo...</option>
                      <option value="Mantenimiento">Mantenimiento Preventivo</option>
                      <option value="Problema">Problema / Reparación Correctiva</option>
                      <option value="Instalacion">Instalación Nueva / Mejora</option>
                      <option value="Inspeccion">Inspección / Diagnóstico</option>
                    </select>
                  </div>

                  {/* ZONA y EQUIPO: solo si la propiedad tiene levantamiento */}
                  {!sinLevantamiento && (<>
                  {/* ZONA DE LA PROPIEDAD */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <Home size={14} color="#ea580c" /> Zona de la propiedad *
                    </label>
                    <select 
                      required 
                      className="msa-select"
                      value={nuevoServicio.area_id}
                      onChange={(e) => handleZonaChange(e.target.value)}
                      disabled={loadingZonas || !selectedPropertyId}
                    >
                      <option value="">{loadingZonas ? "Cargando zonas..." : "Seleccionar zona..."}</option>
                      {zonasDisponibles.map(zona => {
                        const subAreas = zona.sub_areas || zona.subAreas || [];
                        if (subAreas.length > 0) {
                          return (
                            <optgroup key={`opt-${zona.id}`} label={zona.name.toUpperCase()}>
                              <option value={zona.id}>{zona.name} (Área General)</option>
                              {subAreas.map(sub => (
                                <option key={`sub-${sub.id}`} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        } else {
                          return <option key={`zona-${zona.id}`} value={zona.id}>{zona.name}</option>;
                        }
                      })}
                      <option value="otro" style={{ fontWeight: 'bold' }}>Otro (No listado)</option>
                    </select>
                  </div>

                  {/* EQUIPO AFECTADO */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <Wrench size={14} color="#ea580c" /> Equipo afectado (Opcional)
                    </label>
                    <select 
                      className="msa-select"
                      value={nuevoServicio.equipo}
                      disabled={!nuevoServicio.area_id || loadingEquipos}
                      onChange={(e) => elegirEquipo(e.target.value)}
                    >
                      <option value="">
                        {!nuevoServicio.area_id ? "Primero selecciona una zona" : (loadingEquipos ? "Cargando equipos..." : "Seleccionar equipo...")}
                      </option>
                      {Object.entries(equiposDisponibles).map(([seccion, items]) => (
                        <optgroup key={seccion} label={seccion.toUpperCase()}>
                          {items.map((item) => (
                            <option key={item.id} value={`${item.sub_category} ${item.brand ? `(${item.brand})` : ''}`}>
                              {item.sub_category} {item.brand ? `(${item.brand})` : ''} {item.model_or_color ? `- ${item.model_or_color}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="otro">Otro / Ninguno en específico</option>
                    </select>
                  </div>
                  </>)}

                  {/* ¿QUÉ TÉCNICO NECESITA? (habilidad) */}
                  {(() => {
                    const elegida = nuevoServicio.especialidadId;
                    const principales = catalogoHabilidades.filter(e => HABILIDADES_PRINCIPALES.some(r => r.test(e.name)));
                    const visibles = verTodasHabilidades || principales.length === 0
                      ? catalogoHabilidades
                      : [...principales, ...catalogoHabilidades.filter(e => e.id === elegida && !principales.includes(e))];
                    const ocultas = catalogoHabilidades.length - visibles.length;
                    return (
                      <div className="msa-form-group">
                        <label className="msa-label">
                          <Wrench size={14} color="#ea580c" /> ¿Qué técnico necesitas? *
                        </label>
                        <div className="msa-hab-chips" role="radiogroup" aria-label="Habilidad que necesita el trabajo">
                          {visibles.map(e => (
                            <button
                              key={e.id}
                              type="button"
                              role="radio"
                              aria-checked={elegida === e.id}
                              className={`msa-hab-chip ${elegida === e.id ? 'activo' : ''}`}
                              onClick={() => elegirHabilidad(e.id)}
                              disabled={!selectedPropertyId}
                            >
                              <IconoEspecialidad nombre={e.name} size={14} /> {e.name}
                            </button>
                          ))}
                          {ocultas > 0 && (
                            <button type="button" className="msa-hab-chip mas" onClick={() => setVerTodasHabilidades(true)} disabled={!selectedPropertyId}>
                              +{ocultas} más
                            </button>
                          )}
                          <button
                            type="button"
                            role="radio"
                            aria-checked={elegida === SIN_HABILIDAD}
                            className={`msa-hab-chip nose ${elegida === SIN_HABILIDAD ? 'activo' : ''}`}
                            onClick={() => elegirHabilidad(SIN_HABILIDAD)}
                            disabled={!selectedPropertyId}
                          >
                            <HelpCircle size={14} /> No estoy seguro
                          </button>
                        </div>
                        {nuevoServicio.especialidadAuto && elegida && (
                          <small className="msa-hab-nota"><Sparkles size={12} /> La elegimos por el equipo; cámbiala si no es correcta.</small>
                        )}
                        {elegida === SIN_HABILIDAD && (
                          <small className="msa-hab-nota">Le llegará a todos los técnicos del Mercado.</small>
                        )}
                      </div>
                    );
                  })()}

                  {/* DESCRIPCIÓN */}
                  <div className="msa-form-group">
                    <label className="msa-label">
                      <MessageSquare size={14} color="#ea580c" /> Descripción del problema *
                    </label>
                    <textarea 
                      required 
                      rows="3" 
                      className="msa-textarea"
                      placeholder="Describe con detalle qué ocurre o qué necesitas..." 
                      value={nuevoServicio.descripcion} 
                      onChange={(e) => setNuevoServicio({...nuevoServicio, descripcion: e.target.value})}
                      disabled={!selectedPropertyId}
                    />
                  </div>

                  {/* BOTÓN PARA AÑADIR A LOTE */}
                  <button 
                    type="submit" 
                    disabled={!selectedPropertyId} 
                    className="msa-btn-add-batch"
                  >
                    <PlusCircle size={15} color="#ea580c" /> + AÑADIR OTRO PROBLEMA A ESTA SOLICITUD
                  </button>
                </form>

              </div>

              {/* ══════════════════════════════════════════
                  COLUMNA DERECHA: FOTOS, DISPONIBILIDAD Y DESTINO
                  ══════════════════════════════════════════ */}
              <div className="msa-col-right">

                {/* 📷 EVIDENCIA VISUAL (FOTOS) */}
                <div className="msa-card-box msa-evidence-box">
                  <div className="msa-card-box-header">
                    <label className="msa-label">
                      <Camera size={14} color="#ea580c" /> Evidencia Visual
                    </label>
                    <span className="msa-counter-badge">
                      {nuevoServicio.fotos.length}/2 fotos
                    </span>
                  </div>
                  
                  <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                  <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={handleFileSelect} />

                  <div className="msa-photo-preview-grid">
                    {nuevoServicio.fotos.map((foto, idx) => (
                      <div key={idx} className="msa-photo-item">
                        <img src={URL.createObjectURL(foto)} alt="preview" />
                        <button type="button" className="msa-photo-remove" onClick={() => removeFoto(idx)} title="Eliminar foto">
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}

                    {nuevoServicio.fotos.length < 2 && (
                      <button 
                        type="button" 
                        className="msa-photo-add-btn"
                        onClick={() => setIsPhotoMenuOpen(true)}
                        disabled={!selectedPropertyId}
                      >
                        <PlusCircle size={20} />
                        <span className="msa-photo-add-label">+ Añadir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LISTA DE PROBLEMAS EN LOTE (CARRITO) */}
                {carritoServicios.length > 0 && (
                  <div className="msa-card-box msa-batch-box">
                    <div className="msa-batch-header">
                      <h4 className="msa-batch-title">
                        Problemas agregados ({carritoServicios.length})
                      </h4>
                      <span className="msa-batch-badge">Se enviarán juntos</span>
                    </div>
                    <div className="msa-batch-list">
                      {carritoServicios.map((item, idx) => (
                        <div key={idx} className="msa-batch-item">
                          {item.fotos.length > 0 ? (
                            <img src={URL.createObjectURL(item.fotos[0])} alt="preview" className="msa-batch-thumb" />
                          ) : (
                            <div className="msa-batch-thumb-placeholder"><FileText size={16} color="#94a3b8"/></div>
                          )}
                          <div className="msa-batch-info">
                            <strong className="msa-batch-item-title">
                              {item.tipo} - {item.zona}
                              {nombreHabilidad(item.especialidadId) && ` · ${nombreHabilidad(item.especialidadId)}`}
                            </strong>
                            <span className="msa-batch-item-desc">
                              {item.descripcion}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setCarritoServicios(carritoServicios.filter((_, i) => i !== idx))} 
                            className="msa-batch-delete-btn"
                            title="Eliminar de la lista"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⏰ DISPONIBILIDAD / HORARIO */}
                <div className="msa-card-box msa-urgencia-box">
                  <label className="msa-label">
                    <Clock size={14} color="#ea580c" /> ¿Cuándo necesitas la atención?
                  </label>
                  <div className="msa-urgencia-grid">
                    <button
                      type="button"
                      onClick={() => setNuevoServicio({...nuevoServicio, urgencia: 'urgente', fechaProgramada: '', horarioPreferido: ''})}
                      className={`msa-urgencia-btn ${nuevoServicio.urgencia === 'urgente' || !nuevoServicio.urgencia ? 'active-urgente' : ''}`}
                    >
                      <span className="msa-urgencia-icon">⚡</span>
                      <span>Urgente (Hoy)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoServicio({
                        ...nuevoServicio,
                        urgencia: 'programado',
                        fechaProgramada: nuevoServicio.fechaProgramada || enDias(1),
                        horarioPreferido: nuevoServicio.horarioPreferido || HORA_POR_DEFECTO
                      })}
                      className={`msa-urgencia-btn ${nuevoServicio.urgencia === 'programado' ? 'active-programado' : ''}`}
                    >
                      <Calendar size={14} />
                      <span>Programar</span>
                    </button>
                  </div>

                  {nuevoServicio.urgencia === 'programado' && (() => {
                    const fecha = nuevoServicio.fechaProgramada;
                    const atajoActivo = ATAJOS_FECHA.find(a => a.fecha() === fecha)?.key;
                    const horaFija = esHoraExacta(nuevoServicio.horarioPreferido);
                    return (
                      <div className="msa-programar-fields msa-programar-estimado">
                        <span className="msa-sublabel">¿Para cuándo lo necesitas? (fecha estimada)</span>
                        <div className="msa-atajos-fecha">
                          {ATAJOS_FECHA.map(a => (
                            <button
                              key={a.key}
                              type="button"
                              className={`msa-atajo-fecha ${atajoActivo === a.key ? 'activo' : ''}`}
                              onClick={() => setNuevoServicio({ ...nuevoServicio, fechaProgramada: a.fecha() })}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>

                        {/* Fecha y hora con el selector de reloj de la app (calendario + reloj) */}
                        <div className="msa-programar-fecha-hora">
                          <span className="msa-sublabel">{horaFija ? 'Fecha y hora:' : 'Fecha:'}</span>
                          <CampoFechaHora
                            type={horaFija ? 'datetime-local' : 'date'}
                            value={fecha ? (horaFija ? `${fecha}T${nuevoServicio.horarioPreferido}` : fecha) : ''}
                            min={enDias(1)}
                            onChange={(e) => {
                              const [f, h] = String(e.target.value || '').split('T');
                              setNuevoServicio({
                                ...nuevoServicio,
                                fechaProgramada: f || '',
                                ...(h ? { horarioPreferido: h.slice(0, 5) } : {}),
                              });
                            }}
                            className="campo-fecha-red"
                            overlayClassName="mdtp-tema-red"
                            placeholder={horaFija ? 'Elige fecha y hora' : 'Elige la fecha'}
                          />

                          <div className="msa-hora-opciones" role="group" aria-label="Hora preferida">
                            <button
                              type="button"
                              className={`msa-hora-opcion ${horaFija ? 'activo' : ''}`}
                              onClick={() => !horaFija && setNuevoServicio({ ...nuevoServicio, horarioPreferido: HORA_POR_DEFECTO })}
                            >
                              <Clock size={13} /> Hora exacta
                            </button>
                            <button
                              type="button"
                              className={`msa-hora-opcion ${!horaFija ? 'activo' : ''}`}
                              onClick={() => setNuevoServicio({ ...nuevoServicio, horarioPreferido: CUALQUIER_HORA })}
                            >
                              Cualquier hora
                            </button>
                          </div>
                        </div>

                        {fecha && (
                          <p className="msa-fecha-resumen">
                            <Calendar size={13} />
                            <span>
                              Lo necesitas para el <strong>{fechaLarga(fecha)}</strong>
                              {horaFija ? <> a las <strong>{hora12(nuevoServicio.horarioPreferido)}</strong></> : ', a cualquier hora'}.
                              {' '}Los técnicos lo verán al cotizar y te propondrán la cita.
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 🛡️ DESTINO DEL SERVICIO */}
                <div className="msa-card-box msa-destino-box">
                  <label className="msa-label">
                    <Shield size={14} color="#ea580c" /> ¿A quién deseas enviar?
                  </label>

                  {/* Selector de Modo */}
                  <div className="msa-destino-grid">
                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('red')}
                      className={`msa-destino-btn ${destinoEnvio === 'red' ? 'active-red' : ''}`}
                    >
                      <div className="msa-destino-btn-head">
                        <Globe size={16} />
                        <span>AL MERCADO</span>
                      </div>
                      <span className="msa-destino-btn-sub">
                        Técnicos autónomos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinoEnvio('mis_tecnicos')}
                      className={`msa-destino-btn ${destinoEnvio === 'mis_tecnicos' ? 'active-blue' : ''}`}
                    >
                      <div className="msa-destino-btn-head">
                        <Users size={16} />
                        <span>A MIS TÉCNICOS</span>
                      </div>
                      <span className="msa-destino-btn-sub">
                        {esClienteRed ? 'Tus favoritos (máx. 3)' : 'Tus técnicos ligados'}
                      </span>
                    </button>
                  </div>

                  {/* Panel según destino */}
                  {destinoEnvio === 'mis_tecnicos' ? (
                    <div className="msa-destino-panel">
                      {loadingTecnicos ? (
                        <div className="msa-loading-tecnicos">
                          Cargando técnicos asociados...
                        </div>
                      ) : tecnicos.length > 0 ? (
                        <div className="msa-tecnicos-wrapper">
                          <label className="msa-tecnicos-sublabel">
                            {esClienteRed
                              ? 'Elige a tu técnico favorito. Solo él verá la solicitud y te enviará su cotización:'
                              : 'Selecciona el técnico que atenderá la solicitud:'}
                          </label>
                          {/* Lista de técnicos en tarjetas (en vez del select nativo del navegador) */}
                          <div className="msa-tech-list" role="radiogroup" aria-label="Técnico que atenderá la solicitud">
                            {tecnicos.map(t => {
                              const fullName = `${t.first_name || t.name || ''} ${t.last_name || ''}`.trim() || `Técnico #${t.id}`;
                              const rol = t.rolTexto
                                ? [t.rolTexto, t.especialidades?.[0]].filter(Boolean).join(' · ')
                                : t.role_id === 2 ? 'Técnico Agente' : ({ 6: 'Técnico independiente', 7: 'Contratista', 8: 'Técnico de cuadrilla' }[Number(t.role_id)] || 'Técnico');
                              const iniciales = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
                              const elegido = String(selectedTechId) === String(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={elegido}
                                  className={`msa-tech-card ${elegido ? 'is-selected' : ''}`}
                                  onClick={() => setSelectedTechId(t.id)}
                                >
                                  <span className="msa-tech-avatar">
                                    {t.profile_picture
                                      ? <img src={t.profile_picture} alt="" loading="lazy" />
                                      : iniciales}
                                  </span>
                                  <span className="msa-tech-info">
                                    <span className="msa-tech-name">{fullName}</span>
                                    <span className="msa-tech-role">{rol}</span>
                                  </span>
                                  <span className="msa-tech-check" aria-hidden="true">
                                    {elegido && <Check size={13} strokeWidth={3} />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSubmitBatch('mis_tecnicos')}
                            disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)}
                            className="msa-btn-submit-blue"
                          >
                            <UserCheck size={17} />
                            {loadingSubmit ? "ASIGNANDO SERVICIO..." : `ENVIAR A MI TÉCNICO ${totalItemsCount > 1 ? `(${totalItemsCount})` : ''}`}
                          </button>
                        </div>
                      ) : (
                        /* ESTADO VACÍO CUANDO NO TIENE TÉCNICOS */
                        <div className="msa-no-tecnicos-card">
                          <div className="msa-no-tecnicos-title">
                            <AlertCircle size={15} /> {esClienteRed ? 'Aún no tienes técnicos favoritos' : 'Sin técnicos vinculados'}
                          </div>
                          <p className="msa-no-tecnicos-desc">
                            {esClienteRed
                              ? <>Agrega hasta 3 favoritos desde <strong>Mis técnicos</strong> o escaneando el código QR de un técnico. Mientras tanto, envía esta solicitud al <strong>Mercado de Técnicos</strong> para recibir cotizaciones.</>
                              : <>No tienes técnicos directos registrados. Te recomendamos enviar esta solicitud al <strong>Mercado de Técnicos</strong> para recibir cotizaciones.</>}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setDestinoEnvio('red');
                              handleSubmitBatch('red');
                            }}
                            disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)}
                            className="msa-btn-submit-orange"
                          >
                            <Globe size={15} /> PUBLICAR EN EL MERCADO DE TÉCNICOS
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODO RED PÚBLICA */
                    <div className="msa-destino-panel">
                      <p className="msa-network-desc">
                        Tu solicitud será visible para técnicos del Mercado para que recibas cotizaciones en tiempo real.
                      </p>
                      <button 
                        type="button" 
                        onClick={() => handleSubmitBatch('red')} 
                        disabled={loadingSubmit || (!selectedPropertyId && carritoServicios.length === 0)} 
                        className="msa-btn-submit-orange"
                      >
                        <Globe size={17} />
                        {loadingSubmit ? "PUBLICANDO EN EL MERCADO..." : `PUBLICAR EN EL MERCADO ${totalItemsCount > 1 ? `(${totalItemsCount})` : ''}`}
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE ORIGEN DE FOTO */}
      {isPhotoMenuOpen && (
        <div className="msa-photo-source-overlay" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="msa-photo-source-modal" onClick={e => e.stopPropagation()}>
            <div className="msa-photo-source-header">
              <h3 className="msa-photo-source-title">Seleccionar Origen</h3>
              <button 
                type="button" 
                className="msa-photo-source-close" 
                onClick={() => setIsPhotoMenuOpen(false)}
                title="Cerrar"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
            <div className="msa-photo-source-body">
              <button 
                type="button"
                onClick={() => selectPhotoSource('camera')}
                className="msa-photo-source-btn"
              >
                <div className="msa-photo-source-icon camera">
                  <Camera size={18} />
                </div>
                <div className="msa-photo-source-info">
                  <strong>Tomar Foto con Cámara</strong>
                  <span>Usa la cámara de tu dispositivo</span>
                </div>
              </button>
              <button 
                type="button"
                onClick={() => selectPhotoSource('gallery')}
                className="msa-photo-source-btn"
              >
                <div className="msa-photo-source-icon gallery">
                  <FileText size={18} />
                </div>
                <div className="msa-photo-source-info">
                  <strong>Elegir de Galería</strong>
                  <span>Sube archivos o fotos guardadas</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════
          FICHA DE CONFIRMACIÓN / ÉXITO DE SOLICITUD
          ══════════════════════════════════════════ */}
      {solicitudExitosa && (
        <div className="msa-overlay" onClick={handleFinalizarExito}>
          <div className="msa-ficha-card" onClick={e => e.stopPropagation()}>
            <div className="msa-ficha-top-bar" />
            
            <div className="msa-ficha-header">
              <div className="msa-ficha-icon-circle">
                <CheckCircle2 size={36} color="#16a34a" strokeWidth={2.4} />
              </div>
              <h3 className="msa-ficha-title">
                {solicitudExitosa.isToNetwork ? '¡Solicitud Publicada en el Mercado!'
                  : solicitudExitosa.esDirigida ? '¡Solicitud enviada a tu técnico!' : '¡Solicitud Asignada con Éxito!'}
              </h3>
              <p className="msa-ficha-subtitle">
                {solicitudExitosa.isToNetwork 
                  ? 'Tu requerimiento ya está visible para los técnicos disponibles para cotizar.' 
                  : solicitudExitosa.esDirigida
                    ? `Solo ${solicitudExitosa.techName} puede verla. Te avisaremos cuando te envíe su cotización.`
                    : `Se ha notificado y asignado directamente a ${solicitudExitosa.techName}.`}
              </p>
            </div>

            {/* CUERPO DE LA FICHA */}
            <div className="msa-ficha-body">
              <div className="msa-ficha-badge-row">
                <span className="msa-ficha-folio">
                  {solicitudExitosa.loteId ? `LOTE: ${solicitudExitosa.loteId}` : 'FOLIO: EN MERCADO'}
                </span>
                <span className={`msa-ficha-status-pill ${solicitudExitosa.isToNetwork ? 'network' : 'tech'}`}>
                  ● {solicitudExitosa.isToNetwork ? 'EN VIVO EN EL MERCADO' : solicitudExitosa.esDirigida ? 'ESPERANDO COTIZACIÓN' : 'ASIGNADO'}
                </span>
              </div>

              <div className="msa-ficha-details-grid">
                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Home size={13} color="#ea580c" /> Propiedad
                  </span>
                  <strong className="msa-ficha-item-val" title={solicitudExitosa.propiedadNombre}>
                    {solicitudExitosa.propiedadNombre}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <FileText size={13} color="#ea580c" /> Tipo
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.tipo || 'Mantenimiento'}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Wrench size={13} color="#ea580c" /> Zona
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.zona || 'Área General'}
                  </strong>
                </div>

                <div className="msa-ficha-item">
                  <span className="msa-ficha-item-label">
                    <Clock size={13} color="#ea580c" /> Atención
                  </span>
                  <strong className="msa-ficha-item-val">
                    {solicitudExitosa.primerServicio?.urgencia === 'programado'
                      ? `Para el ${fechaLarga(solicitudExitosa.primerServicio.fechaProgramada)}${esHoraExacta(solicitudExitosa.primerServicio.horarioPreferido) ? ` a las ${hora12(solicitudExitosa.primerServicio.horarioPreferido)}` : ''}`
                      : 'Urgente (hoy)'}
                  </strong>
                </div>
              </div>

              {solicitudExitosa.primerServicio?.descripcion && (
                <div className="msa-ficha-desc-box">
                  <span className="msa-ficha-desc-label">Detalle reportado:</span>
                  <p className="msa-ficha-desc-text">
                    "{solicitudExitosa.primerServicio.descripcion}"
                  </p>
                </div>
              )}

              {solicitudExitosa.totalSolicitudes > 1 && (
                <div className="msa-ficha-batch-banner">
                  <span>💼 Incluye {solicitudExitosa.totalSolicitudes} problemas enviados en este lote</span>
                </div>
              )}
            </div>

            {/* BOTÓN ACEPTAR */}
            <div className="msa-ficha-footer">
              <button
                type="button"
                className="msa-ficha-btn-ok"
                onClick={handleFinalizarExito}
              >
                <Check size={18} strokeWidth={2.5} />
                <span>Aceptar y Ver en el Mapa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR (SI FALLA EL ENVÍO) */}
      {errorEnvio && (
        <div className="msa-overlay" onClick={() => setErrorEnvio(null)}>
          <div className="msa-ficha-card" onClick={e => e.stopPropagation()}>
            <div className="msa-ficha-top-bar error" />
            <div className="msa-ficha-header">
              <div className="msa-ficha-icon-circle error">
                <AlertCircle size={36} color="#ef4444" strokeWidth={2.4} />
              </div>
              <h3 className="msa-ficha-title">No se pudo enviar la solicitud</h3>
              <p className="msa-ficha-subtitle">{errorEnvio}</p>
            </div>
            <div className="msa-ficha-footer">
              <button
                type="button"
                className="msa-ficha-btn-error"
                onClick={() => setErrorEnvio(null)}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default ModalServicioAutonomo;
