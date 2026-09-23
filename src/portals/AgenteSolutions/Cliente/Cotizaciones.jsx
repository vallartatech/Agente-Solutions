import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, XCircle, Clock, MessageSquare, 
  ChevronRight, Copy, UploadCloud, ShieldCheck, CreditCard, ShoppingCart 
} from 'lucide-react';
import '../../../styles/AgenteSolutions/Cliente/Cotizaciones.css';

const Cotizaciones = () => {
  const [tabActivo, setTabActivo] = useState('nuevas');
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [pasoPago, setPasoPago] = useState(0); 
  const [motivoFeedback, setMotivoFeedback] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [cotizacionesData, setCotizacionesData] = useState([]);

  const [carritoCotizaciones, setCarritoCotizaciones] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
    } catch {
      return [];
    }
  });

  const isCotizacionEnCarrito = (cot) => {
    if (!cot) return false;
    return carritoCotizaciones.some(item => 
      String(item.id) === String(cot.id) || 
      (cot.folio && String(item.folio) === String(cot.folio))
    );
  };

  // Enviar servicio / cotización a la vista del Carrito
  const handleMandarAlCarrito = (cot, e) => {
    if (e) e.stopPropagation();
    if (!cot) return;

    const carritoGuardado = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
    const yaExiste = carritoGuardado.some(item => String(item.id) === String(cot.id) || String(item.folio) === String(cot.folio));

    if (yaExiste) {
      alert(`La cotización ${cot.folio || `#${cot.id}`} ya se encuentra agregada en tu Carrito de Compras.`);
      cerrarModal();
      navigate('/cotizaciones-pendientes');
      return;
    }

    const fechaOriginal = cot.fecha || cot.created_at || new Date().toISOString().split('T')[0];
    
    const nuevoItemCarrito = {
      id: cot.id || Date.now(),
      titulo: cot.propiedad_nombre || cot.concepto || cot.titulo || `Cotización #${cot.id}`,
      folio: cot.folio || `COT-${cot.id}`,
      fecha: fechaOriginal,
      total: Number(cot.total || cot.total_amount || 0),
      estado: 'Pendiente de aprobación',
      descripcion: getConceptoText(cot),
      vencida: false,
      diasRestantes: 15
    };

    const nuevoCarrito = [nuevoItemCarrito, ...carritoGuardado];
    localStorage.setItem('carrito_cotizaciones', JSON.stringify(nuevoCarrito));
    setCarritoCotizaciones(nuevoCarrito);

    alert(`🛒 ¡Cotización ${nuevoItemCarrito.folio} enviada al Carrito de Compras con éxito!`);
    cerrarModal();
    navigate('/cotizaciones-pendientes');
  };

  useEffect(() => {
    const fetchCotizaciones = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://agentesolutionsback-production.up.railway.app/api';
        const res = await axios.get(`${API_URL}/cotizaciones`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (Array.isArray(res.data)) {
          setCotizacionesData(res.data);
        } else if (res.data && Array.isArray(res.data.quotes || res.data.data)) {
          setCotizacionesData(res.data.quotes || res.data.data);
        }
        setLoading(false);
      } catch (err) {
        console.warn("Usando datos locales o vacíos por error en red:", err);
        setError(null);
        setLoading(false);
      }
    };
    fetchCotizaciones();
  }, []);

  const cotizacionesFiltradas = cotizacionesData.filter(cot => {
    const statusLower = String(cot.status || cot.estado || '').toLowerCase();
    if (tabActivo === 'nuevas') {
      return statusLower === 'nuevas' || statusLower.includes('pendien') || !statusLower;
    }
    if (tabActivo === 'aceptadas') {
      return statusLower === 'aceptadas' || statusLower.includes('aprob') || statusLower.includes('procesada') || statusLower.includes('pagad');
    }
    if (tabActivo === 'rechazadas') {
      return statusLower === 'rechazadas' || statusLower.includes('rechaz') || statusLower.includes('cancel');
    }
    return false;
  });

  const abrirModal = (cot) => {
    setCotizacionSeleccionada(cot);
    setPasoPago(0);
    setMotivoFeedback(cot.comentarioCliente || '');
  };

  const cerrarModal = () => {
    setCotizacionSeleccionada(null);
    setPasoPago(0);
    setMotivoFeedback('');
  };

  const handleFinalizarPago = () => {
    console.log(`Enviando comprobante para ${cotizacionSeleccionada.id}. Nota: ${motivoFeedback}`);
    alert("Comprobante enviado con éxito.");
    navigate('/'); 
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount || 0));
  };

  const getConceptoText = (cot) => {
    if (!cot) return 'Esperando respuesta de Agente Solutions.';
    const raw = cot.concept || cot.concepto;
    if (!raw) return cot.observations || 'Esperando respuesta de Agente Solutions.';
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
          // ignore parsing error
        }
      }
      return raw;
    }
    if (typeof raw === 'object') {
      const arr = raw.conceptos || raw.servicios || raw.seccionesLote || [];
      if (Array.isArray(arr) && arr.length > 0) {
        const descs = arr.map(x => x.descripcion || x.titulo || x.desc || 'Servicio').filter(Boolean);
        if (descs.length > 0) return descs.join(', ');
      }
      return cot.observations || 'Cotización detallada con servicios y materiales.';
    }
    return cot.observations || 'Esperando respuesta de Agente Solutions.';
  };

  const renderDetalleConceptoModal = (cot) => {
    if (!cot) return null;
    let detalle = cot.concept || cot.concepto;
    if (typeof detalle === 'string' && (detalle.trim().startsWith('{') || detalle.trim().startsWith('['))) {
      try { 
        detalle = JSON.parse(detalle); 
      } catch {
        // ignore parsing error
      }
    }
    if (!detalle || typeof detalle !== 'object') {
      return (
        <div className="excel-row">
          <span>Concepto</span>
          <span>{typeof detalle === 'string' ? detalle : 'Cotización asignada'}</span>
        </div>
      );
    }
    const listaServicios = detalle.conceptos || detalle.servicios || [];
    const listaMateriales = detalle.materiales || [];

    return (
      <div className="modal-concept-details-container">
        {listaServicios.length > 0 && (
          <div className="modal-concept-group">
            <h4 className="modal-concept-title">Servicios / Conceptos</h4>
            <div className="modal-table-scroll-wrapper">
              <table className="modal-concept-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="text-center">Cant.</th>
                    <th className="text-right">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {listaServicios.map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.descripcion || s.desc || 'Servicio'}</td>
                      <td className="text-center">{s.cantidad || s.cant || 1}</td>
                      <td className="text-right">{formatCurrency(s.precio_u || s.precio || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {listaMateriales.length > 0 && (
          <div className="modal-concept-group">
            <h4 className="modal-concept-title">Materiales Incluidos</h4>
            <div className="modal-table-scroll-wrapper">
              <table className="modal-concept-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th className="text-center">Cant.</th>
                    <th className="text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {listaMateriales.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.nombre || m.descripcion || m.desc || 'Material'}</td>
                      <td className="text-center">{m.cantidad || m.cant || 1}</td>
                      <td className="text-right">{formatCurrency(m.costo_u || m.precio || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="quotes-view-container">
      <header className="quotes-main-header">
        <div className="header-titles">
          <h2>Panel de Cotizaciones</h2>
          <p>Agente Solutions - Gestión de Proyectos</p>
        </div>
        <div className="quotes-tabs-row">
          <button className={`tab-btn ${tabActivo === 'nuevas' ? 'active-nuevas' : ''}`} onClick={() => setTabActivo('nuevas')}>NUEVAS</button>
          <button className={`tab-btn ${tabActivo === 'aceptadas' ? 'active-aceptadas' : ''}`} onClick={() => setTabActivo('aceptadas')}>ACEPTADAS</button>
          <button className={`tab-btn ${tabActivo === 'rechazadas' ? 'active-rechazadas' : ''}`} onClick={() => setTabActivo('rechazadas')}>RECHAZADAS</button>
        </div>
      </header>

      {loading ? (
        <div className="empty-state">Cargando cotizaciones...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div className="quotes-scroll-area">
          {cotizacionesFiltradas.length > 0 ? (
            cotizacionesFiltradas.map((cot) => (
              <div key={cot.id} className={`quote-card-item card-${cot.estado || 'nuevas'}`} onClick={() => abrirModal(cot)}>
                <div className="quote-card-left">
                  <div className="quote-card-icon">
                    {(cot.estado === 'nuevas' || !cot.estado) && <Clock size={20} />}
                    {cot.estado === 'aceptadas' && <CheckCircle size={20} />}
                    {cot.estado === 'rechazadas' && <XCircle size={20} />}
                  </div>
                  <div className="quote-card-info">
                    <h4>{cot.propiedad_nombre || cot.cliente || 'Cotización pendiente'}</h4>
                    <span>{cot.folio || `#${cot.id}`} • {cot.fecha || 'Sin fecha'}</span>
                    <p>{getConceptoText(cot)}</p>
                  </div>
                </div>
                <div className="quote-card-right">
                  <div className="price-tag-group">
                    <strong>{formatCurrency(cot.total)}</strong>
                    {cot.estado === 'aceptadas' && cot.pagadoPorcentaje === 60 ? (
                      <span className="partial-badge">ANTICIPO 60% PAGADO</span>
                    ) : (
                      <span className="partial-badge">{(cot.estado || 'PENDIENTE').toUpperCase()}</span>
                    )}
                  </div>
                  {(cot.estado === 'nuevas' || !cot.estado || cot.estado === 'pendiente') && (
                    <button 
                      className={`btn-card-cart-quick ${isCotizacionEnCarrito(cot) ? 'en-carrito' : ''}`}
                      onClick={(e) => handleMandarAlCarrito(cot, e)}
                      title="Mandar este servicio al Carrito de compras"
                      style={isCotizacionEnCarrito(cot) ? { background: '#10b981', color: 'white' } : {}}
                    >
                      <ShoppingCart size={15} /> {isCotizacionEnCarrito(cot) ? 'En Carrito' : 'Mandar al Carrito'}
                    </button>
                  )}
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No tienes cotizaciones en esta sección.</div>
          )}
        </div>
      )}

      {cotizacionSeleccionada && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
            {pasoPago === 0 ? (
              <div className="modal-excel-view">
                <header className={`modal-excel-header h-${cotizacionSeleccionada.estado || 'nuevas'}`}>
                  <div className="header-top-info">
                    <span className="badge-status">{(cotizacionSeleccionada.estado || 'NUEVA').toUpperCase()}</span>
                    <button className="close-modal-btn" onClick={cerrarModal}>&times;</button>
                  </div>
                  <h3>{cotizacionSeleccionada.propiedad_nombre || cotizacionSeleccionada.cliente || 'Cotización pendiente'}</h3>
                </header>
                <div className="modal-excel-body">
                  <div className="excel-table-container">
                    <div className="excel-table-header">
                      <span>DETALLE</span>
                      <span>VALOR</span>
                    </div>
                    <div className="excel-row">
                      <span>Folio</span>
                      <span>{cotizacionSeleccionada.folio || `#${cotizacionSeleccionada.id}`}</span>
                    </div>
                    <div className="excel-row">
                      <span>Fecha</span>
                      <span>{cotizacionSeleccionada.fecha || 'Sin fecha'}</span>
                    </div>
                    <div className="excel-row">
                      <span>Importe Total</span>
                      <span>{formatCurrency(cotizacionSeleccionada.total)}</span>
                    </div>
                    <div className="excel-row">
                      <span>Observaciones</span>
                      <span>{typeof cotizacionSeleccionada.observations === 'object' ? JSON.stringify(cotizacionSeleccionada.observations) : (cotizacionSeleccionada.observations || 'Esperando respuesta de Agente Solutions.')}</span>
                    </div>

                    {(cotizacionSeleccionada.estado === 'nuevas' || !cotizacionSeleccionada.estado) && (
                      <div className="excel-advance-highlight">
                        <span>Anticipo requerido para iniciar (60%)</span>
                        <strong>{formatCurrency(Number(cotizacionSeleccionada.total || 0) * 0.6)}</strong>
                      </div>
                    )}
                    {cotizacionSeleccionada.estado === 'aceptadas' && cotizacionSeleccionada.pagadoPorcentaje === 60 && (
                      <div className="excel-pending-highlight">
                        <span>Monto pendiente por liquidar (40%)</span>
                        <strong>{formatCurrency(Number(cotizacionSeleccionada.total || 0) * 0.4)}</strong>
                      </div>
                    )}
                  </div>

                  {renderDetalleConceptoModal(cotizacionSeleccionada)}

                  <div className="feedback-section" style={{ marginTop: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <MessageSquare size={14} /> Observaciones / Comentarios:
                    </label>
                    <textarea 
                      className="modal-textarea"
                      value={motivoFeedback} 
                      onChange={(e) => setMotivoFeedback(e.target.value)} 
                      placeholder="Escribe un mensaje para Agente Solutions..." 
                    />
                  </div>

                  <div className="modal-actions-dynamic">
                    {(cotizacionSeleccionada.estado === 'nuevas' || !cotizacionSeleccionada.estado) && (
                      isCotizacionEnCarrito(cotizacionSeleccionada) ? (
                        <button 
                          className="btn-cart-add-final"
                          onClick={(e) => handleMandarAlCarrito(cotizacionSeleccionada, e)}
                          style={{ background: '#10b981', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)', width: '100%' }}
                        >
                          <ShoppingCart size={18} /> YA EN EL CARRITO
                        </button>
                      ) : (
                        <>
                          <button className="btn-reject-final" onClick={cerrarModal}>RECHAZAR</button>
                          <button 
                            className="btn-cart-add-final"
                            onClick={(e) => handleMandarAlCarrito(cotizacionSeleccionada, e)}
                          >
                            <ShoppingCart size={18} /> MANDAR AL CARRITO
                          </button>
                          <button className="btn-accept-final" onClick={() => setPasoPago(1)}>PAGAR ANTICIPO (60%)</button>
                        </>
                      )
                    )}
                    {cotizacionSeleccionada.estado === 'aceptadas' && cotizacionSeleccionada.pagadoPorcentaje === 60 && (
                      <button className="btn-liquidar-final" onClick={() => setPasoPago(1)}>
                        <CreditCard size={18} /> LIQUIDAR RESTANTE (40%)
                      </button>
                    )}
                    {cotizacionSeleccionada.estado === 'rechazadas' && (
                      <div className="status-banner-error" style={{ width: '100%', textAlign: 'center', padding: '10px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontWeight: 'bold' }}>
                        ESTA COTIZACIÓN FUE RECHAZADA
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="finalizar-pago-container">
                <div className="pago-sidebar-info">
                  <h2 className="sidebar-title">Finalizar Pago</h2>
                  <div className="bank-details-box">
                    <div className="detail-item"><label>BANCO</label><strong>BBVA México</strong></div>
                    <div className="detail-item"><label>BENEFICIARIO</label><strong>Agente Solutions S.A. de C.V.</strong></div>
                    <div className="detail-item"><label>CLABE</label><div className="copy-field"><span>012 345 6789 0123 4567</span><Copy size={14} /></div></div>
                  </div>
                  <div className="monto-depositar-card">
                    <div className="monto-labels">
                      <span>Monto a depositar:</span>
                      <small>{cotizacionSeleccionada.pagadoPorcentaje === 60 ? 'Liquidación Final' : 'Anticipo Inicial'}</small>
                    </div>
                    <div className="monto-valor">
                      {cotizacionSeleccionada.pagadoPorcentaje === 60 
                        ? formatCurrency(Number(cotizacionSeleccionada.total || 0) * 0.4) 
                        : formatCurrency(Number(cotizacionSeleccionada.total || 0) * 0.6)}
                    </div>
                  </div>
                </div>
                <div className="pago-upload-content">
                  <div className="step-indicator">PASO 2 DE 2</div>
                  <h3 className="upload-title">Confirmar Comprobante</h3>
                  <div className="upload-dropzone">
                    <UploadCloud size={40} color="#94a3b8" />
                    <p><strong>Sube tu comprobante aquí</strong></p>
                  </div>
                  <div className="security-note"><ShieldCheck size={14} /> Pago seguro por Agente Solutions</div>
                  <button className="btn-enviar-comprobante-final" onClick={handleFinalizarPago}>Enviar Comprobante</button>
                  <button className="btn-back-link" onClick={() => setPasoPago(0)}>Regresar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cotizaciones;
