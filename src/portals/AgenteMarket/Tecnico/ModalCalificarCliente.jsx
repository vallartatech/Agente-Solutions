import { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Star, Clock, MessageSquare, Award, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import '../../../styles/Shared/ModalCalificarTecnico.css';

// El técnico califica al cliente al terminar un trabajo de la red (★ trato, ⏱ pago).
// Es obligatorio: la ventana no se cierra mientras haya trabajos terminados sin calificar,
// y el backend no deja cotizar hasta terminar.

const API = import.meta.env.VITE_API_BASE_URL;

const TEXTOS_TRATO = ['', 'Muy difícil', 'Complicado', 'Normal', 'Buen trato', '¡Excelente cliente!'];
const TEXTOS_PAGO = ['', 'No pagó / no estuvo', 'Pagó tarde', 'Con retraso menor', 'Puntual', '¡Pagó y atendió a tiempo!'];

const Escala = ({ valor, setValor, Icono, clase, etiquetas, titulo }) => {
  const [hover, setHover] = useState(0);
  const activo = hover || valor;
  return (
    <>
      <div className="calif-factor-header">
        <div className={`calif-factor-badge ${clase === 'star' ? 'star-badge' : 'time-badge'}`}>
          <Icono size={16} />
          <span>{titulo}</span>
        </div>
        <span className="calif-current-label">{etiquetas[activo]}</span>
      </div>
      <div className={clase === 'star' ? 'calif-stars-row' : 'calif-watches-row'} role="radiogroup" aria-label={titulo}>
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            role="radio"
            aria-checked={valor === num}
            className={`${clase === 'star' ? 'calif-star-btn' : 'calif-watch-btn'} ${activo >= num ? 'filled' : ''}`}
            onMouseEnter={() => setHover(num)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValor(num)}
            title={`${num} de 5`}
          >
            <Icono size={clase === 'star' ? 30 : 28} className={clase === 'star' ? 'calif-star-icon' : 'calif-watch-icon'} />
            <span className="calif-btn-num">{num}</span>
          </button>
        ))}
      </div>
    </>
  );
};

/**
 * pendientes: [{ work_order_id, titulo, terminado_at, cliente: { nombre, foto } }]
 * onListo(pendientesRestantes): se llama tras guardar cada calificación
 */
const ModalCalificarCliente = ({ pendientes, onListo }) => {
  const actual = pendientes[0];
  const [trato, setTrato] = useState(0);
  const [pago, setPago] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (!actual) return null;

  const enviar = async (e) => {
    e.preventDefault();
    if (!trato || !pago) {
      setError('Elige las estrellas del trato y los relojes del pago.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const res = await axios.post(`${API}/tecnico/calificaciones-cliente/${actual.work_order_id}`, {
        rating_trato: trato,
        rating_pago: pago,
        comment: comentario.trim() || null,
      });
      setTrato(0);
      setPago(0);
      setComentario('');
      onListo(res.data?.pendientes ?? pendientes.slice(1));
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const foto = String(actual.cliente?.foto || '').startsWith('http') ? actual.cliente.foto : null;
  const fecha = actual.terminado_at ? new Date(actual.terminado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) : null;

  return createPortal(
    <div className="calif-modal-backdrop">
      <div className="calif-modal-card" role="dialog" aria-modal="true" aria-label="Calificar al cliente">
        <div className="calif-modal-header">
          <div className="calif-header-title-box">
            <Sparkles size={22} className="calif-sparkle-icon" />
            <div>
              <h3>Califica a tu cliente</h3>
              <p className="calif-header-sub">
                {pendientes.length > 1
                  ? `Tienes ${pendientes.length} trabajos terminados por calificar. Es necesario para seguir cotizando.`
                  : 'Es necesario para seguir cotizando. Ayuda a otros técnicos a saber con quién trabajan.'}
              </p>
            </div>
          </div>
        </div>

        <div className="calif-tech-pill">
          <div className="calif-tech-avatar">
            {foto ? <img src={foto} alt={actual.cliente?.nombre} /> : <span>{(actual.cliente?.nombre || 'C').charAt(0).toUpperCase()}</span>}
          </div>
          <div className="calif-tech-meta">
            <h4>{actual.cliente?.nombre || 'Cliente'}</h4>
            <span className="calif-tech-spec">{actual.titulo}{fecha ? ` · ${fecha}` : ''}</span>
          </div>
        </div>

        <form onSubmit={enviar} className="calif-form-body">
          <div className="calif-factor-block">
            <Escala valor={trato} setValor={setTrato} Icono={Star} clase="star" etiquetas={TEXTOS_TRATO} titulo="1. Trato del cliente" />
            <p className="calif-factor-desc">¿Fue claro con lo que necesitaba, respetuoso y fácil de trabajar con él?</p>
          </div>

          <div className="calif-factor-block">
            <Escala valor={pago} setValor={setPago} Icono={Clock} clase="time" etiquetas={TEXTOS_PAGO} titulo="2. Pago y disponibilidad" />
            <p className="calif-factor-desc">¿Pagó lo acordado a tiempo y estuvo en la cita a la hora pactada?</p>
          </div>

          <div className="calif-comment-block">
            <label className="calif-comment-label" htmlFor="calif-cliente-comentario">
              <MessageSquare size={15} />
              <span>Comentario (opcional, el cliente no ve quién lo escribió):</span>
            </label>
            <textarea
              id="calif-cliente-comentario"
              className="calif-textarea"
              rows="3"
              maxLength={1000}
              placeholder="Ej. Pagó puntual y explicó bien la falla."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px', color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>
              <AlertCircle size={15} /> {error}
            </p>
          )}

          <div className="calif-footer-actions">
            <button type="submit" className="calif-btn-submit" disabled={enviando} style={{ flex: 1 }}>
              {enviando ? <><Loader2 size={18} /> <span>Guardando…</span></> : <><Award size={18} /> <span>Enviar calificación</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalCalificarCliente;
