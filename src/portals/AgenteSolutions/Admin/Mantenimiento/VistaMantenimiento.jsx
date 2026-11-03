import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, Check, CheckCircle2, ChevronRight, ClipboardList, Pencil, Plus, Repeat, Search, Trash2, Wrench } from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import ModalRegistroInmueble from '../../../../components/Shared/ModalRegistroInmueble';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { CampoFecha, CampoFoto, dentroDeMeses, hoyISO, nombreEquipo, porFecha, proximaFecha, textoFecha, textoFrecuencia } from './CamposMantenimiento';
import ModalEditarMantenimiento from './ModalEditarMantenimiento';
import PeriodoMantenimiento, { proximaDelPeriodo } from './PeriodoMantenimiento';
import { preguntarFechaRealizado } from './MantenimientosProximos';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const ATAJOS_MESES = [3, 6, 12];
// Opción de la lista que abre el registro completo de la propiedad
const REGISTRAR_PROPIEDAD = 'registrar';
// modo: 'periodo' (cada N meses desde el último) o 'fecha' (una sola fecha escrita)
const FORM_VACIO = {
  property_id: '', elegidos: [], tipo: '', cantidad: 1, detalle: '',
  modo: 'periodo', frecuencia: null, ultimo: '', fecha: '', foto_equipo: null, foto_datos: null,
};

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nombrePropiedad = (p) => p?.property_name || p?.address || 'Propiedad';

const avisoError = (title, error) => Swal.fire({
  icon: 'error',
  title,
  text: error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.',
  confirmButtonColor: '#f26522',
});

