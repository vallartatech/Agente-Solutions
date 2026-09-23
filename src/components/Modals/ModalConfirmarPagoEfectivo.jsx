import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, CheckCircle, AlertCircle, DollarSign, 
  User, Calendar, Clock, CreditCard, Sparkles, Check, ArrowRight
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
};

const ModalConfirmarPagoEfectivo = ({ isOpen, onClose, cotizacion, onPaymentConfirmed }) => {
  if (!isOpen || !cotizacion) return null;

  // Extraer información base de la cotización
  const quoteId = cotizacion.id || cotizacion.quoteId || cotizacion.network_quote_id;
  const folio = cotizacion.folio || (String(quoteId).startsWith('net_') ? `RED-${String(quoteId).replace('net_', '').padStart(3, '0')}` : `COT-${quoteId}`);
  const clientName = cotizacion.client_name || cotizacion.cliente || cotizacion.property?.client?.name || cotizacion.property?.client?.propietario || 'Cliente';
  const propertyName = cotizacion.property_name || cotizacion.propiedad || cotizacion.property?.nombre_propiedad || cotizacion.property?.address || 'Propiedad General';
  
  // Total cotizado
  const totalCotizado = parseFloat(
    cotizacion.estimated_amount ?? cotizacion.price ?? cotizacion.total ?? cotizacion.monto ?? 0
  );

  // Ya tiene anticipo previo?
  const yaTieneAnticipo = Boolean(
    cotizacion.advance_paid || 
    String(cotizacion.status || '').includes('Anticipo Pagado') ||
    (parseFloat(cotizacion.remaining_amount || 0) > 0 && parseFloat(cotizacion.advance_amount || 0) > 0)
  );

  // Monto restante si ya tiene anticipo
  const anticipoPrevio = parseFloat(cotizacion.advance_amount || 0);
  const saldoRestantePrevio = yaTieneAnticipo 
    ? (parseFloat(cotizacion.remaining_amount) || Math.max(0, totalCotizado - anticipoPrevio))
    : 0;

  // Tipo de cobro inicial
  const requestedType = cotizacion.cash_amount_type || (yaTieneAnticipo ? 'remaining' : 'advance');
  const [tipoCobro, setTipoCobro] = useState(
    yaTieneAnticipo ? 'remaining' : (requestedType === 'full' ? 'full' : 'advance')
  );
  
  const [customMonto, setCustomMonto] = useState(
    yaTieneAnticipo ? saldoRestantePrevio.toFixed(2) : (totalCotizado * 0.60).toFixed(2)
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Actualizar montos cuando cambia la cotización
  useEffect(() => {
    if (yaTieneAnticipo) {
      setTipoCobro('remaining');
      setCustomMonto(saldoRestantePrevio.toFixed(2));
    } else if (cotizacion.cash_amount_type === 'full') {
      setTipoCobro('full');
      setCustomMonto(totalCotizado.toFixed(2));
    } else {
      setTipoCobro('advance');
      setCustomMonto((totalCotizado * 0.60).toFixed(2));
    }
    setErrorMsg('');
  }, [cotizacion, totalCotizado, yaTieneAnticipo, saldoRestantePrevio]);

  // Cálculos dinámicos
  let montoCobrado = 0;
  if (tipoCobro === 'advance') {
    montoCobrado = Math.round(totalCotizado * 0.60 * 100) / 100;
  } else if (tipoCobro === 'full') {
    montoCobrado = totalCotizado;
  } else if (tipoCobro === 'remaining') {
    montoCobrado = saldoRestantePrevio > 0 ? saldoRestantePrevio : Math.round(totalCotizado * 0.40 * 100) / 100;
  } else if (tipoCobro === 'custom') {
    montoCobrado = parseFloat(customMonto) || 0;
  }

  // Resta por pagar calculada dinámicamente
  const basePrev = yaTieneAnticipo ? anticipoPrevio : 0;
  const restaPorPagar = Math.max(0, Math.round((totalCotizado - (basePrev + montoCobrado)) * 100) / 100);
  const porcentajeCobrado = totalCotizado > 0 ? Math.min(100, Math.round(((basePrev + montoCobrado) / totalCotizado) * 100)) : 0;
  const porcentajeRestante = Math.max(0, 100 - porcentajeCobrado);

  const handleConfirm = async () => {
    if (montoCobrado <= 0) {
      setErrorMsg('Por favor ingresa un monto válido a cobrar.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('token') || localStorage.getItem('agente_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const endpoint = (tipoCobro === 'remaining')
        ? `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${quoteId}/confirmar-efectivo-restante`
        : `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${quoteId}/confirmar-efectivo`;

      const payload = {
        payment_type: (tipoCobro === 'remaining' || tipoCobro === 'full' || restaPorPagar === 0) ? 'full' : (tipoCobro === 'advance' ? 'advance' : 'custom'),
        amount_paid: montoCobrado,
        remaining_amount: restaPorPagar
      };

      const res = await axios.post(endpoint, payload, { headers });

      if (onPaymentConfirmed) {
        onPaymentConfirmed(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Error confirmando pago en efectivo:", err);
      setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Error al confirmar el cobro en efectivo. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalFadeIn 0.2s ease-out'
      }}>
        {/* ENCABEZADO */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px 24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}>
              💵
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Confirmar Pago en Efectivo
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Registro dinámico de cobro para {folio}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#cbd5e1'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
          
          {/* TARJETA DE CONTEXTO / DETALLES */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Cliente</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{clientName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Propiedad</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e293b', marginTop: '2px' }}>{propertyName}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Cotizado</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                {formatCurrency(totalCotizado)}
              </div>
            </div>
          </div>

          {/* MENSAJE DE SOLICITUD CLIENTE */}
          {cotizacion.cash_requested && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>ℹ️</span>
              <div style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: '1.4' }}>
                <strong>Solicitud del Cliente:</strong> Desea pagar{' '}
                <strong>{cotizacion.cash_amount_type === 'advance' ? 'Anticipo del 60%' : 'Pago Total (100%)'}</strong> en efectivo{' '}
                {cotizacion.cash_timing === 'immediate' ? 'de forma inmediata / al inicio' : 'al finalizar el trabajo'}.
              </div>
            </div>
          )}

          {/* SELECTOR DE ESQUEMA DE COBRO */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
              Selecciona el monto que estás recibiendo en efectivo:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Opción 1: Anticipo 60% */}
              {!yaTieneAnticipo && (
                <div
                  onClick={() => setTipoCobro('advance')}
                  style={{
                    border: tipoCobro === 'advance' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                    background: tipoCobro === 'advance' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: tipoCobro === 'advance' ? '6px solid #10b981' : '2px solid #cbd5e1',
                      background: '#fff'
                    }} />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b' }}>
                        Anticipo del 60%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Para iniciar el trabajo (el 40% resta al finalizar)
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#10b981' }}>
                    {formatCurrency(totalCotizado * 0.60)}
                  </div>
                </div>
              )}

              {/* Opción 2: Liquidación 100% */}
              {!yaTieneAnticipo && (
                <div
                  onClick={() => setTipoCobro('full')}
                  style={{
                    border: tipoCobro === 'full' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                    background: tipoCobro === 'full' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: tipoCobro === 'full' ? '6px solid #10b981' : '2px solid #cbd5e1',
                      background: '#fff'
                    }} />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b' }}>
                        Pago Total (100% Liquidado)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Cubre el valor completo de la cotización
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#10b981' }}>
                    {formatCurrency(totalCotizado)}
                  </div>
                </div>
              )}

              {/* Si ya tiene anticipo: Liquidar saldo restante */}
              {yaTieneAnticipo && (
                <div
                  onClick={() => setTipoCobro('remaining')}
                  style={{
                    border: tipoCobro === 'remaining' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                    background: tipoCobro === 'remaining' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: tipoCobro === 'remaining' ? '6px solid #10b981' : '2px solid #cbd5e1',
                      background: '#fff'
                    }} />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b' }}>
                        Liquidar Saldo Restante
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Anticipo previo de {formatCurrency(anticipoPrevio)} ya registrado
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#10b981' }}>
                    {formatCurrency(saldoRestantePrevio > 0 ? saldoRestantePrevio : totalCotizado * 0.40)}
                  </div>
                </div>
              )}

              {/* Opción 3: Monto Personalizado */}
              <div
                onClick={() => setTipoCobro('custom')}
                style={{
                  border: tipoCobro === 'custom' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                  background: tipoCobro === 'custom' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: tipoCobro === 'custom' ? '6px solid #10b981' : '2px solid #cbd5e1',
                      background: '#fff'
                    }} />
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b' }}>
                        Monto Personalizado
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Ingresa una cantidad específica recibida
                      </div>
                    </div>
                  </div>
                </div>

                {tipoCobro === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingLeft: '32px' }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontWeight: '800', color: '#64748b', fontSize: '1.1rem' }}>$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={totalCotizado}
                      value={customMonto}
                      onChange={(e) => setCustomMonto(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '2px solid #10b981',
                        fontSize: '1rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />
                    <span style={{ fontWeight: '700', color: '#64748b', fontSize: '0.85rem' }}>MXN</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RESUMEN DINÁMICO DEL COBRO */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#475569' }}>
              <span>Total Cotización:</span>
              <span style={{ fontWeight: '700', color: '#1e293b' }}>{formatCurrency(totalCotizado)}</span>
            </div>

            {yaTieneAnticipo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#475569' }}>
                <span>Anticipo Previo Recibido:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{formatCurrency(anticipoPrevio)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', color: '#065f46', fontWeight: '800' }}>
              <span>Monto a Cobrar Hoy:</span>
              <span style={{ fontSize: '1.15rem', color: '#10b981', fontWeight: '900' }}>
                {formatCurrency(montoCobrado)} ({porcentajeCobrado}%)
              </span>
            </div>

            <div style={{ height: '1px', background: '#cbd5e1', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: restaPorPagar > 0 ? '#c2410c' : '#10b981' }}>
                {restaPorPagar > 0 ? 'Resta por pagar (Saldo Pendiente):' : 'Estado de Liquidación:'}
              </span>
              <span style={{
                fontSize: '1.15rem',
                fontWeight: '900',
                color: restaPorPagar > 0 ? '#ea580c' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {restaPorPagar > 0 ? `${formatCurrency(restaPorPagar)} (${porcentajeRestante}%)` : '✅ Liquidado al 100%'}
              </span>
            </div>
          </div>

          {/* MENSAJE DE ERROR SI EXISTE */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#dc2626',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* ACCIONES DEL PIE DE MODAL */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading || montoCobrado <= 0}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: loading || montoCobrado <= 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              opacity: loading || montoCobrado <= 0 ? 0.7 : 1,
              transition: 'all 0.15s'
            }}
          >
            {loading ? (
              <span>Confirmando...</span>
            ) : (
              <>
                <Check size={18} />
                <span>Confirmar y Registrar Pago ({formatCurrency(montoCobrado)})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalConfirmarPagoEfectivo;
