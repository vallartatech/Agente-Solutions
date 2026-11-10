import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { aceptarConsentimiento, mensajeError } from './perfilProfesionalApi';

/**
 * Consentimiento expreso (obligatorio) antes de capturar CLABE, RFC, INE,
 * comprobante de domicilio y antecedentes no penales. El backend guarda la fecha y hora.
 */
const ConsentimientoDatos = ({ onAceptado }) => {
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const aceptar = async () => {
    if (!acepto) return;
    setEnviando(true);
    setError('');
    try {
      onAceptado?.(await aceptarConsentimiento());
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar tu consentimiento. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pp-consentimiento" style={{
      border: '1px solid rgba(242, 101, 34, 0.45)', borderRadius: '12px', padding: '16px',
      background: 'rgba(242, 101, 34, 0.06)', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={18} color="#f26522" /> Antes de continuar: tus datos sensibles
      </strong>
      <p style={{ margin: 0, lineHeight: 1.5, fontSize: '0.92rem' }}>
        Para validar tu identidad y pagarte, te pediremos <strong>datos financieros</strong> (CLABE interbancaria,
        banco, titular y, si facturas, RFC y razón social) y <strong>documentos de identificación</strong> (INE,
        comprobante de domicilio y constancia de antecedentes no penales). Se guardan cifrados o en almacenamiento
        privado, solo los revisa nuestro equipo de validación y tu CLABE solo la ve quien te contrata para pagarte.
        Puedes pedir que se borren eliminando tu cuenta.
      </p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.92rem', lineHeight: 1.45 }}>
        <input
          type="checkbox"
          checked={acepto}
          onChange={(e) => setAcepto(e.target.checked)}
          style={{ marginTop: '3px', accentColor: '#f26522', flexShrink: 0, width: '18px', height: '18px' }}
        />
        <span>
          Otorgo mi <strong>consentimiento expreso</strong> para el tratamiento de mis datos financieros y de
          identificación con las finalidades descritas en el{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: '#f26522', textDecoration: 'underline' }}>
            Aviso de Privacidad
          </Link>.
        </span>
      </label>
      {error && <div className="pp-aviso error" role="alert">{error}</div>}
      <div>
        <button type="button" className="pp-btn" onClick={aceptar} disabled={!acepto || enviando}>
          {enviando ? <Loader2 size={16} className="pp-girar" /> : <ShieldCheck size={16} />} Aceptar y continuar
        </button>
      </div>
    </div>
  );
};

export default ConsentimientoDatos;
