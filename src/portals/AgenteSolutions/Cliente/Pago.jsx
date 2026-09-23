import React, { useState } from 'react';
import axios from 'axios';
import { X, CheckCircle2, Loader2, ShieldCheck, CreditCard, Banknote, Sparkles } from 'lucide-react';
import '../../../styles/AgenteSolutions/Cliente/Pagos.css';
import mpLogo from '../../../assets/Mercado-Pago.png';

const Pago = ({ cotizacion, onClose }) => {
  const [subiendo, setSubiendo] = useState(false);

  // Estado para efectivo
  const [modoEfectivo, setModoEfectivo] = useState(false);
  const [cashAmountType, setCashAmountType] = useState('full'); // 'advance' | 'full'
  const [cashTiming, setCashTiming] = useState('immediate');   // 'immediate' | 'on_completion'
  const [enviandoEfectivo, setEnviandoEfectivo] = useState(false);
  const [efectivoEnviado, setEfectivoEnviado] = useState(false);

  // ── CÁLCULO DEL TOTAL FINAL FISCAL (Con IVA + MP) ──
  const calcularMontoFinal = (cot) => {
    if (!cot) return 0;
    let subtotalItems = 0;
    try {
      const rawConcept = cot.concept || cot.concepto;
      const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
      if (detalle && typeof detalle === 'object') {
        const listado = detalle.conceptos || detalle.servicios || [];
        listado.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || 1)));
        if (detalle.materiales) {
          detalle.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || 1)));
        }
      }
    } catch(e) {}
    let base = subtotalItems > 0 ? subtotalItems : parseFloat(cot.total || cot.estimated_amount || 0);
    if (base > 0) {
      const iva = base * 0.16;
      const subConIva = base + iva;
      const comisionMP = (subConIva * 0.0349 + 4) * 1.16;
      return subConIva + comisionMP;
    }
    return 0;
  };

  const calcularMontoEfectivo = (cot) => {
    if (!cot) return 0;
    let subtotalItems = 0;
    try {
      const rawConcept = cot.concept || cot.concepto;
      const detalle = typeof rawConcept === 'string' ? JSON.parse(rawConcept) : rawConcept;
      if (detalle && typeof detalle === 'object') {
        const listado = detalle.conceptos || detalle.servicios || [];
        listado.forEach(c => subtotalItems += (parseFloat(c.precio_u || c.precio || 0) * parseFloat(c.cantidad || 1)));
        if (detalle.materiales) {
          detalle.materiales.forEach(m => subtotalItems += (parseFloat(m.costo_u || m.precio || 0) * parseFloat(m.cantidad || 1)));
        }
      }
    } catch(e) {}
    let base = subtotalItems > 0 ? subtotalItems : parseFloat(cot.total || cot.estimated_amount || 0);
    if (base > 0) {
      const iva = base * 0.16;
      return base + iva; // Solo Subtotal + IVA, exento de comisión MP
    }
    return 0;
  };

  const total    = Math.round(calcularMontoFinal(cotizacion) * 100) / 100;
  const anticipo = Math.round(total * 0.60 * 100) / 100;
  const restante = Math.round(total * 0.40 * 100) / 100;

  const totalEfectivo = Math.round(calcularMontoEfectivo(cotizacion) * 100) / 100;
  const anticipoEfectivo = Math.round(totalEfectivo * 0.60 * 100) / 100;
  const restanteEfectivo = Math.round(totalEfectivo * 0.40 * 100) / 100;

  const yaPayoAnticipo = cotizacion?.advance_paid === true;
  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleMercadoPago = async (stage) => {
    try {
      setSubiendo(true);
      const token = localStorage.getItem('agente_token');

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacion.id}/mercadopago/preference`,
        { payment_stage: stage },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data?.init_point) {
        window.location.href = response.data.init_point;
      } else {
        alert('No se recibió el enlace de pago. Intenta de nuevo.');
        setSubiendo(false);
      }
    } catch (error) {
      console.error('Error iniciando MercadoPago:', error);
      alert('Hubo un error al conectar con MercadoPago. Intenta más tarde.');
      setSubiendo(false);
    }
  };

  const handleSolicitarEfectivo = async () => {
    try {
      setEnviandoEfectivo(true);
      const token = localStorage.getItem('agente_token');
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacion.id}/solicitar-efectivo`,
        { cash_amount_type: cashAmountType, cash_timing: cashTiming },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setEfectivoEnviado(true);
    } catch (error) {
      console.error('Error solicitando efectivo:', error);
      alert('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setEnviandoEfectivo(false);
    }
  };

  const handleSolicitarEfectivoRestante = async () => {
    try {
      setEnviandoEfectivo(true);
      const token = localStorage.getItem('agente_token');
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${cotizacion.id}/solicitar-efectivo`,
        { cash_amount_type: 'remaining', cash_timing: 'on_completion' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setEfectivoEnviado(true);
    } catch (error) {
      console.error('Error solicitando efectivo para saldo restante:', error);
      alert('Error al enviar la solicitud en efectivo.');
    } finally {
      setEnviandoEfectivo(false);
    }
  };

  // ---------- PANTALLA: Anticipo ya pagado, solo queda el 40% ----------
  if (yaPayoAnticipo && !cotizacion?.remaining_paid) {
    return (
      <div className="tp-modal-overlay" style={{ zIndex: 100000 }}>
        <div className="payment-modal-card" style={{ maxWidth: '540px', padding: '36px 28px', position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#e2e8f0',
              color: '#0f172a',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'all 0.2s'
            }}
            title="Cerrar modal"
          >
            <X size={22} color="#0f172a" style={{ strokeWidth: 3 }} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0' }}>Anticipo Acreditado</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>El 60% inicial ya fue registrado exitosamente.</p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#64748b', fontSize: '0.95rem' }}>
              <span>✅ Anticipo cubierto (60%):</span>
              <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{fmt(anticipo)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', borderTop: '1px solid #e2e8f0', paddingTop: '12px', color: '#0f172a' }}>
              <span style={{ fontWeight: 800 }}>Saldo pendiente (40%):</span>
              <span style={{ fontWeight: 800, color: '#f26624' }}>{fmt(restante)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => handleMercadoPago('remaining')}
              disabled={subiendo || enviandoEfectivo}
              className="btn-pay-mp btn-advance"
              style={{ padding: '16px', width: '100%' }}
            >
              {subiendo ? <Loader2 className="spin-icon" size={22} /> : <>Liquidar Saldo ({fmt(restante)}) con <img src={mpLogo} alt="MP" style={{ height: '24px', filter: 'brightness(0) invert(1)' }} /></>}
            </button>

            <button
              onClick={handleSolicitarEfectivoRestante}
              disabled={subiendo || enviandoEfectivo}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              {enviandoEfectivo ? <Loader2 className="spin-icon" size={22} /> : <>💵 Solicitar Pago en Efectivo ({fmt(restanteEfectivo)})</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PANTALLA: Solicitud de efectivo enviada ----------
  if (efectivoEnviado) {
    return (
      <div className="tp-modal-overlay" style={{ zIndex: 100000 }}>
        <div className="payment-modal-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '48px 28px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <CheckCircle2 size={42} color="#16a34a" />
          </div>
          <h2 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>¡Solicitud Recibida!</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 26px 0' }}>Hemos notificado al administrador sobre tu elección de pago en efectivo. Te confirmará de inmediato al recibir tu pago.</p>
          <button onClick={onClose} className="btn-pay-mp btn-full" style={{ maxWidth: '220px', margin: '0 auto' }}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // ---------- PANTALLA PRINCIPAL: Selector de método de pago ----------
  return (
    <div className="tp-modal-overlay" style={{ zIndex: 100000 }}>
      <div className="payment-modal-card">
        
        {/* Encabezado Premium */}
        <div className="payment-modal-header">
          <button onClick={onClose} className="payment-close-btn"><X size={20} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <ShieldCheck size={22} color="#fdba74" />
            <p className="payment-modal-subtitle">Pasarela de Pago Segura</p>
          </div>
          <h1 className="payment-modal-title">Selecciona tu Modalidad</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.85, margin: 0 }}>Cotización #{cotizacion?.folio || cotizacion?.id}</p>
        </div>

        {/* Resumen visual de montos */}
        <div className="payment-summary-pills">
          <div className="summary-pill total-pill">
            <div className="summary-pill-label">Total del Servicio</div>
            <div className="summary-pill-value">{fmt(total)}</div>
          </div>
          <div className="summary-pill advance-pill">
            <div className="summary-pill-label">Anticipo (60%)</div>
            <div className="summary-pill-value">{fmt(anticipo)}</div>
          </div>
          <div className="summary-pill remaining-pill">
            <div className="summary-pill-label">Al Finalizar (40%)</div>
            <div className="summary-pill-value">{fmt(restante)}</div>
          </div>
        </div>

        {/* Tarjetas interactivas */}
        <div className="payment-options-list">

          {/* OPCIÓN 1: Anticipo 60% */}
          <div className="payment-card-option highlight-advance">
            <div className="option-header">
              <div className="option-title-area">
                <div className="option-icon">💳</div>
                <div>
                  <h3 className="option-title-text">Pagar Anticipo (60%)</h3>
                  <p className="option-subtitle-text">Inicia el trabajo hoy y paga el 40% al terminar</p>
                </div>
              </div>
              <span className="option-badge badge-recommended">Recomendado</span>
            </div>
            <div className="option-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#475569' }}>
                <span>Monto a pagar hoy:</span>
                <strong style={{ fontSize: '1.25rem', color: '#1d4ed8' }}>{fmt(anticipo)}</strong>
              </div>
              <button
                onClick={() => handleMercadoPago('advance')}
                disabled={subiendo}
                className="btn-pay-mp btn-advance"
              >
                {subiendo ? <Loader2 className="spin-icon" size={20} /> : <>Pagar {fmt(anticipo)} con <img src={mpLogo} alt="MP" style={{ height: '22px', filter: 'brightness(0) invert(1)' }} /></>}
              </button>
            </div>
          </div>

          {/* OPCIÓN 2: Pago Total 100% */}
          <div className="payment-card-option highlight-full">
            <div className="option-header">
              <div className="option-title-area">
                <div className="option-icon">💎</div>
                <div>
                  <h3 className="option-title-text">Liquidación Total (100%)</h3>
                  <p className="option-subtitle-text">Liquida en una sola exhibición sin pendientes</p>
                </div>
              </div>
              <span className="option-badge badge-liquidate">Pago Único</span>
            </div>
            <div className="option-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#475569' }}>
                <span>Monto total:</span>
                <strong style={{ fontSize: '1.25rem', color: '#c2410c' }}>{fmt(total)}</strong>
              </div>
              <button
                onClick={() => handleMercadoPago('full')}
                disabled={subiendo}
                className="btn-pay-mp btn-full"
              >
                {subiendo ? <Loader2 className="spin-icon" size={20} /> : <>Pagar {fmt(total)} con <img src={mpLogo} alt="MP" style={{ height: '22px', filter: 'brightness(0) invert(1)' }} /></>}
              </button>
            </div>
          </div>

          {/* OPCIÓN 3: Pago en Efectivo */}
          <div className="payment-card-option highlight-cash">
            <div className="option-header">
              <div className="option-title-area">
                <div className="option-icon">💵</div>
                <div>
                  <h3 className="option-title-text">Acordar Pago en Efectivo</h3>
                  <p className="option-subtitle-text">Entrega directa al personal administrativo</p>
                </div>
              </div>
              <span className="option-badge badge-cash">Presencial</span>
            </div>
            <div className="option-body">
              {!modoEfectivo ? (
                <button
                  onClick={() => setModoEfectivo(true)}
                  className="btn-pay-mp btn-cash"
                >
                  <Banknote size={20} /> Elegir Pago en Efectivo
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '6px' }}>
                  {/* Cuánto */}
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontSize: '0.88rem' }}>1. ¿Cuánto pagarás en efectivo?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        onClick={() => setCashAmountType('advance')}
                        style={{ padding: '12px 10px', borderRadius: '12px', border: `2px solid ${cashAmountType === 'advance' ? '#3b82f6' : '#cbd5e1'}`, background: cashAmountType === 'advance' ? '#eff6ff' : 'white', color: cashAmountType === 'advance' ? '#1e40af' : '#64748b', fontWeight: 700, cursor: 'pointer', transition: '0.2s', textAlign: 'center' }}
                      >
                        Anticipo (60%)<br /><span style={{ fontSize: '0.95rem', fontWeight: 800, color: cashAmountType === 'advance' ? '#1d4ed8' : '#334155' }}>{fmt(anticipoEfectivo)}</span>
                      </button>
                      <button
                        onClick={() => setCashAmountType('full')}
                        style={{ padding: '12px 10px', borderRadius: '12px', border: `2px solid ${cashAmountType === 'full' ? '#10b981' : '#cbd5e1'}`, background: cashAmountType === 'full' ? '#ecfdf5' : 'white', color: cashAmountType === 'full' ? '#047857' : '#64748b', fontWeight: 700, cursor: 'pointer', transition: '0.2s', textAlign: 'center' }}
                      >
                        Total (100%)<br /><span style={{ fontSize: '0.95rem', fontWeight: 800, color: cashAmountType === 'full' ? '#059669' : '#334155' }}>{fmt(totalEfectivo)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cuándo */}
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontSize: '0.88rem' }}>2. ¿Cuándo lo entregarás?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        onClick={() => setCashTiming('immediate')}
                        style={{ padding: '10px', borderRadius: '12px', border: `2px solid ${cashTiming === 'immediate' ? '#10b981' : '#cbd5e1'}`, background: cashTiming === 'immediate' ? '#ecfdf5' : 'white', color: cashTiming === 'immediate' ? '#047857' : '#64748b', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                      >
                        🕐 Inmediatamente<br /><span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Hoy mismo</span>
                      </button>
                      <button
                        onClick={() => setCashTiming('on_completion')}
                        style={{ padding: '10px', borderRadius: '12px', border: `2px solid ${cashTiming === 'on_completion' ? '#10b981' : '#cbd5e1'}`, background: cashTiming === 'on_completion' ? '#ecfdf5' : 'white', color: cashTiming === 'on_completion' ? '#047857' : '#64748b', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                      >
                        📅 Al Finalizar<br /><span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Al terminar el trabajo</span>
                      </button>
                    </div>
                  </div>

                  {/* Acciones efectivo */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      onClick={() => setModoEfectivo(false)}
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSolicitarEfectivo}
                      disabled={enviandoEfectivo}
                      className="btn-pay-mp btn-cash"
                      style={{ flex: 2 }}
                    >
                      {enviandoEfectivo ? <Loader2 className="spin-icon" size={18} /> : '✅ Confirmar Solicitud'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Pago;
