import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, CheckCircle2, ClipboardList, Package, X } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import GruposEquipos, { SelectorVeces } from './GruposEquipos';
import { grupoCompleto, textoFechas } from './cicloMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/VistaPropiedades.css';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const VECES_INICIAL = 2;

// Al finalizar un trabajo (workOrderId) o desde la propiedad (propiedadId): qué equipos llevan
// mantenimiento periódico y cuántas veces al año. Las fechas se cuentan desde la fecha base.
const ModalCicloMantenimiento = ({ workOrderId = null, propiedadId = null, onClose, onGuardado }) => {
  const [datos, setDatos] = useState(null);
  const [fechaBase, setFechaBase] = useState('');
  const [marcados, setMarcados] = useState({}); // id de elemento → veces al año
  const [capturados, setCapturados] = useState({}); // id de grupo ya registrado → veces al año
  const [nuevos, setNuevos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const params = workOrderId ? { work_order_id: workOrderId } : { property_id: propiedadId };
    axios.get(`${API}/mantenimiento/formulario`, { params, headers: authHeaders() })
      .then(({ data }) => {
        setDatos(data);
        setFechaBase(data.fecha_base);
        // Lo que se trabajó en esta orden ya viene marcado
        setMarcados(Object.fromEntries(data.elementos.filter((e) => e.en_orden).map((e) => [e.id, e.veces_al_ano || VECES_INICIAL])));
        setCapturados(Object.fromEntries(data.grupos.map((g) => [g.id, g.veces_al_ano || VECES_INICIAL])));
      })
      .catch((error) => {
        Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: error.response?.data?.error || 'Intenta de nuevo.', confirmButtonColor: '#f26522' });
        onClose();
      });
  }, [workOrderId, propiedadId]);

  const porZona = useMemo(() => (datos?.elementos || []).reduce((acc, e) => {
    (acc[e.area] = acc[e.area] || []).push(e);
    return acc;
  }, {}), [datos]);

  const total = Object.keys(marcados).length + Object.keys(capturados).length + nuevos.length;

  const alternar = (setter, id, inicial) => setter((prev) => {
    const copia = { ...prev };
    if (id in copia) delete copia[id];
    else copia[id] = inicial || VECES_INICIAL;
    return copia;
  });

  const guardar = async () => {
    if (!fechaBase) {
      Swal.fire({ icon: 'warning', title: 'Falta la fecha', text: 'Indica la fecha desde la que se cuenta el ciclo.', confirmButtonColor: '#f26522' });
      return;
    }
    if (!total) {
      Swal.fire({ icon: 'warning', title: 'Sin equipos', text: 'Marca al menos un equipo o usa "Ahora no".', confirmButtonColor: '#f26522' });
      return;
    }
    if (nuevos.some((g) => !grupoCompleto(g))) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Cada grupo necesita tipo, cantidad, foto del equipo y tarjeta de datos.', confirmButtonColor: '#f26522' });
      return;
    }

    const fd = new FormData();
    fd.append('property_id', datos.property_id);
    fd.append('fecha_base', fechaBase);
    if (workOrderId) fd.append('work_order_id', workOrderId);

    let i = 0;
    Object.entries(marcados).forEach(([id, veces]) => {
      fd.append(`items[${i}][property_component_id]`, id);
      fd.append(`items[${i}][veces_al_ano]`, veces);
      i += 1;
    });
    Object.entries(capturados).forEach(([id, veces]) => {
      fd.append(`items[${i}][id]`, id);
      fd.append(`items[${i}][veces_al_ano]`, veces);
      i += 1;
    });
    nuevos.forEach((g) => {
      fd.append(`items[${i}][tipo]`, g.tipo.trim());
      fd.append(`items[${i}][cantidad]`, g.cantidad);
      fd.append(`items[${i}][veces_al_ano]`, g.veces_al_ano);
      if (g.detalle.trim()) fd.append(`items[${i}][detalle]`, g.detalle.trim());
      fd.append(`items[${i}][foto_equipo]`, g.foto_equipo);
      fd.append(`items[${i}][foto_datos]`, g.foto_datos);
      i += 1;
    });

    setGuardando(true);
    try {
      await axios.post(`${API}/mantenimiento`, fd, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
      Swal.fire({ icon: 'success', title: '¡Mantenimiento programado!', text: 'Las fechas ya están en tu calendario.', timer: 2200, showConfirmButton: false });
      onGuardado?.();
      onClose();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar',
        text: error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.',
        confirmButtonColor: '#f26522',
      });
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp-modal mt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rp-header">
          <div className="rp-header-text">
            <span className="rp-tag">{datos?.property_name || 'PROPIEDAD'}</span>
            <h2 className="rp-title">Mantenimiento periódico</h2>
          </div>
          <button type="button" className="rp-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} color="#ffffff" strokeWidth={2.6} />
          </button>
        </div>

        {!datos ? (
          <p className="mt-cargando">Cargando equipos...</p>
        ) : (
          <div className="rp-form">
            <label className="mt-campo">
              <span><CalendarClock size={15} /> Contar el ciclo desde</span>
              <input type="date" value={fechaBase} onChange={(e) => setFechaBase(e.target.value)} />
            </label>

            {datos.elementos.length > 0 && (
              <section className="mt-seccion">
                <h3><ClipboardList size={16} /> Del levantamiento</h3>
                {Object.entries(porZona).map(([zona, elementos]) => (
                  <div key={zona}>
                    <p className="mt-zona">{zona}</p>
                    {elementos.map((e) => {
                      const on = e.id in marcados;
                      return (
                        <div key={e.id} className={`mt-elemento ${on ? 'on' : ''}`}>
                          <button type="button" className="mt-elemento-check" onClick={() => alternar(setMarcados, e.id, e.veces_al_ano)} aria-pressed={on}>
                            <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                            <span className="mt-elemento-texto">
                              <strong>{e.label}</strong>
                              {e.veces_al_ano && <small>Ya programado: {e.veces_al_ano} {e.veces_al_ano === 1 ? 'vez' : 'veces'} al año</small>}
                            </span>
                          </button>
                          {on && (
                            <div className="mt-elemento-ciclo">
                              <SelectorVeces valor={marcados[e.id]} onChange={(n) => setMarcados((p) => ({ ...p, [e.id]: n }))} />
                              <span className="mt-fechas">{textoFechas(fechaBase, marcados[e.id])}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>
            )}

            <section className="mt-seccion">
              <h3><Package size={16} /> Sin levantamiento</h3>
              {datos.grupos.map((g) => {
                const on = g.id in capturados;
                return (
                  <div key={g.id} className={`mt-elemento ${on ? 'on' : ''}`}>
                    <button type="button" className="mt-elemento-check" onClick={() => alternar(setCapturados, g.id, g.veces_al_ano)} aria-pressed={on}>
                      <span className="mt-casilla">{on && <CheckCircle2 size={18} />}</span>
                      <span className="mt-elemento-texto">
                        <strong>{g.cantidad > 1 ? `${g.cantidad} × ${g.tipo}` : g.tipo}</strong>
                        {g.detalle && <small>{g.detalle}</small>}
                      </span>
                    </button>
                    {on && (
                      <div className="mt-elemento-ciclo">
                        <SelectorVeces valor={capturados[g.id]} onChange={(n) => setCapturados((p) => ({ ...p, [g.id]: n }))} />
                        <span className="mt-fechas">{textoFechas(fechaBase, capturados[g.id])}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <GruposEquipos grupos={nuevos} onChange={setNuevos} conVeces />
            </section>

            <div className="rp-footer mt-pie">
              <button type="button" className="mt-btn-secundario" onClick={onClose}>Ahora no</button>
              <button type="button" className="xp-btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Programar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ModalCicloMantenimiento;
