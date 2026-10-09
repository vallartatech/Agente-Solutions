import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText, Home, User, Wrench, Clock, MapPin, CheckCircle, Eye, Maximize2 } from 'lucide-react';
import axios from 'axios';
import logo from '../../../assets/Logo3.png';
import '../../../styles/AgenteSolutions/Admin/ReporteTrabajo.css';

const ModalReportePdfTecnico = ({ isOpen, onClose, job, boardJobReports = [], boardPhotos = [] }) => {
  const componentRef = useRef();
  const [selectedZoomImage, setSelectedZoomImage] = useState(null);
  const [fetchedReports, setFetchedReports] = useState([]);
  const [finalReportData, setFinalReportData] = useState(null);

  useEffect(() => {
    if (isOpen && job?.id) {
      const loadDetailedData = async () => {
        try {
          const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};

          // Intentar obtener reportes de evidencias si no vienen por props
          if (!boardJobReports || boardJobReports.length === 0) {
            try {
              const resRep = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/work_order-${job.id}/reportes`, { headers });
              if (resRep.data && Array.isArray(resRep.data)) {
                setFetchedReports(resRep.data);
              }
            } catch (e) {
              console.warn("No se pudieron cargar reportes adicionales:", e);
            }
          }

          // Intentar obtener final-report guardado
          try {
            const resFinal = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/work_order-${job.id}/final-report`, { headers });
            if (resFinal.data) {
              setFinalReportData(resFinal.data);
            }
          } catch (e) {
            // Ignorar si no existe
          }
        } catch (err) {
          console.warn("Error cargando datos para PDF:", err);
        }
      };

      loadDetailedData();
    }
  }, [isOpen, job?.id]);

  if (!isOpen || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  const resolveImageUrl = (imgObj) => {
    if (!imgObj) return null;
    if (typeof imgObj === 'string') {
      const clean = imgObj.trim();
      if (clean === '' || clean === 'null' || clean === 'undefined') return null;
      if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
        return clean;
      }
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const hostBase = apiBase.replace(/\/api\/?$/, '');
      const cleanPath = clean.replace(/^\/?(storage\/)?/, '');
      return `${hostBase}/storage/${cleanPath}`;
    }
    if (typeof imgObj === 'object') {
      const path = imgObj.image_url || imgObj.url || imgObj.path || imgObj.image_path || imgObj.photo_path;
      return resolveImageUrl(path);
    }
    return null;
  };

  // Formateo de Folio
  const folioDisplay = finalReportData?.folio || job.folio || `FT-${new Date().getFullYear()}-${String(job.id || '001').padStart(3, '0')}`;

  // Fecha y Horario
  const rawDate = job.scheduled_at || job.scheduled_date || job.fecha_cita || new Date();
  const fechaFormateada = new Date(rawDate).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const horaFormateada = job.scheduled_at 
    ? new Date(job.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : '09:00 AM - 01:00 PM';

  // Datos Cliente
  const clienteNombre = finalReportData?.cliente?.nombre || job.client_name || job.cliente || job.propietario || 'Cliente de la Red';
  const clienteTelefono = finalReportData?.cliente?.telefono || job.client_phone || job.telefono_cliente || job.telefono || 'No registrado';
  const clienteCorreo = finalReportData?.cliente?.correo || job.client_email || job.email || 'Contacto vía Plataforma Agente';

  // Datos Propiedad
  const propiedadNombre = finalReportData?.propiedad?.nombre || (job.property?.property_code ? `[${job.property.property_code}] ` : '') + (job.property_name || job.property?.type || 'Residencial');
  const propiedadTipo = finalReportData?.propiedad?.tipo || job.property?.type || 'Casa / Residencial';
  const propiedadDireccion = finalReportData?.propiedad?.direccion || job.full_address || job.calle || job.property?.address || job.address || job.zona || 'Mérida, Yucatán';

  // Datos Técnico
  const tecnicoNombre = finalReportData?.tecnico?.nombre || job.tecnico_nombre || job.technician_name || 'Técnico Especialista de la Red';
  const tecnicoEspecialidad = finalReportData?.tecnico?.especialidad || job.tecnico_specialty || job.tipo || 'Instalaciones y Mantenimiento';
  const tecnicoCelular = finalReportData?.tecnico?.celular || job.tecnico_celular || 'Soporte Agente Solutions';
  const tecnicoCorreo = finalReportData?.tecnico?.correo || job.tecnico_email || 'soporte@agentesolutions.com';

  // Descripción y Equipo
  const descripcionTrabajo = finalReportData?.descripcion || job.descripcion || job.titulo || 'Servicio técnico especializado y mantenimiento general ejecutado en sitio.';
  const equipoAfectado = job.equipo || null;

  // Materiales / Presupuesto
  const materiales = (finalReportData?.materiales && finalReportData.materiales.length > 0)
    ? finalReportData.materiales
    : (Array.isArray(job.materiales) && job.materiales.length > 0)
      ? job.materiales
      : [
          {
            nombre: job.titulo || job.tipo || 'Mano de Obra y Servicio Técnico Especializado',
            cantidad: 1,
            unidad: 'Serv',
            precio: Number(job.agreed_price || job.precio || 0)
          }
        ];

  const totalMateriales = materiales.reduce((sum, m) => sum + (Number(m.cantidad || 1) * Number(m.precio || 0)), 0);

  // Recopilación de Imágenes (Fachada + Reportes Técnicos + Evidencias de Cliente)
  const allImagesList = [];

  // 1. Fachada de la Propiedad
  const rawFacade = job.facade_photo || 
                    job.foto_fachada || 
                    job.property?.facade_photo_path || 
                    job.property?.facade_photo || 
                    job.property?.foto_fachada || 
                    job.property_facade_photo_path ||
                    null;
  const facadeUrl = resolveImageUrl(rawFacade);
  if (facadeUrl) {
    allImagesList.push({ url: facadeUrl, label: 'FACHADA DEL INMUEBLE' });
  }

  // 2. Reportes de Etapas Técnicas (Antes, Durante, Después, Extra)
  const activeReports = (boardJobReports && boardJobReports.length > 0) ? boardJobReports : fetchedReports;
  if (activeReports && activeReports.length > 0) {
    activeReports.forEach((r, idx) => {
      const rUrl = resolveImageUrl(r.image_url || r.photo_url || r.path);
      if (rUrl && !allImagesList.some(i => i.url === rUrl)) {
        allImagesList.push({
          url: rUrl,
          label: r.description || `EVIDENCIA TÉCNICA ${idx + 1}`
        });
      }
    });
  }

  // 3. Fotos locales o pasadas por array
  if (Array.isArray(boardPhotos) && boardPhotos.length > 0) {
    const stageLabels = ['[ANTES] Diagnóstico Inicial', '[DURANTE] Servicio en Curso', '[DESPUÉS] Trabajo Terminado', '[EXTRA] Evidencia Adicional'];
    boardPhotos.forEach((pUrl, pIdx) => {
      if (pUrl && typeof pUrl === 'string' && !allImagesList.some(i => i.url === pUrl)) {
        allImagesList.push({
          url: pUrl,
          label: stageLabels[pIdx] || `EVIDENCIA ${pIdx + 1}`
        });
      }
    });
  }

  // 4. Evidencias subidas por el cliente inicialmente
  const rawClientEvidences = [
    job.evidence_path,
    job.evidence_path_2,
    job.evidence_path_3,
    job.evidence_photo,
    job.foto_evidencia,
    ...(job.fotos || []),
    ...(job.evidencias || [])
  ].filter(Boolean);

  rawClientEvidences.forEach((cPhoto, cIdx) => {
    const cUrl = resolveImageUrl(cPhoto);
    if (cUrl && !allImagesList.some(i => i.url === cUrl)) {
      allImagesList.push({
        url: cUrl,
        label: `EVIDENCIA CLIENTE ${cIdx + 1}`
      });
    }
  });

  const isDone = ['Finalizado', 'Listo', 'Terminado', 'Completado', 'Aprobado', 'Entregado'].includes(job.status);
  const estadoDisplay = isDone ? 'Concluido / Listo' : (job.status || 'En Proceso');

  return createPortal(
    <div className="reporte-modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 8, 15, 0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 99999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflowY: 'auto',
      padding: '24px 12px',
      boxSizing: 'border-box'
    }}>
      {/* ── BARRA SUPERIOR DE ACCIONES FLOTANTE (NO SE IMPRIME) ── */}
      <div className="no-print" style={{
        position: 'sticky',
        top: '8px',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '900px',
        background: 'linear-gradient(135deg, #191e2b, #11141e)',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '10px 18px',
        marginBottom: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        boxSizing: 'border-box'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
          <FileText size={18} color="#f26522" />
          <span style={{ fontWeight: '800', fontSize: '0.88rem', letterSpacing: '0.4px' }}>
            REPORTE TÉCNICO OFICIAL - {folioDisplay}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #f26522, #ea580c)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)'
            }}
          >
            <Printer size={15} /> IMPRIMIR / DESCARGAR PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <X size={15} /> CERRAR
          </button>
        </div>
      </div>

      {/* ── HOJA OFICIAL DEL REPORTE (IDÉNTICA A REPORTE TRABAJO DE AGENTE) ── */}
      <div 
        ref={componentRef} 
        className="reporte-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#1a1a1a',
          maxWidth: '900px',
          width: '100%',
          borderRadius: '8px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
          marginBottom: '50px',
          boxSizing: 'border-box'
        }}
      >
        {/* Encabezado Oficial */}
        <div className="reporte-header">
          <div className="header-left">
            <img src={logo} alt="Agente Solutions" className="logo-reporte" />
          </div>
          <div className="header-right">
            <div className="folio-box">
              <span className="folio-label">FOLIO:</span>
              <span className="folio-number">{folioDisplay}</span>
            </div>
          </div>
        </div>

        {/* Título Principal */}
        <div className="reporte-title">
          <h2>REPORTE DE TRABAJO REALIZADO</h2>
          <div className="fecha-trabajo">
            <span>📅 Fecha: <strong>{fechaFormateada}</strong></span>
            <span>⏰ Horario: <strong>{horaFormateada}</strong></span>
            <span>📌 Estado: <strong style={{ color: isDone ? '#16a34a' : '#f26522' }}>{estadoDisplay}</strong></span>
          </div>
        </div>

        {/* 1. Información del Cliente */}
        <div className="info-section">
          <h3>INFORMACIÓN DEL CLIENTE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>NOMBRE:</strong> 
              <span>{clienteNombre}</span>
            </div>
            <div className="info-linea">
              <strong>TELÉFONO:</strong> 
              <span>{clienteTelefono}</span>
            </div>
            <div className="info-linea full-width">
              <strong>CORREO:</strong> 
              <span>{clienteCorreo}</span>
            </div>
          </div>
        </div>

        {/* 2. Información de la Propiedad */}
        <div className="info-section">
          <h3>INFORMACIÓN DE LA PROPIEDAD</h3>
          <div className="info-grid-2cols">
            <div className="info-linea">
              <strong>PROPIEDAD:</strong> 
              <span>{propiedadNombre}</span>
            </div>
            <div className="info-linea">
              <strong>TIPO:</strong> 
              <span>{propiedadTipo}</span>
            </div>
            <div className="info-linea full-width">
              <strong>DIRECCIÓN:</strong> 
              <span>{propiedadDireccion}</span>
            </div>
          </div>
        </div>

        {/* 3. Técnico Responsable */}
        <div className="info-section">
          <h3>TÉCNICO RESPONSABLE</h3>
          <div className="info-grid-2cols">
            <div className="info-linea full-width">
              <strong>NOMBRE:</strong> 
              <span>{tecnicoNombre}</span>
            </div>
            <div className="info-linea">
              <strong>ESPECIALIDAD:</strong> 
              <span>{tecnicoEspecialidad}</span>
            </div>
            <div className="info-linea">
              <strong>CELULAR:</strong> 
              <span>{tecnicoCelular}</span>
            </div>
            <div className="info-linea full-width">
              <strong>CORREO:</strong> 
              <span>{tecnicoCorreo}</span>
            </div>
          </div>
        </div>

        {/* 4. Descripción del Trabajo */}
        <div className="info-section">
          <h3>DESCRIPCIÓN DEL TRABAJO</h3>
          <div className="descripcion-box">
            <p>{descripcionTrabajo}</p>
            {equipoAfectado && (
              <p style={{ marginTop: '6px', fontSize: '0.68rem', color: '#475569', fontWeight: 'bold' }}>
                Componente / Área Afectada: {equipoAfectado}
              </p>
            )}
          </div>
        </div>

        {/* 5. Materiales Utilizados y Cotización */}
        <div className="info-section">
          <h3>MATERIALES UTILIZADOS Y CONCEPTOS</h3>
          <table className="materiales-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Cant.</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Unidad</th>
                <th style={{ width: '110px', textAlign: 'right' }}>P. Unitario</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((material, idx) => (
                <tr key={idx}>
                  <td>{material.nombre || 'Servicio Técnico Especializado'}</td>
                  <td style={{ textAlign: 'center' }}>{material.cantidad || 1}</td>
                  <td style={{ textAlign: 'center' }}>{material.unidad || 'pza'}</td>
                  <td style={{ textAlign: 'right' }}>
                    ${Number(material.precio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    ${(Number(material.cantidad || 1) * Number(material.precio || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan="4" className="total-label">TOTAL DEL SERVICIO:</td>
                <td className="total-amount">${totalMateriales.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Galería de Evidencia Fotográfica */}
        <div className="info-section">
          <h3>EVIDENCIA FOTOGRÁFICA DEL SERVICIO ({allImagesList.length})</h3>
          <div className="galeria-imagenes">
            {allImagesList.map((img, idx) => (
              <div 
                key={idx} 
                className="imagen-item"
                onClick={() => setSelectedZoomImage(img.url)}
                title="Clic para ampliar imagen"
              >
                <img src={img.url} alt={img.label} />
                <div className="photo-zoom-hint no-print">
                  <Maximize2 size={12} />
                </div>
                <p className="no-print" style={{
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  color: '#333333',
                  textAlign: 'center',
                  margin: '4px 0 2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 4px'
                }}>
                  {img.label}
                </p>
              </div>
            ))}
            {allImagesList.length === 0 && (
              <p className="empty-gallery" style={{ padding: '10px 0', color: '#888', fontStyle: 'italic', fontSize: '0.72rem' }}>
                No hay fotografías adjuntas registradas en este servicio.
              </p>
            )}
          </div>
        </div>

        {/* 7. Observaciones y Recomendaciones */}
        <div className="info-section">
          <h3>OBSERVACIONES Y RECOMENDACIONES</h3>
          <div className="observaciones-box">
            <p>
              {finalReportData?.observaciones || job.observaciones || "El servicio técnico se ejecutó bajo los estándares de calidad de Agente Solutions. Las evidencias adjuntas certifican la correcta realización del trabajo."}
            </p>
          </div>
        </div>

        {/* 8. Firmas de Conformidad */}
        <div className="firmas-section">
          <div className="firma-cliente">
            <div className="firma-linea">
              <div className="linea-firma"></div>
            </div>
            <p>Firma del Cliente ({clienteNombre})</p>
          </div>
          <div className="firma-tecnico">
            <div className="firma-linea">
              <div className="linea-firma"></div>
            </div>
            <p>Firma del Técnico Responsable ({tecnicoNombre})</p>
          </div>
        </div>

        {/* Pie de página Oficial */}
        <div className="reporte-footer">
          <p>Este documento es un comprobante oficial de los trabajos realizados.</p>
          <p>AGENTE SOLUTIONS - Resolviendo tus necesidades</p>
          <p>Tel: (999) 123-4567 | Email: soporte@agentesolutions.com</p>
        </div>
      </div>

      {/* ── MODAL DE ZOOM DE IMAGEN ── */}
      {selectedZoomImage && (
        <div 
          className="image-zoom-modal no-print" 
          onClick={() => setSelectedZoomImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="zoom-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <button 
              className="zoom-close-btn" 
              onClick={() => setSelectedZoomImage(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#f26522',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
            >
              <X size={20} />
            </button>
            <img 
              src={selectedZoomImage} 
              alt="Zoom evidencia" 
              className="zoom-main-image" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }} 
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ModalReportePdfTecnico;
