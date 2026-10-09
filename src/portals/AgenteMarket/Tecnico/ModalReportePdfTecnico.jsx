import React, { useRef } from 'react';
import { Printer, X, FileText, Home, User, Wrench, Clock, MapPin, CheckCircle, Eye } from 'lucide-react';
import logo from '../../../assets/Logo3.png';
import '../../../styles/AgenteSolutions/Admin/ReporteTrabajo.css';

const ModalReportePdfTecnico = ({ isOpen, onClose, job }) => {
  const componentRef = useRef();

  if (!isOpen || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  const resolveImageUrl = (imgObj) => {
    if (!imgObj) return null;
    if (typeof imgObj === 'string') {
      if (imgObj.startsWith('http://') || imgObj.startsWith('https://') || imgObj.startsWith('data:')) {
        return imgObj;
      }
      return `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '')}/storage/${imgObj.replace(/^\/+/, '')}`;
    }
    if (typeof imgObj === 'object') {
      const path = imgObj.url || imgObj.path || imgObj.image_path || imgObj.photo_path;
      return resolveImageUrl(path);
    }
    return null;
  };

  // Formateo de Folio
  const folioDisplay = job.folio || `FT-${new Date().getFullYear()}-${String(job.id || '001').padStart(4, '0')}`;
  
  // Fotos
  const rawFacade = job.facade_photo || 
                    job.foto_fachada || 
                    job.property?.facade_photo_path || 
                    job.property?.foto_fachada || 
                    null;
  const facadeUrl = resolveImageUrl(rawFacade);

  const clientEvidences = (job.evidencias || job.evidence_photos || job.fotos || []).map(resolveImageUrl).filter(Boolean);

  const materiales = Array.isArray(job.materiales) && job.materiales.length > 0 
    ? job.materiales 
    : [
        { nombre: job.tipo || job.titulo || 'Servicio Técnico Especializado', cantidad: 1, unidad: 'Serv', precio: Number(job.agreed_price || job.precio || 0) }
      ];

  const totalMateriales = materiales.reduce((sum, m) => sum + (Number(m.cantidad || 1) * Number(m.precio || 0)), 0);

  return (
    <div className="reporte-modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflowY: 'auto',
      padding: '20px 10px'
    }}>
      {/* Barra Superior de Acciones Flotante */}
      <div className="no-print" style={{
        position: 'sticky',
        top: '10px',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '900px',
        background: 'linear-gradient(135deg, #191e2b, #11141e)',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '14px',
        padding: '10px 18px',
        marginBottom: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
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

      {/* ── HOJA OFICIAL DEL REPORTE (IMPRIMIBLE) ── */}
      <div 
        ref={componentRef} 
        className="reporte-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#111827',
          maxWidth: '900px',
          width: '100%',
          borderRadius: '12px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
          marginBottom: '40px'
        }}
      >
        {/* Encabezado */}
        <div className="reporte-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          padding: '16px 28px',
          borderBottom: '3.5px solid #f26522'
        }}>
          <div className="header-left">
            <img src={logo} alt="Agente Solutions" style={{ maxHeight: '60px', width: 'auto', display: 'block' }} />
          </div>
          <div className="header-right" style={{ textAlign: 'right' }}>
            <div style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-block',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.62rem', display: 'block', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px' }}>
                FOLIO DE ORDEN
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f26522' }}>
                {folioDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Título y Fechas */}
        <div className="reporte-title" style={{ padding: '16px 28px 10px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 6px', letterSpacing: '0.5px' }}>
            REPORTE TÉCNICO DE TRABAJO & DIAGNÓSTICO
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
            <span>📅 Fecha: <strong>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')}</strong></span>
            <span>⏰ Horario: <strong>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Horario Acordado'}</strong></span>
            <span>📌 Estado: <strong style={{ color: '#16a34a' }}>{job.status || 'En Proceso'}</strong></span>
          </div>
        </div>

        {/* Info Grid: Cliente & Propiedad */}
        <div style={{ padding: '10px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Cliente */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              <User size={14} color="#f26522" /> INFORMACIÓN DEL CLIENTE
            </h3>
            <div style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Nombre:</strong> {job.client_name || job.cliente || 'Cliente de la Red'}</div>
              <div><strong>Teléfono:</strong> {job.client_phone || job.telefono || 'No especificado'}</div>
              <div><strong>Contacto:</strong> {job.client_email || 'Contacto vía Plataforma'}</div>
            </div>
          </div>

          {/* Propiedad */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              <Home size={14} color="#f26522" /> INMUEBLE / PROPIEDAD
            </h3>
            <div style={{ fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Inmueble:</strong> {job.property?.property_code ? `[${job.property.property_code}]` : ''} {job.property_name || job.property?.type || 'Residencial'}</div>
              <div><strong>Dirección:</strong> {job.full_address || job.calle || job.property?.address || 'Dirección no registrada'}</div>
              <div><strong>Zona:</strong> {job.zona || job.colonia || 'Mérida, Yucatán'}</div>
            </div>
          </div>
        </div>

        {/* Técnico Asignado */}
        <div style={{ padding: '0 28px 10px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              <Wrench size={14} color="#f26522" /> TÉCNICO ESPECIALISTA RESPONSABLE
            </h3>
            <div style={{ fontSize: '0.76rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div><strong>Nombre del Técnico:</strong> {job.tecnico_nombre || 'Técnico Especialista de la Red'}</div>
              <div><strong>Especialidad:</strong> {job.tecnico_specialty || 'Instalaciones y Mantenimiento'}</div>
              <div><strong>Estado Operativo:</strong> Asignado y Verificado</div>
              <div><strong>Garantía:</strong> Aplica garantía de satisfacción Agente Solutions</div>
            </div>
          </div>
        </div>

        {/* Descripción del Trabajo / Falla */}
        <div style={{ padding: '0 28px 10px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              📝 DESCRIPCIÓN DEL REPORTE / TRABAJO REALIZADO
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>
              {job.descripcion || job.titulo || 'Servicio correctivo y mantenimiento reportado.'}
            </p>
            {job.equipo && (
              <p style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px', fontWeight: '600' }}>
                Componente o área afectada: <strong>{job.equipo}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Galería de Fotos (Fachada + Evidencias) */}
        <div style={{ padding: '0 28px 10px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 10px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              📸 EVIDENCIA FOTOGRÁFICA DEL SERVICIO
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {/* Fachada */}
              {facadeUrl && (
                <div style={{ textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
                  <img src={facadeUrl} alt="Fachada" style={{ width: '100%', height: '95px', objectFit: 'cover' }} />
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: '900', padding: '2px 4px', color: '#f26522', background: '#ffffff' }}>FACHADA</span>
                </div>
              )}
              {/* Evidencias */}
              {clientEvidences.map((evImg, eIdx) => (
                <div key={eIdx} style={{ textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
                  <img src={evImg} alt={`Evidencia ${eIdx + 1}`} style={{ width: '100%', height: '95px', objectFit: 'cover' }} />
                  <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: '800', padding: '2px 4px', color: '#334155', background: '#ffffff' }}>Evidencia {eIdx + 1}</span>
                </div>
              ))}
              {!facadeUrl && clientEvidences.length === 0 && (
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '8px 0', gridColumn: '1 / -1' }}>No se adjuntaron fotografías al reporte.</p>
              )}
            </div>
          </div>
        </div>

        {/* Materiales / Costos */}
        <div style={{ padding: '0 28px 16px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
            <h3 style={{ fontSize: '0.76rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>
              💰 DESGLOSE DE CONCEPTOS / COTIZACIÓN
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Concepto</th>
                  <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Unidad</th>
                  <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>P. Unitario</th>
                  <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((m, mIdx) => (
                  <tr key={mIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px' }}>{m.nombre || 'Servicio Técnico'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.cantidad || 1}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.unidad || 'pza'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>${Number(m.precio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                      ${(Number(m.cantidad || 1) * Number(m.precio || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f1f5f9', fontWeight: '900' }}>
                  <td colSpan="4" style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>TOTAL COTIZADO:</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#16a34a', fontSize: '0.86rem' }}>
                    ${totalMateriales.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Firmas / Pie */}
        <div style={{ padding: '10px 28px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', textAlign: 'center' }}>
          <div>
            <div style={{ borderBottom: '1px solid #475569', height: '40px', marginBottom: '4px' }}></div>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#334155' }}>FIRMA DEL TÉCNICO</span>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid #475569', height: '40px', marginBottom: '4px' }}></div>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#334155' }}>CONFORMIDAD DEL CLIENTE</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#0f172a',
          color: '#94a3b8',
          fontSize: '0.65rem',
          textAlign: 'center',
          padding: '8px 20px',
          fontWeight: '600'
        }}>
          Agente Solutions S.A. de C.V. — Plataforma de Gestión y Conexión Técnica Certificada
        </div>
      </div>
    </div>
  );
};

export default ModalReportePdfTecnico;
