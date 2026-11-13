// Historial de la cotización: la original (v1) y cada ajuste con su estado, desglose y fotos
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { dinero, ESTADO_AJUSTE, fechaCorta, totalFilas } from './ajusteCotizacionApi';

export const DesgloseAjuste = ({ desglose }) => {
  if (!desglose) return null;
  const grupos = [
    ['Servicios / mano de obra', desglose.servicios],
    ['Materiales', desglose.materiales],
  ].filter(([, filas]) => filas?.length);
  if (!grupos.length) return null;

  return (
    <div className="aj-desglose">
      {grupos.map(([titulo, filas]) => (
        <div key={titulo} className="aj-desglose-grupo">
          <span className="aj-desglose-titulo">{titulo}</span>
          {filas.map((f, i) => (
            <div key={i} className="aj-desglose-fila">
              <span className="aj-desglose-desc">{f.cantidad} × {f.descripcion || 'Sin descripción'}</span>
              <span>{dinero(f.cantidad * f.precio)}</span>
            </div>
          ))}
          <div className="aj-desglose-fila subtotal">
            <span>Subtotal</span>
            <span>{dinero(totalFilas(filas))}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const FotosAjuste = ({ fotos }) => {
  if (!fotos?.length) return null;
  return (
    <div className="aj-fotos">
      {fotos.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="aj-foto" title="Ver foto completa">
          <img src={url} alt={`Foto del problema ${i + 1}`} loading="lazy" />
        </a>
      ))}
    </div>
  );
};

const HistorialAjustes = ({ ajustes = [], precioOriginal }) => {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(null);
  if (!ajustes.length) return null;

  return (
    <div className="aj-historial">
      <button type="button" className="aj-historial-toggle" onClick={() => setAbierto((v) => !v)}>
        Historial de la cotización ({ajustes.length + 1} versiones)
        {abierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {abierto && (
        <ol className="aj-historial-lista">
          <li className="aj-version">
            <div className="aj-version-cab">
              <span className="aj-version-num">v1</span>
              <span className="aj-version-precio">{dinero(precioOriginal)}</span>
              <span className="aj-chip aceptado">Cotización original</span>
            </div>
          </li>
          {ajustes.map((a) => {
            const estado = ESTADO_AJUSTE[a.status] || ESTADO_AJUSTE.pending;
            const tieneMas = a.desglose || a.fotos?.length;
            return (
              <li key={a.id} className="aj-version">
                <div className="aj-version-cab">
                  <span className="aj-version-num">v{a.version}</span>
                  <span className="aj-version-precio">{dinero(a.precio)}</span>
                  <span className={`aj-chip ${estado.tono}`}>{estado.texto}</span>
                </div>
                <p className="aj-version-motivo">{a.motivo}</p>
                <span className="aj-version-fecha">
                  {fechaCorta(a.created_at)}
                  {a.decision_tecnico === 'continuar' && ' · el técnico continuó con el precio anterior'}
                  {a.decision_tecnico === 'cancelar' && ' · el técnico canceló sin penalización'}
                </span>
                {tieneMas && (
                  <button type="button" className="aj-link" onClick={() => setDetalle(detalle === a.id ? null : a.id)}>
                    <ImageIcon size={13} /> {detalle === a.id ? 'Ocultar detalle' : 'Ver desglose y fotos'}
                  </button>
                )}
                {detalle === a.id && (
                  <>
                    <DesgloseAjuste desglose={a.desglose} />
                    <FotosAjuste fotos={a.fotos} />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default HistorialAjustes;
