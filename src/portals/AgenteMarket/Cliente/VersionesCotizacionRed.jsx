// Red (cliente): propuesta del técnico dentro de su oferta. Si el técnico cambió su cotización
// se muestra la nueva y, debajo, un botón para desplegar u ocultar las anteriores.
// - Antes de aceptar: las versiones anteriores salen del chat (mensaje automático al "Actualizar oferta").
// - Ya aceptada: los ajustes de precio que guarda el servidor (/mercado-trabajos/{id}/ajustes).
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { obtenerAjustes, dinero, fechaCorta } from '../Shared/ajusteCotizacionApi';
import { ArchivoAjuste, DesgloseAjuste, FotosAjuste } from '../Shared/HistorialAjustes';
import { versionesDesdeChat } from '../Shared/versionesCotizacionChat';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const ESTADO_ANTERIOR = {
  reemplazada: { texto: 'Reemplazada', tono: 'retirado' },
  rejected: { texto: 'Ajuste rechazado', tono: 'rechazado' },
  retirado: { texto: 'Ajuste retirado', tono: 'retirado' },
};

const VersionesCotizacionRed = ({ quote, workOrderId, aceptada, recarga }) => {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!aceptada || !workOrderId) {
      setDatos(null);
      return undefined;
    }
    let vivo = true;
    obtenerAjustes(workOrderId)
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setDatos(null); });
    return () => { vivo = false; };
  }, [aceptada, workOrderId, recarga]);

  // Línea de tiempo, de la más antigua a la más reciente
  const delChat = versionesDesdeChat(quote.chat_history).reverse().map((v, i) => ({
    id: `chat-${i}`,
    precio: v.precio,
    motivo: v.propuesta,
    fecha: v.reemplazada_at,
    fechaTexto: 'Reemplazada el',
    status: 'reemplazada',
  }));
  const ajustes = [...(datos?.ajustes || [])]
    .filter((a) => a.status !== 'pending') // la pendiente se responde arriba
    .sort((a, b) => a.version - b.version);
  const base = {
    id: 'base',
    precio: datos?.precio_original ?? quote.price,
    motivo: quote.message,
    fecha: quote.created_at,
    fechaTexto: 'Enviada el',
    status: 'reemplazada',
  };
  const linea = [
    ...delChat,
    base,
    ...ajustes.map((a) => ({ ...a, fecha: a.created_at, fechaTexto: 'Enviada el', ajuste: true })),
  ].map((v, i) => ({ ...v, num: i + 1 }));

  const aceptados = linea.filter((v) => v.ajuste && v.status === 'accepted');
  const actual = aceptados[aceptados.length - 1] || linea.find((v) => v.id === 'base');
  const anteriores = linea.filter((v) => v !== actual).reverse();

  // Sin cambios: la propuesta de siempre
  if (!anteriores.length) {
    return quote.message ? (
      <div className="red-quote-bloque">
        <small>Propuesta del técnico</small>
        <p>{quote.message}</p>
      </div>
    ) : null;
  }

  const varias = anteriores.length > 1;

  return (
    <div className="red-cot-versiones">
      <div className="red-cot-nueva">
        <div className="red-cot-nueva-cab">
          <small>Cotización actual · v{actual.num}</small>
          <span className="aj-chip aceptado">Nueva</span>
        </div>
        <strong className="red-cot-precio">{dinero(actual.precio)}</strong>
        {actual.motivo && <p className="red-cot-motivo">{actual.motivo}</p>}
        <ArchivoAjuste ajuste={actual} />
        <DesgloseAjuste desglose={actual.desglose} conIva={actual.con_iva} />
        <FotosAjuste fotos={actual.fotos} />
        {actual.fecha && <span className="red-cot-fecha">{fechaCorta(actual.fecha)}</span>}
      </div>

      <button
        type="button"
        className="red-cot-toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <History size={14} />
        {abierto
          ? (varias ? 'Ocultar cotizaciones anteriores' : 'Ocultar cotización anterior')
          : (varias ? `Ver cotizaciones anteriores (${anteriores.length})` : 'Ver cotización anterior')}
        {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {abierto && (
        <ol className="red-cot-anteriores">
          {anteriores.map((v) => {
            const estado = ESTADO_ANTERIOR[v.status] || ESTADO_ANTERIOR.reemplazada;
            return (
              <li key={v.id} className="red-cot-anterior">
                <div className="aj-version-cab">
                  <span className="aj-version-num">v{v.num}</span>
                  <span className="red-cot-precio-viejo">{dinero(v.precio)}</span>
                  <span className={`aj-chip ${estado.tono}`}>{estado.texto}</span>
                </div>
                {v.motivo && <p className="aj-version-motivo">{v.motivo}</p>}
                <ArchivoAjuste ajuste={v} />
                <DesgloseAjuste desglose={v.desglose} conIva={v.con_iva} />
                <FotosAjuste fotos={v.fotos} />
                {v.fecha && <span className="aj-version-fecha">{v.fechaTexto} {fechaCorta(v.fecha)}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default VersionesCotizacionRed;
