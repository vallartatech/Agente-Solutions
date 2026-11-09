import { Star, Clock, Sparkles } from 'lucide-react';
import '../../../styles/AgenteMarket/Shared/ResumenTecnico.css';

// Calificaciones de la red con el mismo formato para técnicos y clientes:
//   ★ estrellas (técnico: calidad del trabajo · cliente: trato)
//   ⏱ relojes   (técnico: puntualidad       · cliente: pago y disponibilidad)
// Sin calificaciones se muestra "Nuevo", nunca un 5.0 inventado.

const uno = (v) => Number(v).toFixed(1);

/**
 * <Calificacion estrellas={4.8} relojes={4.6} total={12} etiquetas={{ estrellas: 'Calidad', relojes: 'Puntualidad' }} />
 * compacta: solo números (para tarjetas pequeñas)
 */
const Calificacion = ({ estrellas, relojes, total = 0, etiquetas = {}, compacta = false, textoNuevo = 'Nuevo en la red' }) => {
  if (!total) {
    return <span className="cal-nuevo"><Sparkles size={12} /> {textoNuevo}</span>;
  }
  return (
    <span className={`cal ${compacta ? 'compacta' : ''}`}>
      <span className="cal-item estrellas" title={`${etiquetas.estrellas || 'Estrellas'}: ${uno(estrellas)} de 5`}>
        <Star size={13} /> <strong>{uno(estrellas)}</strong>
        {!compacta && etiquetas.estrellas && <small>{etiquetas.estrellas}</small>}
      </span>
      <span className="cal-item relojes" title={`${etiquetas.relojes || 'Relojes'}: ${uno(relojes)} de 5`}>
        <Clock size={13} /> <strong>{uno(relojes)}</strong>
        {!compacta && etiquetas.relojes && <small>{etiquetas.relojes}</small>}
      </span>
      <span className="cal-total">({total} {total === 1 ? 'calificación' : 'calificaciones'})</span>
    </span>
  );
};

export default Calificacion;
