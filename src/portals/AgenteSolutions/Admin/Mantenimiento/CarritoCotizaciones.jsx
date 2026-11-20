import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Eye, FilePlus, HardHat, Lock, ShoppingCart, User } from 'lucide-react';
import { API, authHeaders, dinero, fechaHora, totalCotizacion } from '../Expediente/flujoTrabajo';
import { confirmarAccion, mostrarAviso } from '../../../../utils/dialogos';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Carrito de una orden con varios equipos. Flujo:
// 1) el técnico manda una propuesta (interna) por equipo;
// 2) aquí el admin elige qué equipos se contratan y finaliza (definitivo);
// 3) de cada equipo contratado, el admin genera la cotización para el cliente desde la propuesta del técnico.
// `onVer(cotizacionId)` abre una cotización; `onCambio()` recarga el trabajo tras finalizar.
const CarritoCotizaciones = ({ ordenId, onVer, onCambio }) => {
  const navigate = useNavigate();
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
  // La propuesta del técnico es la base para elegir (las órdenes viejas pueden no distinguirla)
  const propuesta = (e) => e.cotizacion_tecnico || e.cotizacion;
  const sinCotizacion = elementos.filter((e) => !propuesta(e));
  const total = elementos
    .filter((e) => elegidos.includes(e.id))
    .reduce((suma, e) => suma + (Number(totalCotizacion(propuesta(e) || {})) || 0), 0);
  const guardados = elementos.filter((e) => e.estado === 'aceptado').map((e) => e.id);
  const hayCambios = elegidos.length !== guardados.length || elegidos.some((id) => !guardados.includes(id));
  const faltanParaCliente = finalizado ? elementos.filter((e) => e.estado === 'aceptado' && !e.cotizacion_cliente) : [];

  const alternar = (id) => {
    if (finalizado) return;
    setElegidos((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const enviar = async (finalizar) => {
    if (finalizar) {
      const noContratados = elementos.filter((e) => !elegidos.includes(e.id)).map((e) => e.label);
      const ok = await confirmarAccion(
        `Se contratarán ${elegidos.length} de ${elementos.length} equipos (propuestas del técnico por ${dinero(total) || '$0.00'}).`
        + (noContratados.length ? ` No se contratará: ${noContratados.join(', ')}.` : '')
        + ' Después generarás la cotización para el cliente de cada equipo contratado. Esta elección ya no se podrá cambiar.',
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

  // Abre la propuesta del técnico en Cotizaciones, donde está "Generar recotización"
  const generarParaCliente = (e) => {
    const base = e.cotizacion_tecnico || e.cotizacion;
    if (base) navigate(`/vista-cotizaciones?quote_id=${base.id}`);
  };

  const resumen = (c) => [dinero(totalCotizacion(c)), c.status].filter(Boolean).join(' · ');

  if (error) return <p className="mt-vacio">No se pudo cargar el carrito de cotizaciones.</p>;
  if (!carrito) return <p className="mt-vacio">Cargando cotizaciones por equipo...</p>;

  return (
    <div className="mt-carrito-cot">
      <p className="mt-carrito-cot-ayuda">
        {finalizado
          ? <><Lock size={14} /> Carrito finalizado el {fechaHora(carrito.finalizado_at)}. Genera la cotización para el cliente de cada equipo contratado.</>
          : 'Revisa las propuestas del técnico y marca los equipos que se van a contratar. Puedes guardar y cambiar la elección hasta finalizar.'}
      </p>

      <ul className="mt-carrito-cot-lista">
        {elementos.map((e) => {
          const on = elegidos.includes(e.id);
          const tecnico = propuesta(e);
          const cliente = e.cotizacion_cliente;
          const contratado = e.estado === 'aceptado';
          const estadoFinal = finalizado ? (contratado ? 'Contratado' : 'No contratado') : null;
          return (
            <li key={e.id} className={`mt-carrito-cot-item ${on ? 'on' : ''} ${finalizado && !on ? 'fuera' : ''}`}>
              <div className="mt-carrito-cot-fila">
                <button
                  type="button"
                  className="mt-carrito-cot-elegir"
                  onClick={() => alternar(e.id)}
                  disabled={finalizado || !tecnico}
                  aria-pressed={on}
                  title={!tecnico ? 'El técnico aún no cotiza este equipo' : undefined}
                >
                  <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                  <span className="mt-renglon-texto">
                    <strong>{e.label}</strong>
                    <small><HardHat size={12} /> Propuesta del técnico: {tecnico ? resumen(tecnico) : 'sin cotizar'}</small>
                  </span>
                  {estadoFinal && <span className={`mt-carrito-cot-estado ${contratado ? 'si' : 'no'}`}>{estadoFinal}</span>}
                </button>
                {tecnico && (
                  <button type="button" className="mt-carrito-cot-ver" onClick={() => onVer?.(tecnico.id)} aria-label={`Ver la propuesta del técnico de ${e.label}`}>
                    <Eye size={16} /> Ver
                  </button>
                )}
              </div>

              {/* Paso 3: la cotización que ve el cliente, solo de los contratados */}
              {finalizado && contratado && (
                <div className={`mt-carrito-cot-cliente ${cliente ? 'lista' : ''}`}>
                  <span><User size={13} /> Para el cliente: {cliente ? resumen(cliente) : 'falta generarla'}</span>
                  {cliente ? (
                    <button type="button" className="mt-carrito-cot-ver" onClick={() => onVer?.(cliente.id)} aria-label={`Ver la cotización para el cliente de ${e.label}`}>
                      <Eye size={16} /> Ver
                    </button>
                  ) : (
                    <button type="button" className="mt-carrito-cot-btn primario" onClick={() => generarParaCliente(e)}>
                      <FilePlus size={15} /> Generar cotización para el cliente
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-carrito-cot-pie">
        <span className="mt-carrito-cot-total">
          <ShoppingCart size={16} /> {elegidos.length} de {elementos.length} equipos · <strong>{dinero(total) || '$0.00'}</strong>
          <small>(propuestas del técnico)</small>
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
              title={sinCotizacion.length ? 'Todos los equipos deben tener la propuesta del técnico antes de finalizar' : undefined}
            >
              <Lock size={15} /> Finalizar
            </button>
          </div>
        )}
      </div>
      {!finalizado && sinCotizacion.length > 0 && (
        <p className="mt-aviso-parcial">Falta la propuesta del técnico de: {sinCotizacion.map((e) => e.label).join(', ')}. El técnico debe cotizar cada equipo antes de finalizar.</p>
      )}
      {faltanParaCliente.length > 0 && (
        <p className="mt-aviso-parcial">Falta generar la cotización para el cliente de: {faltanParaCliente.map((e) => e.label).join(', ')}.</p>
      )}
    </div>
  );
};

export default CarritoCotizaciones;
