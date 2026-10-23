// ReporteTrabajo.jsx
import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../../../styles/AgenteSolutions/Admin/ReporteTrabajo.css";
import logo from '../../../assets/Logo3.png';
import {
  Printer, ChevronLeft, Save, Trash2, X, Maximize2, Plus, History, Calendar, Clock,
  ImagePlus, Check, Upload, ShieldCheck, ArrowUpRight, Pencil,
} from 'lucide-react';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';
import { useAuth } from '../../../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL;

// ---- Fecha y hora: se guardan como texto ("23/10/2026", "12:52 PM") y se editan con selectores ----
const aISO = (texto) => {
  const s = String(texto || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
};
const deISO = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const a24h = (texto) => {
  const m = String(texto || '').trim().match(/^(\d{1,2}):(\d{2})\s*([ap])?/i);
  if (!m) return '';
  let h = Number(m[1]);
  const sufijo = m[3]?.toLowerCase();
  if (sufijo === 'p' && h < 12) h += 12;
  if (sufijo === 'a' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};
const de24h = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatoFechaVersion = (fecha) =>
  new Date(fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ---- Datos del trabajo ----
const isInvalid = (val) => !val || val === "Sin Propietario" || val === "Dirección no registrada" || val === "Propiedad Sin Nombre" || val === "N/A" || val === "Cargando..." || val === "Usuario" || (typeof val === 'string' && val.trim() === "");
const getValid = (...values) => {
  for (let v of values) {
    if (!isInvalid(v)) return v;
  }
  return "";
};

// Completa el reporte con los datos reales del servicio en la BD
const conDatosDelServicio = (prev, s) => ({
  ...prev,
  fechaTrabajo: s.fecha_programada || prev.fechaTrabajo,
  cliente: {
    nombre: getValid(prev.cliente.nombre, s.propietario, s.cliente_nombre),
    telefono: getValid(prev.cliente.telefono, s.telefono_cliente),
    correo: getValid(prev.cliente.correo, s.cliente_email, s.email),
    direccion: getValid(prev.cliente.direccion, s.direccion, s.address),
  },
  propiedad: {
    nombre: getValid(prev.propiedad.nombre, s.propiedad_nombre),
    direccion: getValid(prev.propiedad.direccion, s.direccion, s.address),
    tipo: getValid(prev.propiedad.tipo, s.tipoPropiedad, "Residencial"),
    superficie: getValid(prev.propiedad.superficie, s.superficie, "N/A"),
  },
  tecnico: {
    nombre: getValid(prev.tecnico.nombre, (s.technicians?.length ? s.technicians.map(t => t.name).join(', ') : s.tecnico)),
    especialidad: prev.tecnico.especialidad || "Técnico Especialista",
    celular: getValid(prev.tecnico.celular, (s.technicians?.length ? s.technicians.map(t => t.phone_number).filter(Boolean).join(', ') : s.tecnico_celular)),
    correo: getValid(prev.tecnico.correo, (s.technicians?.length ? s.technicians.map(t => t.email).filter(Boolean).join(', ') : s.tecnico_email)),
  },
  descripcion: getValid(prev.descripcion, s.descripcion),
});

// Arma el reporte de una versión guardada. Las versiones nuevas traen la copia completa (data);
// las anteriores al historial solo guardaban algunos campos y se completan con el servicio.
const desdeVersionGuardada = (f, base, s) => {
  if (f.data) {
    return { ...base, ...f.data, logoUrl: f.data.logoUrl ?? f.logo_url ?? null };
  }
  const completo = s ? conDatosDelServicio(base, s) : base;
  return {
    ...completo,
    folio: f.folio || completo.folio,
    fechaTrabajo: f.report_date || completo.fechaTrabajo,
    horaInicio: f.start_time || completo.horaInicio,
    horaFin: f.end_time || completo.horaFin,
    descripcion: f.description || completo.descripcion,
    materiales: f.materials?.length ? f.materials : completo.materiales,
    observaciones: f.observations ?? completo.observaciones,
    imagenes: f.selected_images ?? completo.imagenes,
    logoUrl: f.logo_url || null,
  };
};

// ---- Modal para elegir o subir el logo del encabezado ----
const OpcionLogo = ({ url, src, titulo, actual, onElegir, children }) => (
  <div className={`rt-logo-opcion ${actual === url ? 'activa' : ''}`}>
    <button type="button" className="rt-logo-opcion__img" onClick={() => onElegir(url)}>
      <img src={src || url} alt={titulo} />
      {actual === url && <span className="rt-logo-opcion__check"><Check size={14} /></span>}
    </button>
    <span className="rt-logo-opcion__titulo">{titulo}</span>
    {children}
  </div>
);

const ModalLogo = ({ trabajo, actual, puedeBorrar, onElegir, onCerrar }) => {
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/report-logos`, { params: { trabajo } })
      .then(({ data }) => {
        setEmpresa(data.empresa);
        setGaleria(data.galeria || []);
      })
      .catch(() => mostrarAviso("No se pudo cargar la galería de logos."))
      .finally(() => setCargando(false));
  }, [trabajo]);

  const subir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (archivo.size > 4 * 1024 * 1024) {
      mostrarAviso("El logo debe pesar menos de 4 MB.", 'warning');
      return;
    }
    const form = new FormData();
    form.append('logo', archivo);
    setSubiendo(true);
    try {
      const { data } = await axios.post(`${API}/report-logos`, form);
      setGaleria(prev => [data, ...prev]);
      onElegir(data.url);
    } catch (error) {
      mostrarAviso(error.response?.data?.error || "No se pudo subir el logo.");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (item) => {
    if (!(await confirmarAccion("¿Quitar este logo de la galería? Los reportes ya guardados lo conservan."))) return;
    try {
      await axios.delete(`${API}/report-logos/${item.id}`);
      setGaleria(prev => prev.filter(l => l.id !== item.id));
    } catch {
      mostrarAviso("No se pudo quitar el logo.");
    }
  };

  return (
    <div className="rt-modal-fondo" onClick={onCerrar}>
      <div className="rt-modal" onClick={e => e.stopPropagation()}>
        <div className="rt-modal__cabecera">
          <div>
            <h3>Logo del reporte</h3>
            <p>Elige el logo que aparecerá en el encabezado.</p>
          </div>
          <button type="button" className="rt-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="rt-modal__cuerpo">
          <div className="rt-logo-grid">
            <OpcionLogo url={null} src={logo} titulo="Agente Solutions" actual={actual} onElegir={onElegir} />
            {empresa && <OpcionLogo url={empresa.url} titulo={empresa.nombre || "Empresa de la propiedad"} actual={actual} onElegir={onElegir} />}
            {!cargando && galeria
              .filter(l => l.url !== empresa?.url)
              .map(l => (
                <OpcionLogo key={l.id} url={l.url} titulo="Galería" actual={actual} onElegir={onElegir}>
                  {puedeBorrar && (
                    <button type="button" className="rt-logo-opcion__borrar" onClick={() => borrar(l)} title="Quitar de la galería">
                      <Trash2 size={12} />
                    </button>
                  )}
                </OpcionLogo>
              ))}
            <button type="button" className="rt-logo-subir" onClick={() => inputRef.current?.click()} disabled={subiendo}>
              <Upload size={20} />
              <span>{subiendo ? "Subiendo..." : "Subir logo"}</span>
            </button>
          </div>
          {cargando && <p className="rt-modal__nota">Cargando galería...</p>}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={subir} />
        </div>

        <div className="rt-modal__pie">
          <ShieldCheck size={16} />
          <span>Usa únicamente logos oficiales autorizados por la empresa. Los logos que subas quedan en la galería para reutilizarlos.</span>
        </div>
      </div>
    </div>
  );
};

// ---- Pie de página: el de Agente Solutions o el de la empresa para la que se emite ----
const LEYENDA_PIE = "Este documento es un comprobante oficial de los trabajos realizados.";
const PIE_AGENTE = {
  id: null,
  empresa: "AGENTE SOLUTIONS - Resolviendo tus necesidades",
  telefono: "(999) 123-4567",
  email: "soporte@agentesolutions.com",
  leyenda: LEYENDA_PIE,
};

const lineaContacto = (pie) =>
  [pie.telefono && `Tel: ${pie.telefono}`, pie.email && `Email: ${pie.email}`].filter(Boolean).join(' | ');

const TextoPie = ({ pie }) => (
  <>
    <span className="rt-pie-linea">{pie.leyenda || LEYENDA_PIE}</span>
    <span className="rt-pie-linea">{pie.empresa}</span>
    {lineaContacto(pie) && <span className="rt-pie-linea">{lineaContacto(pie)}</span>}
  </>
);

const PIE_VACIO = { empresa: '', telefono: '', email: '', leyenda: LEYENDA_PIE };

const ModalPie = ({ actual, puedeBorrar, onElegir, onCerrar }) => {
  const [cargando, setCargando] = useState(true);
  const [pies, setPies] = useState([]);
  const [nuevo, setNuevo] = useState(null); // formulario abierto
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    axios.get(`${API}/report-footers`)
      .then(({ data }) => setPies(data || []))
      .catch(() => mostrarAviso("No se pudieron cargar los pies de página guardados."))
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nuevo.empresa.trim()) {
      mostrarAviso("Escribe el nombre de la empresa.", 'warning');
      return;
    }
    setGuardando(true);
    try {
      const { data } = await axios.post(`${API}/report-footers`, nuevo);
      setPies(prev => [...prev, data]);
      onElegir(data);
    } catch (error) {
      mostrarAviso(error.response?.data?.error || "No se pudo guardar el pie de página.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (pie) => {
    if (!(await confirmarAccion(`¿Quitar el pie de "${pie.empresa}" de la lista? Los reportes ya guardados lo conservan.`))) return;
    try {
      await axios.delete(`${API}/report-footers/${pie.id}`);
      setPies(prev => prev.filter(p => p.id !== pie.id));
    } catch {
      mostrarAviso("No se pudo quitar el pie de página.");
    }
  };

  const campo = (clave, etiqueta, props = {}) => (
    <label className="rt-campo">
      <span>{etiqueta}</span>
      <input value={nuevo[clave]} onChange={(e) => setNuevo(prev => ({ ...prev, [clave]: e.target.value }))} {...props} />
    </label>
  );

  return (
    <div className="rt-modal-fondo" onClick={onCerrar}>
      <div className="rt-modal" onClick={e => e.stopPropagation()}>
        <div className="rt-modal__cabecera">
          <div>
            <h3>Pie de página</h3>
            <p>Elige los datos de la empresa que aparecen al final del reporte.</p>
          </div>
          <button type="button" className="rt-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="rt-modal__cuerpo">
          {nuevo ? (
            <form className="rt-pie-form" onSubmit={guardar}>
              {campo('empresa', 'Empresa / razón social', { placeholder: 'Ej. Empresa SA de CV', autoFocus: true })}
              <div className="rt-pie-form__fila">
                {campo('telefono', 'Teléfono', { placeholder: 'Ej. 999 123 4567' })}
                {campo('email', 'Email', { type: 'email', placeholder: 'Ej. contacto@empresa.com' })}
              </div>
              {campo('leyenda', 'Leyenda')}

              <div className="rt-pie-preview">
                <span>Vista previa</span>
                <div className="reporte-footer"><TextoPie pie={{ ...nuevo, empresa: nuevo.empresa || 'Nombre de la empresa' }} /></div>
              </div>

              <div className="rt-pie-form__acciones">
                <button type="button" className="rt-btn rt-btn--ghost" onClick={() => setNuevo(null)}>Cancelar</button>
                <button type="submit" className="rt-btn rt-btn--primary" disabled={guardando}>
                  <Check size={16} /> {guardando ? "Guardando..." : "Guardar y usar"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rt-pie-lista">
              {[PIE_AGENTE, ...pies].map(pie => {
                const activo = (actual?.id ?? null) === pie.id;
                return (
                  <div key={pie.id ?? 'agente'} className={`rt-pie-opcion ${activo ? 'activa' : ''}`}>
                    <button type="button" className="rt-pie-opcion__btn" onClick={() => onElegir(pie)}>
                      <span className="rt-pie-opcion__titulo">
                        {pie.id === null ? 'Agente Solutions (predeterminado)' : pie.empresa}
                        {activo && <span className="rt-logo-opcion__check"><Check size={14} /></span>}
                      </span>
                      <span className="reporte-footer"><TextoPie pie={pie} /></span>
                    </button>
                    {puedeBorrar && pie.id !== null && (
                      <button type="button" className="rt-logo-opcion__borrar" onClick={() => borrar(pie)} title="Quitar de la lista">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              {cargando && <p className="rt-modal__nota">Cargando pies guardados...</p>}
              <button type="button" className="rt-logo-subir rt-pie-nuevo" onClick={() => setNuevo(PIE_VACIO)}>
                <Plus size={18} /> <span>Nuevo pie de empresa</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReporteTrabajo = () => {
  const componentRef = useRef();
  const servicioRef = useRef(null); // datos frescos del servicio, para completar versiones antiguas
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { id: paramId } = useParams();

  // Datos recibidos de la navegación
  const { trabajoId: stateRawTrabajoId, servicio, imagenes: imagenesEvidencia } = location.state || {};

  const rawTrabajoId = paramId || stateRawTrabajoId;

  // Extraer el ID numérico real en caso de que venga con prefijo (ej. work_order-5)
  const trabajoId = rawTrabajoId?.toString().includes('-')
    ? rawTrabajoId.split('-')[1]
    : rawTrabajoId;
  const idApi = rawTrabajoId || trabajoId;
  const idValido = trabajoId && trabajoId !== "null" && trabajoId !== "undefined";

  // Evitar que el folio diga "work order-null" o similares
  const cleanIdForFolio = (id) => {
    if (!id || id === "null" || id === "undefined") return "001";
    // Si sigue teniendo guion (ej. "work_order-5"), sacamos solo el número
    const numericPart = id.toString().includes('-') ? id.split('-')[1] : id;
    return numericPart;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Para el modal de zoom
  const [modalLogo, setModalLogo] = useState(false);
  const [modalPie, setModalPie] = useState(false);

  // Historial de versiones
  const [versiones, setVersiones] = useState([]);
  const [versionVista, setVersionVista] = useState(null);
  const [cargandoVersion, setCargandoVersion] = useState(false);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(() => window.matchMedia('(min-width: 1280px)').matches);

  // Estado principal del reporte
  const [reportInicial] = useState(() => ({
    folio: `FT-${new Date().getFullYear()}-${String(cleanIdForFolio(trabajoId)).padStart(3, '0')}`,
    logoUrl: null,
    pie: null, // null = pie de Agente Solutions
    fechaTrabajo: servicio?.fecha_programada || new Date().toLocaleDateString("es-MX"),
    horaInicio: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    horaFin: "02:00 PM",
    cliente: {
      nombre: servicio?.cliente_nombre || servicio?.propietario || "Cargando...",
      telefono: servicio?.cliente_telefono || servicio?.telefono_cliente || "",
      correo: servicio?.cliente_email || servicio?.correo || "",
      direccion: servicio?.direccion || servicio?.address || "",
    },
    propiedad: {
      nombre: servicio?.propiedad_nombre || "",
      direccion: servicio?.direccion || servicio?.address || "",
      tipo: servicio?.tipoPropiedad || "Residencial",
      superficie: "N/A",
    },
    tecnico: {
      nombre: servicio?.tecnico_nombre || "",
      especialidad: "Técnico Especialista",
      celular: "",
      correo: "",
    },
    descripcion: servicio?.descripcion || "",
    materiales: [
      { nombre: "", cantidad: 1, unidad: "pza", precio: 0 },
    ],
    observaciones: "El cliente queda satisfecho con el trabajo realizado.",
    imagenes: imagenesEvidencia || [],
    firmaCliente: null,
    firmaTecnico: null,
  }));
  const [reportData, setReportData] = useState(reportInicial);

  const ultimaVersion = versiones[0]?.version || 0;
  const viendoAnterior = versionVista !== null && versionVista < ultimaVersion;

  // Cargar datos reales de la BD
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!idValido) {
        setLoading(false);
        return;
      }
      try {
        const [resFinal, resService, resVersiones] = await Promise.all([
          axios.get(`${API}/servicios/${idApi}/final-report`),
          axios.get(`${API}/servicios/${idApi}`),
          axios.get(`${API}/servicios/${idApi}/final-report/versions`).catch(() => ({ data: [] })),
        ]);
        const s = resService.data;
        servicioRef.current = s;
        setVersiones(resVersiones.data || []);

        if (resFinal.data) {
          setReportData(desdeVersionGuardada(resFinal.data, reportInicial, s));
          setVersionVista(resFinal.data.version || 1);
        } else {
          setReportData(prev => conDatosDelServicio(prev, s));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [trabajoId]);

  // Avisar antes de cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!sinGuardar) return;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sinGuardar]);

  const editar = (actualizar) => {
    setReportData(actualizar);
    setSinGuardar(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = async () => {
    if (sinGuardar && !(await confirmarAccion("Tienes cambios sin guardar. ¿Salir de todos modos?", { peligro: true, confirmar: 'Salir sin guardar' }))) return;
    navigate(-1);
  };

  const abrirVersion = async (version) => {
    if (version === versionVista || cargandoVersion) return;
    if (sinGuardar && !(await confirmarAccion(`Tienes cambios sin guardar. Si abres la versión #${version} se perderán.`, { peligro: true, confirmar: 'Abrir de todos modos' }))) return;

    setCargandoVersion(true);
    try {
      const { data } = await axios.get(`${API}/servicios/${idApi}/final-report`, { params: { version } });
      if (!data) throw new Error('Versión no encontrada');
      setReportData(desdeVersionGuardada(data, reportInicial, servicioRef.current));
      setVersionVista(data.version);
      setSinGuardar(false);
      if (!window.matchMedia('(min-width: 1280px)').matches) setPanelAbierto(false);
    } catch (error) {
      console.error("Error loading version:", error);
      mostrarAviso("No se pudo abrir esa versión.");
    } finally {
      setCargandoVersion(false);
    }
  };

  const handleSave = async () => {
    if (!idValido) {
      mostrarAviso("Error: No se pudo identificar el trabajo. Por favor, regrese e intente de nuevo.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/servicios/${idApi}/final-report`, reportData);
      const nueva = data.report;
      setVersiones(prev => [{
        id: nueva.id,
        version: nueva.version,
        folio: nueva.folio,
        autor: nueva.creador?.name || user?.name || null,
        created_at: nueva.created_at,
      }, ...prev]);
      setVersionVista(nueva.version);
      setSinGuardar(false);
      mostrarAviso(`Se guardó la versión #${nueva.version} del reporte.`, 'success');
    } catch (error) {
      console.error("Error saving report:", error);
      mostrarAviso("Error al guardar el reporte.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section, field, value) => {
    if (section) {
      editar(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      editar(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const valor = field === 'cantidad' || field === 'precio' ? Number(value) : value;
    editar(prev => ({
      ...prev,
      materiales: prev.materiales.map((m, i) => (i === index ? { ...m, [field]: valor } : m)),
    }));
  };

  const addMaterial = () => {
    editar(prev => ({
      ...prev,
      materiales: [...prev.materiales, { nombre: "", cantidad: 1, unidad: "pza", precio: 0 }]
    }));
  };

  const removeMaterial = (index) => {
    editar(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }));
  };

  const toggleImage = (url) => {
    editar(prev => {
      const currentImages = prev.imagenes || [];
      return {
        ...prev,
        imagenes: currentImages.includes(url) ? currentImages.filter(img => img !== url) : [...currentImages, url],
      };
    });
  };

  const elegirPie = (pie) => {
    if ((pie.id ?? null) !== (reportData.pie?.id ?? null)) {
      updateField(null, 'pie', pie.id === null ? null : pie);
    }
    setModalPie(false);
  };

  const elegirLogo = (url) => {
    if (url !== (reportData.logoUrl || null)) updateField(null, 'logoUrl', url);
    setModalLogo(false);
  };

  const totalMateriales = reportData.materiales.reduce(
    (sum, m) => sum + (m.cantidad * m.precio),
    0
  );

  // Validar si el usuario es cliente para restringir edición
  const isClient = Number(user?.role_id) === 3;
  const esAdmin = [0, 1].includes(Number(user?.role_id));

  if (loading) return <div className="loading-report">Cargando editor de reporte...</div>;

  const estadoVersion = sinGuardar
    ? 'Cambios sin guardar'
    : versionVista
      ? `Versión #${versionVista}${viendoAnterior ? ` de ${ultimaVersion}` : ' · la más reciente'}`
      : 'Aún sin guardar';

  // Se monta fuera de #root: las reglas de impresión ocultan todo lo demás de la app
  return createPortal(
    <div className="reporte-modal-backdrop rt-pagina">
      {/* Barra de acciones */}
      <header className="rt-toolbar">
        <button onClick={handleBack} className="rt-btn rt-btn--ghost">
          <ChevronLeft size={18} /> <span>Regresar</span>
        </button>

        <div className="rt-toolbar__titulo">
          <strong>Reporte oficial</strong>
          <span className={`rt-estado ${sinGuardar ? 'rt-estado--pendiente' : ''}`}>
            <i /> {estadoVersion}
          </span>
        </div>

        <div className="rt-toolbar__acciones">
          {!isClient && (
            <button onClick={() => setPanelAbierto(v => !v)} className={`rt-btn rt-btn--soft ${panelAbierto ? 'activo' : ''}`}>
              <History size={17} /> <span>Historial</span>
              {versiones.length > 0 && <em className="rt-badge">{versiones.length}</em>}
            </button>
          )}
          {!isClient && (
            <button onClick={handleSave} className="rt-btn rt-btn--primary" disabled={saving}>
              <Save size={17} /> <span>{saving ? "Guardando..." : `Guardar versión #${ultimaVersion + 1}`}</span>
            </button>
          )}
          <button onClick={handlePrint} className="rt-btn rt-btn--dark">
            <Printer size={17} /> <span>Imprimir</span>
          </button>
        </div>
      </header>

      <div className={`rt-layout ${panelAbierto && !isClient ? 'con-panel' : ''}`}>
        <div className="rt-documento">
          {viendoAnterior && !isClient && (
            <div className="rt-aviso-version">
              <History size={18} />
              <p>
                Estás viendo la <strong>versión #{versionVista}</strong>. Si la editas y guardas, se creará la
                <strong> versión #{ultimaVersion + 1}</strong>; esta versión no se modifica.
              </p>
              <button onClick={() => abrirVersion(ultimaVersion)} className="rt-link">
                Ir a la más reciente <ArrowUpRight size={14} />
              </button>
            </div>
          )}

          <div ref={componentRef} className={`${isClient ? "reporte-content" : "reporte-content editable-mode"} ${cargandoVersion ? 'rt-cargando' : ''}`}>
            {/* Encabezado */}
            <div className="reporte-header">
              <div className="header-left">
                {isClient ? (
                  <img src={reportData.logoUrl || logo} alt="Logo" className="logo-reporte" />
                ) : (
                  <button type="button" className="rt-logo-editable" onClick={() => setModalLogo(true)} title="Cambiar logo">
                    <img src={reportData.logoUrl || logo} alt="Logo" className="logo-reporte" />
                    <span className="rt-logo-editable__hint"><ImagePlus size={14} /> Cambiar logo</span>
                  </button>
                )}
              </div>
              <div className="header-right">
                <div className="folio-box">
                  <span className="folio-label">FOLIO:</span>
                  <input
                    className="editable-folio"
                    value={reportData.folio}
                    onChange={(e) => updateField(null, 'folio', e.target.value)}
                    disabled={isClient}
                  />
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="reporte-title">
              <h2>REPORTE DE TRABAJO REALIZADO</h2>
              <div className="rt-meta">
                <label className="rt-meta__item">
                  <Calendar size={13} />
                  <span className="rt-meta__label">Fecha:</span>
                  <input
                    type="date"
                    className="rt-meta__input"
                    value={aISO(reportData.fechaTrabajo)}
                    onChange={(e) => updateField(null, 'fechaTrabajo', deISO(e.target.value))}
                    disabled={isClient}
                  />
                </label>
                <div className="rt-meta__item">
                  <Clock size={13} />
                  <span className="rt-meta__label">Horario:</span>
                  <input
                    type="time"
                    className="rt-meta__input"
                    value={a24h(reportData.horaInicio)}
                    onChange={(e) => updateField(null, 'horaInicio', de24h(e.target.value))}
                    disabled={isClient}
                    aria-label="Hora de inicio"
                  />
                  <span className="rt-meta__sep">a</span>
                  <input
                    type="time"
                    className="rt-meta__input"
                    value={a24h(reportData.horaFin)}
                    onChange={(e) => updateField(null, 'horaFin', de24h(e.target.value))}
                    disabled={isClient}
                    aria-label="Hora de fin"
                  />
                </div>
              </div>
            </div>

            {/* Info Cliente */}
            <div className="info-section">
              <h3>INFORMACIÓN DEL CLIENTE</h3>
              <div className="info-grid-2cols">
                <div className="info-linea">
                  <strong>NOMBRE:</strong>
                  <input className="editable-span" value={reportData.cliente.nombre} onChange={(e) => updateField('cliente', 'nombre', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea">
                  <strong>TELÉFONO:</strong>
                  <input className="editable-span" value={reportData.cliente.telefono} onChange={(e) => updateField('cliente', 'telefono', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea full-width">
                  <strong>CORREO:</strong>
                  <input className="editable-span" value={reportData.cliente.correo} onChange={(e) => updateField('cliente', 'correo', e.target.value)} disabled={isClient} />
                </div>
              </div>
            </div>

            {/* Info Propiedad */}
            <div className="info-section">
              <h3>INFORMACIÓN DE LA PROPIEDAD</h3>
              <div className="info-grid-2cols">
                <div className="info-linea">
                  <strong>PROPIEDAD:</strong>
                  <input className="editable-span" value={reportData.propiedad.nombre} onChange={(e) => updateField('propiedad', 'nombre', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea">
                  <strong>TIPO:</strong>
                  <input className="editable-span" value={reportData.propiedad.tipo} onChange={(e) => updateField('propiedad', 'tipo', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea full-width">
                  <strong>DIRECCIÓN:</strong>
                  <input className="editable-span" value={reportData.propiedad.direccion} onChange={(e) => updateField('propiedad', 'direccion', e.target.value)} disabled={isClient} />
                </div>
              </div>
            </div>

            {/* Técnico */}
            <div className="info-section">
              <h3>TÉCNICO RESPONSABLE</h3>
              <div className="info-grid-2cols">
                <div className="info-linea full-width">
                  <strong>NOMBRE:</strong>
                  <input className="editable-span" value={reportData.tecnico.nombre} onChange={(e) => updateField('tecnico', 'nombre', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea">
                  <strong>ESPECIALIDAD:</strong>
                  <input className="editable-span" value={reportData.tecnico.especialidad} onChange={(e) => updateField('tecnico', 'especialidad', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea">
                  <strong>CELULAR:</strong>
                  <input className="editable-span" value={reportData.tecnico.celular} onChange={(e) => updateField('tecnico', 'celular', e.target.value)} disabled={isClient} />
                </div>
                <div className="info-linea full-width">
                  <strong>CORREO:</strong>
                  <input className="editable-span" value={reportData.tecnico.correo} onChange={(e) => updateField('tecnico', 'correo', e.target.value)} disabled={isClient} />
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="info-section">
              <h3>DESCRIPCIÓN DEL TRABAJO</h3>
              <div className="descripcion-box">
                <textarea
                  className="editable-textarea"
                  value={reportData.descripcion}
                  onChange={(e) => updateField(null, 'descripcion', e.target.value)}
                  placeholder="Escribe aquí el resumen de las actividades realizadas..."
                  disabled={isClient}
                />
                {/* Al imprimir se usa el texto (ocupa solo lo que mide), no el cuadro de edición */}
                <div className="rt-texto-impreso">{reportData.descripcion}</div>
              </div>
            </div>

            {/* Materiales */}
            <div className="info-section">
              <h3>MATERIALES UTILIZADOS
                {!isClient && <button className="btn-add-item no-print" onClick={addMaterial}><Plus size={14} /> AGREGAR</button>}
              </h3>
              <table className="materiales-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th style={{ width: '60px' }}>Cant.</th>
                    <th style={{ width: '80px' }}>Unidad</th>
                    <th style={{ width: '100px' }}>P. Unitario</th>
                    <th style={{ width: '100px' }}>Subtotal</th>
                    {!isClient && <th className="no-print" style={{ width: '40px' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.materiales.map((material, idx) => (
                    <tr key={idx}>
                      <td><input className="table-input" value={material.nombre} onChange={(e) => handleMaterialChange(idx, 'nombre', e.target.value)} disabled={isClient} /></td>
                      <td><input className="table-input center" type="number" value={material.cantidad} onChange={(e) => handleMaterialChange(idx, 'cantidad', e.target.value)} disabled={isClient} /></td>
                      <td><input className="table-input center" value={material.unidad} onChange={(e) => handleMaterialChange(idx, 'unidad', e.target.value)} disabled={isClient} /></td>
                      <td><input className="table-input" type="number" value={material.precio} onChange={(e) => handleMaterialChange(idx, 'precio', e.target.value)} disabled={isClient} /></td>
                      <td>${(material.cantidad * material.precio).toFixed(2)}</td>
                      {!isClient && (
                        <td className="no-print">
                          <button className="btn-row-delete" onClick={() => removeMaterial(idx)}><Trash2 size={12} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan="4" className="total-label">TOTAL MATERIALES:</td>
                    <td className="total-amount">${totalMateriales.toFixed(2)}</td>
                    {!isClient && <td className="no-print"></td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Galería */}
            <div className="info-section">
              <h3>EVIDENCIA FOTOGRÁFICA</h3>
              <div className="galeria-imagenes">
                {reportData.imagenes.map((img, idx) => (
                  <div key={idx} className="imagen-item">
                    <img
                      src={img}
                      alt={`Evidencia ${idx + 1}`}
                      onClick={() => setSelectedImage(img)}
                      style={{ cursor: 'zoom-in' }}
                    />

                    {/* Botón de eliminar en hover (no se imprime) */}
                    {!isClient && (
                      <button
                        className="btn-delete-photo no-print"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImage(img);
                        }}
                        title="Eliminar de este reporte"
                      >
                        <X size={18} />
                      </button>
                    )}

                    <div className="photo-zoom-hint no-print" onClick={() => setSelectedImage(img)}>
                      <Maximize2 size={12} />
                    </div>

                    <p className="no-print">Foto {idx + 1}</p>
                  </div>
                ))}
                {reportData.imagenes.length === 0 && <p className="empty-gallery">No hay imágenes en el reporte.</p>}
              </div>
            </div>

            {/* Observaciones */}
            <div className="info-section">
              <h3>OBSERVACIONES Y RECOMENDACIONES</h3>
              <div className="observaciones-box">
                <textarea
                  className="editable-textarea"
                  value={reportData.observaciones}
                  onChange={(e) => updateField(null, 'observaciones', e.target.value)}
                  disabled={isClient}
                />
                <div className="rt-texto-impreso">{reportData.observaciones}</div>
              </div>
            </div>

            {/* Firmas */}
            <div className="firmas-section">
              <div className="firma-cliente">
                <div className="firma-linea">
                  <div className="linea-firma"></div>
                </div>
                <p>Firma del Cliente</p>
              </div>
              <div className="firma-tecnico">
                <div className="firma-linea">
                  <div className="linea-firma"></div>
                </div>
                <p>Firma del Técnico</p>
              </div>
            </div>

            {/* Pie de página */}
            {isClient ? (
              <div className="reporte-footer">
                <TextoPie pie={reportData.pie || PIE_AGENTE} />
              </div>
            ) : (
              <button type="button" className="reporte-footer rt-pie-editable" onClick={() => setModalPie(true)} title="Cambiar pie de página">
                <TextoPie pie={reportData.pie || PIE_AGENTE} />
                <span className="rt-logo-editable__hint"><Pencil size={12} /> Cambiar pie de página</span>
              </button>
            )}
          </div>
        </div>

        {/* Historial de versiones */}
        {!isClient && panelAbierto && (
          <>
            <div className="rt-panel-fondo" onClick={() => setPanelAbierto(false)} />
            <aside className="rt-historial">
              <div className="rt-historial__cabecera">
                <div>
                  <h3>Historial de versiones</h3>
                  <p>Cada vez que guardas se crea una versión nueva.</p>
                </div>
                <button type="button" className="rt-icon-btn" onClick={() => setPanelAbierto(false)} aria-label="Cerrar historial"><X size={18} /></button>
              </div>

              {versiones.length === 0 ? (
                <div className="rt-historial__vacio">
                  <History size={28} />
                  <p>Aún no hay versiones guardadas.</p>
                  <span>Al guardar se creará la versión #1.</span>
                </div>
              ) : (
                <ol className="rt-historial__lista">
                  {versiones.map((v) => {
                    const activa = v.version === versionVista;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          className={`rt-version ${activa ? 'activa' : ''}`}
                          onClick={() => abrirVersion(v.version)}
                          disabled={cargandoVersion}
                        >
                          <span className="rt-version__num">#{v.version}</span>
                          <span className="rt-version__info">
                            <span className="rt-version__fecha">{formatoFechaVersion(v.created_at)}</span>
                            <span className="rt-version__autor">{v.autor || 'Sin autor'}</span>
                          </span>
                          {v.version === ultimaVersion && <span className="rt-tag">Actual</span>}
                          {activa && v.version !== ultimaVersion && <span className="rt-tag rt-tag--gris">Abierta</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </aside>
          </>
        )}
      </div>

      {/* Modal de Zoom de Imagen */}
      {selectedImage && (
        <div className="image-zoom-modal no-print" onClick={() => setSelectedImage(null)}>
          <div className="zoom-modal-content" onClick={e => e.stopPropagation()}>
            <button className="zoom-close-btn" onClick={() => setSelectedImage(null)}>
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Zoom evidencia" className="zoom-main-image" />
          </div>
        </div>
      )}

      {modalLogo && (
        <ModalLogo
          trabajo={idApi}
          actual={reportData.logoUrl || null}
          puedeBorrar={esAdmin}
          onElegir={elegirLogo}
          onCerrar={() => setModalLogo(false)}
        />
      )}

      {modalPie && (
        <ModalPie
          actual={reportData.pie}
          puedeBorrar={esAdmin}
          onElegir={elegirPie}
          onCerrar={() => setModalPie(false)}
        />
      )}
    </div>,
    document.body
  );
};

export default ReporteTrabajo;
