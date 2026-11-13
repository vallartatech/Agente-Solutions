// Red: el técnico ve el acceso a la propiedad que dejó el cliente (QR y/o código),
// solo después de marcar "Llegué". Antes solo sabe que existe.
import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, QrCode, Lock, Copy, Maximize2 } from 'lucide-react';
import { obtenerAccesos, textoVigencia } from '../Shared/accesoRedApi';
import VisorAccesoRed from '../Shared/VisorAccesoRed';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

const AccesoPropiedadTecnico = ({ job }) => {
  const [datos, setDatos] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [copiado, setCopiado] = useState(null);
  const workOrderId = job?.id;

  const cargar = useCallback(async () => {
    if (!workOrderId) return;
    try {
      setDatos(await obtenerAccesos(workOrderId));
    } catch {
      setDatos(null);
    }
  }, [workOrderId]);

  // Se vuelve a pedir al marcar "Llegué" (arrived_at cambia)
  useEffect(() => { cargar(); }, [cargar, job?.arrived_at]);

  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!datos || !(datos.accesos || []).length) return null;

  if (!datos.puede_ver) {
    return (
      <div className="acr-aviso">
        <Lock size={16} />
        <span><strong>El cliente dejó acceso a la propiedad.</strong> Lo verás cuando marques que llegaste.</span>
      </div>
    );
  }

  const copiar = async (a) => {
    try {
      await navigator.clipboard.writeText(a.codigo);
      setCopiado(a.slot);
      setTimeout(() => setCopiado(null), 1500);
    } catch { /* sin portapapeles */ }
  };

  return (
    <div className="acr-panel tecnico">
      <div className="acr-cab">
        <KeyRound size={18} />
        <div>
          <strong>Acceso a la propiedad</strong>
          <span>Úsalo solo para este trabajo. Se borra al terminar.</span>
        </div>
      </div>
      {datos.accesos.map((a) => (
        <div key={a.slot} className="acr-item">
          <span className="acr-item-icono">{a.tiene_imagen ? <QrCode size={18} /> : <KeyRound size={18} />}</span>
          <div className="acr-item-txt">
            <strong>{a.label || (a.tiene_imagen ? 'QR de acceso' : 'Código de acceso')}</strong>
            {a.codigo && (
              <button type="button" className="acr-codigo acr-codigo-btn" onClick={() => copiar(a)} title="Copiar código">
                {a.codigo} <Copy size={13} /> {copiado === a.slot && <em>Copiado</em>}
              </button>
            )}
            {a.note && <span className="acr-nota">{a.note}</span>}
            <span className="acr-vence">{textoVigencia(a.valid_until)}</span>
          </div>
          {a.tiene_imagen && (
            <button type="button" className="acr-btn primario acr-btn-qr" onClick={() => setViendo(a)}>
              <Maximize2 size={15} /> Mostrar QR
            </button>
          )}
        </div>
      ))}
      {viendo && <VisorAccesoRed workOrderId={workOrderId} acceso={viendo} onCerrar={cerrarVisor} />}
    </div>
  );
};

export default AccesoPropiedadTecnico;
