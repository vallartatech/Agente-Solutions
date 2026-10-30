import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, ChevronRight, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import ModalRegistroInmueble from '../../../../components/Shared/ModalRegistroInmueble';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { CampoFecha, CampoFoto, dentroDeMeses, hoyISO, nombreEquipo, porFecha, proximaFecha, textoFecha } from './CamposMantenimiento';
import ModalEditarMantenimiento from './ModalEditarMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const ATAJOS_MESES = [3, 6, 12];
// Opción de la lista que abre el registro completo de la propiedad
const REGISTRAR_PROPIEDAD = 'registrar';
const FORM_VACIO = { property_id: '', tipo: '', cantidad: 1, detalle: '', fecha: '', foto_equipo: null, foto_datos: null };

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nombrePropiedad = (p) => p?.property_name || p?.address || 'Propiedad';

const avisoError = (title, error) => Swal.fire({
  icon: 'error',
  title,
  text: error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.',
  confirmButtonColor: '#f26522',
});

// Sin levantamiento: se agrega el equipo y la fecha de su próximo mantenimiento, y queda en la agenda.
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

  const elegirPropiedad = (valor) => {
    if (valor === REGISTRAR_PROPIEDAD) setRegistrandoPropiedad(true);
    else setForm((f) => ({ ...f, property_id: valor }));
  };

  // Al registrar una propiedad nueva queda elegida en el formulario
  const propiedadRegistrada = async (creada) => {
    if (creada?.id) setForm((f) => ({ ...f, property_id: String(creada.id) }));
    try {
      const { data } = await axios.get(`${API}/mantenimiento/propiedades`, { headers: authHeaders() });
      setPropiedades(data || []);
    } catch {
      Swal.fire({ icon: 'warning', title: 'Propiedad registrada', text: 'Recarga la página para verla en la lista.', confirmButtonColor: '#f26522' });
    }
  };

  const agregar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    if (!form.property_id || !form.tipo.trim() || !form.fecha) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Indica la propiedad, el equipo y la fecha del próximo mantenimiento.', confirmButtonColor: '#f26522' });
      return;
    }

    const fd = new FormData();
    fd.append('property_id', form.property_id);
    fd.append('tipo', form.tipo.trim());
    fd.append('cantidad', form.cantidad || 1);
    fd.append('fecha', form.fecha);
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
      Swal.fire({ icon: 'success', title: '¡Agregado!', text: `Mantenimiento de ${form.tipo.trim()} en la agenda para el ${textoFecha(form.fecha)}.`, timer: 2400, showConfirmButton: false });
    } catch (error) {
      avisoError('No se pudo agregar', error);
    } finally {
      setGuardando(false);
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

          <button type="submit" className="xp-btn-primary mt-guardar" disabled={guardando}>
            <Plus size={17} /> {guardando ? 'Agendando...' : 'Agendar'}
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
                        {e.detalle && <small>{e.detalle}</small>}
                      </span>
                      <ChevronRight size={18} className="mt-item-flecha" />
                    </button>

                    <span className={`mt-item-fecha ${vencida ? 'vencida' : ''} ${proxima ? '' : 'sin-fecha'}`}>
                      <CalendarClock size={15} />
                      {proxima ? `${vencida ? 'Vencido: ' : ''}${textoFecha(proxima)}` : 'Sin fecha'}
                    </span>

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
