import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, CheckCircle2, ChevronDown, ClipboardPlus, Wrench } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { hoyISO, nombreEquipo, textoFecha, textoFrecuencia, tiempoRestante } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const DIAS_ANTICIPACION = 30;
const nombrePropiedad = (p) => p?.property_name || p?.address || 'Propiedad';

const avisoError = (title, error) => Swal.fire({
  icon: 'error',
  title,
  text: error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.',
  confirmButtonColor: '#f26522',
});

// Fecha en que se realizó: hoy por defecto, nunca futura
export const preguntarFechaRealizado = async (titulo) => {
  const hoy = hoyISO();
  const { value, isConfirmed } = await Swal.fire({
    title: titulo,
    text: '¿Cuándo se realizó? El ciclo vuelve a contar desde ese día.',
    input: 'date',
    inputValue: hoy,
    inputAttributes: { max: hoy },
    showCancelButton: true,
    confirmButtonText: 'Registrar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16a34a',
    reverseButtons: true,
    inputValidator: (v) => (!v ? 'Indica la fecha.' : v > hoy ? 'No puede ser una fecha futura.' : undefined),
  });
  return isConfirmed ? value : null;
};

// Sección del tablero: mantenimientos que tocan en los próximos 30 días o ya vencieron, agrupados como
// saldrían en la orden (misma propiedad y misma fecha). Se convierten en orden o se registran como hechos.
const MantenimientosProximos = ({ onOrdenCreada }) => {
  const [visitas, setVisitas] = useState([]);
  const [abierto, setAbierto] = useState(true);
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/mantenimiento/visitas`, { headers: authHeaders() });
      setVisitas(Array.isArray(data) ? data : []);
    } catch {
      setVisitas([]);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const grupos = useMemo(() => {
    const tope = new Date();
    tope.setDate(tope.getDate() + DIAS_ANTICIPACION);
    const topeISO = `${tope.getFullYear()}-${String(tope.getMonth() + 1).padStart(2, '0')}-${String(tope.getDate()).padStart(2, '0')}`;

    const mapa = new Map();
    visitas.forEach((v) => {
      const fecha = String(v.fecha_programada).slice(0, 10);
      if (fecha > topeISO || !v.equipment?.property_id) return;
      const clave = `${v.equipment.property_id}|${fecha}`;
      if (!mapa.has(clave)) mapa.set(clave, { clave, fecha, propiedad: v.equipment.property, visitas: [] });
      mapa.get(clave).visitas.push(v);
    });
    // Lo vencido primero, luego lo más próximo
    return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [visitas]);

  if (!grupos.length) return null;
  const vencidos = grupos.filter((g) => g.fecha < hoyISO()).length;

  const crearOrden = async (grupo) => {
    const equipos = grupo.visitas.map((v) => nombreEquipo(v.equipment)).join(', ');
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Crear orden de mantenimiento',
      html: `${nombrePropiedad(grupo.propiedad)}<br/><small>${equipos}</small>`,
      showCancelButton: true,
      confirmButtonText: 'Crear orden',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f26522',
      reverseButtons: true,
    });
    if (!isConfirmed) return;

    setOcupado(grupo.clave);
    try {
      const { data } = await axios.post(`${API}/mantenimiento/visitas/${grupo.visitas[0].id}/convertir`, {}, { headers: authHeaders() });
      await cargar();
      onOrdenCreada?.(data.work_order_id);
    } catch (error) {
      avisoError('No se pudo crear la orden', error);
    } finally {
      setOcupado(null);
    }
  };

  const registrar = async (grupo) => {
    const fecha = await preguntarFechaRealizado(grupo.visitas.length > 1 ? `${grupo.visitas.length} equipos ya atendidos` : 'Mantenimiento ya realizado');
    if (!fecha) return;

    setOcupado(grupo.clave);
    try {
      await axios.post(`${API}/mantenimiento/realizado`, { equipos: grupo.visitas.map((v) => v.equipment.id), fecha }, { headers: authHeaders() });
      await cargar();
      Swal.fire({ icon: 'success', title: 'Registrado', text: 'Los equipos con periodo ya tienen su siguiente fecha.', timer: 2200, showConfirmButton: false });
    } catch (error) {
      avisoError('No se pudo registrar', error);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <section className="mt-proximos">
      <button type="button" className="mt-proximos-cabecera" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
        <span className="mt-proximos-titulo">
          <Wrench size={17} /> Mantenimientos próximos
          <span className="mt-proximos-cuenta">{grupos.length}</span>
          {vencidos > 0 && <span className="mt-proximos-cuenta vencido">{vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
        </span>
        <ChevronDown size={18} className={abierto ? 'girado' : ''} />
      </button>

      {abierto && (
        <ul className="mt-proximos-lista">
          {grupos.map((g) => {
            const restante = tiempoRestante(g.fecha);
            return (
              <li key={g.clave} className={`mt-proximo ${restante.tono}`}>
                <div className="mt-proximo-info">
                  <strong>{nombrePropiedad(g.propiedad)}</strong>
                  <span className="mt-proximo-fecha"><CalendarClock size={14} /> {textoFecha(g.fecha)} · {restante.texto}</span>
                  <small>
                    {g.visitas.map((v) => nombreEquipo(v.equipment) + (v.equipment.frecuencia_meses ? ` (${textoFrecuencia(v.equipment.frecuencia_meses).toLowerCase()})` : '')).join(' · ')}
                  </small>
                </div>
                <div className="mt-proximo-acciones">
                  <button type="button" className="mt-btn-editar" onClick={() => registrar(g)} disabled={ocupado === g.clave}>
                    <CheckCircle2 size={15} /> Ya se hizo
                  </button>
                  <button type="button" className="xp-btn-primary" onClick={() => crearOrden(g)} disabled={ocupado === g.clave}>
                    <ClipboardPlus size={15} /> Crear orden
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MantenimientosProximos;
