import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  X, FileText, Home, Wrench, MessageSquare, Camera, ImageIcon, PlusCircle,
  Users, User, ClipboardList, Hammer, ChevronRight, CheckCircle2, CalendarClock
} from 'lucide-react';
import { API, authHeaders } from './flujoTrabajo';
import PanelEquiposSolicitud from '../Mantenimiento/PanelEquiposSolicitud';
import '../../../../styles/AgenteSolutions/Admin/VistaPropiedades.css';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';
import '../../../../styles/Shared/LiquidGlass.css';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

// Solicitud de trabajo o de levantamiento para una propiedad, asignada a técnicos (rol 2) y/o admins (rol 1).
// Si se eligen varias personas, forman una cuadrilla: la primera elegida es la responsable.
// Reutiliza el diseño "Reportar Problema" (rp-*) de Propiedades.
const FORM_VACIO = { tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [], supervisor: '', fecha: '', hora: '' };

const sesion = () => {
  try {
    return JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData || {};
  } catch {
    return {};
  }
};

// Solo root (0) y administrador (1) programan la visita desde aquí
const esAdministrador = () => [0, 1].includes(Number(sesion().role_id));

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Id del registro recién creado, si la API lo devuelve
const idCreado = (d = {}) => d.id || d.work_order_id || d.workOrderId || d.service_id || d.servicio_id || d.insertId || d.data?.id;

