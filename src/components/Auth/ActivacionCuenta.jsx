import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo4 from '../../assets/Logo4.png';
import { CheckCircle, AlertCircle, Clock, CreditCard, RefreshCw } from 'lucide-react';

const ActivacionCuenta = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status   = searchParams.get('status');
  const tenantId = searchParams.get('tenant_id');
  const typeParam = searchParams.get('type') || searchParams.get('reason');
  const userId    = searchParams.get('user_id');

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [planOption, setPlanOption] = useState('monthly'); // 'monthly' vs 'annual'
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [bgSettings, setBgSettings] = useState({ colorHex: '#0f0f0f', imageUrl: null, appLogo: null });

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/ui/settings/login-settings`)
      .then(r => { if (r.data.success) setBgSettings(r.data.settings); })
      .catch(() => {});
  }, []);

  const handlePagar = async () => {
    if (!tenantId && !userId && typeParam !== 'technician') {
      setError('ID de empresa o usuario no encontrado. Verifica la URL.'); return;
    }
    setLoading(true);
    setError('');
    try {
      const origin = window.location.origin;
      const targetId = tenantId || userId || 1;
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercadopago/subscription/${targetId}`,
        { plan_option: planOption, type: typeParam, ...(userId ? { user_id: userId } : {}), quantity: extraQuantity },
        { headers: { Origin: origin } }
      );
      const url = import.meta.env.DEV ? res.data.sandbox_init_point : res.data.init_point;
      window.location.href = url;
    } catch {
      setError('No se pudo generar el enlace de pago. Intenta de nuevo o contacta soporte.');
      setLoading(false);
    }
  };

  const isExtraProperty = (typeParam === 'extra_property');
  const isTechnician    = (typeParam === 'technician' || typeParam === 'expired_technician');

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: bgSettings.colorHex || '#0f0f0f',
      backgroundImage: bgSettings.imageUrl ? `url(${bgSettings.imageUrl})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
      padding: '30px 15px', boxSizing: 'border-box',
      fontFamily: '"Arial Black", sans-serif'
    }}>
      <img src={bgSettings.appLogo || Logo4} alt="Agente Solutions"
        style={{ maxWidth: '200px', marginBottom: '28px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.7))', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      />

      <div style={{
        width: '100%', maxWidth: '580px', backgroundColor: 'rgba(15,15,15,0.97)',
        border: '2px solid rgba(242,101,34,0.5)', borderRadius: '24px',
        padding: '38px 30px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(242,101,34,0.2)',
      }}>

        {/* ─── ÉXITO: pago aprobado ─── */}
        {status === 'success' ? (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckCircle size={38} color="#22c55e" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 12px 0' }}>
              {isExtraProperty ? '¡PROPIEDAD EXTRA ACTIVADA!' : '¡CUENTA / SUSCRIPCIÓN ACTIVADA!'}
            </h2>
            <p style={{ color: '#aaa', fontSize: '1rem', lineHeight: 1.6, marginBottom: 24 }}>
              {isExtraProperty
                ? 'Tu pago por la propiedad extra fue procesado correctamente. Ahora puedes registrar una nueva propiedad en tu portafolio.'
                : 'Tu pago fue procesado correctamente. Ya tienes acceso completo y renovado a tu panel de Agente Solutions.'}
            </p>
            <button onClick={() => navigate('/')} style={{ width: '100%', padding: '15px', borderRadius: '50px', border: 'none', backgroundColor: '#f26522', color: '#fff', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', letterSpacing: 1 }}>
              IR AL INICIO DE SESIÓN →
            </button>
          </>
        ) : status === 'failure' ? (
          /* ─── FALLO ─── */
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <AlertCircle size={38} color="#ef4444" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 12px 0' }}>
              PAGO NO COMPLETADO
            </h2>
            <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 24 }}>
              Hubo un problema procesando tu transacción con MercadoPago. Puedes intentarlo nuevamente.
            </p>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}
            <button onClick={handlePagar} disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '50px', border: 'none', backgroundColor: '#f26522', color: '#fff', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer' }}>
              {loading ? 'GENERANDO ENLACE...' : '🔄 REINTENTAR PAGO'}
            </button>
          </>
        ) : status === 'pending' ? (
          /* ─── PENDIENTE ─── */
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(234,179,8,0.15)', border: '2px solid #eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <Clock size={38} color="#eab308" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 12px 0' }}>
              PAGO EN REVISIÓN
            </h2>
            <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Tu pago está siendo procesado por MercadoPago. Tan pronto se confirme el ingreso, tu cuenta o propiedad extra se activará de forma automática.
            </p>
          </>
        ) : isExtraProperty ? (
          /* ─── COMPRA PROPIEDAD EXTRA (+N) ─── */
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(242,101,34,0.15)', border: '2px solid #f26522', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CreditCard size={38} color="#f26522" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 8px 0' }}>
              🏠 AMPLIACIÓN DE PORTAFOLIO (+{extraQuantity})
            </h2>
            <p style={{ color: '#f26522', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 16px 0' }}>
              Adquiere Espacios para Propiedades en tu Plan Personal
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20 }}>
              Selecciona cuántos espacios de propiedad deseas agregar a tu cuenta. Cada espacio adicional tiene un costo único de <strong>$79.99 MXN</strong>.
            </p>

            {/* ─── SELECTOR DE CANTIDAD ─── */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px', marginBottom: 24, textAlign: 'center' }}>
              <label style={{ color: '#ccc', fontSize: '0.88rem', fontWeight: 'bold', display: 'block', marginBottom: 12 }}>
                ¿Cuántos espacios de propiedad necesitas?
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setExtraQuantity(Math.max(1, extraQuantity - 1))}
                  style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #f26522', background: 'rgba(242,101,34,0.2)', color: '#fff', fontWeight: 'bold', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >-</button>
                <span style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f26522', minWidth: '45px', display: 'inline-block' }}>{extraQuantity}</span>
                <button 
                  type="button" 
                  onClick={() => setExtraQuantity(extraQuantity + 1)}
                  style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #f26522', background: 'rgba(242,101,34,0.2)', color: '#fff', fontWeight: 'bold', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eee', fontSize: '1.1rem', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
                <span>Total a Pagar ({extraQuantity} {extraQuantity === 1 ? 'espacio' : 'espacios'}):</span>
                <span style={{ color: '#5cb85c' }}>${(79.99 * extraQuantity).toFixed(2)} MXN</span>
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}
            <button onClick={handlePagar} disabled={loading}
              style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', backgroundColor: '#f26522', color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1, boxShadow: '0 8px 24px rgba(242,101,34,0.4)', transition: 'transform 0.2s' }}
              onMouseOver={e => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'GENERANDO ENLACE...' : `💳 PAGAR ${(79.99 * extraQuantity).toFixed(2)} CON MERCADOPAGO`}
            </button>
          </>
        ) : isTechnician ? (
          /* ─── RENOVACIÓN DE TÉCNICO EXTERNO ($99/mes) ─── */
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(242,101,34,0.15)', border: '2px solid #f26522', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CreditCard size={38} color="#f26522" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 8px 0' }}>
              🛠️ RENOVACIÓN DE SUSCRIPCIÓN TÉCNICA
            </h2>
            <p style={{ color: '#f26522', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 16px 0' }}>
              Cuota Mensual de Técnico Externo
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20 }}>
              Tu año de prueba gratuito ha concluido. Para seguir recibiendo órdenes de trabajo, emitiendo cotizaciones y reportando evidencias, realiza el pago mensual de tu suscripción.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#eee', fontSize: '1.05rem', fontWeight: 'bold' }}>
                <span>Mensualidad Técnico Externo:</span>
                <span style={{ color: '#5cb85c' }}>$99.00 MXN / mes</span>
              </div>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}
            <button onClick={handlePagar} disabled={loading}
              style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', backgroundColor: '#f26522', color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1, boxShadow: '0 8px 24px rgba(242,101,34,0.4)', transition: 'transform 0.2s' }}
              onMouseOver={e => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'GENERANDO ENLACE...' : '💳 PAGAR $99.00 CON MERCADOPAGO'}
            </button>
          </>
        ) : (
          /* ─── RENOVACIÓN / ACTIVACIÓN DE AUTÓNOMO (Selector de Plan) ─── */
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(242,101,34,0.15)', border: '2px solid #f26522', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <RefreshCw size={38} color="#f26522" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 900, fontStyle: 'italic', margin: '0 0 8px 0' }}>
              🚀 RENUEVA TU SUSCRIPCIÓN
            </h2>
            <p style={{ color: '#f26522', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 16px 0' }}>
              Selecciona tu modalidad de pago
            </p>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20 }}>
              Tu periodo de prueba gratuita o suscripción ha vencido. Elige pagar de forma mensual o aprovecha el descuento pagando el año completo para mantener todas las funcionalidades del panel activas.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 24 }}>
              <div
                onClick={() => setPlanOption('monthly')}
                style={{
                  padding: '16px', borderRadius: '16px', cursor: 'pointer',
                  border: planOption === 'monthly' ? '2px solid #f26522' : '2px solid rgba(255,255,255,0.1)',
                  backgroundColor: planOption === 'monthly' ? 'rgba(242,101,34,0.15)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', marginBottom: 6 }}>📅 Pago Mensual</div>
                <div style={{ color: '#aaa', fontSize: '0.82rem' }}>Renovación mes a mes con flexibilidad total</div>
              </div>

              <div
                onClick={() => setPlanOption('annual')}
                style={{
                  padding: '16px', borderRadius: '16px', cursor: 'pointer', position: 'relative',
                  border: planOption === 'annual' ? '2px solid #5cb85c' : '2px solid rgba(255,255,255,0.1)',
                  backgroundColor: planOption === 'annual' ? 'rgba(92,184,92,0.15)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ position: 'absolute', top: -10, right: 10, background: '#5cb85c', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                  Ahorra 10%
                </div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', marginBottom: 6 }}>🌟 Pago Anual</div>
                <div style={{ color: '#aaa', fontSize: '0.82rem' }}>12 meses de servicio ininterrumpido con descuento</div>
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}

            <button onClick={handlePagar} disabled={loading || !tenantId}
              style={{ width: '100%', padding: '16px', borderRadius: '50px', border: 'none', backgroundColor: '#f26522', color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1, boxShadow: '0 8px 24px rgba(242,101,34,0.4)', transition: 'transform 0.2s' }}
              onMouseOver={e => !loading && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'GENERANDO ENLACE...' : `💳 CONTINUAR Y PAGAR (${planOption === 'annual' ? 'ANUAL' : 'MENSUAL'})`}
            </button>

            <p style={{ color: '#555', fontSize: '0.78rem', marginTop: 16, lineHeight: 1.5 }}>
              ¿Tuviste algún problema con el pago? Escríbenos a <span style={{ color: '#f26522' }}>soporte@agentesolutions.mx</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivacionCuenta;
