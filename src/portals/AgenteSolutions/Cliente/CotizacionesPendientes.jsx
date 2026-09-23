import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ShoppingBag, Sparkles, CheckSquare, Square, 
  CreditCard, ShieldCheck, Eye, CheckCircle2, AlertTriangle, 
  RefreshCw, AlertCircle, CalendarX, Lock, Trash2, Banknote,
  X, Check, ChevronRight, ArrowRight, Loader2, Home, MapPin,
  Navigation, Phone, FileText, Camera, UserCircle, Zap,
  User, Wrench, ImageIcon
} from 'lucide-react';
import '../../../styles/AgenteSolutions/Cliente/Cotizaciones.css';
import '../../../styles/AgenteSolutions/Tecnico/TrabajoPropiedad.css';
import mpLogo from '../../../assets/Mercado-Pago.png';

const CotizacionesPendientes = () => {
  const navigate = useNavigate();
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [modalRecotizacionExito, setModalRecotizacionExito] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mensajeNotificacion, setMensajeNotificacion] = useState(null);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // Estados para el Modal de Pago Integrado
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState('mercadopago'); // 'mercadopago' | 'efectivo'
  const [tipoMonto, setTipoMonto] = useState('full'); // 'full' (100%) | 'advance' (60%)
  const [timingEfectivo, setTimingEfectivo] = useState('immediate'); // 'immediate' | 'on_completion'
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [pagoCompletadoExito, setPagoCompletadoExito] = useState(null);

  // Helper para calcular la vigencia de 15 días desde la fecha de registro
  const calcularCaducidad = (fechaStr, vencidaExplicit) => {
    if (vencidaExplicit) {
      return { vencida: true, diasRestantes: 0, diasTranscurridos: 18 };
    }
    if (!fechaStr) {
      return { vencida: false, diasRestantes: 15, diasTranscurridos: 0 };
    }

    let fechaDoc = new Date(fechaStr);
    if (isNaN(fechaDoc.getTime())) {
      if (fechaStr.includes('05 Mar') || fechaStr.includes('febrero')) {
        return { vencida: true, diasRestantes: 0, diasTranscurridos: 20 };
      }
      return { vencida: false, diasRestantes: 15, diasTranscurridos: 0 };
    }

    const hoy = new Date();
    const diffTime = hoy - fechaDoc;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diasRestantes = 15 - diffDays;
    
    return {
      vencida: diffDays > 15,
      diasRestantes: Math.max(0, diasRestantes),
      diasTranscurridos: Math.max(0, diffDays)
    };
  };

  // Helper para parsear texto de concepto/descripción
  const parsearConcepto = (raw) => {
    if (!raw) return 'Servicio registrado en espera de aprobación.';
    if (typeof raw === 'string') {
      if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const arr = parsed.conceptos || parsed.servicios || parsed.seccionesLote || [];
            if (Array.isArray(arr) && arr.length > 0) {
              const descs = arr.map(x => x.descripcion || x.titulo || x.desc || 'Servicio').filter(Boolean);
              if (descs.length > 0) return descs.join(', ');
            }
          }
        } catch {
          return raw;
        }
      }
      return raw;
    } else if (typeof raw === 'object' && raw.conceptos) {
      return raw.conceptos.map(x => x.descripcion || x.titulo || 'Servicio').join(', ');
    }
    return String(raw);
  };

  const [cotizaciones, setCotizaciones] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Cargar cotizaciones desde la API y sincronizar
  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentesolutionsback-production.up.railway.app/api';
      
      const guardadasLocales = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');

      let data = [];
      try {
        const res = await axios.get(`${API_URL}/cotizaciones`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (res.data && Array.isArray(res.data.quotes || res.data.data)) {
          data = res.data.quotes || res.data.data;
        }
      } catch (apiErr) {
        console.warn("Utilizando datos locales para el carrito:", apiErr);
      }

      // Filtrar solo las pendientes (excluir ya pagadas o canceladas)
      const pendientesAPI = data.filter(cot => {
        const st = String(cot.status || cot.estado || '').toLowerCase();
        return !st.includes('aceptad') && !st.includes('aprob') && !st.includes('rechaz') && !st.includes('cancel') && !st.includes('pagad');
      });

      let mapeadas = [];
      if (pendientesAPI.length > 0) {
        mapeadas = pendientesAPI.map(item => {
          const caducidad = calcularCaducidad(item.created_at || item.fecha, item.vencida);
          const tipoFalla = item.tipo_falla || (item.concept ? parsearConcepto(item.concept) : `Servicio #${item.id}`);
          const equipoNombre = item.equipo && item.equipo !== 'No especificado' ? item.equipo : 'otro';
          
          return {
            id: item.id,
            quote_id: item.id,
            titulo: `${item.propiedad_nombre || 'Mi Propiedad'} • ${tipoFalla} (${equipoNombre})`,
            propiedad_nombre: item.propiedad_nombre || 'Mi Propiedad',
            propiedad_direccion: item.propiedad_direccion || 'Dirección de la propiedad',
            propiedad_curp: item.propiedad_curp || `WKF-ORD-#${item.id}`,
            propiedad_coordenadas: item.propiedad_coordenadas || null,
            propiedad_foto: item.propiedad_foto || item.foto_fachada || null,
            tipo_falla: tipoFalla,
            zona: item.zona || 'Área de la propiedad',
            equipo: equipoNombre,
            descripcion_problema: item.descripcion_problema || item.observations || parsearConcepto(item.concept),
            evidencias: Array.isArray(item.evidencias) && item.evidencias.length > 0 ? item.evidencias : (item.evidence_photo_path ? [item.evidence_photo_path] : []),
            problemas_lote: Array.isArray(item.problemas_lote) ? item.problemas_lote : [],
            cliente_nombre: item.cliente_nombre || item.cliente || 'Pedro Koh',
            cliente_telefono: item.cliente_telefono || 'No registrado',
            cliente_tipo_propiedad: item.cliente_tipo_propiedad || 'CASA',
            tecnico: item.tecnico || 'Pendiente de asignar',
            tecnico_telefono: item.tecnico_telefono || null,
            folio: item.folio || `COT-${item.id}`,
            fecha: item.created_at ? new Date(item.created_at).toLocaleDateString('es-MX') : 'Reciente',
            scheduled_at: item.scheduled_at || null,
            total: Number(item.total || item.total_amount || item.estimated_amount || item.monto || 0),
            estado: caducidad.vencida ? 'Caducada (> 15 días)' : (item.status || 'Pendiente'),
            descripcion: item.observations || parsearConcepto(item.concept),
            vencida: caducidad.vencida,
            diasRestantes: caducidad.diasRestantes,
            conceptRaw: item.concept,
            work_order_id: item.work_order_id,
            service_id: item.service_id
          };
        });
      }

      const mapa = new Map();
      mapeadas.forEach(item => {
        mapa.set(String(item.id), item);
      });

      guardadasLocales.forEach(item => {
        const cad = calcularCaducidad(item.fecha, item.vencida);
        const esRecotizando = item.estado === 'Pendiente de recotización' || item.recotizacionSolicitada;
        mapa.set(String(item.id), {
          ...item,
          vencida: cad.vencida,
          diasRestantes: cad.diasRestantes,
          estado: esRecotizando ? 'Pendiente de recotización' : (cad.vencida ? 'Caducada (> 15 días)' : (item.estado || 'Pendiente de aprobación')),
          recotizacionSolicitada: esRecotizando
        });
      });

      const listaFinal = Array.from(mapa.values());
      setCotizaciones(listaFinal);

      // Por defecto, seleccionar todas las vigentes
      const vigentesIds = listaFinal.filter(c => !c.vencida && !c.recotizacionSolicitada).map(c => c.id);
      setSelectedIds(vigentesIds);

    } catch (err) {
      console.warn("Error cargando carrito:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  // Eliminar servicio del carrito
  const handleEliminarDelCarrito = (cot, e) => {
    if (e) e.stopPropagation();
    if (!cot) return;

    if (window.confirm(`¿Deseas quitar la cotización "${cot.titulo || cot.folio}" del carrito?`)) {
      const guardadas = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
      const filtradas = guardadas.filter(item => String(item.id) !== String(cot.id) && String(item.folio) !== String(cot.folio));
      localStorage.setItem('carrito_cotizaciones', JSON.stringify(filtradas));

      const listaActualizada = cotizaciones.filter(c => String(c.id) !== String(cot.id));
      setCotizaciones(listaActualizada);
      setSelectedIds(selectedIds.filter(id => String(id) !== String(cot.id)));
    }
  };

  // Manejador de selección de cotizaciones con validación de caducidad
  const handleToggleSelect = (cot, e) => {
    if (e) e.stopPropagation();
    
    // Si la cotización está vencida, no se puede seleccionar para la sumatoria
    if (cot.vencida) {
      mostrarNotificacion(`La cotización "${cot.titulo}" está caducada (excedió los 15 días). Debes solicitar recotizar para actualizar su monto y agregarla a tu cuenta.`);
      return;
    }

    if (cot.recotizacionSolicitada) {
      mostrarNotificacion(`La cotización "${cot.titulo}" está en proceso de recotización por el Administrador.`);
      return;
    }

    setSelectedIds(prev => 
      prev.includes(cot.id) ? prev.filter(item => item !== cot.id) : [...prev, cot.id]
    );
  };

  const handleToggleAll = () => {
    const vigentes = cotizaciones.filter(c => !c.vencida && !c.recotizacionSolicitada);
    const vigentesIds = vigentes.map(c => c.id);

    // Si todas las vigentes están seleccionadas, deseleccionar todas
    const todasVigentesSeleccionadas = vigentesIds.every(id => selectedIds.includes(id));

    if (todasVigentesSeleccionadas) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vigentesIds);
    }
  };

  const mostrarNotificacion = (msg) => {
    setMensajeNotificacion(msg);
    setTimeout(() => {
      setMensajeNotificacion(null);
    }, 5000);
  };

  const handleSolicitarRecotizacion = (cot, e) => {
    if (e) e.stopPropagation();
    if (!cot) return;

    // 1. Notificación local para Administrador y Root
    const notificacionesAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
    const notificacionesRoot = JSON.parse(localStorage.getItem('notificaciones_root') || '[]');
    const nuevaNotif = {
      id: Date.now(),
      type: 'solicitud_recotizacion',
      title: `🔄 Solicitud de Recotización - ${cot.folio || `#${cot.id}`}`,
      titulo: `Solicitud de Recotización - ${cot.folio || `#${cot.id}`}`,
      message: `El cliente solicitó recotizar el servicio "${cot.titulo || cot.descripcion || ''}" (${cot.folio || cot.id}) por estar vencida.`,
      mensaje: `El cliente solicitó recotizar el servicio "${cot.titulo || cot.descripcion || ''}" (${cot.folio || cot.id}) por estar vencida.`,
      cotizacionOriginal: { ...cot, isDerived: true },
      fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      created_at: new Date().toISOString(),
      read_at: null,
      leida: false,
      data: {
        type: 'solicitud_recotizacion',
        quote_id: cot.id,
        cotizacion_id: cot.id,
        url: '/vista-cotizaciones?filtro=Recotizaciones'
      }
    };
    localStorage.setItem('notificaciones_admin', JSON.stringify([nuevaNotif, ...notificacionesAdmin]));
    localStorage.setItem('notificaciones_root', JSON.stringify([nuevaNotif, ...notificacionesRoot]));
    window.dispatchEvent(new Event('notif_update'));
    window.dispatchEvent(new Event('storage'));

    // 2. Enviar petición al backend
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentesolutionsback-production.up.railway.app/api';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      axios.post(`${API_URL}/cotizaciones/${cot.id}/recotizar`, {
        cotizacion_id: cot.id,
        motivo: 'Caducada (> 15 días)'
      }, { headers }).catch(err => console.warn("Petición de recotización API:", err));
    } catch {
      // ignore
    }

    // 3. Actualizar estado local
    setCotizaciones(prev => prev.map(c => {
      if (String(c.id) === String(cot.id) || String(c.folio) === String(cot.folio)) {
        return {
          ...c,
          estado: 'Pendiente de recotización',
          recotizacionSolicitada: true
        };
      }
      return c;
    }));

    const guardadas = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
    const actualizadas = guardadas.map(item => {
      if (String(item.id) === String(cot.id) || String(item.folio) === String(cot.folio)) {
        return {
          ...item,
          estado: 'Pendiente de recotización',
          recotizacionSolicitada: true
        };
      }
      return item;
    });
    localStorage.setItem('carrito_cotizaciones', JSON.stringify(actualizadas));

    setModalRecotizacionExito(cot);
    mostrarNotificacion(`Solicitud enviada para ${cot.folio || cot.titulo}.`);
  };

  // ── CÁLCULOS DINÁMICOS EN TIEMPO REAL ──
  const cotizacionesSeleccionadas = cotizaciones.filter(c => !c.vencida && !c.recotizacionSolicitada && selectedIds.includes(c.id));
  const cotizacionesNoSeleccionadas = cotizaciones.filter(c => !c.vencida && !c.recotizacionSolicitada && !selectedIds.includes(c.id));
  const totalSubtotal = cotizacionesSeleccionadas.reduce((acc, c) => acc + (Number(c.total) || 0), 0);
  
  // Cálculo fiscal e IVA para pasarela
  const ivaCalculado = totalSubtotal * 0.16;
  const subConIva = totalSubtotal + ivaCalculado;
  const comisionMP = totalSubtotal > 0 ? (subConIva * 0.0349 + 4) * 1.16 : 0;
  const totalConImpuestos = Math.round((subConIva + comisionMP) * 100) / 100;

  const totalFinalPagar = metodoPago === 'mercadopago' ? totalConImpuestos : totalSubtotal;
  const anticipoPagar = Math.round(totalFinalPagar * 0.60 * 100) / 100;
  const montoAPagarAhora = tipoMonto === 'advance' ? anticipoPagar : totalFinalPagar;

  const cotizacionesVigentes = cotizaciones.filter(c => !c.vencida && !c.recotizacionSolicitada);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount || 0));
  };

  // Abrir Modal de Pago para los ítems seleccionados
  const handleProcederPago = () => {
    if (cotizacionesSeleccionadas.length === 0) {
      alert("Por favor selecciona al menos una cotización vigente para proceder al pago.");
      return;
    }
    setShowPagoModal(true);
  };

  // ── PROCESAR PAGO (MERCADO PAGO O EFECTIVO) ──
  const handleConfirmarPago = async () => {
    if (cotizacionesSeleccionadas.length === 0) return;
    setProcesandoPago(true);

    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentesolutionsback-production.up.railway.app/api';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const selectedQuoteIds = cotizacionesSeleccionadas.map(c => c.quote_id || c.id);

    try {
      if (metodoPago === 'mercadopago') {
        // Generar preferencia de Mercado Pago con el primer ID o lote
        const firstQuoteId = selectedQuoteIds[0];
        const res = await axios.post(
          `${API_URL}/cotizaciones/${firstQuoteId}/mercadopago/preference`,
          { 
            payment_stage: tipoMonto,
            quote_ids: selectedQuoteIds
          },
          { headers }
        );

        if (res.data?.init_point) {
          window.location.href = res.data.init_point;
          return;
        } else {
          alert("No se pudo iniciar la pasarela de Mercado Pago. Por favor intenta de nuevo.");
        }
      } else {
        // Pago en Efectivo (Registrar en Backend y notificar a Admin y Root)
        await axios.post(
          `${API_URL}/cotizaciones/batch/solicitar-efectivo`,
          {
            quote_ids: selectedQuoteIds,
            cash_amount_type: tipoMonto,
            cash_timing: timingEfectivo
          },
          { headers }
        );

        // Notificación local inmediata para admin y root
        const notificacionesAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
        const notificacionesRoot = JSON.parse(localStorage.getItem('notificaciones_root') || '[]');
        const foliosTxt = cotizacionesSeleccionadas.map(c => c.folio || `#${c.id}`).join(', ');
        
        const nuevaNotifPago = {
          id: Date.now(),
          type: 'pago_solicitado',
          title: `💳 Pago en Efectivo Solicitado (${foliosTxt})`,
          titulo: `Pago en Efectivo Solicitado (${foliosTxt})`,
          message: `El cliente ha solicitado y autorizado ${cotizacionesSeleccionadas.length} servicio(s) [${foliosTxt}] por un monto de ${formatCurrency(montoAPagarAhora)}. Procede a planear la visita y asignar técnicos.`,
          mensaje: `El cliente ha solicitado y autorizado ${cotizacionesSeleccionadas.length} servicio(s) [${foliosTxt}] por un monto de ${formatCurrency(montoAPagarAhora)}. Procede a planear la visita y asignar técnicos.`,
          fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
          created_at: new Date().toISOString(),
          read_at: null,
          leida: false,
          data: {
            type: 'pago_solicitado',
            quote_ids: selectedQuoteIds,
            url: '/vista-cotizaciones?filtro=Aceptadas'
          }
        };

        localStorage.setItem('notificaciones_admin', JSON.stringify([nuevaNotifPago, ...notificacionesAdmin]));
        localStorage.setItem('notificaciones_root', JSON.stringify([nuevaNotifPago, ...notificacionesRoot]));
        window.dispatchEvent(new Event('notif_update'));
        window.dispatchEvent(new Event('storage'));

        // Guardar estado de éxito para mostrar pantalla de confirmación
        setPagoCompletadoExito({
          cantidad: cotizacionesSeleccionadas.length,
          folios: foliosTxt,
          monto: montoAPagarAhora,
          tipo: tipoMonto === 'advance' ? 'Anticipo (60%)' : 'Total (100%)',
          noSeleccionadasCount: cotizacionesNoSeleccionadas.length
        });

        // Limpiar del carrito local los seleccionados
        const guardadas = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
        const restantes = guardadas.filter(item => !selectedQuoteIds.includes(item.id) && !selectedQuoteIds.includes(item.quote_id));
        localStorage.setItem('carrito_cotizaciones', JSON.stringify(restantes));

        // Refrescar lista de cotizaciones
        fetchCotizaciones();
      }
    } catch (err) {
      console.error("Error al procesar pago:", err);
      alert("Hubo un error al procesar la solicitud. Por favor intenta de nuevo.");
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="quotes-view-container cart-page-container">
      {/* Toast de Notificación o Alerta */}
      {mensajeNotificacion && (
        <div className="cart-toast-alert">
          <AlertCircle size={20} className="toast-icon" />
          <span>{mensajeNotificacion}</span>
          <button className="toast-close-btn" onClick={() => setMensajeNotificacion(null)}>&times;</button>
        </div>
      )}

      {/* Encabezado Principal */}
      <header className="quotes-main-header cart-header">
        <div className="header-titles">
          <div className="cart-title-row">
            <div className="cart-icon-badge">
              <ShoppingBag size={28} color="#f26624" />
            </div>
            <div>
              <h2>Carrito de Cotizaciones y Servicios</h2>
              <p>Selecciona los servicios que deseas autorizar y pagar hoy. Los no seleccionados quedarán guardados como <strong>"Por pagar"</strong>.</p>
            </div>
          </div>
        </div>
        <div className="cart-summary-pill">
          <Sparkles size={16} />
          {cotizaciones.length} servicios registrados
        </div>
      </header>

      {/* Grid Principal: Lista + Resumen Lateral */}
      <div className="cart-main-grid">
        {/* Columna Izquierda: Lista de Cotizaciones */}
        <div className="cart-items-column">
          {/* Barra de Selección Masiva */}
          <div className="cart-selection-bar">
            <div className="select-all-toggle" onClick={handleToggleAll}>
              {selectedIds.length === cotizacionesVigentes.length && cotizacionesVigentes.length > 0 ? (
                <CheckSquare size={22} className="checkbox-icon checked" />
              ) : (
                <Square size={22} className="checkbox-icon" />
              )}
              <span className="select-all-text">
                Seleccionar vigentes ({selectedIds.length}/{cotizacionesVigentes.length})
              </span>
            </div>
            {selectedIds.length > 0 && (
              <span className="selected-count-badge">
                {selectedIds.length} {selectedIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
              </span>
            )}
          </div>

          {/* Lista de Tarjetas de Cotización */}
          <div className="quotes-scroll-area cart-list-wrapper">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <Loader2 size={32} className="spin-slow" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <p>Cargando tus cotizaciones...</p>
              </div>
            ) : cotizaciones.length === 0 ? (
              <div className="empty-cart-state">
                <ShoppingBag size={48} color="#94a3b8" />
                <p>No tienes cotizaciones o servicios pendientes por el momento.</p>
                <button 
                  className="btn-login" 
                  style={{ marginTop: '14px', width: 'auto', padding: '10px 24px', fontSize: '0.9rem' }}
                  onClick={() => navigate('/propiedades')}
                >
                  Ir a mis propiedades
                </button>
              </div>
            ) : (
              cotizaciones.map((cot) => {
                const esPendienteRecotizacion = cot.estado === 'Pendiente de recotización' || cot.recotizacionSolicitada;
                const isSelected = !cot.vencida && !esPendienteRecotizacion && selectedIds.includes(cot.id);
                return (
                  <div 
                    key={cot.id} 
                    className={`quote-card-item cart-card-row ${isSelected ? 'selected-row' : ''} ${cot.vencida && !esPendienteRecotizacion ? 'expired-card-row' : ''} ${esPendienteRecotizacion ? 'pending-requote-card-row' : ''}`}
                    onClick={() => handleToggleSelect(cot)}
                  >
                    {/* Cabecera de la Tarjeta */}
                    <div className="cart-card-header">
                      <div className="cart-card-title-group">
                        <div 
                          className={`cart-checkbox-wrapper ${cot.vencida || esPendienteRecotizacion ? 'disabled-checkbox' : ''}`} 
                          onClick={(e) => handleToggleSelect(cot, e)}
                          title={esPendienteRecotizacion ? 'Recotización en proceso' : cot.vencida ? 'Cotización caducada. Solicita recotizar' : isSelected ? 'Desmarcar (dejar por pagar)' : 'Marcar para sumar al total'}
                        >
                          {esPendienteRecotizacion ? (
                            <div className="pending-requote-lock-box" title="Recotización pendiente">
                              <RefreshCw size={18} className="lock-icon spin-slow" color="#d97706" />
                            </div>
                          ) : cot.vencida ? (
                            <div className="expired-lock-box">
                              <Lock size={18} className="lock-icon" />
                            </div>
                          ) : isSelected ? (
                            <CheckSquare size={22} className="checkbox-icon checked" />
                          ) : (
                            <Square size={22} className="checkbox-icon" />
                          )}
                        </div>

                        <div className="cart-card-title-info">
                          <h4>{cot.propiedad_nombre} • {cot.tipo_falla}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {esPendienteRecotizacion ? (
                              <span className="quote-status-label status-pending-requote">
                                <Clock size={13} style={{ marginRight: '4px' }} /> Pendiente de recotización
                              </span>
                            ) : cot.vencida ? (
                              <span className="quote-status-label status-expired">
                                Caducada (&gt; 15 días)
                              </span>
                            ) : isSelected ? (
                              <span className="quote-status-label" style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: '800' }}>
                                ✅ Marcado para pagar hoy
                              </span>
                            ) : (
                              <span className="quote-status-label" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: '800' }}>
                                📌 Por pagar / Por autorizar
                              </span>
                            )}
                            
                            {!cot.vencida && !esPendienteRecotizacion && (
                              <span className="quote-status-label status-valid" style={{ fontSize: '0.72rem' }}>
                                Vigente ({cot.diasRestantes} días restantes)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        className="btn-remove-icon"
                        title="Quitar del carrito"
                        onClick={(e) => handleEliminarDelCarrito(cot, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="cart-card-body">
                      <div className="cart-card-body-left">
                        <div className={`quote-card-icon cart-icon ${esPendienteRecotizacion ? 'pending-icon-box' : cot.vencida ? 'expired-icon-box' : ''}`}>
                          {esPendienteRecotizacion ? <RefreshCw size={20} color="#d97706" /> : cot.vencida ? <CalendarX size={20} color="#dc2626" /> : <Clock size={20} />}
                        </div>
                        <div className="quote-card-details">
                          <p className="quote-description">
                            <strong>Problema:</strong> {cot.descripcion_problema || cot.descripcion}
                          </p>
                          
                          {/* Avisos de Estado */}
                          {esPendienteRecotizacion ? (
                            <div className="expired-alert-banner pending-requote-banner">
                              <RefreshCw size={15} className="alert-icon" />
                              <span>Solicitud de recotización enviada. En espera de actualización de costos por el administrador.</span>
                            </div>
                          ) : cot.vencida ? (
                            <div className="expired-alert-banner">
                              <AlertTriangle size={15} className="alert-icon" />
                              <span>Cotización vencida. Debes recotizar para poder sumarla a tu cuenta.</span>
                            </div>
                          ) : null}

                          <div className="quote-meta-row">
                            <span className="quote-meta-pill">Folio: <strong>{cot.folio}</strong></span>
                            <span className="quote-meta-pill">Zona: <strong>{cot.zona}</strong></span>
                            <span className="quote-meta-pill">Equipo: <strong>{cot.equipo}</strong></span>
                            <span className="quote-meta-pill">Registro: {cot.fecha}</span>
                          </div>
                        </div>
                      </div>

                      {/* Importe Total */}
                      <div className={`quote-total-box ${esPendienteRecotizacion ? 'pending-total-box' : cot.vencida ? 'expired-total-box' : ''}`}>
                        <span className="total-box-label">{esPendienteRecotizacion ? 'Monto en actualización' : cot.vencida ? 'Sujeto a recotización' : 'Importe cotizado'}</span>
                        <strong className={`total-box-amount ${cot.vencida && !esPendienteRecotizacion ? 'strike-price' : ''}`}>
                          {formatCurrency(cot.total)}
                        </strong>
                      </div>
                    </div>

                    {/* Acciones de la Tarjeta en el Pie */}
                    <div className="cart-card-actions-row">
                      {esPendienteRecotizacion ? (
                        <button className="btn-requote-sent-disabled" disabled title="La solicitud ya fue enviada al administrador">
                          <CheckCircle2 size={14} /> Solicitud de recotización enviada
                        </button>
                      ) : cot.vencida ? (
                        <button 
                          className="btn-requote-action"
                          onClick={(e) => handleSolicitarRecotizacion(cot, e)}
                        >
                          <RefreshCw size={14} /> Solicitar Recotización
                        </button>
                      ) : null}
                      <button 
                        className="btn-preview" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCotizacionSeleccionada(cot);
                        }}
                      >
                        <Eye size={14} /> Ver desglose del problema
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Resumen Acumulado Dinámico */}
        <div className="cart-summary-column">
          <div className="order-summary-card">
            <div className="summary-card-header">
              <h3>Resumen del Carrito</h3>
              <span className="summary-items-count">
                {cotizacionesSeleccionadas.length} seleccionados para pagar
              </span>
            </div>

            <div className="summary-divider"></div>

            {/* Desglose Rápido de Ítems Seleccionados */}
            <div className="selected-items-breakdown">
              <h4>Servicios incluidos en la suma:</h4>
              {cotizacionesSeleccionadas.length === 0 ? (
                <p className="no-selection-msg">Selecciona al menos una cotización para calcular el total a pagar.</p>
              ) : (
                <ul className="breakdown-list">
                  {cotizacionesSeleccionadas.map((item) => (
                    <li key={item.id} className="breakdown-item">
                      <div className="breakdown-item-info">
                        <CheckCircle2 size={15} className="item-check-icon" />
                        <span className="item-title">{item.titulo}</span>
                      </div>
                      <span className="item-price">{formatCurrency(item.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Aviso de servicios que quedan como Por Pagar */}
            {cotizacionesNoSeleccionadas.length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '0.78rem',
                color: '#64748b',
                marginTop: '10px',
                lineHeight: '1.4'
              }}>
                📌 <strong>{cotizacionesNoSeleccionadas.length} servicio(s)</strong> no seleccionados permanecerán guardados como <em>"Por pagar"</em>.
              </div>
            )}

            <div className="summary-divider"></div>

            {/* Fila de Total Acumulado */}
            <div className="total-accumulated-box">
              <div className="total-label-group">
                <span>Total a Pagar</span>
                <small>{cotizacionesSeleccionadas.length} servicio(s) marcado(s)</small>
              </div>
              <div className="total-amount-highlight">
                {formatCurrency(totalSubtotal)}
              </div>
            </div>

            {/* Botón de Acción Principal */}
            <button 
              className={`btn-proceed-checkout ${cotizacionesSeleccionadas.length === 0 ? 'disabled' : ''}`}
              onClick={handleProcederPago}
              disabled={cotizacionesSeleccionadas.length === 0}
            >
              <CreditCard size={20} />
              <span>Aceptar y Pagar Seleccionados ({cotizacionesSeleccionadas.length})</span>
            </button>

            {/* Nota de Seguridad */}
            <div className="cart-security-badge">
              <ShieldCheck size={18} color="#16a34a" />
              <span>Garantía de 15 días de vigencia en todas tus cotizaciones.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL DE PAGO INTEGRADO (MERCADO PAGO / EFECTIVO / TRANSFERENCIA)
      ══════════════════════════════════════════════════════════════════════ */}
      {showPagoModal && (
        <div className="modal-overlay" onClick={() => !procesandoPago && setShowPagoModal(false)}>
          <div 
            className="modal-content-wrapper" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', width: '95%', background: '#ffffff', borderRadius: '24px', padding: '0', overflow: 'hidden' }}
          >
            {/* Header del Modal de Pago */}
            <div style={{
              background: 'linear-gradient(135deg, #1e2229 0%, #0f172a 100%)',
              padding: '24px 24px 20px 24px',
              color: '#ffffff',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowPagoModal(false)}
                disabled={procesandoPago}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>

              <span style={{ 
                background: 'rgba(242, 102, 36, 0.2)', 
                color: '#f26624', 
                border: '1px solid rgba(242, 102, 36, 0.4)',
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontSize: '0.75rem', 
                fontWeight: '900', 
                letterSpacing: '0.5px' 
              }}>
                PASARELA DE PAGO Y AUTORIZACIÓN
              </span>
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '1.4rem', fontWeight: '900' }}>
                Pagar Servicios Seleccionados ({cotizacionesSeleccionadas.length})
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                Autoriza y agenda tus trabajos con Agente Solutions
              </p>
            </div>

            {/* Cuerpo del Modal de Pago */}
            <div style={{ padding: '20px 24px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Lista de Servicios a Pagar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: '800' }}>
                  Servicios que se autorizan y pagan:
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cotizacionesSeleccionadas.map(c => (
                    <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155' }}>
                      <span style={{ fontWeight: '600' }}>• {c.titulo}</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(c.total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector de Método de Pago */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '800' }}>
                1. Selecciona Método de Pago:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                {/* Opción Mercado Pago */}
                <div 
                  onClick={() => setMetodoPago('mercadopago')}
                  style={{
                    border: `2px solid ${metodoPago === 'mercadopago' ? '#009ee3' : '#e2e8f0'}`,
                    background: metodoPago === 'mercadopago' ? '#f0f9ff' : '#ffffff',
                    borderRadius: '14px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <img src={mpLogo} alt="Mercado Pago" style={{ height: '24px', objectFit: 'contain', marginBottom: '6px' }} />
                  <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>Tarjeta / Mercado Pago</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Crédito, Débito o SPEI</div>
                </div>

                {/* Opción Efectivo */}
                <div 
                  onClick={() => setMetodoPago('efectivo')}
                  style={{
                    border: `2px solid ${metodoPago === 'efectivo' ? '#16a34a' : '#e2e8f0'}`,
                    background: metodoPago === 'efectivo' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '14px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <Banknote size={26} color="#16a34a" style={{ margin: '0 auto 4px auto', display: 'block' }} />
                  <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>Efectivo / En Sitio</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Pago contra entrega</div>
                </div>
              </div>

              {/* Selector de Esquema: Anticipo 60% vs Pago Total 100% */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '800' }}>
                2. Esquema de Pago:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div 
                  onClick={() => setTipoMonto('advance')}
                  style={{
                    border: `2px solid ${tipoMonto === 'advance' ? '#f26624' : '#e2e8f0'}`,
                    background: tipoMonto === 'advance' ? '#fff7ed' : '#ffffff',
                    borderRadius: '14px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#f26624' }}>Anticipo del 60%</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
                    {formatCurrency(anticipoPagar)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>40% restante al finalizar</div>
                </div>

                <div 
                  onClick={() => setTipoMonto('full')}
                  style={{
                    border: `2px solid ${tipoMonto === 'full' ? '#f26624' : '#e2e8f0'}`,
                    background: tipoMonto === 'full' ? '#fff7ed' : '#ffffff',
                    borderRadius: '14px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#f26624' }}>Pago Total (100%)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
                    {formatCurrency(totalFinalPagar)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Liquidación completa</div>
                </div>
              </div>

              {/* Si es efectivo, selector de timing */}
              {metodoPago === 'efectivo' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    Momento de entrega del efectivo:
                  </label>
                  <select 
                    value={timingEfectivo} 
                    onChange={(e) => setTimingEfectivo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  >
                    <option value="immediate">Entregar al inicio / visita del técnico</option>
                    <option value="on_completion">Entregar al finalizar y validar el trabajo</option>
                  </select>
                </div>
              )}

              {/* Resumen Total a Pagar Ahora */}
              <div style={{
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>
                    Monto a pagar ahora ({tipoMonto === 'advance' ? '60% Anticipo' : 'Total'}):
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f26624' }}>
                    {formatCurrency(montoAPagarAhora)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {cotizacionesSeleccionadas.length} servicio(s)
                </div>
              </div>

              {/* Botón de Confirmación */}
              <button 
                onClick={handleConfirmarPago}
                disabled={procesandoPago}
                style={{
                  width: '100%',
                  background: '#f26624',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px',
                  fontWeight: '900',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 20px rgba(242, 102, 36, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {procesandoPago ? (
                  <>
                    <Loader2 size={20} className="spin-slow" />
                    <span>Procesando solicitud...</span>
                  </>
                ) : metodoPago === 'mercadopago' ? (
                  <>
                    <span>PAGAR CON MERCADO PAGO</span>
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>CONFIRMAR PAGO EN EFECTIVO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito / Confirmación de Pago y Notificación a Admin/Root */}
      {pagoCompletadoExito && (
        <div className="modal-overlay" onClick={() => setPagoCompletadoExito(null)}>
          <div 
            className="modal-content-wrapper modal-requote-success" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', textAlign: 'center', padding: '32px 24px' }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#dcfce7',
              border: '2px solid #16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={40} color="#16a34a" />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>
              ¡Servicios Autorizados y Notificados!
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 18px 0' }}>
              Se ha confirmado la solicitud para <strong>{pagoCompletadoExito.cantidad} servicio(s)</strong> por un importe de <strong>{formatCurrency(pagoCompletadoExito.monto)} ({pagoCompletadoExito.tipo})</strong>.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px',
              textAlign: 'left',
              fontSize: '0.82rem',
              color: '#334155',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: '800', color: '#f26624' }}>
                🚀 Flujo Operativo Agente Solutions:
              </p>
              <p style={{ margin: 0 }}>
                El <strong>Administrador y Root</strong> han recibido la notificación en tiempo real. Procederán a asignar a los técnicos de tu zona y programar la fecha de visita para realizar los trabajos.
              </p>
            </div>

            <button 
              className="btn-login"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              onClick={() => {
                setPagoCompletadoExito(null);
                setShowPagoModal(false);
              }}
            >
              ENTENDIDO, VOLVER AL CARRITO
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL DE DETALLE Y DESGLOSE DEL PROBLEMA (ESTILO TABLERO DE SERVICIOS)
      ══════════════════════════════════════════════════════════════════════ */}
      {cotizacionSeleccionada && (
        <div className="tp-modal-overlay" onClick={() => setCotizacionSeleccionada(null)} style={{ zIndex: 9999 }}>
          <div 
            className="tp-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '95%', borderRadius: '24px', overflow: 'hidden', padding: 0 }}
          >
            {/* HERO DE LA PROPIEDAD CON IMAGEN DE FACHADA */}
            <section 
              className="tp-hero-section"
              style={{
                backgroundImage: cotizacionSeleccionada.propiedad_foto ? `url(${cotizacionSeleccionada.propiedad_foto})` : 'none',
                backgroundColor: '#1e2229',
                minHeight: '190px',
                position: 'relative'
              }}
            >
              <div className="tp-hero-overlay"></div>
              <button 
                className="tp-close-modal-btn" 
                onClick={() => setCotizacionSeleccionada(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.65)',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30
                }}
              >
                <X size={20} />
              </button>

              <div className="tp-hero-content" style={{ padding: '24px 28px', position: 'relative', zIndex: 10 }}>
                <div className="tp-hero-text">
                  <span className="tp-id-badge" style={{ backgroundColor: '#f26624', color: '#fff', fontWeight: '900', padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {cotizacionSeleccionada.propiedad_curp || cotizacionSeleccionada.folio}
                  </span>
                  <h1 className="tp-property-name" style={{ fontSize: '1.85rem', color: '#fff', margin: '8px 0 4px 0', fontWeight: '900' }}>
                    {cotizacionSeleccionada.propiedad_nombre}
                  </h1>
                  <div className="tp-property-address" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.88rem' }}>
                    <MapPin size={16} color="#f26624" />
                    <span>{cotizacionSeleccionada.propiedad_direccion}</span>
                  </div>
                </div>

                {cotizacionSeleccionada.propiedad_coordenadas && (
                  <div className="tp-hero-actions" style={{ marginTop: '12px' }}>
                    <button 
                      className="tp-action-btn maps"
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${cotizacionSeleccionada.propiedad_coordenadas}`, '_blank')}
                      style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '800' }}
                    >
                      <Navigation size={14} />
                      <span>GPS</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* SECCIÓN PRINCIPAL: TARJETAS DE CONTENIDO */}
            <div style={{ padding: '24px', backgroundColor: '#f8fafc', maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                
                {/* 1. TARJETA CONSISTE EN: */}
                <div className="tp-card tp-work-description-card" style={{ margin: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div className="tp-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', color: '#f26624' }}>
                    <FileText size={20} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>CONSISTE EN:</h3>
                  </div>

                  <div className="tp-work-description-v2">
                    <div className="tp-description-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="tp-desc-item" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div className="tp-desc-icon problem" style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AlertTriangle size={20} />
                        </div>
                        <div className="tp-desc-text" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>TIPO DE FALLA / PROBLEMA</label>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '800' }}>{cotizacionSeleccionada.tipo_falla}</strong>
                        </div>
                      </div>

                      <div className="tp-desc-item" style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div className="tp-desc-icon equipment" style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fff7ed', color: '#f26624', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Zap size={20} />
                        </div>
                        <div className="tp-desc-text" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>EQUIPO O COMPONENTE AFECTADO</label>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '800' }}>{cotizacionSeleccionada.equipo}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tp-work-meta" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '14px', padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div className="tp-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
                      <Clock size={16} color="#f26624" />
                      <span>Programado: {cotizacionSeleccionada.scheduled_at || cotizacionSeleccionada.fecha || 'Pendiente'}</span>
                    </div>
                    <div className="tp-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
                      <Wrench size={16} color="#f26624" />
                      <span>Título: {cotizacionSeleccionada.tipo_falla} - {cotizacionSeleccionada.zona || 'General'}</span>
                    </div>
                  </div>

                  {/* Descripción detallada */}
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Descripción del cliente</span>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-line', background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      {cotizacionSeleccionada.descripcion_problema || cotizacionSeleccionada.descripcion || 'Sin descripción adicional registrada.'}
                    </p>
                  </div>
                </div>

                {/* 2. TARJETA DATOS DEL CLIENTE Y COTIZACIÓN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* DATOS DEL CLIENTE */}
                  <div className="tp-card tp-client-card" style={{ margin: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div className="tp-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', color: '#f26624' }}>
                      <User size={20} />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>DATOS DEL CLIENTE</h3>
                    </div>
                    <div className="tp-client-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#334155' }}>
                      <p style={{ margin: 0 }}><strong>Nombre:</strong> {cotizacionSeleccionada.cliente_nombre}</p>
                      <p style={{ margin: 0 }}><strong>Teléfono:</strong> {cotizacionSeleccionada.cliente_telefono || 'No registrado'}</p>
                      <p style={{ margin: 0 }}><strong>Tipo:</strong> {cotizacionSeleccionada.cliente_tipo_propiedad || 'CASA'}</p>
                    </div>
                  </div>

                  {/* FOTOS DE EVIDENCIAS */}
                  <div className="tp-card tp-evidence-card" style={{ margin: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div className="tp-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px', color: '#f26624' }}>
                      <ImageIcon size={20} />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>EVIDENCIAS REGISTRADAS</h3>
                    </div>
                    {cotizacionSeleccionada.evidencias && cotizacionSeleccionada.evidencias.length > 0 ? (
                      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {cotizacionSeleccionada.evidencias.map((foto, idx) => (
                          <img 
                            key={idx}
                            src={foto}
                            alt="Evidencia"
                            onClick={() => setImagenExpandida(foto)}
                            style={{ width: '75px', height: '75px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        No se adjuntaron fotografías en este reporte.
                      </p>
                    )}
                  </div>

                  {/* TARJETA DE COTIZACIÓN Y PRESUPUESTO */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '10px' }}>
                      <CreditCard size={20} color="#f26624" />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#0f172a' }}>COTIZACIÓN Y PRESUPUESTO</h3>
                    </div>

                    {/* Bloque de Precio */}
                    <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' }}>
                        {cotizacionSeleccionada.vencida ? 'Presupuesto sujeto a recotización' : 'Importe Oficial Cotizado'}
                      </span>
                      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
                        {formatCurrency(cotizacionSeleccionada.total)} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>MXN</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: cotizacionSeleccionada.vencida ? '#dc2626' : '#16a34a', fontWeight: '800' }}>
                        {cotizacionSeleccionada.vencida ? '⚠️ Caducada (> 15 días)' : `🟢 Vigente (${cotizacionSeleccionada.diasRestantes} días restantes)`}
                      </span>
                    </div>

                    {/* Grid de Metadatos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Folio</span>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{cotizacionSeleccionada.folio}</strong>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Fecha de Registro</span>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{cotizacionSeleccionada.fecha}</strong>
                      </div>
                    </div>

                    {/* Botón de Acción en el Modal */}
                    <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                      {cotizacionSeleccionada.vencida ? (
                        <button 
                          className="btn-requote-final"
                          style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '900' }}
                          onClick={(e) => {
                            handleSolicitarRecotizacion(cotizacionSeleccionada, e);
                            setCotizacionSeleccionada(null);
                          }}
                        >
                          <RefreshCw size={16} style={{ marginRight: '6px' }} />
                          Solicitar Recotización al Administrador
                        </button>
                      ) : (
                        <button 
                          className="btn-accept-final"
                          style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '900', background: '#f26624', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(242, 102, 36, 0.3)' }}
                          onClick={() => {
                            if (!selectedIds.includes(cotizacionSeleccionada.id)) {
                              setSelectedIds(prev => [...prev, cotizacionSeleccionada.id]);
                            }
                            setCotizacionSeleccionada(null);
                          }}
                        >
                          {selectedIds.includes(cotizacionSeleccionada.id) ? '✅ Mantener Seleccionado para Pago' : '➕ Seleccionar para Pagar Ahora'}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visor de Imagen Expandida */}
      {imagenExpandida && (
        <div className="zoom-overlay" onClick={() => setImagenExpandida(null)} style={{ zIndex: 100000 }}>
          <button className="zoom-close-fixed" onClick={() => setImagenExpandida(null)}><X size={32} /></button>
          <div className="zoom-content" onClick={e => e.stopPropagation()}>
            <img src={imagenExpandida} className="image-zoomed" alt="Zoom" />
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Recotización Enviada */}
      {modalRecotizacionExito && (
        <div className="modal-overlay" onClick={() => setModalRecotizacionExito(null)}>
          <div className="modal-content-wrapper modal-requote-success" onClick={(e) => e.stopPropagation()}>
            <div className="modal-requote-body">
              <div className="requote-success-icon-badge">
                <RefreshCw size={36} color="#f26624" />
              </div>
              <h3>¡Solicitud de Recotización Enviada!</h3>
              <p className="requote-success-msg">
                Se ha enviado la solicitud de recotización para <strong>{modalRecotizacionExito.titulo}</strong> ({modalRecotizacionExito.folio || `#${modalRecotizacionExito.id}`}) al Administrador.
              </p>
              
              <div className="requote-status-box">
                <div className="status-box-row">
                  <span>Nuevo Estado de la Cotización:</span>
                  <span className="quote-status-label status-pending-requote">
                    <Clock size={13} style={{ marginRight: '4px' }} /> Pendiente de recotización
                  </span>
                </div>
                <p className="status-box-note">
                  El Administrador ha recibido la notificación para actualizar los precios. En cuanto sean actualizados, la cotización pasará nuevamente a estar vigente en tu carrito.
                </p>
              </div>

              <div className="requote-modal-actions">
                <button 
                  className="btn-accept-final btn-requote-confirm-ok" 
                  onClick={() => setModalRecotizacionExito(null)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionesPendientes;
