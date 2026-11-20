import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Eye, Lock, ShoppingCart } from 'lucide-react';
import { API, authHeaders, dinero, fechaHora, totalCotizacion } from '../Expediente/flujoTrabajo';
import { confirmarAccion, mostrarAviso } from '../../../../utils/dialogos';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Carrito de una orden con varios equipos: cada equipo trae su cotización y el admin marca
// los que el cliente contrata. Se puede guardar y cambiar; al finalizar la elección es definitiva.
// `onVer(cotizacionId)` abre la cotización; `onCambio()` recarga el trabajo tras finalizar.
const CarritoCotizaciones = ({ ordenId, onVer, onCambio }) => {
  const [carrito, setCarrito] = useState(null);
  const [elegidos, setElegidos] = useState([]);
  const [error, setError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const aplicarRespuesta = useCallback((data) => {
    setCarrito(data);
    setElegidos((data.elementos || []).filter((e) => e.estado === 'aceptado').map((e) => e.id));
  }, []);

  useEffect(() => {
    let vigente = true;
    axios.get(`${API}/work-orders/${ordenId}/carrito`, { headers: authHeaders() })
      .then(({ data }) => { if (vigente) aplicarRespuesta(data); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [ordenId, aplicarRespuesta]);

  const elementos = useMemo(() => carrito?.elementos || [], [carrito]);
  const finalizado = Boolean(carrito?.finalizado_at);
  const sinCotizacion = elementos.filter((e) => !e.cotizacion);
  const total = elementos
    .filter((e) => elegidos.includes(e.id))
    .reduce((suma, e) => suma + (Number(totalCotizacion(e.cotizacion || {})) || 0), 0);
  const guardados = elementos.filter((e) => e.estado === 'aceptado').map((e) => e.id);
  const hayCambios = elegidos.length !== guardados.length || elegidos.some((id) => !guardados.includes(id));

  const alternar = (id) => {
    if (finalizado) return;
    setElegidos((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const enviar = async (finalizar) => {
    if (finalizar) {
      const noContratados = elementos.filter((e) => !elegidos.includes(e.id)).map((e) => e.label);
      const ok = await confirmarAccion(
        `Se contratarán ${elegidos.length} de ${elementos.length} equipos por ${dinero(total) || '$0.00'}.`
        + (noContratados.length ? ` No se contratará: ${noContratados.join(', ')}.` : '')
        + ' Después de finalizar ya no se podrá cambiar.',
        { titulo: '¿Finalizar el carrito?', confirmar: 'Sí, finalizar', peligro: true },
      );
      if (!ok) return;
    }
    setGuardando(true);
    try {
      const { data } = await axios({
        method: finalizar ? 'post' : 'put',
        url: `${API}/work-orders/${ordenId}/carrito${finalizar ? '/finalizar' : ''}`,
        data: { aceptados: elegidos },
        headers: authHeaders(),
      });
      aplicarRespuesta(data);
      if (finalizar) onCambio?.();
    } catch (e) {
      mostrarAviso(e.response?.data?.error || 'No se pudo guardar el carrito. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <p className="mt-vacio">No se pudo cargar el carrito de cotizaciones.</p>;
  if (!carrito) return <p className="mt-vacio">Cargando cotizaciones por equipo...</p>;

  return (
    <div className="mt-carrito-cot">
      <p className="mt-carrito-cot-ayuda">
        {finalizado
          ? <><Lock size={14} /> Carrito finalizado el {fechaHora(carrito.finalizado_at)}. La elección ya es definitiva.</>
          : 'Marca los equipos que el cliente quiere contratar. Puedes guardar y cambiar la elección hasta finalizar.'}
      </p>

      <ul className="mt-carrito-cot-lista">
        {elementos.map((e) => {
          const on = elegidos.includes(e.id);
          const monto = e.cotizacion ? dinero(totalCotizacion(e.cotizacion)) : null;
          const estadoFinal = finalizado ? (e.estado === 'aceptado' ? 'Contratado' : 'No contratado') : null;
          return (
            <li key={e.id} className={`mt-carrito-cot-item ${on ? 'on' : ''} ${finalizado && !on ? 'fuera' : ''}`}>
              <button
                type="button"
                className="mt-carrito-cot-elegir"
                onClick={() => alternar(e.id)}
                disabled={finalizado || !e.cotizacion}
                aria-pressed={on}
                title={!e.cotizacion ? 'El técnico aún no cotiza este equipo' : undefined}
              >
                <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                <span className="mt-renglon-texto">
                  <strong>{e.label}</strong>
                  <small>
                    {e.cotizacion
                      ? [monto, e.cotizacion.status].filter(Boolean).join(' · ')
                      : 'Sin cotización del técnico'}
                  </small>
                </span>
                {estadoFinal && <span className={`mt-carrito-cot-estado ${e.estado === 'aceptado' ? 'si' : 'no'}`}>{estadoFinal}</span>}
              </button>
              {e.cotizacion && (
                <button type="button" className="mt-carrito-cot-ver" onClick={() => onVer?.(e.cotizacion.id)} aria-label={`Ver la cotización de ${e.label}`}>
                  <Eye size={16} /> Ver
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-carrito-cot-pie">
        <span className="mt-carrito-cot-total">
          <ShoppingCart size={16} /> {elegidos.length} de {elementos.length} equipos · <strong>{dinero(total) || '$0.00'}</strong>
        </span>
        {!finalizado && (
          <div className="mt-carrito-cot-acciones">
            <button type="button" className="mt-carrito-cot-btn" onClick={() => enviar(false)} disabled={guardando || !hayCambios}>
              Guardar selección
            </button>
            <button
              type="button"
              className="mt-carrito-cot-btn primario"
              onClick={() => enviar(true)}
              disabled={guardando || !elegidos.length || sinCotizacion.length > 0}
              title={sinCotizacion.length ? 'Todos los equipos deben tener su cotización antes de finalizar' : undefined}
            >
              <Lock size={15} /> Finalizar
            </button>
          </div>
        )}
      </div>
      {!finalizado && sinCotizacion.length > 0 && (
        <p className="mt-aviso-parcial">Falta la cotización de: {sinCotizacion.map((e) => e.label).join(', ')}. El técnico debe cotizar cada equipo antes de finalizar.</p>
      )}
    </div>
  );
};

export default CarritoCotizaciones;
