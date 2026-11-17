// Red: el cliente sube el acceso a su propiedad para este trabajo (imagen del QR y/o código).
// Vigencia obligatoria de máximo 7 días; se borra sola al vencer o cuando el trabajo termina o se cancela.
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { KeyRound, QrCode, Plus, Trash2, Eye } from 'lucide-react';
import FormularioAcceso from './FormularioAcceso';
import {
  obtenerAccesos, borrarAcceso, errorDeAcceso, textoVigencia,
} from '../Shared/accesoRedApi';
import VisorAccesoRed from '../Shared/VisorAccesoRed';
import '../../../styles/AgenteMarket/Shared/AccesoPropiedad.css';

const ESTADOS_SIN_ACCESO = ['Listo', 'Finalizado', 'Terminado', 'Completado', 'Cancelado', 'Cancelado_Tecnico', 'Cancelado_Cliente', 'Rechazado'];

const AccesoPropiedadCliente = ({ job }) => {
  const [datos, setDatos] = useState(null);
  const [editando, setEditando] = useState(null); // slot que se está agregando
  const [viendo, setViendo] = useState(null);
  const workOrderId = job?.id;
  const abierto = job && !ESTADOS_SIN_ACCESO.includes(job.status);

  const cargar = useCallback(async () => {
    if (!workOrderId) return;
    try {
      setDatos(await obtenerAccesos(workOrderId));
    } catch {
      setDatos(null);
    }
  }, [workOrderId]);

  useEffect(() => {
    setDatos(null);
    setEditando(null);
    if (abierto) cargar();
  }, [cargar, abierto]);

  const cerrarVisor = useCallback(() => setViendo(null), []);

  if (!abierto || !datos) return null;

  const accesos = datos.accesos || [];
  const libre = [1, 2].find((s) => !accesos.some((a) => a.slot === s));

  const borrar = async (slot) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Quitar este acceso?', text: 'El técnico ya no podrá verlo.', icon: 'question',
      showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b',
    });
    if (!isConfirmed) return;
    try {
      setDatos(await borrarAcceso(workOrderId, slot));
    } catch (e) {
      Swal.fire('No se pudo quitar', await errorDeAcceso(e), 'error');
    }
  };

  return (
    <section className="acr-panel">
      <div className="acr-cab">
        <KeyRound size={18} />
        <div>
          <strong>Acceso a la propiedad</strong>
          <span>¿Hay caseta o QR para entrar? Déjalo aquí si no vas a estar. El técnico lo verá solo cuando llegue.</span>
        </div>
      </div>

      {accesos.map((a) => (
        <div key={a.slot} className="acr-item">
          <span className="acr-item-icono">{a.tiene_imagen ? <QrCode size={18} /> : <KeyRound size={18} />}</span>
          <div className="acr-item-txt">
            <strong>{a.label || (a.tiene_imagen ? 'QR de acceso' : 'Código de acceso')}</strong>
            {a.codigo && <span className="acr-codigo">{a.codigo}</span>}
            <span className="acr-vence">{textoVigencia(a.valid_until)}</span>
          </div>
          {a.tiene_imagen && (
            <button type="button" className="acr-icono-btn" onClick={() => setViendo(a)} title="Ver QR"><Eye size={15} /></button>
          )}
          {datos.puede_editar && (
            <button type="button" className="acr-icono-btn peligro" onClick={() => borrar(a.slot)} title="Quitar acceso"><Trash2 size={15} /></button>
          )}
        </div>
      ))}

      {editando ? (
        <FormularioAcceso
          workOrderId={workOrderId}
          slot={editando}
          onCancelar={() => setEditando(null)}
          onGuardado={(res) => {
            setDatos(res);
            setEditando(null);
            Swal.fire({ icon: 'success', title: 'Acceso guardado', text: 'El técnico lo verá cuando marque que llegó.', confirmButtonColor: '#f26522' });
          }}
        />
      ) : datos.puede_editar && libre && (
        <button type="button" className="acr-agregar" onClick={() => setEditando(libre)}>
          <Plus size={16} /> {accesos.length ? 'Agregar otro acceso' : 'Agregar QR o código de acceso'}
        </button>
      )}

      {viendo && <VisorAccesoRed workOrderId={workOrderId} acceso={viendo} onCerrar={cerrarVisor} />}
    </section>
  );
};

export default AccesoPropiedadCliente;