const ModalNuevaSolicitud = ({ propiedad, onClose, onCreada }) => {
  const [modo, setModo] = useState('trabajo');
  const [form, setForm] = useState(FORM_VACIO);
  const [tecnicoIds, setTecnicoIds] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);
  const [zonas, setZonas] = useState([]);
  const [cargandoZonas, setCargandoZonas] = useState(true);
  const [equipos, setEquipos] = useState({});
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [menuFoto, setMenuFoto] = useState(false);
  const [carrito, setCarrito] = useState([]); // equipos elegidos para un mantenimiento
  const [panelEquiposAbierto, setPanelEquiposAbierto] = useState(false); // solo aplica en responsivo
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const navigate = useNavigate();
  const esAdmin = esAdministrador();
  const mostrarEquipos = esAdmin && modo === 'trabajo' && form.tipo === 'Mantenimiento';
  const conCarrito = mostrarEquipos && carrito.length > 0;

  useEffect(() => {
    const headers = authHeaders();
    const miId = String(sesion().id ?? '');
    // Técnicos y admins, sin quien está solicitando; primero los técnicos
    axios.get(`${API}/usuarios`, { headers })
      .then((res) => (res.data || []).filter((u) => [1, 2].includes(Number(u.role_id))))
      .catch(() => axios.get(`${API}/usuarios/tecnicos`, { headers }).then((r) => r.data || []))
      .then((lista) => setTecnicos(lista
        .map((u) => ({ ...u, id: String(u.id).replace(/^u_/, '') }))
        .filter((u) => u.id !== miId)
        .sort((a, b) => Number(b.role_id) - Number(a.role_id))))
      .catch(() => setTecnicos([]))
      .finally(() => setCargandoTecnicos(false));

    axios.get(`${API}/properties/${propiedad.id}/areas`, { headers })
      .then((res) => setZonas(res.data || []))
      .catch(() => setZonas([]))
      .finally(() => setCargandoZonas(false));
  }, [propiedad.id]);

  const cambiarZona = async (areaId) => {
    if (areaId === 'otro') {
      setForm((f) => ({ ...f, area_id: 'otro', zona: 'Otro', equipo: '' }));
      setEquipos({});
      return;
    }
    let area = zonas.find((z) => z.id === parseInt(areaId));
    if (!area) {
      for (const z of zonas) {
        const sub = (z.sub_areas || z.subAreas || []).find((s) => s.id === parseInt(areaId));
        if (sub) { area = { ...sub, name: `${z.name} - ${sub.name}` }; break; }
      }
    }
    setForm((f) => ({ ...f, area_id: areaId, zona: area ? area.name : '', equipo: '' }));
    setEquipos({});
    if (!areaId) return;

    setCargandoEquipos(true);
    try {
      const res = await axios.get(`${API}/areas/${areaId}/components`, { headers: authHeaders() });
      setEquipos((res.data || []).reduce((acc, c) => {
        const cat = c.category || 'General';
        (acc[cat] = acc[cat] || []).push(c);
        return acc;
      }, {}));
    } catch {
      setEquipos({});
    } finally {
      setCargandoEquipos(false);
    }
  };

  const agregarFotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setForm((f) => ({ ...f, fotos: [...f.fotos, ...files].slice(0, 2) }));
    e.target.value = '';
  };

  // El administrador registra él mismo las zonas de la propiedad
  const realizarLevantamientoPropio = () => {
    const curp = propiedad.custom_curp || propiedad.curp || '';
    localStorage.setItem('current_property_id', propiedad.id);
    window.dispatchEvent(new Event('sync-agente-ids'));
    onClose();
    navigate(`/RegistroZonas/${encodeURIComponent(curp)}`, { state: { id: propiedad.id, curp, nombre: propiedad.property_name || propiedad.nombre_propiedad || '' } });
  };

  const toggleTecnico = (id) =>
    setTecnicoIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const nombresEquipo = () => {
    const nombres = tecnicoIds
      .map((id) => tecnicos.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => `${t.first_name || ''} ${t.last_name || ''}`.trim());
    return nombres.length ? nombres.join(', ') : null;
  };

  // Si la API no devolvió el id, se toma el registro más reciente del expediente
  const buscarCreado = async (kind) => {
    try {
      const res = await axios.get(`${API}/propiedades/${propiedad.id}/expediente`, { headers: authHeaders() });
      const t = (res.data?.trabajos || [])
        .filter((x) => (kind === 'levantamiento') === (x.kind === 'levantamiento'))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      return t ? (t.id || t.db_id || Number(String(t.uid).match(/\d+$/)?.[0]) || null) : null;
    } catch {
      return null;
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (modo === 'trabajo' && (!form.tipo || (!conCarrito && !form.area_id) || !form.descripcion.trim())) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: conCarrito ? 'Completa la descripción.' : 'Completa el tipo, la zona y la descripción.', confirmButtonColor: '#f26522' });
      return;
    }
    // La visita se refleja en el calendario: el administrador siempre la programa
    if (esAdmin && (!form.fecha || !form.hora)) {
      Swal.fire({ icon: 'warning', title: 'Falta la fecha u hora', text: 'Indica la fecha y la hora de la visita para que aparezca en el calendario.', confirmButtonColor: '#f26522' });
      return;
    }

    setEnviando(true);
    try {
      const ids = tecnicoIds.map(Number);
      const idTec = ids[0] || null;
      const headers = authHeaders();
      const visita = esAdmin && form.fecha && form.hora ? `${form.fecha} ${form.hora}` : null;
      let sinProgramar = false;
      if (modo === 'trabajo') {
        const fd = new FormData();
        fd.append('property_id', propiedad.id);
        fd.append('type', form.tipo);
        if (conCarrito) {
          const etiquetas = carrito.map((r) => r.label).join(', ');
          fd.append('zone', carrito.length === 1 && carrito[0].area ? carrito[0].area : 'Varias zonas');
          fd.append('equipment', etiquetas.length > 150 ? `${etiquetas.slice(0, 149)}…` : etiquetas);
          fd.append('description', `${form.descripcion}\n\n[EQUIPO AFECTADO]: ${etiquetas}`);
          carrito.forEach((r) => fd.append(r.tipo === 'equipo' ? 'equipo_ids[]' : 'component_ids[]', r.id));
        } else {
          fd.append('zone', form.zona);
          fd.append('equipment', form.equipo || '');
          fd.append('description', form.equipo
            ? `${form.descripcion}\n\n[EQUIPO AFECTADO]: ${form.equipo}`
            : form.descripcion);
        }
        if (idTec) fd.append('tecnico_id', idTec);
        form.fotos.forEach((foto, i) => fd.append(`evidence_${i + 1}`, foto));
        const res = await axios.post(`${API}/work-orders/cliente`, fd, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        // Cuadrilla y visita en una sola llamada (mismo endpoint que el tablero de servicios):
        // notifica a cada integrante como asignado. En dos llamadas, la de la fecha
        // se tomaba como reprogramación y llegaba un segundo aviso.
        if (ids.length > 1 || visita) {
          const ordenId = idCreado(res.data) || await buscarCreado('trabajo');
          if (ordenId) {
            await axios.put(`${API}/work-orders/${ordenId}/assign`, {
              ...(ids.length && { tecnicos_ids: ids }),
              ...(visita && { scheduled_at: visita }),
            }, { headers });
          } else {
            sinProgramar = true;
          }
        }
      } else {
        const tec = nombresEquipo();
        const res = await axios.post(`${API}/servicios`, {
          property_id: propiedad.id,
          title: 'Levantamiento Inicial',
          description: form.descripcion.trim() ||
            `Solicitud de visita técnica para registro inicial de la propiedad.${tec ? ` Técnico asignado: ${tec}` : ''}`,
          priority: 'Media',
          supervisor_name: form.supervisor.trim() || tec || 'El propietario',
          technician_id: idTec,
          tecnico_id: idTec,
          ...(visita && { scheduled_start: `${visita}:00` }),
        }, { headers });
        // Misma agenda que la vista de Levantamientos
        if (visita) {
          const servicioId = idCreado(res.data) || await buscarCreado('levantamiento');
          if (servicioId) {
            await axios.put(`${API}/servicios/${servicioId}/asignar`, { tecnico_id: idTec, scheduled_start: `${visita}:00` }, { headers });
          } else {
            sinProgramar = true;
          }
        }
        // Los demás técnicos se suman al equipo del levantamiento
        for (const extra of ids.slice(1)) {
          await axios.post(`${API}/propiedades/${propiedad.id}/equipo-levantamiento`, { technician_id: extra }, { headers });
        }
      }

      Swal.fire({
        icon: 'success',
        title: modo === 'trabajo' ? '¡Trabajo solicitado!' : '¡Levantamiento solicitado!',
        text: [
          idTec ? `Se asignó a ${nombresEquipo()}.` : 'Puedes asignar un técnico después desde Servicios.',
          visita && !sinProgramar && `Visita programada: ${new Date(`${form.fecha}T${form.hora}`).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}.`,
          sinProgramar && 'No se pudo completar la asignación o la agenda; revísala desde Servicios.',
        ].filter(Boolean).join(' '),
        confirmButtonColor: '#f26522',
      });
      onCreada?.();
      onClose();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar',
        text: error.response?.data?.message || 'Hubo un error al crear la solicitud.',
        confirmButtonColor: '#f26522',
      });
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <>
      <div className="rp-overlay" onClick={onClose}>
        <div className={`mt-solicitud ${mostrarEquipos ? 'con-equipos' : ''}`}>
        <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="rp-header">
            <div className="rp-header-text">
              <span className="rp-tag">NUEVA SOLICITUD</span>
              <h2 className="rp-title">{modo === 'trabajo' ? 'Solicitar Trabajo' : 'Solicitar Levantamiento'}</h2>
            </div>
            <button type="button" className="rp-close" onClick={onClose} aria-label="Cerrar">
              <X size={18} color="#ffffff" strokeWidth={2.6} />
            </button>
          </div>

          <form className="rp-form" onSubmit={enviar}>
            <div className="xp-seg" role="tablist">
              <button type="button" className={modo === 'trabajo' ? 'on' : ''} onClick={() => setModo('trabajo')}>
                <Hammer size={15} /> Trabajo
              </button>
              <button type="button" className={modo === 'levantamiento' ? 'on' : ''} onClick={() => setModo('levantamiento')}>
                <ClipboardList size={15} /> Levantamiento
              </button>
            </div>

            <p className="xp-rp-propiedad">
              <Home size={15} color="#ff8c42" />
              {propiedad.property_name || propiedad.nombre_propiedad || propiedad.address}
            </p>

            {modo === 'levantamiento' && (
              <>
                <button type="button" className="xp-rp-propio" onClick={realizarLevantamientoPropio}>
                  <span className="xp-rp-propio-icon"><Camera size={20} /></span>
                  <span className="xp-rp-propio-texto">
                    <strong>{zonas.length ? 'Editar mi levantamiento' : 'Realizar mi propio levantamiento'}</strong>
                    <span>Registra tú mismo las zonas y equipos de la propiedad.</span>
                  </span>
                  <ChevronRight size={18} />
                </button>
                <span className="xp-rp-separador">o solicítalo a un técnico</span>
              </>
            )}

            <div className="xp-equipo">
              <label className="rp-label">
                <Users size={16} color="#ff8c42" /> Equipo de trabajo <span className="xp-equipo-hint">(Selecciona uno o más)</span>
              </label>
              {cargandoTecnicos ? (
                <p className="xp-equipo-vacio">Cargando equipo...</p>
              ) : !tecnicos.length ? (
                <p className="xp-equipo-vacio">No hay técnicos ni administradores disponibles.</p>
              ) : (
                <div className="xp-equipo-grid">
                  {tecnicos.map((t) => {
                    const on = tecnicoIds.includes(t.id);
                    const lider = tecnicoIds.length > 1 && tecnicoIds[0] === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`xp-equipo-card ${on ? 'on' : ''}`}
                        onClick={() => toggleTecnico(t.id)}
                        aria-pressed={on}
                        title={`${t.first_name || ''} ${t.last_name || ''}`.trim()}
                      >
                        {t.profile_picture_url ? (
                          <img
                            src={t.profile_picture_url}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <span className="xp-equipo-iniciales" style={{ display: t.profile_picture_url ? 'none' : 'flex' }}>
                          {t.first_name?.charAt(0)}{t.last_name?.charAt(0)}
                        </span>
                        <span className="xp-equipo-nombre">{t.first_name} {t.last_name ? `${t.last_name.charAt(0)}.` : ''}</span>
                        <span className={`xp-equipo-rol ${lider ? 'lider' : ''}`}>
                          {lider ? 'Responsable' : Number(t.role_id) === 1 ? 'Admin' : 'Técnico'}
                        </span>
                        {on && <CheckCircle2 size={17} className="xp-equipo-check" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {!cargandoTecnicos && tecnicos.length > 0 && !tecnicoIds.length && (
                <small className="xp-equipo-nota">Sin asignar por ahora: puedes asignarlo después desde Servicios.</small>
              )}
              {tecnicoIds.length > 1 && (
                <small className="xp-equipo-nota xp-equipo-cuadrilla">
                  <Users size={13} /> Cuadrilla de {tecnicoIds.length} personas. Todas recibirán la notificación;
                  la primera que elegiste queda como responsable.
                </small>
              )}
            </div>

            {esAdmin && (
              <div className="xp-equipo">
                <label className="rp-label">
                  <CalendarClock size={16} color="#ff8c42" /> Programar visita *
                </label>
                <div className="xp-visita">
                  <label>
                    <span>Fecha</span>
                    <input
                      type="date"
                      className="xp-rp-input"
                      required
                      min={hoyISO()}
                      value={form.fecha}
                      onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Hora</span>
                    <input
                      type="time"
                      required
                      className="xp-rp-input"
                      value={form.hora}
                      onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            )}

            {modo === 'trabajo' ? (
              <>
                <div className="rp-group">
                  <label className="rp-label"><FileText size={16} color="#ff8c42" /> Tipo de servicio *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="">Selecciona el tipo...</option>
                    <option value="Mantenimiento">Mantenimiento Preventivo</option>
                    <option value="Problema">Problema / Reparación</option>
                    <option value="SOS">SOS / Urgente</option>
                  </select>
                </div>

                {conCarrito ? (
                  <p className="mt-solicitud-nota">
                    <CheckCircle2 size={15} /> {carrito.length} {carrito.length === 1 ? 'equipo elegido' : 'equipos elegidos'}: {carrito.map((r) => r.label).join(', ')}
                  </p>
                ) : (
                <>
                <div className="rp-group">
                  <label className="rp-label"><Home size={16} color="#ff8c42" /> Zona de la propiedad *</label>
                  <select required value={form.area_id} onChange={(e) => cambiarZona(e.target.value)} disabled={cargandoZonas}>
                    <option value="">{cargandoZonas ? 'Cargando zonas...' : 'Seleccionar zona...'}</option>
                    {zonas.map((z) => {
                      const subs = z.sub_areas || z.subAreas || [];
                      return subs.length ? (
                        <optgroup key={`g-${z.id}`} label={z.name.toUpperCase()}>
                          <option value={z.id}>{z.name} (Área General)</option>
                          {subs.map((s) => <option key={`s-${s.id}`} value={s.id}>{s.name}</option>)}
                        </optgroup>
                      ) : (
                        <option key={`z-${z.id}`} value={z.id}>{z.name}</option>
                      );
                    })}
                    <option value="otro">Otro (No está en la lista)</option>
                  </select>
                </div>

                <div className="rp-group">
                  <label className="rp-label"><Wrench size={16} color="#ff8c42" /> Equipo afectado (Opcional)</label>
                  <select
                    value={form.equipo}
                    disabled={!form.area_id || cargandoEquipos}
                    onChange={(e) => setForm({ ...form, equipo: e.target.value })}
                  >
                    <option value="">
                      {!form.area_id ? 'Primero selecciona una zona' : cargandoEquipos ? 'Cargando equipos...' : 'Seleccionar equipo...'}
                    </option>
                    {Object.entries(equipos).map(([cat, items]) => (
                      <optgroup key={cat} label={cat.toUpperCase()}>
                        {items.map((it) => (
                          <option key={it.id} value={`${it.sub_category} ${it.brand ? `(${it.brand})` : ''}`}>
                            {it.sub_category} {it.brand ? `(${it.brand})` : ''} {it.model_or_color ? `- ${it.model_or_color}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="otro">Otro (No está en la lista)</option>
                  </select>
                </div>
                </>
                )}
              </>
            ) : (
              <div className="rp-group">
                <label className="rp-label"><User size={16} color="#ff8c42" /> Supervisor en sitio (Opcional)</label>
                <input
                  type="text"
                  className="xp-rp-input"
                  placeholder="Ej. Juan Pérez (Conserje)"
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                />
              </div>
            )}

            <div className="rp-group">
              <label className="rp-label">
                <MessageSquare size={16} color="#ff8c42" /> Descripción {modo === 'trabajo' ? '*' : '(Opcional)'}
              </label>
              <textarea
                required={modo === 'trabajo'}
                rows="3"
                placeholder={modo === 'trabajo' ? 'Describe detalladamente el trabajo...' : 'Indicaciones para el levantamiento...'}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            {modo === 'trabajo' && (
              <div className="rp-group">
                <label className="rp-label"><Camera size={16} color="#ff8c42" /> Evidencia visual (Máx 2 fotos)</label>
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={agregarFotos} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={agregarFotos} />
                <div className="xp-rp-fotos">
                  {form.fotos.map((foto, i) => (
                    <div key={i} className="xp-rp-foto">
                      <img src={URL.createObjectURL(foto)} alt="Evidencia" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                        aria-label="Quitar foto"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {form.fotos.length < 2 && (
                    <button type="button" className="xp-rp-foto-add" onClick={() => setMenuFoto(true)}>
                      <PlusCircle size={22} color="#ff8c42" />
                      <span>AÑADIR</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="rp-footer">
              <button type="submit" className="xp-btn-primary" disabled={enviando}>
                {enviando ? 'Enviando...' : modo === 'trabajo' ? 'Solicitar trabajo' : 'Solicitar levantamiento'}
              </button>
            </div>
          </form>
        </div>

        {mostrarEquipos && (
          <>
            <button
              type="button"
              className="mt-flecha-equipos"
              onClick={(e) => { e.stopPropagation(); setPanelEquiposAbierto(true); }}
              aria-label={`Elegir equipos${carrito.length ? `, ${carrito.length} elegidos` : ''}`}
            >
              <ChevronRight size={24} strokeWidth={2.6} />
              {carrito.length > 0 && <span className="mt-flecha-cuenta">{carrito.length}</span>}
            </button>
            {panelEquiposAbierto && <div className="mt-panel-fondo" onClick={(e) => { e.stopPropagation(); setPanelEquiposAbierto(false); }} />}
            <PanelEquiposSolicitud
              propiedad={propiedad}
              carrito={carrito}
              onChange={setCarrito}
              abierto={panelEquiposAbierto}
              onCerrar={() => setPanelEquiposAbierto(false)}
            />
          </>
        )}
        </div>
      </div>

      {menuFoto && (
        <div className="rp-overlay xp-rp-fuente" onClick={() => setMenuFoto(false)}>
          <div className="xp-rp-fuente-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleccionar origen</h3>
            <button type="button" onClick={() => { setMenuFoto(false); cameraRef.current?.click(); }}>
              <Camera size={19} color="#ff8c42" /> Tomar foto
            </button>
            <button type="button" onClick={() => { setMenuFoto(false); galleryRef.current?.click(); }}>
              <ImageIcon size={19} color="#ff8c42" /> Elegir de la galería
            </button>
            <button type="button" className="cancelar" onClick={() => setMenuFoto(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default ModalNuevaSolicitud;
