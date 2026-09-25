import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Printer, Download, Save, 
  CheckCircle, Clock, Wrench, ShieldCheck,
  CreditCard, FileText, UserCheck, Home, MapPin, Phone,
  Lock, AlertTriangle, Sparkles, Check
} from 'lucide-react';
import "../../../styles/AgenteSolutions/Admin/VistaCotizacionPrint.css";
import logo from "../../../assets/Logo3.png"; 
import mpLogo from "../../../assets/Mercado-Pago.png";
import html2pdf from 'html2pdf.js';

const IVA_RATE = 0.16;

const VistaCotizacionPrint = () => {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [elementosTabla, setElementosTabla] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [pdfGenerado, setPdfGenerado] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  
  // Fase seleccionada para el PDF: 'por_pagar' | 'pagado' | 'finalizado'
  const [faseActual, setFaseActual] = useState('por_pagar');
  const [notas, setNotas] = useState("");

  // Detectar si quien genera el PDF es Admin o Cliente
  const esAdmin = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
      const roleId = session?.userData?.role_id;
      return roleId === 0 || roleId === 1; // 0=root, 1=admin
    } catch { return false; }
  })();

  // Mostrar mensaje toast
  const mostrarToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Validaciones de disponibilidad de fases según los datos reales en Base de Datos
  const verificarDisponibilidadFases = (cot) => {
    if (!cot) return { f1: true, f2: false, f3: false };

    const statusLower = String(cot.status || cot.estado || '').toLowerCase();
    
    // Fase 1: Siempre disponible
    const f1 = true;

    // Fase 2: Solo si está pagada (MercadoPago aprobado o Efectivo confirmado o estado avanzado)
    const isPaid = Boolean(
      cot.payment_status === 'approved' ||
      cot.payment_status === 'Validado' ||
      cot.advance_paid == 1 ||
      cot.cash_confirmed == 1 ||
      statusLower.includes('pagad') ||
      Boolean(cot.mp_payment_data) ||
      ['en proceso', 'asignado', 'listo', 'finalizado', 'terminado'].includes(statusLower)
    );
    const f2 = isPaid;

    // Fase 3: Solo si el trabajo fue marcado como finalizado por Técnico o Root
    const isFinished = Boolean(
      ['finalizado', 'terminado', 'completado', 'listo'].includes(statusLower) ||
      cot.trabajo_finalizado == 1 ||
      cot.has_final_report == true ||
      Boolean(cot.final_report_id) ||
      cot.work_order_status === 'Listo' ||
      cot.work_order_status === 'Finalizado' ||
      cot.service_status === 'Listo' ||
      cot.service_status === 'Finalizado'
    );
    const f3 = isFinished;

    return { f1, f2, f3 };
  };

  const detectarFaseMaximaDisponible = (cot) => {
    if (!cot) return 'por_pagar';
    const { f2, f3 } = verificarDisponibilidadFases(cot);
    if (f3) return 'finalizado';
    if (f2) return 'pagado';
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
      texto += `--- FASE 1: COTIZACIÓN COMERCIAL (PENDIENTE DE PAGO) ---\n`;
      texto += `• Vigencia de precios: 15 días naturales a partir de la fecha de emisión.\n`;
      texto += `• Garantía de mano de obra: 15 días naturales tras la entrega y conclusión del servicio.\n`;
      texto += `• La asignación del técnico especialista y fecha de ejecución se programarán automáticamente al confirmarse el pago por Mercado Pago o en Efectivo.\n`;
    } else if (fase === 'pagado') {
      texto += `--- FASE 2: PAGO CONFIRMADO (TÉCNICO EN ASIGNACIÓN) ---\n`;
      if (cot.mp_payment_data?.mp_payment_id) {
        texto += `• N° Operación MercadoPago: #${cot.mp_payment_data.mp_payment_id}\n`;
      } else if (cot.cash_confirmed) {
        texto += `• Modalidad de Pago: Efectivo validado en sistema por administración.\n`;
      }
      texto += `• Estatus Operativo: Pago acreditado. Personal y materiales en proceso de programación.\n`;
      texto += `• Los conceptos y refacciones cotizadas quedan formalmente reservados para el servicio.\n`;
    } else if (fase === 'finalizado') {
      texto += `--- FASE 3: ACTA DE ENTREGA - TRABAJO FINALIZADO Y GARANTÍA ---\n`;
      texto += `• Técnico Responsable: ${cot.tecnico && cot.tecnico !== 'Sin Técnico' ? cot.tecnico : 'Técnico Especialista Agente Solutions'}\n`;
      if (cot.tecnico_telefono) {
        texto += `• Teléfono de Contacto Técnico: ${cot.tecnico_telefono}\n`;
      }
      if (cot.scheduled_at || cot.fecha_finalizacion) {
        texto += `• Fecha de Conclusión / Entrega: ${cot.fecha_finalizacion || cot.scheduled_at || new Date().toLocaleDateString('es-MX')}\n`;
      }
      texto += `• Garantía de Satisfacción: Activa por 15 días naturales a partir de la firma de conformidad.\n`;
      texto += `• Conformidad del Cliente: El cliente manifiesta haber recibido los trabajos y materiales a entera satisfacción.\n`;
    }

    if (cot.observations && !texto.includes(cot.observations)) {
      texto += `\nObservaciones adicionales del servicio:\n${cot.observations}\n`;
    }

    return texto;
  };

  // Auto-ajustar altura del textarea para que abarque todo el texto sin recortar ni mostrar scrollbars
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(160, textareaRef.current.scrollHeight + 15)}px`;
    }
  }, [notas, faseActual]);

  useEffect(() => {
    const datosGuardados = localStorage.getItem('cotizacion_para_imprimir');
    
    if (datosGuardados) {
      const data = JSON.parse(datosGuardados);
      setCotizacion(data);

      const faseInicial = detectarFaseMaximaDisponible(data);
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

  const { f1: fase1Ok, f2: fase2Ok, f3: fase3Ok } = verificarDisponibilidadFases(cotizacion);

  const handleSeleccionarFase = (faseDestino) => {
    if (faseDestino === 'por_pagar') {
      setFaseActual('por_pagar');
      setNotas(generarTextoEspecificaciones(cotizacion, 'por_pagar'));
    } else if (faseDestino === 'pagado') {
      if (!fase2Ok) {
        mostrarToast("🔒 Fase 2 Bloqueada: Se habilitará automáticamente en cuanto el cliente realice el pago por Mercado Pago o se valide en efectivo.");
        return;
      }
      setFaseActual('pagado');
      setNotas(generarTextoEspecificaciones(cotizacion, 'pagado'));
    } else if (faseDestino === 'finalizado') {
      if (!fase3Ok) {
        mostrarToast("🔒 Fase 3 Bloqueada: Se habilitará cuando el Técnico o el Root marquen el trabajo como 'Finalizado' en el sistema.");
        return;
      }
      setFaseActual('finalizado');
      setNotas(generarTextoEspecificaciones(cotizacion, 'finalizado'));
    }
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
      mostrarToast("¡PDF generado y guardado en el sistema con éxito!");
      
    } catch (error) {
      console.error("Error en el proceso:", error);
      mostrarToast("Hubo un error al guardar el archivo en el sistema.");
    } finally {
      setGuardando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!cotizacion) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}>Cargando información de cotización...</div>;
  }

  // Cálculos de montos
  const subtotal = elementosTabla.reduce((acc, item) => acc + item.importe, 0);
  const iva = subtotal * IVA_RATE;
  const subtotalConIva = subtotal + iva;
  const esPagadoMP = Boolean(
    (cotizacion?.status === 'Pagado' || cotizacion?.payment_status === 'approved' || faseActual === 'pagado' || faseActual === 'finalizado') &&
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
    <div className="print-page-root" style={{ backgroundColor: '#0b1329', minHeight: '100vh', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          zIndex: 9999,
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #f59e0b',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          maxWidth: '550px',
          fontSize: '0.88rem',
          fontWeight: '700'
        }}>
          <AlertTriangle size={20} color="#f59e0b" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── PANEL DE CONTROL SUPERIOR (NO PRINT) ─── */}
      <div className="no-print" style={{ marginBottom: '22px', width: '100%', maxWidth: '21.59cm', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Barra superior de acciones */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#131e3a', padding: '14px 20px', borderRadius: '14px', border: '1px solid #22325a' }}>
          <button 
            onClick={() => navigate('/vista-cotizaciones')}
            style={{ 
              padding: '10px 18px', 
              backgroundColor: '#1e293b', 
              color: '#cbd5e1', 
              border: '1px solid #334155', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '700', 
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
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
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} /> {guardando ? 'GUARDANDO...' : 'SUBIR ESPECIFICACIONES'}
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
                  fontSize: '0.85rem',
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
                background: 'linear-gradient(135deg, #f26624 0%, #ea580c 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: '800', 
                fontSize: '0.85rem',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> IMPRIMIR / DESCARGAR
            </button>
          </div>
        </div>

        {/* ─── STEPPER BAR / HISTORIAL DE FASES DINÁMICAS CON CANDADOS ─── */}
        <div style={{ background: '#131e3a', padding: '16px 20px', borderRadius: '14px', border: '1px solid #22325a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📜 HISTORIAL DE FASES DEL DOCUMENTO:
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
              * Solo se habilitan las fases alcanzadas en el ciclo del trabajo
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
            
            {/* Paso 1: Por Pagar */}
            <div
              onClick={() => handleSeleccionarFase('por_pagar')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: faseActual === 'por_pagar' ? '#f59e0b' : '#334155',
                background: faseActual === 'por_pagar' ? 'rgba(245, 158, 11, 0.12)' : '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: faseActual === 'por_pagar' ? '#f59e0b' : '#1e293b',
                  color: faseActual === 'por_pagar' ? '#000' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '0.85rem'
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: faseActual === 'por_pagar' ? '#fbbf24' : '#e2e8f0' }}>
                    POR PAGAR
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Cotización Comercial
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px' }}>
                {faseActual === 'por_pagar' ? 'ACTUAL' : 'LISTO'}
              </span>
            </div>

            {/* Paso 2: Pagado (Técnico sin asignar) */}
            <div
              onClick={() => handleSeleccionarFase('pagado')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: faseActual === 'pagado' ? '#10b981' : (fase2Ok ? '#334155' : '#1e293b'),
                background: faseActual === 'pagado' ? 'rgba(16, 185, 129, 0.12)' : (fase2Ok ? '#0f172a' : '#090f1d'),
                cursor: fase2Ok ? 'pointer' : 'not-allowed',
                opacity: fase2Ok ? 1 : 0.55,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: faseActual === 'pagado' ? '#10b981' : (fase2Ok ? '#1e293b' : '#111827'),
                  color: faseActual === 'pagado' ? '#fff' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '0.85rem'
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: faseActual === 'pagado' ? '#34d399' : (fase2Ok ? '#e2e8f0' : '#64748b') }}>
                    PAGADO
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Técnico en Asignación
                  </div>
                </div>
              </div>
              {fase2Ok ? (
                <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '12px' }}>
                  {faseActual === 'pagado' ? 'ACTUAL' : 'HABILITADO'}
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={10} /> BLOQUEADO
                </span>
              )}
            </div>

            {/* Paso 3: Finalizado (Acta de Entrega / Garantía) */}
            <div
              onClick={() => handleSeleccionarFase('finalizado')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: faseActual === 'finalizado' ? '#3b82f6' : (fase3Ok ? '#334155' : '#1e293b'),
                background: faseActual === 'finalizado' ? 'rgba(59, 130, 246, 0.12)' : (fase3Ok ? '#0f172a' : '#090f1d'),
                cursor: fase3Ok ? 'pointer' : 'not-allowed',
                opacity: fase3Ok ? 1 : 0.55,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: faseActual === 'finalizado' ? '#3b82f6' : (fase3Ok ? '#1e293b' : '#111827'),
                  color: faseActual === 'finalizado' ? '#fff' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '0.85rem'
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: faseActual === 'finalizado' ? '#60a5fa' : (fase3Ok ? '#e2e8f0' : '#64748b') }}>
                    FINALIZADO
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Acta y Garantía
                  </div>
                </div>
              </div>
              {fase3Ok ? (
                <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px' }}>
                  {faseActual === 'finalizado' ? 'ACTUAL' : 'HABILITADO'}
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={10} /> BLOQUEADO
                </span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ─── HOJA IMPRIMIBLE DEL PDF (TAMAÑO CARTA: 21.59cm x 27.94cm) ─── */}
      <div className="print-outer-wrapper" style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '30px' }}>
        <div className="print-scale-wrapper" style={{ width: '100%', maxWidth: '21.59cm', display: 'flex', justifyContent: 'center' }}>
          <div id="cotizacion-pdf" className="cotizacion-container printable-page-container" style={{ margin: '0 auto', background: '#ffffff', color: '#0f172a', position: 'relative' }}>

            {/* Cabecera Principal Reestructurada */}
            <div className="doc-header-grid" style={{
              display: 'grid',
              gridTemplateColumns: '135px 1fr 245px',
              gap: '16px',
              alignItems: 'stretch',
              paddingTop: '6px',
              paddingBottom: '6px'
            }}>
              {/* Columna 1: Logo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                <img src={logo} alt="Agente Solutions Logo" className="logo" style={{ width: '100%', maxWidth: '135px', height: 'auto', objectFit: 'contain' }} />
                <div style={{ fontSize: '10px', color: '#f26624', fontWeight: '800', marginTop: '6px', letterSpacing: '0.02em' }}>
                  RESOLVIENDO TUS NECESIDADES
                </div>
              </div>

              {/* Columna 2: Datos de Atención y Propiedad */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '2px solid #f1f5f9' }}>
                <div>
                  <span style={{ color: '#f26624', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    ATENCIÓN A:
                  </span>
                  <div style={{ margin: '1px 0 0 0', fontSize: '16px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' }}>
                    {(cotizacion.cliente || cotizacion.cliente_nombre || 'CLIENTE').toUpperCase()}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#f26624', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    PROPIEDAD:
                  </span>
                  <div style={{ margin: '1px 0 0 0', fontSize: '14px', fontWeight: '800', color: '#334155', lineHeight: '1.2' }}>
                    {(cotizacion.propiedad || cotizacion.propiedad_nombre || 'PROPIEDAD DE CLIENTE').toUpperCase()}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#f26624', fontWeight: '900', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    UBICACIÓN:
                  </span>
                  <div style={{ margin: '1px 0 0 0', fontSize: '11.5px', fontWeight: '700', color: '#64748b', lineHeight: '1.3' }}>
                    {(cotizacion.propiedad_direccion || cotizacion.ubicacion || 'MÉRIDA, YUCATÁN').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Columna 3: Sello + Folio + Estado del Servicio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                
                {/* Sello de Fase Integrado */}
                <div style={{ 
                  textAlign: 'center',
                  padding: '6px 10px', 
                  borderRadius: '6px', 
                  fontWeight: '900', 
                  fontSize: '11px', 
                  letterSpacing: '0.04em',
                  border: '1.5px solid',
                  borderColor: faseActual === 'por_pagar' ? '#f59e0b' : (faseActual === 'pagado' ? '#10b981' : '#2563eb'),
                  color: faseActual === 'por_pagar' ? '#b45309' : (faseActual === 'pagado' ? '#047857' : '#1d4ed8'),
                  background: faseActual === 'por_pagar' ? '#fffbeb' : (faseActual === 'pagado' ? '#ecfdf5' : '#eff6ff')
                }}>
                  {faseActual === 'por_pagar' && '🟡 COTIZACIÓN PENDIENTE DE PAGO'}
                  {faseActual === 'pagado' && '🟢 PAGO CONFIRMADO - EN ASIGNACIÓN'}
                  {faseActual === 'finalizado' && '🔵 ACTA DE ENTREGA - FINALIZADO'}
                </div>

                {/* Caja Folio y Fecha */}
                <div className="fecha-box" style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px', borderLeft: '4px solid #f26624', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10.5px', color: '#f26624', fontWeight: '800' }}>FOLIO</span>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>
                      {cotizacion.folio || `COT-${cotizacion.id}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700' }}>FECHA DE EMISIÓN</span>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: '800' }}>
                      {cotizacion.fecha || new Date().toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>

                {/* Caja Estado del Servicio */}
                <div style={{ 
                  background: faseActual === 'por_pagar' ? '#fff7ed' : (faseActual === 'pagado' ? '#ecfdf5' : '#eff6ff'), 
                  padding: '8px 12px', 
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: faseActual === 'por_pagar' ? '#fdba74' : (faseActual === 'pagado' ? '#6ee7b7' : '#93c5fd'),
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '9.5px', fontWeight: '800', color: faseActual === 'por_pagar' ? '#c2410c' : (faseActual === 'pagado' ? '#047857' : '#1d4ed8'), textTransform: 'uppercase', marginBottom: '2px' }}>
                    ESTADO DEL SERVICIO
                  </div>
                  
                  {faseActual === 'por_pagar' && (
                    <div>
                      <div style={{ color: '#b45309', fontWeight: '900', fontSize: '12px' }}>🟡 PENDIENTE POR PAGAR</div>
                      <div style={{ color: '#78350f', fontSize: '10px', marginTop: '1px' }}>Técnico: Pendiente de asignación</div>
                    </div>
                  )}

                  {faseActual === 'pagado' && (
                    <div>
                      <div style={{ color: '#047857', fontWeight: '900', fontSize: '12px' }}>🟢 PAGO CONFIRMADO</div>
                      <div style={{ color: '#065f46', fontSize: '10px', marginTop: '1px' }}>Técnico: Sin asignar (En proceso)</div>
                    </div>
                  )}

                  {faseActual === 'finalizado' && (
                    <div>
                      <div style={{ color: '#1d4ed8', fontWeight: '900', fontSize: '12px' }}>
                        🛠️ {cotizacion.tecnico && cotizacion.tecnico !== 'Sin Técnico' ? cotizacion.tecnico.toUpperCase() : 'TRABAJO FINALIZADO'}
                      </div>
                      <div style={{ color: '#1e3a8a', fontSize: '10px', marginTop: '1px' }}>
                        {cotizacion.scheduled_at ? `Entrega: ${cotizacion.scheduled_at}` : 'Servicio concluido a satisfacción'}
                      </div>
                    </div>
                  )}
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
                  {faseActual === 'por_pagar' ? '🟡 Vigencia: 15 Días' : (faseActual === 'pagado' ? '🟢 Pago Validado' : '🔵 Trabajo Finalizado')}
                </span>
              </div>

              <textarea 
                ref={textareaRef}
                className="notas-textarea"
                value={notas}
                onChange={(e) => {
                  setNotas(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.max(160, textareaRef.current.scrollHeight + 15)}px`;
                  }
                }}
                spellCheck="false"
                placeholder="Escriba aquí los términos, especificaciones o condiciones de esta cotización..."
                style={{ 
                  width: '100%', 
                  minHeight: '160px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  padding: '12px 14px', 
                  fontSize: '13px', 
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  color: '#1e293b',
                  background: '#f8fafc',
                  resize: 'none',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Cuadros de Firmas / Conformidad (Fase 3: Finalizado) */}
            {faseActual === 'finalizado' && (
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', padding: '10px 0' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                    {cotizacion.tecnico && cotizacion.tecnico !== 'Sin Técnico' ? cotizacion.tecnico.toUpperCase() : 'TÉCNICO ESPECIALISTA'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma del Técnico Ejecutor</div>
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', paddingTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                    {(cotizacion.cliente || cotizacion.cliente_nombre || 'CLIENTE / PROPIETARIO').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma de Conformidad y Entrega</div>
                </div>
              </div>
            )}

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
