import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Printer, Download, Save, 
  CheckCircle, Clock, Wrench, ShieldCheck,
  CreditCard, FileText, UserCheck, Home, MapPin, Phone
} from 'lucide-react';
import "../../../styles/AgenteSolutions/Admin/VistaCotizacionPrint.css";
import logo from "../../../assets/Logo3.png"; 
import mpLogo from "../../../assets/Mercado-Pago.png";
import html2pdf from 'html2pdf.js';

const IVA_RATE = 0.16;

const VistaCotizacionPrint = () => {
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState(null);
  const [elementosTabla, setElementosTabla] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [pdfGenerado, setPdfGenerado] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Fase seleccionada para el PDF: 'por_pagar' | 'pagado' | 'asignado'
  const [faseActual, setFaseActual] = useState('por_pagar');
  const [escala, setEscala] = useState(1);
  const [notas, setNotas] = useState("");

  // Detectar si quien genera el PDF es Admin o Cliente
  const esAdmin = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const roleId = session?.userData?.role_id;
      return roleId === 0 || roleId === 1; // 0=root, 1=admin
    } catch { return false; }
  })();

  const detectarFaseReal = (cot) => {
    if (!cot) return 'por_pagar';
    const statusLower = String(cot.status || cot.estado || '').toLowerCase();
    const hasTecnico = cot.tecnico && cot.tecnico !== 'Sin Técnico' && cot.tecnico !== 'Pendiente de asignar' && !cot.tecnico.toLowerCase().includes('sin técnico');
    const isPaid = statusLower.includes('pagad') || cot.payment_status === 'approved' || cot.payment_status === 'Validado' || cot.advance_paid || cot.cash_confirmed;

    if (hasTecnico) return 'asignado';
    if (isPaid) return 'pagado';
    return 'por_pagar';
  };

  const generarTextoEspecificaciones = (cot, fase) => {
    if (!cot) return '';
    const propName = cot.propiedad || cot.propiedad_nombre || "Propiedad del Cliente";
    const clientName = cot.cliente || cot.cliente_nombre || "Cliente";
    const folio = cot.folio || `COT-${cot.id}`;
    const descProblema = cot.descripcion_problema || cot.observations || cot.descripcion || '';

    let texto = `=== ESPECIFICACIONES Y TÉRMINOS (${folio}) ===\n`;
    texto += `• Propiedad: ${propName}\n`;
    texto += `• Atención a: ${clientName}\n`;
    if (cot.propiedad_direccion || cot.ubicacion) {
      texto += `• Ubicación: ${cot.propiedad_direccion || cot.ubicacion}\n`;
    }
    if (descProblema && descProblema !== 'N/A') {
      texto += `• Descripción del trabajo: ${descProblema}\n`;
    }
    texto += `\n`;

    if (fase === 'por_pagar') {
      texto += `--- ESTADO: PENDIENTE POR PAGAR ---\n`;
      texto += `• Vigencia de precios: 15 días naturales a partir de la fecha de emisión.\n`;
      texto += `• Garantía de mano de obra: 15 días naturales tras la entrega del servicio.\n`;
      texto += `• La asignación del técnico especialista se realizará inmediatamente al confirmar el pago del anticipo/total.\n`;
    } else if (fase === 'pagado') {
      texto += `--- ESTADO: PAGO CONFIRMADO ---\n`;
      if (cot.mp_payment_data?.mp_payment_id) {
        texto += `• N° Operación MercadoPago: #${cot.mp_payment_data.mp_payment_id}\n`;
      }
      texto += `• Estatus de Asignación: En proceso de asignación de técnico por el área operativa.\n`;
      texto += `• Los materiales y conceptos cotizados quedan reservados para su ejecución.\n`;
    } else if (fase === 'asignado') {
      texto += `--- ESTADO: SERVICIO ASIGNADO Y PROGRAMADO ---\n`;
      texto += `• Técnico Responsable: ${cot.tecnico || 'Técnico Especialista'}\n`;
      if (cot.tecnico_telefono) {
        texto += `• Teléfono de Contacto Técnico: ${cot.tecnico_telefono}\n`;
      }
      if (cot.scheduled_at) {
        texto += `• Fecha Programada de Visita/Servicio: ${cot.scheduled_at}\n`;
      }
      texto += `• Garantía oficial de satisfacción Agente Solutions activa.\n`;
    }

    if (cot.observations && !texto.includes(cot.observations)) {
      texto += `\nObservaciones adicionales:\n${cot.observations}\n`;
    }

    return texto;
  };

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 840) {
        setEscala(Math.max(0.3, (screenWidth - 40) / 794));
      } else {
        setEscala(1);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const datosGuardados = localStorage.getItem('cotizacion_para_imprimir');
    
    if (datosGuardados) {
      const data = JSON.parse(datosGuardados);
      setCotizacion(data);

      const faseInicial = detectarFaseReal(data);
      setFaseActual(faseInicial);
      setNotas(generarTextoEspecificaciones(data, faseInicial));

      // El backend puede enviar 'concept' o 'concepto'
      const rawConcept = data.concept || data.concepto;
      let items = [];
      
      try {
        const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
        
        if (detalle && typeof detalle === 'object') {
          const listadoServicios = detalle.conceptos || detalle.servicios || [];
          listadoServicios.filter(c => c.descripcion || c.precio_u || c.precio).forEach(c => {
            const precio = parseFloat(c.precio_u || c.precio || 0);
            const cant = parseFloat(c.cantidad || 1);
            items.push({ 
              descripcion: c.descripcion || '(Sin Descripción)', 
              cantidad: cant, 
              unidad: 'S', 
              precio_u: precio, 
              importe: cant * precio 
            });
          });

          if (detalle.materiales) {
            detalle.materiales.filter(m => m.nombre || m.descripcion || m.costo_u || m.precio).forEach(m => {
              const precio = parseFloat(m.costo_u || m.precio || 0);
              const cant = parseFloat(m.cantidad || 1);
              items.push({ 
                descripcion: m.nombre || m.descripcion || '(Sin Descripción)', 
                cantidad: cant, 
                unidad: 'PZA', 
                precio_u: precio, 
                importe: cant * precio 
              });
            });
          }
        } else if (rawConcept) {
          items.push({ 
            descripcion: rawConcept, 
            cantidad: 1, 
            unidad: 'S', 
            precio_u: parseFloat(data.total || 0), 
            importe: parseFloat(data.total || 0) 
          });
        }
      } catch (error) {
        if (rawConcept) {
          items.push({ 
            descripcion: rawConcept, 
            cantidad: 1, 
            unidad: 'S', 
            precio_u: parseFloat(data.total || 0), 
            importe: parseFloat(data.total || 0) 
          });
        }
      }
      
      setElementosTabla(items);
    }
  }, []);

  const handleCambiarFase = (nuevaFase) => {
    setFaseActual(nuevaFase);
    setNotas(generarTextoEspecificaciones(cotizacion, nuevaFase));
  };

  const handleGenerarPDF = async () => {
    setGuardando(true);
    
    const elemento = document.getElementById('cotizacion-pdf');
    const opciones = {
      margin: 0,
      filename: `cotizacion_${cotizacion.folio || cotizacion.id}_${faseActual}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opciones).from(elemento).output('blob');

      const formData = new FormData();
      formData.append('pdf', pdfBlob, `cotizacion_${cotizacion.folio || cotizacion.id}_${faseActual}.pdf`);
      formData.append('observaciones', notas);
      formData.append('titulo_seccion', 'ESPECIFICACIONES');

      const respuesta = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacion.id}/finalizar`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPdfUrl(respuesta.data.url);
      setPdfGenerado(true);
      alert("¡PDF de cotización generado y guardado en el sistema con éxito!");
      
    } catch (error) {
      console.error("Error en el proceso:", error);
      alert("Hubo un error al procesar el archivo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargar = () => {
    const elemento = document.getElementById('cotizacion-pdf');
    const opciones = {
      margin: 0,
      filename: `cotizacion_${cotizacion.folio || cotizacion.id}_${faseActual}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opciones).from(elemento).save();
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!cotizacion) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando información de cotización...</div>;
  }

  // Cálculos de montos
  const subtotal = elementosTabla.reduce((acc, item) => acc + item.importe, 0);
  const iva = subtotal * IVA_RATE;
  const subtotalConIva = subtotal + iva;
  const esPagadoMP = Boolean(
    (cotizacion?.status === 'Pagado' || cotizacion?.payment_status === 'approved' || faseActual === 'pagado' || faseActual === 'asignado') &&
    !cotizacion?.cash_confirmed &&
    !cotizacion?.cash_requested
  );
  const comisionMP = esPagadoMP ? ((subtotalConIva * 0.0349 + 4) * 1.16) : 0;
  const totalFinal = subtotalConIva + (esPagadoMP ? comisionMP : 0);
  const priceFactor = (!esAdmin && subtotal > 0) ? (totalFinal / subtotal) : 1;

  const formatearDinero = (cantidad) => {
    return `$${parseFloat(cantidad || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ─── PANEL DE CONTROL SUPERIOR (NO PRINT) ─── */}
      <div className="no-print" style={{ marginBottom: '20px', width: '100%', maxWidth: '21cm', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Barra superior de navegación y botones */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '12px 18px', borderRadius: '12px', border: '1px solid #334155' }}>
          <button 
            onClick={() => navigate('/vista-cotizaciones')}
            style={{ 
              padding: '10px 18px', 
              backgroundColor: '#334155', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '700', 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} /> REGRESAR
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!pdfGenerado ? (
              <button 
                onClick={handleGenerarPDF} 
                disabled={guardando}
                style={{ 
                  padding: '10px 18px', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: '800', 
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} /> {guardando ? 'PREPARANDO...' : 'GUARDAR EN SISTEMA'}
              </button>
            ) : (
              <a 
                href={pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  padding: '10px 18px', 
                  background: '#0284c7', 
                  color: 'white', 
                  textDecoration: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '800', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={16} /> VER PDF GUARDADO
              </a>
            )}
            
            <button 
              onClick={handleImprimir}
              style={{ 
                padding: '10px 18px', 
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '800', 
                boxShadow: '0 3px 10px rgba(234, 88, 12, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> IMPRIMIR / DESCARGAR
            </button>
          </div>
        </div>

        {/* Selector de Historial / Versiones del PDF por Fase */}
        <div style={{ background: '#1e293b', padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📜 HISTORIAL / FASES DEL DOCUMENTO PDF:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
            <button
              onClick={() => handleCambiarFase('por_pagar')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: faseActual === 'por_pagar' ? '#f59e0b' : '#334155',
                background: faseActual === 'por_pagar' ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                color: faseActual === 'por_pagar' ? '#fbbf24' : '#94a3b8',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Clock size={15} /> 1. POR PAGAR (Cotización)
            </button>

            <button
              onClick={() => handleCambiarFase('pagado')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: faseActual === 'pagado' ? '#10b981' : '#334155',
                background: faseActual === 'pagado' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                color: faseActual === 'pagado' ? '#34d399' : '#94a3b8',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <CreditCard size={15} /> 2. PAGADO (Técnico sin asignar)
            </button>

            <button
              onClick={() => handleCambiarFase('asignado')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: faseActual === 'asignado' ? '#3b82f6' : '#334155',
                background: faseActual === 'asignado' ? 'rgba(59, 130, 246, 0.15)' : '#0f172a',
                color: faseActual === 'asignado' ? '#60a5fa' : '#94a3b8',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <UserCheck size={15} /> 3. ASIGNADO (Versión Final)
            </button>
          </div>
        </div>
      </div>

      {/* ─── HOJA IMPRIMIBLE DEL PDF ─── */}
      <div style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center', paddingBottom: '30px' }}>
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', width: '21cm' }}>
          <div id="cotizacion-pdf" className="cotizacion-container printable-page-container" style={{ minWidth: '21cm', margin: '0 auto', background: '#ffffff', color: '#0f172a', position: 'relative' }}>

            {/* Sello / Marca de Agua según Fase */}
            <div style={{ position: 'absolute', top: '15px', right: '25px', zIndex: 10 }}>
              {faseActual === 'por_pagar' && (
                <div style={{ border: '2px solid #f59e0b', color: '#b45309', background: '#fffbeb', padding: '4px 10px', borderRadius: '6px', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em' }}>
                  🟡 COTIZACIÓN PENDIENTE DE PAGO
                </div>
              )}
              {faseActual === 'pagado' && (
                <div style={{ border: '2px solid #10b981', color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em' }}>
                  🟢 PAGO VALIDADO / CONFIRMADO
                </div>
              )}
              {faseActual === 'asignado' && (
                <div style={{ border: '2px solid #2563eb', color: '#1d4ed8', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em' }}>
                  🔵 ORDEN DE TRABAJO ASIGNADA
                </div>
              )}
            </div>

            {/* Cabecera Principal */}
            <div className="header" style={{ marginTop: '10px' }}>
              <div className="header-left">
                <img src={logo} alt="Agente Solutions Logo" className="logo" style={{ maxWidth: '130px', height: 'auto' }} />
                
                <div className="info-cliente" style={{ paddingLeft: '10px' }}>
                  <p style={{ margin: 0, color: '#f26624', fontWeight: '800', fontSize: '12px' }}>ATENCIÓN A:</p>
                  <h2 style={{ margin: '2px 0 6px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                    {(cotizacion.cliente || cotizacion.cliente_nombre || 'CLIENTE').toUpperCase()}
                  </h2>
                  
                  <p style={{ margin: 0, color: '#f26624', fontWeight: '800', fontSize: '12px' }}>PROPIEDAD:</p>
                  <h3 style={{ margin: '2px 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#334155' }}>
                    {(cotizacion.propiedad || cotizacion.propiedad_nombre || 'PROPIEDAD DE CLIENTE').toUpperCase()}
                  </h3>

                  <p style={{ margin: 0, color: '#f26624', fontWeight: '800', fontSize: '12px' }}>UBICACIÓN:</p>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                    {(cotizacion.propiedad_direccion || cotizacion.ubicacion || 'MÉRIDA, YUCATÁN').toUpperCase()}
                  </h3>
                </div>

                {/* Cajas Dinámicas a la Derecha */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px', marginLeft: 'auto' }}>
                  
                  {/* Caja 1: Folio y Fecha */}
                  <div className="fecha-box" style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #f26624' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#f26624', fontWeight: '800' }}>FOLIO</span>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>{cotizacion.folio || `COT-${cotizacion.id}`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>FECHA DE EMISIÓN</span>
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: '800' }}>{cotizacion.fecha || new Date().toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>

                  {/* Caja 2: Estado Dinámico de la Cotización */}
                  <div className="fecha-box" style={{ 
                    background: faseActual === 'por_pagar' ? '#fff7ed' : (faseActual === 'pagado' ? '#ecfdf5' : '#eff6ff'), 
                    padding: '10px 14px', 
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: faseActual === 'por_pagar' ? '#fdba74' : (faseActual === 'pagado' ? '#6ee7b7' : '#93c5fd'),
                    textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: faseActual === 'por_pagar' ? '#c2410c' : (faseActual === 'pagado' ? '#047857' : '#1d4ed8'), textTransform: 'uppercase', marginBottom: '2px' }}>
                      ESTADO DEL DOCUMENTO
                    </div>
                    
                    {faseActual === 'por_pagar' && (
                      <div>
                        <div style={{ color: '#b45309', fontWeight: '900', fontSize: '13px' }}>🟡 PENDIENTE POR PAGAR</div>
                        <div style={{ color: '#78350f', fontSize: '10px', marginTop: '2px' }}>Técnico: Pendiente de asignación</div>
                      </div>
                    )}

                    {faseActual === 'pagado' && (
                      <div>
                        <div style={{ color: '#047857', fontWeight: '900', fontSize: '13px' }}>🟢 PAGADO</div>
                        <div style={{ color: '#065f46', fontSize: '10px', marginTop: '2px' }}>Técnico: Sin asignar (En proceso)</div>
                      </div>
                    )}

                    {faseActual === 'asignado' && (
                      <div>
                        <div style={{ color: '#1d4ed8', fontWeight: '900', fontSize: '13px' }}>🛠️ {cotizacion.tecnico ? cotizacion.tecnico.toUpperCase() : 'TÉCNICO ASIGNADO'}</div>
                        <div style={{ color: '#1e3a8a', fontSize: '10px', marginTop: '2px' }}>
                          {cotizacion.scheduled_at ? `Visita: ${cotizacion.scheduled_at}` : 'Servicio programado activo'}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* Separador Naranja */}
            <div className="linea" style={{ height: '3px', background: 'linear-gradient(90deg, #f26624 0%, #ea580c 100%)', margin: '16px 0' }}></div>

            {/* Tabla de Conceptos y Materiales */}
            <div className="tabla-container">
              <table className="tabla" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                    <th style={{ width: '40px', padding: '8px', fontSize: '12px' }}>NO</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px' }}>CONCEPTO / DESCRIPCIÓN</th>
                    <th style={{ width: '60px', padding: '8px', fontSize: '12px' }}>CANT</th>
                    <th style={{ width: '60px', padding: '8px', fontSize: '12px' }}>U/S</th>
                    <th style={{ width: '110px', padding: '8px', fontSize: '12px' }}>PRECIO/U</th>
                    <th style={{ width: '120px', padding: '8px', fontSize: '12px' }}>IMPORTE</th>
                  </tr>
                </thead>
                <tbody>
                  {elementosTabla.length > 0 ? (
                    elementosTabla.map((item, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: '700', color: '#64748b', fontSize: '12px' }}>{index + 1}</td>
                        <td style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                          {(item.descripcion || '').toUpperCase()}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#334155' }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#64748b' }}>{item.unidad}</td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', fontSize: '12px', color: '#334155' }}>{formatearDinero(item.precio_u * priceFactor)}</td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{formatearDinero(item.importe * priceFactor)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        {cotizacion.descripcion_problema || cotizacion.observations || 'Servicio registrado'}
                      </td>
                    </tr>
                  )}

                  {/* Totales */}
                  {esAdmin && (
                    <tr className="totales" style={{ background: '#f8fafc' }}>
                      <td colSpan="4" style={{ border: 'none' }}></td>
                      <td className="label" style={{ textAlign: 'right', padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>SUBTOTAL</td>
                      <td className="subtotal" style={{ textAlign: 'right', padding: '6px 12px', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{formatearDinero(subtotal)}</td>
                    </tr>
                  )}
                  {esAdmin && (
                    <tr className="totales" style={{ background: '#f8fafc' }}>
                      <td colSpan="4" style={{ border: 'none' }}></td>
                      <td className="label" style={{ textAlign: 'right', padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>IVA (16%)</td>
                      <td style={{ textAlign: 'right', padding: '6px 12px', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{formatearDinero(iva)}</td>
                    </tr>
                  )}
                  {esAdmin && esPagadoMP && (
                    <tr className="totales" style={{ background: '#f8fafc' }}>
                      <td colSpan="4" style={{ border: 'none' }}></td>
                      <td className="label" style={{ textAlign: 'right', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <img src={mpLogo} alt="MercadoPago" style={{ height: '14px', objectFit: 'contain' }} />
                        <span>COMISIÓN MERCADOPAGO</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px 12px', color: '#009ee3', fontWeight: '800', fontSize: '12px' }}>{formatearDinero(comisionMP)}</td>
                    </tr>
                  )}
                  <tr className="totales total-final" style={{ background: '#0f172a', color: '#ffffff' }}>
                    <td colSpan="4" style={{ border: 'none' }}></td>
                    <td className="label" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '14px', fontWeight: '900', color: '#f26624' }}>TOTAL</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>{formatearDinero(totalFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sección de Especificaciones, Términos y Comentarios */}
            <div className="notas" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f26624', paddingBottom: '4px', marginBottom: '8px' }}>
                <h4 style={{ color: '#f26624', margin: 0, textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '0.03em' }}>
                  ESPECIFICACIONES, COMENTARIOS Y TÉRMINOS
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                  {faseActual === 'por_pagar' ? '🟡 Vigencia: 15 Días' : (faseActual === 'pagado' ? '🟢 Pago Aprobado' : '🔵 Técnico Asignado')}
                </span>
              </div>

              <textarea 
                className="notas-textarea"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                spellCheck="false"
                placeholder="Escriba aquí los términos, especificaciones o condiciones de esta cotización..."
                style={{ 
                  width: '100%', 
                  minHeight: '110px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  padding: '10px', 
                  fontSize: '12px', 
                  fontFamily: 'monospace',
                  lineHeight: '1.45',
                  color: '#334155',
                  background: '#f8fafc',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Datos Fiscales y Pie de Página */}
            <div className="fiscales" style={{ marginTop: '16px', borderTop: '2px solid #e2e8f0', paddingTop: '10px', fontSize: '11px', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ background: '#f26624', color: 'white', display: 'inline-block', padding: '3px 8px', fontSize: '11px', fontWeight: '800', borderRadius: '4px', margin: '0 0 4px 0' }}>
                    DATOS FISCALES Y DE CONTACTO
                  </h3>
                  <p style={{ margin: '2px 0', fontWeight: '800', color: '#0f172a' }}>JORGE ERNESTO VALLARTA SOSA</p>
                  <p style={{ margin: '2px 0' }}><strong>RFC:</strong> VASJ820324779 &bull; <strong>Régimen:</strong> Personas Físicas con Actividades Empresariales</p>
                  <p style={{ margin: '2px 0' }}><strong>Dirección:</strong> Calle 23 No. 137 x 20A, Xcanatún, Mérida, Yucatán</p>
                  <p style={{ margin: '2px 0' }}><strong>Teléfono:</strong> 999 242 6030 &bull; <strong>Email:</strong> vallofacturas@gmail.com</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ color: '#0f172a', fontWeight: '900', fontSize: '14px' }}>AGENTE SOLUTIONS</div>
                  <div style={{ color: '#f26624', fontWeight: '800', fontSize: '11px' }}>Resolviendo tus necesidades</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Documento oficial generado por sistema</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaCotizacionPrint;