// Al elegir la propiedad se muestran los equipos de su levantamiento: se marcan uno o varios (ej. 3 climas de
// distintas habitaciones) y se programan juntos cada N meses. Si no está en el levantamiento, se escribe a mano.
const VistaMantenimiento = () => {
  const navigate = useNavigate();
  const [propiedades, setPropiedades] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [registrandoPropiedad, setRegistrandoPropiedad] = useState(false);
  const [elementos, setElementos] = useState([]);
  const [cargandoElementos, setCargandoElementos] = useState(false);
  // Evita que la respuesta de una propiedad anterior pise la de la elegida ahora
  const propiedadPedida = useRef('');

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      axios.get(`${API}/mantenimiento/propiedades`, { headers }),
      axios.get(`${API}/mantenimiento/equipos`, { headers }),
    ])
      .then(([resPropiedades, resEquipos]) => {
        setPropiedades(resPropiedades.data || []);
        setEquipos(resEquipos.data || []);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, []);

  const lista = useMemo(() => {
    const texto = normalizar(busqueda);
    return equipos
      .filter((e) => !texto || normalizar(`${e.tipo} ${e.detalle} ${e.property?.property_name} ${e.property?.address}`).includes(texto))
      .sort(porFecha);
  }, [equipos, busqueda]);

  // Equipo de la lista ya ligado a cada elemento del levantamiento
  const agendadoPorElemento = useMemo(() => {
    const mapa = {};
    equipos.forEach((e) => { if (e.property_component_id) mapa[e.property_component_id] = e; });
    return mapa;
  }, [equipos]);

  // Agrega o reemplaza en la lista los equipos que regresó el servidor
  const fusionarEquipos = (nuevos) => setEquipos((prev) => {
    const porId = new Map(prev.map((e) => [e.id, e]));
    nuevos.forEach((n) => porId.set(n.id, { ...porId.get(n.id), ...n }));
    return [...porId.values()];
  });

  const cargarElementos = async (propertyId) => {
    propiedadPedida.current = propertyId;
    setElementos([]);
    if (!propertyId) return;
    setCargandoElementos(true);
    try {
      const { data } = await axios.get(`${API}/properties/${propertyId}/elementos`, { headers: authHeaders() });
      if (propiedadPedida.current === propertyId) setElementos(data || []);
    } catch {
      // Sin levantamiento disponible: el equipo se sigue pudiendo escribir a mano
    } finally {
      if (propiedadPedida.current === propertyId) setCargandoElementos(false);
    }
  };

  const elegirPropiedad = (valor) => {
    if (valor === REGISTRAR_PROPIEDAD) {
      setRegistrandoPropiedad(true);
      return;
    }
    // Lo elegido del levantamiento anterior no aplica a la nueva propiedad
    setForm((f) => ({ ...f, property_id: valor, elegidos: [] }));
    cargarElementos(valor);
  };

  const alternarElemento = (id) => setForm((f) => ({
    ...f,
    elegidos: f.elegidos.includes(id) ? f.elegidos.filter((x) => x !== id) : [...f.elegidos, id],
    modo: 'periodo',
  }));

  const todosElegidos = elementos.length > 0 && form.elegidos.length === elementos.length;
  const alternarTodos = () => setForm((f) => ({ ...f, elegidos: todosElegidos ? [] : elementos.map((el) => el.id), modo: 'periodo' }));

  // Al registrar una propiedad nueva queda elegida en el formulario
  const propiedadRegistrada = async (creada) => {
    if (creada?.id) {
      setForm((f) => ({ ...f, property_id: String(creada.id), elegidos: [] }));
      cargarElementos(String(creada.id));
    }
    try {
      const { data } = await axios.get(`${API}/mantenimiento/propiedades`, { headers: authHeaders() });
      setPropiedades(data || []);
    } catch {
      Swal.fire({ icon: 'warning', title: 'Propiedad registrada', text: 'Recarga la página para verla en la lista.', confirmButtonColor: '#f26522' });
    }
  };

  const faltan = (texto) => Swal.fire({ icon: 'warning', title: 'Faltan datos', text: texto, confirmButtonColor: '#f26522' });

  // Varios elementos del levantamiento: mismo periodo y misma fecha, salen juntos en una orden
  const programarElegidos = async () => {
    if (!form.frecuencia) return faltan('Elige cada cuánto se da el mantenimiento.');
    setGuardando(true);
    try {
      const { data } = await axios.post(`${API}/mantenimiento/programar`, {
        property_id: form.property_id,
        elementos: form.elegidos,
        frecuencia_meses: form.frecuencia,
        ultimo_mantenimiento: form.ultimo || null,
      }, { headers: authHeaders() });
      fusionarEquipos(data.equipos || []);
      const n = form.elegidos.length;
      setForm({ ...FORM_VACIO, property_id: form.property_id });
      Swal.fire({
        icon: 'success',
        title: '¡Programado!',
        text: `${n === 1 ? '1 equipo' : `${n} equipos`} ${textoFrecuencia(form.frecuencia).toLowerCase()}. Próximo: ${textoFecha(data.fecha)}.`,
        timer: 2600,
        showConfirmButton: false,
      });
    } catch (error) {
      avisoError('No se pudo programar', error);
    } finally {
      setGuardando(false);
    }
  };

  // Un equipo escrito a mano: cada N meses o una sola fecha
  const agregarManual = async () => {
    if (!form.tipo.trim()) return faltan('Escribe el equipo o elígelo del levantamiento.');
    if (form.modo === 'periodo' && !form.frecuencia) return faltan('Elige cada cuánto se da el mantenimiento.');
    if (form.modo === 'fecha' && !form.fecha) return faltan('Indica la fecha del próximo mantenimiento.');

    const fd = new FormData();
    fd.append('property_id', form.property_id);
    fd.append('tipo', form.tipo.trim());
    fd.append('cantidad', form.cantidad || 1);
    if (form.modo === 'periodo') {
      fd.append('frecuencia_meses', form.frecuencia);
      if (form.ultimo) fd.append('ultimo_mantenimiento', form.ultimo);
    } else {
      fd.append('fecha', form.fecha);
    }
    if (form.detalle.trim()) fd.append('detalle', form.detalle.trim());
    if (form.foto_equipo) fd.append('foto_equipo', form.foto_equipo);
    if (form.foto_datos) fd.append('foto_datos', form.foto_datos);

    setGuardando(true);
    try {
      const { data } = await axios.post(`${API}/mantenimiento/equipos`, fd, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
      const property = propiedades.find((p) => String(p.id) === String(form.property_id));
      setEquipos((prev) => [{ ...data.equipo, property }, ...prev]);
      // La propiedad se conserva para seguir agregando equipos del mismo lugar
      setForm({ ...FORM_VACIO, property_id: form.property_id });
      const proxima = proximaFecha(data.equipo);
      Swal.fire({ icon: 'success', title: '¡Agregado!', text: `Mantenimiento de ${form.tipo.trim()} en la agenda para el ${textoFecha(proxima)}.`, timer: 2400, showConfirmButton: false });
    } catch (error) {
      avisoError('No se pudo agregar', error);
    } finally {
      setGuardando(false);
    }
  };

  const agregar = (e) => {
    e.preventDefault();
    if (guardando) return;
    if (!form.property_id) return faltan('Elige la propiedad.');
    return form.elegidos.length ? programarElegidos() : agregarManual();
  };

  // "Ya se hizo": la fecha (aunque esté vencida) queda como realizada y el ciclo vuelve a contar desde ese día
  const registrarRealizado = async (equipo) => {
    const fecha = await preguntarFechaRealizado(nombreEquipo(equipo));
    if (!fecha) return;
    try {
      const { data } = await axios.post(`${API}/mantenimiento/realizado`, { equipos: [equipo.id], fecha }, { headers: authHeaders() });
      fusionarEquipos(data.equipos || []);
      const actualizado = (data.equipos || [])[0];
      const proxima = actualizado && proximaFecha(actualizado);
      Swal.fire({
        icon: 'success',
        title: 'Registrado',
        text: proxima ? `Próximo mantenimiento: ${textoFecha(proxima)}.` : 'No tiene periodo: edítalo si quieres agendar otra fecha.',
        timer: 2600,
        showConfirmButton: false,
      });
    } catch (error) {
      avisoError('No se pudo registrar', error);
    }
  };

  const quitar = async (equipo) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: '¿Quitar de la lista?',
      text: `"${nombreEquipo(equipo)}" dejará de aparecer en la agenda. Las órdenes ya creadas no cambian.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`${API}/mantenimiento/equipos/${equipo.id}`, { headers: authHeaders() });
      setEquipos((prev) => prev.filter((e) => e.id !== equipo.id));
    } catch (error) {
      avisoError('No se pudo quitar', error);
    }
  };

  const hoy = hoyISO();
  const varios = form.elegidos.length > 0;
  const reprogramados = form.elegidos.filter((id) => agendadoPorElemento[id]).length;
  const proximaVarios = varios && proximaDelPeriodo(form.frecuencia, form.ultimo);

  return (
    <div className="xp-page">
      <Header activeModule="mantenimiento" />
      <main className="xp-container mt-vista">
        <h1 className="mt-titulo">Mantenimiento</h1>

        <form className="xp-card xp-panel" onSubmit={agregar}>
          <h3 className="xp-panel-titulo"><Plus size={18} /> Agregar equipo</h3>

          <label className="mt-campo">
            <span>Propiedad *</span>
            <select value={form.property_id} onChange={(e) => elegirPropiedad(e.target.value)} disabled={cargando}>
              <option value="">{cargando ? 'Cargando propiedades...' : 'Selecciona la propiedad...'}</option>
              <option value={REGISTRAR_PROPIEDAD}>+ Registrar nueva propiedad</option>
              {propiedades.map((p) => <option key={p.id} value={p.id}>{nombrePropiedad(p)}</option>)}
            </select>
          </label>

          {form.property_id && (
            <div className="mt-campo">
              <div className="mt-levantamiento-cabecera">
                <span><ClipboardList size={14} /> Equipos del levantamiento {elementos.length > 0 && `(${elementos.length})`}</span>
                {elementos.length > 1 && (
                  <button type="button" className="mt-link" onClick={alternarTodos}>
                    {todosElegidos ? 'Quitar selección' : 'Seleccionar todos'}
                  </button>
                )}
              </div>
              {cargandoElementos ? (
                <p className="mt-nota">Buscando los equipos de la propiedad...</p>
              ) : !elementos.length ? (
                <p className="mt-nota">Esta propiedad no tiene equipos en su levantamiento. Escribe el equipo abajo.</p>
              ) : (
                <>
                  <div className="mt-levantamiento">
                    {elementos.map((el) => {
                      const agendado = agendadoPorElemento[el.id];
                      const proxima = agendado && proximaFecha(agendado);
                      const elegido = form.elegidos.includes(el.id);
                      const datos = [el.category, el.model_or_color].filter(Boolean).join(' · ');
                      return (
                        <button
                          key={el.id}
                          type="button"
                          className={`mt-renglon ${elegido ? 'on' : ''} ${agendado && !elegido ? 'agendado' : ''}`}
                          onClick={() => alternarElemento(el.id)}
                          aria-pressed={elegido}
                          title={agendado ? 'Ya está en la agenda: si lo marcas, se reprograma' : 'Marcar para programar su mantenimiento'}
                        >
                          <span className="mt-casilla">{(elegido || agendado) && <Check size={15} />}</span>
                          <span className="mt-renglon-texto">
                            <strong>{el.label}</strong>
                            {datos && <small>{datos}</small>}
                            {agendado && (
                              <span className={`mt-restante ${proxima ? (proxima < hoy ? 'vencido' : 'a-tiempo') : 'sin-fecha'}`}>
                                {agendado.frecuencia_meses ? `${textoFrecuencia(agendado.frecuencia_meses)} · ` : ''}
                                {proxima ? `${proxima < hoy ? 'Vencido' : 'Próximo'}: ${textoFecha(proxima)}` : 'En la lista, sin fecha'}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-nota">
                    {varios
                      ? `${form.elegidos.length} marcado${form.elegidos.length > 1 ? 's' : ''}: quedan en la misma fecha y salen en una sola orden.${reprogramados ? ` ${reprogramados} ya estaba${reprogramados > 1 ? 'n' : ''} agendado${reprogramados > 1 ? 's' : ''} y se reprograma${reprogramados > 1 ? 'n' : ''}.` : ''}`
                      : 'Marca uno o varios equipos para programarlos juntos. Si no aparece, escríbelo abajo.'}
                  </p>
                </>
              )}
            </div>
          )}

          {!varios && (
            <div className="mt-fila">
              <label className="mt-campo mt-campo-equipo">
                <span>Equipo *</span>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="Ej. Aire acondicionado de la sala"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                />
              </label>
              <label className="mt-campo mt-campo-cantidad">
                <span>Cantidad</span>
                <input type="number" min="1" max="1000" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              </label>
            </div>
          )}

          {!varios && (
            <div className="mt-modo" role="tablist" aria-label="Cómo se agenda">
              <button type="button" role="tab" aria-selected={form.modo === 'periodo'} className={form.modo === 'periodo' ? 'on' : ''} onClick={() => setForm({ ...form, modo: 'periodo' })}>
                <Repeat size={15} /> Cada cierto tiempo
              </button>
              <button type="button" role="tab" aria-selected={form.modo === 'fecha'} className={form.modo === 'fecha' ? 'on' : ''} onClick={() => setForm({ ...form, modo: 'fecha' })}>
                <CalendarClock size={15} /> Una sola fecha
              </button>
            </div>
          )}

          {varios || form.modo === 'periodo' ? (
            <PeriodoMantenimiento
              idBase="mt-nuevo"
              frecuencia={form.frecuencia}
              ultimo={form.ultimo}
              onChange={({ frecuencia, ultimo }) => setForm({ ...form, frecuencia, ultimo })}
            />
          ) : (
            <div className="mt-campo">
              <span>Próximo mantenimiento *</span>
              <div className="mt-fecha">
                {ATAJOS_MESES.map((n) => {
                  const valor = dentroDeMeses(n);
                  return (
                    <button key={n} type="button" className={form.fecha === valor ? 'on' : ''} onClick={() => setForm({ ...form, fecha: valor })} aria-pressed={form.fecha === valor}>
                      En {n} meses
                    </button>
                  );
                })}
                <CampoFecha min={hoy} ariaLabel="Fecha del próximo mantenimiento" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
            </div>
          )}

          {!varios && (
            <>
              <label className="mt-campo">
                <span>Detalle (opcional)</span>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ej. Minisplit de 12,000 BTU, limpieza general"
                  value={form.detalle}
                  onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                />
              </label>

              <div className="mt-fotos">
                <CampoFoto etiqueta="Foto del equipo (opcional)" archivo={form.foto_equipo} onChange={(f) => setForm({ ...form, foto_equipo: f })} />
                <CampoFoto etiqueta="Tarjeta de datos (opcional)" archivo={form.foto_datos} onChange={(f) => setForm({ ...form, foto_datos: f })} />
              </div>
            </>
          )}

          <button type="submit" className="xp-btn-primary mt-guardar" disabled={guardando}>
            <Plus size={17} />
            {guardando
              ? 'Agendando...'
              : varios
                ? `Programar ${form.elegidos.length} equipo${form.elegidos.length > 1 ? 's' : ''}${proximaVarios ? ` · ${textoFecha(proximaVarios)}` : ''}`
                : 'Agendar'}
          </button>
        </form>

        <section className="xp-card xp-panel">
          <div className="mt-lista-cabecera">
            <h3 className="xp-panel-titulo"><Wrench size={18} /> Equipos agregados {equipos.length > 0 && `(${equipos.length})`}</h3>
            {equipos.length > 0 && (
              <label className="mt-buscador">
                <Search size={16} />
                <input type="search" placeholder="Buscar..." aria-label="Buscar equipo o propiedad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </label>
            )}
          </div>

          {cargando ? (
            <p className="mt-vacio">Cargando equipos...</p>
          ) : errorCarga ? (
            <p className="mt-vacio">No se pudo cargar la información. Recarga la página para intentarlo de nuevo.</p>
          ) : !equipos.length ? (
            <p className="mt-vacio">Todavía no has agregado equipos.</p>
          ) : !lista.length ? (
            <p className="mt-vacio">Ningún equipo coincide con la búsqueda.</p>
          ) : (
            <ul className="mt-lista">
              {lista.map((e) => {
                const proxima = proximaFecha(e);
                const vencida = proxima && proxima < hoy;
                return (
                  <li key={e.id} className="mt-item">
                    <button type="button" className="mt-item-abrir" onClick={() => navigate(`/detalle-propiedad/${e.property_id}`)} title="Abrir la propiedad">
                      {e.foto_equipo_url && <img src={e.foto_equipo_url} alt="" />}
                      <span className="mt-item-texto">
                        <strong>{nombreEquipo(e)}</strong>
                        <span>{nombrePropiedad(e.property)}</span>
                        {e.frecuencia_meses && (
                          <small className="mt-item-periodo">
                            <Repeat size={12} /> {textoFrecuencia(e.frecuencia_meses)}
                            {e.ultimo_mantenimiento && ` · último: ${textoFecha(e.ultimo_mantenimiento)}`}
                          </small>
                        )}
                        {e.detalle && <small>{e.detalle}</small>}
                      </span>
                      <ChevronRight size={18} className="mt-item-flecha" />
                    </button>

                    <span className={`mt-item-fecha ${vencida ? 'vencida' : ''} ${proxima ? '' : 'sin-fecha'}`}>
                      <CalendarClock size={15} />
                      {proxima ? `${vencida ? 'Vencido: ' : ''}${textoFecha(proxima)}` : 'Sin fecha'}
                    </span>

                    <button type="button" className="mt-btn-editar mt-btn-hecho" onClick={() => registrarRealizado(e)} title="Registrar que ya se realizó">
                      <CheckCircle2 size={15} /> Ya se hizo
                    </button>
                    <button type="button" className="mt-btn-editar" onClick={() => setEditando(e)}>
                      <Pencil size={15} /> Editar
                    </button>
                    <button type="button" className="mt-icono peligro" onClick={() => quitar(e)} aria-label={`Quitar ${nombreEquipo(e)}`}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {editando && (
        <ModalEditarMantenimiento
          equipo={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(actualizado) => setEquipos((prev) => prev.map((e) => (e.id === actualizado.id ? { ...e, ...actualizado } : e)))}
        />
      )}

      <ModalRegistroInmueble
        isOpen={registrandoPropiedad}
        onClose={() => setRegistrandoPropiedad(false)}
        onSuccess={propiedadRegistrada}
      />
    </div>
  );
};

export default VistaMantenimiento;
