// ReporteTrabajo.jsx
import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../../../styles/AgenteMarket/Admin/ReporteTrabajo.css";
import logo from '../../../assets/Logo3.png';
import { Printer, ChevronLeft, Save, Trash2, X, Maximize2, Plus, Calendar, Clock } from 'lucide-react';
import { mostrarAviso } from '../../../utils/dialogos';
import { useAuth } from '../../../context/AuthContext';
import { esTecnicoRed } from '../../../utils/entorno';
import CasaLoader from "../../../components/Shared/CasaLoader";

// Ancho de la hoja carta (21.59cm a 96dpi)
const ANCHO_HOJA_PX = 816;

const ReporteTrabajo = () => {
  const componentRef = useRef();
  const hojaContenedorRef = useRef(null);
  const [hojaEscala, setHojaEscala] = useState({ escala: 1, alto: null });
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { id: paramId } = useParams();
  
  // Datos recibidos de la navegación
  const { trabajoId: stateRawTrabajoId, servicio, imagenes: imagenesEvidencia } = location.state || {};
  
  const rawTrabajoId = paramId || stateRawTrabajoId;
  
  // Extraer el ID numérico real en caso de que venga con prefijo (ej. work_order-5)
  const trabajoId = rawTrabajoId?.toString().includes('-') 
    ? rawTrabajoId.split('-')[1] 
    : rawTrabajoId;

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
  
  // Estado principal del reporte
  const [reportData, setReportData] = useState({
    folio: `FT-${new Date().getFullYear()}-${String(cleanIdForFolio(trabajoId)).padStart(3, '0')}`,
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
  });

  // Cargar datos reales de la BD
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!trabajoId || trabajoId === "null" || trabajoId === "undefined") {
        setLoading(false);
        return;
      }
      try {
        // 1. Intentar cargar reporte final guardado
        const resFinal = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${rawTrabajoId || trabajoId}/final-report`);
        
        // 2. Cargar datos del servicio/cliente reales de la BD SIEMPRE
        const resService = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${rawTrabajoId || trabajoId}`);
        const s = resService.data;
        
        const isInvalid = (val) => !val || val === "Sin Propietario" || val === "Dirección no registrada" || val === "Propiedad Sin Nombre" || val === "N/A" || val === "Cargando..." || val === "Usuario" || (typeof val === 'string' && val.trim() === "");
        const getValid = (...values) => {
            for(let v of values) {
                if(!isInvalid(v)) return v;
            }
            return "";
        };

        if (resFinal.data) {
          // Si ya existe un reporte guardado, lo usamos PERO rellenamos vacíos con datos frescos o del estado previo
          const f = resFinal.data;
          setReportData(prev => ({
            ...prev,
            ...f,
            cliente: { 
              nombre: getValid(f.cliente?.nombre, prev.cliente.nombre, s.propietario, s.cliente_nombre),
              telefono: getValid(f.cliente?.telefono, prev.cliente.telefono, s.telefono_cliente),
              correo: getValid(f.cliente?.correo, prev.cliente.correo, s.cliente_email, s.email),
              direccion: getValid(f.cliente?.direccion, prev.cliente.direccion, s.direccion, s.address),
            },
            propiedad: { 
              nombre: getValid(f.propiedad?.nombre, prev.propiedad.nombre, s.propiedad_nombre),
              direccion: getValid(f.propiedad?.direccion, prev.propiedad.direccion, s.direccion, s.address),
              tipo: getValid(f.propiedad?.tipo, prev.propiedad.tipo, s.tipoPropiedad, "Residencial"),
              superficie: getValid(f.propiedad?.superficie, prev.propiedad.superficie, s.superficie, "N/A"),
            },
            tecnico: { 
              ...prev.tecnico, 
              ...(f.tecnico || {}),
              nombre: getValid(f.tecnico?.nombre, prev.tecnico.nombre, (s.technicians?.length ? s.technicians.map(t=>t.name).join(', ') : s.tecnico)),
              celular: getValid(f.tecnico?.celular, prev.tecnico.celular, (s.technicians?.length ? s.technicians.map(t=>t.phone_number).filter(Boolean).join(', ') : s.tecnico_celular)),
              correo: getValid(f.tecnico?.correo, prev.tecnico.correo, (s.technicians?.length ? s.technicians.map(t=>t.email).filter(Boolean).join(', ') : s.tecnico_email)),
            },
          }));
        } else {
          // 3. Si no hay reporte guardado, cargar datos del estado previo y rellenar con servicio real de la BD
          setReportData(prev => ({
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
              nombre: getValid(prev.tecnico.nombre, (s.technicians?.length ? s.technicians.map(t=>t.name).join(', ') : s.tecnico)),
              especialidad: "Técnico Especialista",
              celular: getValid(prev.tecnico.celular, (s.technicians?.length ? s.technicians.map(t=>t.phone_number).filter(Boolean).join(', ') : s.tecnico_celular)),
              correo: getValid(prev.tecnico.correo, (s.technicians?.length ? s.technicians.map(t=>t.email).filter(Boolean).join(', ') : s.tecnico_email)),
            },
            descripcion: getValid(prev.descripcion, s.descripcion),
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [trabajoId]);

  // La hoja mide siempre lo mismo (carta) y se escala al ancho disponible, igual que un PDF
  useEffect(() => {
    const contenedor = hojaContenedorRef.current;
    const hoja = componentRef.current;
    if (!contenedor || !hoja) return;

    const ajustar = () => {
      const escala = Math.min(1, contenedor.clientWidth / ANCHO_HOJA_PX);
      setHojaEscala({ escala, alto: hoja.offsetHeight * escala });
    };
    ajustar();

    const observador = new ResizeObserver(ajustar);
    observador.observe(contenedor);
    observador.observe(hoja);
    return () => observador.disconnect();
  }, [loading]);

  // El resto de la app bloquea el zoom; aquí se permite para acercar el documento con los dedos
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const original = viewport.getAttribute('content');
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover, interactive-widget=resizes-content');
    return () => viewport.setAttribute('content', original);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!trabajoId || trabajoId === "null" || trabajoId === "undefined") {
      mostrarAviso("Error: No se pudo identificar el trabajo. Por favor, regrese e intente de nuevo.");
      return;
    }

    setSaving(true);
    try {
      // Re-construir el ID con prefijo correcto para el backend
      const isWorkOrder = rawTrabajoId?.toString().includes('work_order');
      const apiId = isWorkOrder ? `work_order-${trabajoId}` : (rawTrabajoId?.toString().includes('servicio') ? `servicio-${trabajoId}` : trabajoId);

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${apiId}/final-report`, {
        ...reportData,
        service_id: isWorkOrder ? null : trabajoId,
        work_order_id: isWorkOrder ? trabajoId : null
      });
      mostrarAviso("¡Reporte guardado con éxito!");
    } catch (error) {
      console.error("Error saving report:", error);
      mostrarAviso("Error al guardar el reporte.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section, field, value) => {
    if (section) {
      setReportData(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setReportData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const newMateriales = [...reportData.materiales];
    newMateriales[index][field] = field === 'cantidad' || field === 'precio' ? Number(value) : value;
    setReportData(prev => ({ ...prev, materiales: newMateriales }));
  };

  const addMaterial = () => {
    setReportData(prev => ({
      ...prev,
      materiales: [...prev.materiales, { nombre: "", cantidad: 1, unidad: "pza", precio: 0 }]
    }));
  };

  const removeMaterial = (index) => {
    setReportData(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }));
  };

  const toggleImage = (url) => {
      const currentImages = reportData.imagenes || [];
      if (currentImages.includes(url)) {
          setReportData(prev => ({ ...prev, imagenes: currentImages.filter(img => img !== url) }));
      } else {
          setReportData(prev => ({ ...prev, imagenes: [...currentImages, url] }));
      }
  };

  const totalMateriales = reportData.materiales.reduce(
    (sum, m) => sum + (m.cantidad * m.precio),
    0
  );

  // Solo los técnicos de la red pueden editar el reporte
  const soloLectura = !esTecnicoRed(user);
  const materialesVisibles = soloLectura
    ? reportData.materiales.filter(m => String(m.nombre || '').trim() !== '')
    : reportData.materiales;

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: '#0b1329' }}><CasaLoader texto="Cargando reporte..." fondoOscuro /></div>;

  return (
    <div className="reporte-container">
      <div className={`print-actions no-print ${soloLectura ? 'lectura' : ''}`}>
        <button onClick={() => navigate(-1)} className="btn-back">
          <ChevronLeft size={18} /> REGRESAR
        </button>
        <div className="reporte-acciones">
          {!soloLectura && (
            <button onClick={handleSave} className="btn-save" disabled={saving}>
              <Save size={18} /> {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
            </button>
          )}
          <button onClick={handlePrint} className="btn-print">
            <Printer size={18} /> IMPRIMIR REPORTE
          </button>
        </div>
      </div>

      <div
        ref={hojaContenedorRef}
        className="reporte-hoja-contenedor"
        style={{ height: hojaEscala.alto ?? undefined }}
      >
        <div
          className="reporte-hoja-escala"
          style={{ width: `${ANCHO_HOJA_PX}px`, transform: `scale(${hojaEscala.escala})` }}
        >
      <div ref={componentRef} className={soloLectura ? "reporte-content" : "reporte-content editable-mode"}>
        {/* Encabezado */}
        <div className="reporte-header">
          <div className="header-left">
            <img src={logo} alt="Logo" className="logo-reporte" />
          </div>
          <div className="header-right">
            <div className="folio-box">
              <span className="folio-label">FOLIO:</span>
              <input 
                className="editable-folio" 
                value={reportData.folio} 
                onChange={(e) => updateField(null, 'folio', e.target.value)} 
                disabled={soloLectura}
              />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="reporte-title">
          <h2>REPORTE DE TRABAJO REALIZADO</h2>
          <div className="fecha-trabajo">
            <span><Calendar size={13} /> Fecha:
                <input type="text" className="inline-input" value={reportData.fechaTrabajo} onChange={(e) => updateField(null, 'fechaTrabajo', e.target.value)} disabled={soloLectura} />
            </span>
            <span><Clock size={13} /> Horario:
                <input type="text" className="inline-input" style={{width: '80px'}} value={reportData.horaInicio} onChange={(e) => updateField(null, 'horaInicio', e.target.value)} disabled={soloLectura} /> - 
                <input type="text" className="inline-input" style={{width: '80px'}} value={reportData.horaFin} onChange={(e) => updateField(null, 'horaFin', e.target.value)} disabled={soloLectura} />
            </span>
          </div>
        </div>

        {/* Info Cliente */}
        <div className="info-section">
          <h3>INFORMACIÓN DEL CLIENTE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>NOMBRE:</strong> 
              <input className="editable-span" value={reportData.cliente.nombre} onChange={(e) => updateField('cliente', 'nombre', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea">
              <strong>TELÉFONO:</strong> 
              <input className="editable-span" value={reportData.cliente.telefono} onChange={(e) => updateField('cliente', 'telefono', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea full-width">
              <strong>CORREO:</strong> 
              <input className="editable-span" value={reportData.cliente.correo} onChange={(e) => updateField('cliente', 'correo', e.target.value)} disabled={soloLectura} />
            </div>
          </div>
        </div>

        {/* Info Propiedad */}
        <div className="info-section">
          <h3>INFORMACIÓN DE LA PROPIEDAD</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>PROPIEDAD:</strong> 
              <input className="editable-span" value={reportData.propiedad.nombre} onChange={(e) => updateField('propiedad', 'nombre', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea">
              <strong>TIPO:</strong> 
              <input className="editable-span" value={reportData.propiedad.tipo} onChange={(e) => updateField('propiedad', 'tipo', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea full-width">
              <strong>DIRECCIÓN:</strong> 
              <input className="editable-span" value={reportData.propiedad.direccion} onChange={(e) => updateField('propiedad', 'direccion', e.target.value)} disabled={soloLectura} />
            </div>
          </div>
        </div>

        {/* Técnico */}
        <div className="info-section">
          <h3>TÉCNICO RESPONSABLE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea full-width">
              <strong>NOMBRE:</strong> 
              <input className="editable-span" value={reportData.tecnico.nombre} onChange={(e) => updateField('tecnico', 'nombre', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea">
              <strong>ESPECIALIDAD:</strong> 
              <input className="editable-span" value={reportData.tecnico.especialidad} onChange={(e) => updateField('tecnico', 'especialidad', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea">
              <strong>CELULAR:</strong> 
              <input className="editable-span" value={reportData.tecnico.celular} onChange={(e) => updateField('tecnico', 'celular', e.target.value)} disabled={soloLectura} />
            </div>
            <div className="info-linea full-width">
              <strong>CORREO:</strong> 
              <input className="editable-span" value={reportData.tecnico.correo} onChange={(e) => updateField('tecnico', 'correo', e.target.value)} disabled={soloLectura} />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="info-section">
          <h3>DESCRIPCIÓN DEL TRABAJO</h3>
          <div className="descripcion-box">
            {soloLectura ? (
              <p className="reporte-texto-lectura">{reportData.descripcion || 'Sin descripción.'}</p>
            ) : (
              <textarea
                  className="editable-textarea"
                  value={reportData.descripcion}
                  onChange={(e) => updateField(null, 'descripcion', e.target.value)}
                  placeholder="Escribe aquí el resumen de las actividades realizadas..."
              />
            )}
          </div>
        </div>

        {/* Materiales */}
        <div className="info-section">
          <h3>MATERIALES UTILIZADOS 
              {!soloLectura && <button className="btn-add-item no-print" onClick={addMaterial}><Plus size={14}/> AGREGAR</button>}
          </h3>
          <table className="materiales-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{width: '60px'}}>Cant.</th>
                <th style={{width: '80px'}}>Unidad</th>
                <th style={{width: '100px'}}>P. Unitario</th>
                <th style={{width: '100px'}}>Subtotal</th>
                {!soloLectura && <th className="no-print" style={{width: '40px'}}></th>}
              </tr>
            </thead>
            <tbody>
              {materialesVisibles.length === 0 && (
                <tr><td colSpan="5" className="materiales-vacio">Sin materiales registrados.</td></tr>
              )}
              {materialesVisibles.map((material, idx) => (
                <tr key={idx}>
                  <td><input className="table-input" value={material.nombre} onChange={(e) => handleMaterialChange(idx, 'nombre', e.target.value)} disabled={soloLectura} /></td>
                  <td><input className="table-input center" type="number" value={material.cantidad} onChange={(e) => handleMaterialChange(idx, 'cantidad', e.target.value)} disabled={soloLectura} /></td>
                  <td><input className="table-input center" value={material.unidad} onChange={(e) => handleMaterialChange(idx, 'unidad', e.target.value)} disabled={soloLectura} /></td>
                  <td><input className="table-input" type="number" value={material.precio} onChange={(e) => handleMaterialChange(idx, 'precio', e.target.value)} disabled={soloLectura} /></td>
                  <td>${(material.cantidad * material.precio).toFixed(2)}</td>
                  {!soloLectura && (
                    <td className="no-print">
                        <button className="btn-row-delete" onClick={() => removeMaterial(idx)}><Trash2 size={12}/></button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan="4" className="total-label">TOTAL MATERIALES:</td>
                <td className="total-amount">${totalMateriales.toFixed(2)}</td>
                {!soloLectura && <td className="no-print"></td>}
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
                {!soloLectura && (
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
            {soloLectura ? (
              <p className="reporte-texto-lectura">{reportData.observaciones || 'Sin observaciones.'}</p>
            ) : (
              <textarea
                  className="editable-textarea"
                  value={reportData.observaciones}
                  onChange={(e) => updateField(null, 'observaciones', e.target.value)}
              />
            )}
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
        <div className="reporte-footer">
          <p>Este documento es un comprobante oficial de los trabajos realizados.</p>
          <p>AGENTE SOLUTIONS - Resolviendo tus necesidades</p>
          <p>Tel: (999) 123-4567 | Email: soporte@agentesolutions.com</p>
        </div>
      </div>
        </div>
      </div>

      {/* Modal de Zoom de Imagen (en body: la escala de la hoja rompería el position: fixed) */}
      {selectedImage && createPortal(
        <div className="image-zoom-modal no-print" onClick={() => setSelectedImage(null)}>
          <div className="zoom-modal-content" onClick={e => e.stopPropagation()}>
            <button className="zoom-close-btn" onClick={() => setSelectedImage(null)}>
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Zoom evidencia" className="zoom-main-image" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReporteTrabajo;
