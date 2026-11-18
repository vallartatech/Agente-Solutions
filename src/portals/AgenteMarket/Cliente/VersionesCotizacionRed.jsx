// Red (cliente): propuesta del técnico dentro de su oferta. Si el técnico reajustó la cotización
// aceptada, se muestra la nueva y, debajo, un botón para desplegar u ocultar las anteriores.
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { obtenerAjustes, dinero, fechaCorta } from '../Shared/ajusteCotizacionApi';
import { ArchivoAjuste, DesgloseAjuste, FotosAjuste } from '../Shared/HistorialAjustes';
import '../../../styles/AgenteMarket/Shared/AjusteCotizacion.css';

const ESTADO_ANTERIOR = {
  original: { texto: 'Cotización original', tono: 'retirado' },
  accepted: { texto: 'Reemplazada', tono: 'retirado' },
  rejected: { texto: 'Rechazada', tono: 'rechazado' },
  retirado: { texto: 'Retirada', tono: 'retirado' },
};

const PropuestaSimple = ({ mensaje }) => (mensaje ? (
  <div className="red-quote-bloque">
    <small>Propuesta del técnico</small>
    <p>{mensaje}</p>
  </div>
) : null);

const VersionesCotizacionRed = ({ quote, workOrderId, aceptada, recarga }) => {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!aceptada || !workOrderId) {
      setDatos(null);
      return;
    }
    let vivo = true;
    obtenerAjustes(workOrderId)
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setDatos(null); });
    return () => { vivo = false; };
  }, [aceptada, workOrderId, recarga]);

  const ajustes = [...(datos?.ajustes || [])].sort((a, b) => a.version - b.version);
  const aceptados = ajustes.filter((a) => a.status === 'accepted');
  const actual = aceptados[aceptados.length - 1];

  // Sin reajuste aceptado: la propuesta de siempre
  if (!actual) return <PropuestaSimple mensaje={quote.message} />;

  // Versiones anteriores (la más reciente primero). La pendiente se responde arriba, no aquí.
  const anteriores = [
    {
      id: 'original',
      version: 1,
      precio: datos.precio_original,
      motivo: quote.message,
      created_at: quote.created_at,
      status: 'original',
    },
    ...ajustes.filter((a) => a.id !== actual.id && a.status !== 'pending'),
  ].reverse();

  return (
    <div className="red-cot-versiones">
      <div className="red-cot-nueva">
        <div className="red-cot-nueva-cab">
          <small>Cotización actual · v{actual.version}</small>
          <span className="aj-chip aceptado">Nueva</span>
        </div>
        <strong className="red-cot-precio">{dinero(actual.precio)}</strong>
        {actual.motivo && <p className="red-cot-motivo">{actual.motivo}</p>}
        <ArchivoAjuste ajuste={actual} />
        <DesgloseAjuste desglose={actual.desglose} conIva={actual.con_iva} />
        <FotosAjuste fotos={actual.fotos} />
        <span className="red-cot-fecha">{fechaCorta(actual.created_at)}</span>
      </div>

      <button
        type="button"
        className="red-cot-toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <History size={14} />
        {abierto
          ? (anteriores.length > 1 ? 'Ocultar cotizaciones anteriores' : 'Ocultar cotización anterior')
          : (anteriores.length > 1 ? `Ver cotizaciones anteriores (${anteriores.length})` : 'Ver cotización anterior')}
        {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {abierto && (
        <ol className="red-cot-anteriores">
          {anteriores.map((v) => {
            const estado = ESTADO_ANTERIOR[v.status] || ESTADO_ANTERIOR.accepted;
            return (
              <li key={v.id} className="red-cot-anterior">
                <div className="aj-version-cab">
                  <span className="aj-version-num">v{v.version}</span>
                  <span className="red-cot-precio-viejo">{dinero(v.precio)}</span>
                  <span className={`aj-chip ${estado.tono}`}>{estado.texto}</span>
                </div>
                {v.motivo && <p className="aj-version-motivo">{v.motivo}</p>}
                <ArchivoAjuste ajuste={v} />
                <DesgloseAjuste desglose={v.desglose} conIva={v.con_iva} />
                <FotosAjuste fotos={v.fotos} />
                {v.created_at && <span className="aj-version-fecha">{fechaCorta(v.created_at)}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default VersionesCotizacionRed;
