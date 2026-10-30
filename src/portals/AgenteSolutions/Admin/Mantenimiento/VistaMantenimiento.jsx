import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CalendarClock, Camera, Check, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import Header from '../../../../components/Shared/Header';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ATAJOS_MESES = [3, 6, 12];
const FORM_VACIO = { property_id: '', tipo: '', cantidad: 1, detalle: '', fecha: '', foto_equipo: null, foto_datos: null };

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => aISO(new Date());

// Hoy + n meses; un fin de mes no se pasa al mes siguiente
const dentroDeMeses = (n) => {
  const hoy = new Date();
  const destino = new Date(hoy.getFullYear(), hoy.getMonth() + n, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(hoy.getDate(), ultimoDia));
  return aISO(destino);
};

const textoFecha = (iso) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return y ? `${d} ${MESES[m - 1]} ${y}` : '';
};

const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nombreEquipo = (e) => (e.cantidad > 1 ? `${e.cantidad} × ${e.tipo}` : e.tipo);
const nombrePropiedad = (p) => p?.property_name || p?.address || 'Propiedad';
const proximaFecha = (e) => e.visits?.[0]?.fecha_programada?.slice(0, 10) || null;

const avisoError = (title, error) => Swal.fire({
  icon: 'error',
  title,
  text: error.response?.data?.error || error.response?.data?.message || 'Intenta de nuevo.',
  confirmButtonColor: '#f26522',
});

const CampoFoto = ({ etiqueta, archivo, onChange }) => {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  return (
    <label className={`mt-foto ${vista ? 'con-foto' : ''}`}>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value = ''; }}
      />
      {vista ? <img src={vista} alt={etiqueta} /> : <Camera size={20} />}
      <span>{etiqueta}</span>
    </label>
  );
};

// Sin levantamiento: se agrega el equipo y la fecha de su próximo mantenimiento, y queda en la agenda.
const VistaMantenimiento = () => {
  const [propiedades, setPropiedades] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null); // { id, fecha }

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

  // Primero lo más próximo; los que no tienen fecha pendiente, al final
  const lista = useMemo(() => {
    const texto = normalizar(busqueda);
    return equipos
      .filter((e) => !texto || normalizar(`${e.tipo} ${e.detalle} ${e.property?.property_name} ${e.property?.address}`).includes(texto))
      .sort((a, b) => (proximaFecha(a) || '9999').localeCompare(proximaFecha(b) || '9999'));
  }, [equipos, busqueda]);

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

  const guardarFecha = async () => {
    if (!editando?.fecha) return;
    try {
      const { data } = await axios.put(`${API}/mantenimiento/equipos/${editando.id}/fecha`, { fecha: editando.fecha }, { headers: authHeaders() });
      setEquipos((prev) => prev.map((e) => (e.id === editando.id ? { ...e, visits: data.equipo.visits } : e)));
      setEditando(null);
    } catch (error) {
      avisoError('No se pudo cambiar la fecha', error);
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
            <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} disabled={cargando}>
              <option value="">{cargando ? 'Cargando propiedades...' : 'Selecciona la propiedad...'}</option>
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
              <input type="date" min={hoy} aria-label="Fecha del próximo mantenimiento" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
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
            <Plus size={17} /> {guardando ? 'Agregando...' : 'Agregar a la agenda'}
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
                const enEdicion = editando?.id === e.id;
                return (
                  <li key={e.id} className="mt-item">
                    {e.foto_equipo_url && <img src={e.foto_equipo_url} alt="" />}
                    <div className="mt-item-texto">
                      <strong>{nombreEquipo(e)}</strong>
                      <span>{nombrePropiedad(e.property)}</span>
                      {e.detalle && <small>{e.detalle}</small>}
                    </div>

                    {enEdicion ? (
                      <div className="mt-item-editar">
                        <input type="date" min={hoy} aria-label="Nueva fecha" value={editando.fecha} onChange={(ev) => setEditando({ ...editando, fecha: ev.target.value })} />
                        <button type="button" className="mt-icono guardar" onClick={guardarFecha} aria-label="Guardar fecha"><Check size={16} /></button>
                        <button type="button" className="mt-icono" onClick={() => setEditando(null)} aria-label="Cancelar"><X size={16} /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`mt-item-fecha ${vencida ? 'vencida' : ''} ${proxima ? '' : 'sin-fecha'}`}
                        onClick={() => setEditando({ id: e.id, fecha: proxima && !vencida ? proxima : '' })}
                        title="Cambiar fecha"
                      >
                        <CalendarClock size={15} />
                        {proxima ? `${vencida ? 'Vencido: ' : ''}${textoFecha(proxima)}` : 'Poner siguiente fecha'}
                      </button>
                    )}

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
    </div>
  );
};

export default VistaMantenimiento;
