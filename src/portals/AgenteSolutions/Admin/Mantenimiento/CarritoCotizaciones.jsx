import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Eye, FilePlus, HardHat, Loader2, Lock, ShoppingCart, User } from 'lucide-react';
import { API, authHeaders, dinero, fechaHora, totalCotizacion } from '../Expediente/flujoTrabajo';
import { confirmarAccion, mostrarAviso } from '../../../../utils/dialogos';
import CreateQuotationModal from '../../../../components/Modals/CreateQuotationModal';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Carrito de una orden con varios equipos. Flujo:
// 1) el técnico manda una propuesta (interna) por equipo;
// 2) el admin marca aquí un equipo y se abre su recotización: la cotización para el cliente
//    (el técnico no la ve), hecha sobre la propuesta del técnico;
// 3) con todo listo, el admin finaliza el carrito (definitivo).
// `onVer(cotizacionId)` abre una cotización; `onCambio()` recarga el trabajo.
const CarritoCotizaciones = ({ ordenId, onVer, onCambio }) => {
  const [carrito, setCarrito] = useState(null);
  const [error, setError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abriendo, setAbriendo] = useState(null); // id del equipo cuya recotización se está cargando
  const [recotizando, setRecotizando] = useState(null); // propuesta del técnico precargada en el formulario

  const cargar = useCallback(() => (
    axios.get(`${API}/work-orders/${ordenId}/carrito`, { headers: authHeaders() })
      .then(({ data }) => setCarrito(data))
  ), [ordenId]);

  useEffect(() => {
    cargar().catch(() => setError(true));
  }, [cargar]);

  const elementos = useMemo(() => carrito?.elementos || [], [carrito]);
  const finalizado = Boolean(carrito?.finalizado_at);
  const elegidos = elementos.filter((e) => e.estado === 'aceptado').map((e) => e.id);
  const propuesta = (e) => e.cotizacion_tecnico || e.cotizacion;
  const sinCotizacion = elementos.filter((e) => !propuesta(e));
  const faltanParaCliente = elementos.filter((e) => e.estado === 'aceptado' && !e.cotizacion_cliente);
  // Total de lo que verá el cliente (si aún no hay recotización, la propuesta del técnico como referencia)
  const total = elementos
    .filter((e) => e.estado === 'aceptado')
    .reduce((suma, e) => suma + (Number(totalCotizacion(e.cotizacion_cliente || propuesta(e) || {})) || 0), 0);

  // El formulario de recotización usa la cotización con el formato de la lista de Cotizaciones
  const abrirRecotizacion = async (e) => {
    const base = propuesta(e);
    if (!base) return;
    setAbriendo(e.id);
    try {
      const { data } = await axios.get(`${API}/cotizaciones`, { headers: authHeaders() });
      const lista = Array.isArray(data) ? data : (data?.data || []);
      const completa = lista.find((c) => String(c.id) === String(base.id));
      if (!completa) throw new Error('no encontrada');
      setRecotizando({ ...completa, isRecotizacionTecnico: true });
    } catch {
      mostrarAviso('No se pudo abrir la recotización. Intenta de nuevo.');
    } finally {
      setAbriendo(null);
    }
  };

  const guardarSeleccion = async (aceptados) => {
    const { data } = await axios.put(`${API}/work-orders/${ordenId}/carrito`, { aceptados }, { headers: authHeaders() });
    setCarrito(data);
    return data;
  };

  // Marcar un equipo lo agrega al carrito y abre su recotización para el cliente
  const alternar = async (e) => {
    if (finalizado || guardando) return;
    const marcado = elegidos.includes(e.id);
    setGuardando(true);
    try {
      await guardarSeleccion(marcado ? elegidos.filter((x) => x !== e.id) : [...elegidos, e.id]);
    } catch (err) {
      mostrarAviso(err.response?.data?.error || 'No se pudo guardar el carrito. Intenta de nuevo.');
      return;
    } finally {
      setGuardando(false);
    }
    if (!marcado && !e.cotizacion_cliente) abrirRecotizacion(e);
  };

  const finalizar = async () => {
    const noContratados = elementos.filter((e) => e.estado !== 'aceptado').map((e) => e.label);
    const ok = await confirmarAccion(
      `Se contratarán ${elegidos.length} de ${elementos.length} equipos por ${dinero(total) || '$0.00'}.`
      + (noContratados.length ? ` No se contratará: ${noContratados.join(', ')}.` : '')
      + ' Esta elección ya no se podrá cambiar.',
      { titulo: '¿Finalizar el carrito?', confirmar: 'Sí, finalizar', peligro: true },
    );
    if (!ok) return;
    setGuardando(true);
    try {
      const { data } = await axios.post(`${API}/work-orders/${ordenId}/carrito/finalizar`, { aceptados: elegidos }, { headers: authHeaders() });
      setCarrito(data);
      onCambio?.();
    } catch (err) {
      mostrarAviso(err.response?.data?.error || 'No se pudo finalizar el carrito. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const resumen = (c) => [dinero(totalCotizacion(c)), c.status].filter(Boolean).join(' · ');

  if (error) return <p className="mt-vacio">No se pudo cargar el carrito de cotizaciones.</p>;
  if (!carrito) return <p className="mt-vacio">Cargando cotizaciones por equipo...</p>;

  return (
    <div className="mt-carrito-cot">
      <p className="mt-carrito-cot-ayuda">
        {finalizado
          ? <><Lock size={14} /> Carrito finalizado el {fechaHora(carrito.finalizado_at)}. La elección ya es definitiva.</>
          : 'Marca un equipo para contratarlo: se abre su recotización para el cliente sobre la propuesta del técnico (el técnico no la ve). Al terminar, finaliza el carrito.'}
      </p>

      <ul className="mt-carrito-cot-lista">
        {elementos.map((e) => {
          const on = e.estado === 'aceptado';
          const tecnico = propuesta(e);
          const cliente = e.cotizacion_cliente;
          const estadoFinal = finalizado ? (on ? 'Contratado' : 'No contratado') : null;
          return (
            <li key={e.id} className={`mt-carrito-cot-item ${on ? 'on' : ''} ${finalizado && !on ? 'fuera' : ''}`}>
              <div className="mt-carrito-cot-fila">
                <button
                  type="button"
                  className="mt-carrito-cot-elegir"
                  onClick={() => alternar(e)}
                  disabled={finalizado || !tecnico || guardando}
                  aria-pressed={on}
                  title={!tecnico ? 'El técnico aún no cotiza este equipo' : undefined}
                >
                  <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                  <span className="mt-renglon-texto">
                    <strong>{e.label}</strong>
                    <small><HardHat size={12} /> Propuesta del técnico: {tecnico ? (dinero(totalCotizacion(tecnico)) || '$0.00') : 'sin cotizar'}</small>
                  </span>
                  {estadoFinal && <span className={`mt-carrito-cot-estado ${on ? 'si' : 'no'}`}>{estadoFinal}</span>}
                </button>
                {tecnico && (
                  <button type="button" className="mt-carrito-cot-ver" onClick={() => onVer?.(tecnico.id)} aria-label={`Ver la propuesta del técnico de ${e.label}`}>
                    <Eye size={16} /> Ver
                  </button>
                )}
              </div>

              {/* La cotización que verá el cliente: la recotización del admin */}
              {on && (
                <div className={`mt-carrito-cot-cliente ${cliente ? 'lista' : ''}`}>
                  <span><User size={13} /> Para el cliente: {cliente ? resumen(cliente) : 'falta la recotización'}</span>
                  {cliente ? (
                    <button type="button" className="mt-carrito-cot-ver" onClick={() => onVer?.(cliente.id)} aria-label={`Ver la cotización para el cliente de ${e.label}`}>
                      <Eye size={16} /> Ver
                    </button>
                  ) : (
                    <button type="button" className="mt-carrito-cot-btn primario" onClick={() => abrirRecotizacion(e)} disabled={abriendo === e.id}>
                      {abriendo === e.id ? <Loader2 size={15} className="mt-girando" /> : <FilePlus size={15} />} Recotizar para el cliente
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
        </span>
        {!finalizado && (
          <div className="mt-carrito-cot-acciones">
            <button
              type="button"
              className="mt-carrito-cot-btn primario"
              onClick={finalizar}
              disabled={guardando || !elegidos.length || sinCotizacion.length > 0 || faltanParaCliente.length > 0}
              title={faltanParaCliente.length ? 'Cada equipo marcado necesita su recotización para el cliente' : undefined}
            >
              <Lock size={15} /> Finalizar
            </button>
          </div>
        )}
      </div>
      {!finalizado && sinCotizacion.length > 0 && (
        <p className="mt-aviso-parcial">Falta la propuesta del técnico de: {sinCotizacion.map((e) => e.label).join(', ')}.</p>
      )}
      {!finalizado && faltanParaCliente.length > 0 && (
        <p className="mt-aviso-parcial">Falta la recotización para el cliente de: {faltanParaCliente.map((e) => e.label).join(', ')}.</p>
      )}

      {recotizando && (
        <CreateQuotationModal
          prefillData={recotizando}
          onClose={() => setRecotizando(null)}
          onSuccess={() => {
            setRecotizando(null);
            cargar().catch(() => {});
            onCambio?.();
          }}
        />
      )}
    </div>
  );
};

export default CarritoCotizaciones;
