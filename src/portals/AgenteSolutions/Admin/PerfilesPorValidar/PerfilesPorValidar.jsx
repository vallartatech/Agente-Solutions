import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  ShieldCheck, Clock, RefreshCw, AlertCircle, Eye, X, Check, Ban, Phone, Mail, IdCard, Receipt,
  Wrench, GraduationCap, Briefcase, Award, Loader2, FileText, MessageSquare, History,
  Cake, CalendarDays, UserRound, FolderCheck, ZoomIn, ZoomOut, Download, Maximize2,
} from 'lucide-react';
import { mostrarAviso, confirmarAccion } from '../../../../utils/dialogos';
import '../../../../styles/AgenteSolutions/Admin/PerfilesPorValidar.css';

// Validación de los perfiles profesionales de los técnicos de la red (roles 6 y 8): Root y Admin.
// Copia propia de Agente Solutions: no usa archivos de AgenteMarket.

const API = import.meta.env.VITE_API_BASE_URL;

const FILTROS = [
  { clave: 'en_revision', texto: 'Por revisar' },
  { clave: 'rechazado', texto: 'Rechazados' },
  { clave: 'aprobado', texto: 'Validados' },
  { clave: 'todos', texto: 'Todos' },
];

const ESTADOS = {
  incompleto: { texto: 'Sin enviar', clase: 'gris' },
  en_revision: { texto: 'Por revisar', clase: 'naranja' },
  aprobado: { texto: 'Validado', clase: 'verde' },
  rechazado: { texto: 'Rechazado', clase: 'rojo' },
};

const ROLES = { 6: 'Técnico independiente', 8: 'Técnico de cuadrilla' };

// Motivos frecuentes: se pueden tocar y editar antes de enviar
const MOTIVOS_RAPIDOS = [
  'La foto de la INE está borrosa o con reflejos.',
  'El nombre de la INE no coincide con el de la cuenta.',
  'Falta un lado de la INE o está cortada.',
  'El titular de la cuenta bancaria no coincide con el técnico.',
  'El RFC o la razón social no coinciden.',
  'La presentación no describe su experiencia.',
  'El comprobante de domicilio no es legible o tiene más de 3 meses.',
  'La constancia de antecedentes no penales no es legible o no está vigente.',
  'Falta una foto de perfil clara de su cara.',
];

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fechaCorta = (iso) => (iso ? new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
const edadDe = (iso) => {
  if (!iso) return null;
  const n = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e -= 1;
  return e;
};
const esUrl = (u) => String(u || '').startsWith('http');
const siNo = (v) => (v === true ? 'Sí' : v === false ? 'No' : '—');
const telefono10 = (t) => String(t || '').replace(/\D/g, '').slice(-10);
const formatoClabe = (c) => {
  const d = String(c || '').replace(/\D/g, '');
  return d ? [d.slice(0, 3), d.slice(3, 6), d.slice(6, 17), d.slice(17)].filter(Boolean).join(' ') : '—';
};

/** Archivo privado (INE / diploma) pedido con la sesión: devuelve { url, pdf } local. */
const archivoPrivado = async (userId, tipo, cursoId = null) => {
  const res = await axios.get(`${API}/perfil-profesional/${userId}/archivo/${tipo}${cursoId ? `/${cursoId}` : ''}`, { responseType: 'blob' });
  return { url: URL.createObjectURL(res.data), pdf: res.data.type === 'application/pdf' };
};

const mensajeError = (err, porDefecto) => {
  const d = err?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || d?.error || porDefecto;
};

/**
 * Visor dentro de la app para fotos y PDF (INE, documentos, diplomas, foto de perfil).
 * Va en el body por encima de la revisión; Escape o el fondo lo cierran sin cerrar la revisión.
 */
const Visor = ({ archivo, onCerrar }) => {
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCerrar();
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => window.removeEventListener('keydown', alTeclear, true);
  }, [onCerrar]);

  // Los clics no deben llegar a la ventana de revisión (en React el portal sigue dentro de su árbol)
  const detener = (e) => e.stopPropagation();
  const nombreDescarga = `${archivo.titulo.replace(/[^\w\u00C0-\u017F]+/g, '_')}${archivo.pdf ? '.pdf' : '.jpg'}`;

  return createPortal(
    <div className="vpp-visor" onClick={(e) => { detener(e); onCerrar(); }} role="dialog" aria-modal="true" aria-label={archivo.titulo}>
      <div className="vpp-visor-barra" onClick={detener}>
        <strong>{archivo.titulo}</strong>
        <div className="vpp-visor-acciones">
          {!archivo.pdf && (
            <button type="button" onClick={() => setAmpliada(a => !a)} aria-label={ampliada ? 'Ajustar a la pantalla' : 'Ver tamaño real'} title={ampliada ? 'Ajustar a la pantalla' : 'Ver tamaño real'}>
              {ampliada ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>
          )}
          <a href={archivo.url} download={nombreDescarga} aria-label="Descargar" title="Descargar"><Download size={18} /></a>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
      </div>
      <div className={`vpp-visor-cuerpo ${ampliada ? 'ampliada' : ''}`} onClick={(e) => { detener(e); if (e.target === e.currentTarget) onCerrar(); }}>
        {archivo.pdf
          ? <iframe src={archivo.url} title={archivo.titulo} onClick={detener} />
          : <img src={archivo.url} alt={archivo.titulo} onClick={(e) => { detener(e); setAmpliada(a => !a); }} />}
      </div>
    </div>,
    document.body
  );
};

/** Foto de un lado de la INE o un documento (o PDF); al tocarla se abre en el visor. */
const FotoIne = ({ userId, tipo, titulo, existe, onVer }) => {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!existe) return undefined;
    let actual = null;
    let cancelado = false;
    archivoPrivado(userId, tipo)
      .then((a) => { actual = a; if (!cancelado) setArchivo(a); })
      .catch((err) => !cancelado && setError(err?.response?.status === 404 ? 'El archivo no está en este servidor' : 'No se pudo cargar'));
    return () => { cancelado = true; if (actual) URL.revokeObjectURL(actual.url); };
  }, [userId, tipo, existe]);

  return (
    <figure className="vpp-ine">
      <figcaption>{titulo}</figcaption>
      {!existe ? (
        <div className="vpp-ine-vacio falta">No la subió</div>
      ) : error ? (
        <div className="vpp-ine-vacio falta"><AlertCircle size={20} /> {error}</div>
      ) : !archivo ? (
        <div className="vpp-ine-vacio"><Loader2 size={20} className="vpp-girar" /></div>
      ) : archivo.pdf ? (
        <button type="button" className="vpp-ine-vacio vpp-ver" onClick={() => onVer({ ...archivo, titulo })}><FileText size={22} /> Ver PDF</button>
      ) : (
        <button type="button" className="vpp-ver" onClick={() => onVer({ ...archivo, titulo })} title="Ver en grande">
          <img src={archivo.url} alt={titulo} />
          <span className="vpp-ver-icono"><Maximize2 size={14} /></span>
        </button>
      )}
    </figure>
  );
};

/** Detalle completo de un técnico para revisar y aprobar o rechazar. */
const DetalleRevision = ({ userId, onCerrar, onResuelto }) => {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [estudiosOk, setEstudiosOk] = useState(true);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [visor, setVisor] = useState(null); // { url, pdf, titulo, liberar }

  const cerrarVisor = useCallback(() => {
    setVisor((v) => {
      if (v?.liberar) URL.revokeObjectURL(v.url);
      return null;
    });
  }, []);

  useEffect(() => {
    axios.get(`${API}/admin/perfiles-profesionales/${userId}`)
      .then((res) => setP(res.data.data))
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el perfil.')));
  }, [userId]);

  const verDiploma = async (cursoId) => {
    try {
      const a = await archivoPrivado(userId, 'curso', cursoId);
      const curso = p?.cursos?.find(c => c.id === cursoId);
      setVisor({ ...a, titulo: curso ? `Diploma · ${curso.nombre}` : 'Diploma', liberar: true });
    } catch {
      mostrarAviso('No se pudo abrir el diploma.');
    }
  };

  const aprobar = async () => {
    if (!await confirmarAccion(`¿Validar el perfil de ${p.nombre}? ${p.bloqueado ? 'Podrá usar su cuenta y cotizar en la red de inmediato.' : 'Recuperará sus insignias de verificación.'}`)) return;
    setEnviando(true);
    try {
      await axios.post(`${API}/admin/perfiles-profesionales/${userId}/aprobar`, { estudios_verificados: estudiosOk });
      mostrarAviso(`✅ Perfil de ${p.nombre} validado. Le avisamos por notificación.`);
      onResuelto();
    } catch (err) {
      mostrarAviso(mensajeError(err, 'No se pudo aprobar.'));
    } finally {
      setEnviando(false);
    }
  };

  const rechazar = async () => {
    if (motivo.trim().length < 5) { mostrarAviso('Escribe qué debe corregir el técnico.'); return; }
    setEnviando(true);
    try {
      await axios.post(`${API}/admin/perfiles-profesionales/${userId}/rechazar`, { motivo: motivo.trim() });
      mostrarAviso(`Se le pidió a ${p.nombre} que corrija su perfil.`);
      onResuelto();
    } catch (err) {
      mostrarAviso(mensajeError(err, 'No se pudo enviar el rechazo.'));
    } finally {
      setEnviando(false);
    }
  };

  const agregarMotivo = (m) => setMotivo(prev => (prev.includes(m) ? prev : `${prev ? `${prev.trim()} ` : ''}${m}`));

  const estado = p ? (ESTADOS[p.estado] || ESTADOS.incompleto) : null;
  const faltantes = Object.values(p?.faltantes || {});
  const tel = telefono10(p?.telefono);

  // Puntos que revisa Root antes de validar (verde = completo)
  const revision = p ? [
    { clave: 'identidad', texto: 'Identidad', Icono: IdCard, ok: esUrl(p.foto) && Boolean(p.fecha_nacimiento) && p.tiene_ine_frente && p.tiene_ine_reverso },
    { clave: 'documentos', texto: 'Documentos', Icono: FolderCheck, ok: p.tiene_comprobante_domicilio && p.tiene_antecedentes_penales },
    { clave: 'cobro', texto: 'Cobro', Icono: Receipt, ok: Boolean(p.clabe && p.titular_cuenta) },
    { clave: 'habilidades', texto: 'Habilidades', Icono: Wrench, ok: (p.especialidades || []).length > 0 },
    { clave: 'curriculum', texto: 'Currículum', Icono: GraduationCap, ok: Boolean(p.nivel_estudios_texto && p.presentacion) },
  ] : [];

  const irA = (clave) => document.getElementById(`vpp-sec-${clave}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // En el body: así ningún encabezado fijo de la página queda encima del modal
  return createPortal(
    <div className="vpp-overlay" onClick={() => !enviando && onCerrar()}>
      <div className="vpp-modal" role="dialog" aria-modal="true" aria-label="Revisar perfil" onClick={(e) => e.stopPropagation()}>
        <div className="vpp-modal-scroll">
        <header className="vpp-ficha">
          <button type="button" className="vpp-cerrar" onClick={onCerrar} disabled={enviando} aria-label="Cerrar"><X size={20} /></button>
          <div className={`vpp-ficha-foto ${p && !esUrl(p.foto) ? 'sin-foto' : ''}`}>
            {p && esUrl(p.foto)
              ? <button type="button" className="vpp-ver" onClick={() => setVisor({ url: p.foto, pdf: false, titulo: `Foto de perfil · ${p.nombre}` })} title="Ver foto en grande"><img src={p.foto} alt={`Foto de ${p.nombre}`} /></button>
              : <span>{p ? <><UserRound size={30} /><small>Sin foto</small></> : <Loader2 size={26} className="vpp-girar" />}</span>}
          </div>
          <div className="vpp-ficha-info">
            <span className="vpp-kicker">Revisión de perfil profesional</span>
            <h2>{p?.nombre || 'Cargando…'}</h2>
            {p && (
              <>
                <div className="vpp-ficha-sub">
                  <span className={`vpp-estado ${estado.clase}`}>{estado.texto}</span>
                  <span>{ROLES[p.role_id] || 'Técnico de la red'}</span>
                  <span>ID {p.user_id}</span>
                </div>
                <dl className="vpp-ficha-datos">
                  <div>
                    <dt><Cake size={13} /> Edad</dt>
                    <dd className={p.fecha_nacimiento ? '' : 'falta'}>
                      {p.fecha_nacimiento ? `${edadDe(p.fecha_nacimiento)} años` : 'Sin registrar'}
                      {p.fecha_nacimiento && <small>{fechaCorta(p.fecha_nacimiento)}</small>}
                    </dd>
                  </div>
                  <div><dt><Phone size={13} /> Teléfono</dt><dd>{tel || '—'}</dd></div>
                  <div><dt><CalendarDays size={13} /> Registrado</dt><dd>{fechaCorta(p.registrado_at) || '—'}</dd></div>
                  <div className="ancho"><dt><Mail size={13} /> Correo</dt><dd title={p.email}>{p.email || '—'}</dd></div>
                  <div><dt><Clock size={13} /> Enviado</dt><dd>{fecha(p.enviado_at)}</dd></div>
                  {p.revisado_at && <div><dt><History size={13} /> Última revisión</dt><dd>{fecha(p.revisado_at)}</dd></div>}
                </dl>
                <div className="vpp-ficha-contacto">
                  {tel && <a href={`https://wa.me/521${tel}`} target="_blank" rel="noreferrer" className="wa"><MessageSquare size={15} /> WhatsApp</a>}
                  {tel && <a href={`tel:${tel}`}><Phone size={15} /> Llamar</a>}
                  {p.email && <a href={`mailto:${p.email}`}><Mail size={15} /> Correo</a>}
                </div>
              </>
            )}
          </div>
        </header>

        {p && (
          <nav className="vpp-pasos" aria-label="Puntos a revisar">
            {revision.map(({ clave, texto, Icono, ok }) => (
              <button key={clave} type="button" className={ok ? 'ok' : 'falta'} onClick={() => irA(clave)}>
                <Icono size={15} /> {texto} {ok ? <Check size={14} strokeWidth={3} /> : <AlertCircle size={14} />}
              </button>
            ))}
          </nav>
        )}

        <div className="vpp-modal-cuerpo">
          {error && <div className="vpp-alerta rojo"><AlertCircle size={16} /> {error}</div>}
          {!p && !error && <div className="vpp-cargando"><Loader2 size={24} className="vpp-girar" /> Cargando perfil…</div>}

          {p && (
            <>
              {p.estado === 'rechazado' && p.motivo_rechazo && (
                <div className="vpp-alerta rojo"><Ban size={16} /> <div><strong>Motivo del último rechazo:</strong> {p.motivo_rechazo}</div></div>
              )}
              {faltantes.length > 0 && (
                <div className="vpp-alerta naranja"><AlertCircle size={16} /> <div><strong>Le falta:</strong> {faltantes.join(', ')}.</div></div>
              )}

              <section className="vpp-bloque" id="vpp-sec-identidad">
                <h3><IdCard size={17} /> Identidad {p.insignias?.identidad_verificada && <span className="vpp-ok"><ShieldCheck size={14} /> Verificada</span>}</h3>
                <p className="vpp-nota">Compara la foto de perfil y el nombre con la INE: <strong>{p.nombre}</strong>{p.fecha_nacimiento ? <>, nacido el <strong>{fechaCorta(p.fecha_nacimiento)}</strong></> : ''}.</p>
                <div className="vpp-ines">
                  <figure className="vpp-ine vpp-ine-perfil">
                    <figcaption>Foto de perfil</figcaption>
                    {esUrl(p.foto)
                      ? (
                        <button type="button" className="vpp-ver" onClick={() => setVisor({ url: p.foto, pdf: false, titulo: `Foto de perfil · ${p.nombre}` })} title="Ver en grande">
                          <img src={p.foto} alt="Foto de perfil" />
                          <span className="vpp-ver-icono"><Maximize2 size={14} /></span>
                        </button>
                      )
                      : <div className="vpp-ine-vacio falta"><UserRound size={22} /> No la subió</div>}
                  </figure>
                  <FotoIne onVer={setVisor} userId={p.user_id} tipo="ine_frente" titulo="Frente" existe={p.tiene_ine_frente} />
                  <FotoIne onVer={setVisor} userId={p.user_id} tipo="ine_reverso" titulo="Reverso" existe={p.tiene_ine_reverso} />
                </div>
              </section>

              <section className="vpp-bloque" id="vpp-sec-documentos">
                <h3><FolderCheck size={17} /> Documentos</h3>
                <p className="vpp-nota">Revisa que el domicilio sea reciente (máximo 3 meses) y que la constancia de antecedentes esté vigente y a nombre de <strong>{p.nombre}</strong>.</p>
                <div className="vpp-docs">
                  <FotoIne onVer={setVisor} userId={p.user_id} tipo="comprobante_domicilio" titulo="Comprobante de domicilio" existe={p.tiene_comprobante_domicilio} />
                  <FotoIne onVer={setVisor} userId={p.user_id} tipo="antecedentes_penales" titulo="Antecedentes no penales" existe={p.tiene_antecedentes_penales} />
                </div>
              </section>

              <section className="vpp-bloque" id="vpp-sec-cobro">
                <h3><Receipt size={17} /> Cobro y facturación</h3>
                <dl className="vpp-datos">
                  <div><dt>Emite factura</dt><dd>{siNo(p.emite_factura)}</dd></div>
                  {p.emite_factura && <div><dt>RFC</dt><dd className="mono">{p.rfc || '—'}</dd></div>}
                  {p.emite_factura && <div><dt>Razón social</dt><dd>{p.razon_social || '—'}</dd></div>}
                  <div><dt>Banco</dt><dd>{p.banco || '—'}</dd></div>
                  <div><dt>Titular</dt><dd>{p.titular_cuenta || '—'}</dd></div>
                  <div><dt>CLABE</dt><dd className="mono">{formatoClabe(p.clabe)}</dd></div>
                  <div><dt>Acepta efectivo</dt><dd>{siNo(p.acepta_efectivo)}</dd></div>
                  <div><dt>Terminal para tarjeta</dt><dd>{siNo(p.tiene_terminal)}</dd></div>
                </dl>
              </section>

              <section className="vpp-bloque" id="vpp-sec-habilidades">
                <h3><Wrench size={17} /> Habilidades · {p.anios_experiencia ?? '—'} {p.anios_experiencia === 1 ? 'año' : 'años'} de experiencia</h3>
                <div className="vpp-chips">
                  {(p.especialidades || []).map(e => <span key={e.id}><Check size={13} strokeWidth={3} /> {e.name}</span>)}
                  {!p.especialidades?.length && <span className="vacio">Sin habilidades</span>}
                </div>
              </section>

              <section className="vpp-bloque" id="vpp-sec-curriculum">
                <h3><GraduationCap size={17} /> Currículum {p.insignias?.estudios_verificados && <span className="vpp-ok"><ShieldCheck size={14} /> Verificado</span>}</h3>
                <dl className="vpp-datos">
                  <div><dt>Nivel de estudios</dt><dd>{p.nivel_estudios_texto || '—'}</dd></div>
                </dl>
                {p.presentacion && <blockquote className="vpp-presentacion">{p.presentacion}</blockquote>}

                <h4><Award size={15} /> Cursos y certificaciones</h4>
                {p.cursos?.length ? (
                  <ul className="vpp-lista">
                    {p.cursos.map(c => (
                      <li key={c.id}>
                        <div><strong>{c.nombre}</strong><span>{[c.institucion, c.anio].filter(Boolean).join(' · ') || 'Sin institución'}</span></div>
                        {c.tiene_archivo
                          ? <button type="button" className="vpp-btn-link" onClick={() => verDiploma(c.id)}><Eye size={14} /> Ver diploma</button>
                          : <small>Sin diploma</small>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="vpp-nota">{p.sin_cursos ? 'Declaró que no tiene cursos.' : 'Sin cursos registrados.'}</p>}

                <h4><Briefcase size={15} /> Empleos anteriores</h4>
                {p.experiencias?.length ? (
                  <ul className="vpp-lista">
                    {p.experiencias.map(e => (
                      <li key={e.id}>
                        <div>
                          <strong>{e.empresa}{e.puesto ? ` · ${e.puesto}` : ''}</strong>
                          <span>{e.desde_anio || '¿?'} – {e.hasta_anio || 'actual'}{e.descripcion ? ` · ${e.descripcion}` : ''}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="vpp-nota">{p.sin_empleos ? 'Trabaja por su cuenta (sin empleos anteriores).' : 'Sin empleos registrados.'}</p>}
              </section>
            </>
          )}
        </div>

        </div>

        {p?.estado === 'en_revision' && (
          <footer className="vpp-modal-pie">
            {rechazando ? (
              <div className="vpp-rechazo">
                <label htmlFor="vpp-motivo"><strong>¿Qué debe corregir?</strong> El técnico verá este mensaje.</label>
                <div className="vpp-motivos">
                  {MOTIVOS_RAPIDOS.map(m => <button key={m} type="button" onClick={() => agregarMotivo(m)}>{m}</button>)}
                </div>
                <textarea id="vpp-motivo" rows={3} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. La foto del reverso de tu INE salió cortada; súbela completa." />
                <div className="vpp-acciones">
                  <button type="button" className="vpp-btn-sec" onClick={() => setRechazando(false)} disabled={enviando}>Volver</button>
                  <button type="button" className="vpp-btn rojo" onClick={rechazar} disabled={enviando || motivo.trim().length < 5}>
                    {enviando ? <Loader2 size={16} className="vpp-girar" /> : <Ban size={16} />} Enviar rechazo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="vpp-check">
                  <input type="checkbox" checked={estudiosOk} onChange={(e) => setEstudiosOk(e.target.checked)} />
                  Marcar también sus estudios como verificados
                </label>
                <div className="vpp-acciones">
                  <button type="button" className="vpp-btn-sec rojo" onClick={() => setRechazando(true)} disabled={enviando}><Ban size={16} /> Rechazar</button>
                  <button type="button" className="vpp-btn verde" onClick={aprobar} disabled={enviando || faltantes.length > 0}>
                    {enviando ? <Loader2 size={16} className="vpp-girar" /> : <Check size={16} />} Validar perfil
                  </button>
                </div>
              </>
            )}
          </footer>
        )}
      </div>
      {visor && <Visor archivo={visor} onCerrar={cerrarVisor} />}
    </div>,
    document.body
  );
};

/**
 * Lista de perfiles profesionales de técnicos de la red para Root/Admin.
 * `abrirId`: abre directo el detalle (viene de la notificación: ?validar=ID).
 */
const PerfilesPorValidar = ({ abrirId = null, onConteo }) => {
  const [filtro, setFiltro] = useState('en_revision');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState(abrirId);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const res = await axios.get(`${API}/admin/perfiles-profesionales`, { params: { estado: filtro } });
      const datos = res.data.data || [];
      setLista(datos);
      if (filtro === 'en_revision') onConteo?.(datos.length);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la lista.'));
    } finally {
      setCargando(false);
    }
  }, [filtro, onConteo]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (abrirId) setDetalleId(abrirId); }, [abrirId]);

  return (
    <div className="vpp">
      <div className="vpp-intro">
        <ShieldCheck size={30} />
        <div>
          <h4>VALIDACIÓN DE TÉCNICOS DE LA RED</h4>
          <p>Los técnicos nuevos no pueden usar su cuenta hasta que valides su perfil: identidad (INE), datos de cobro, habilidades y currículum. Si un técnico ya validado cambia su INE o sus estudios, vuelve a aparecer aquí sin perder el acceso.</p>
        </div>
      </div>

      <div className="vpp-barra">
        <div className="vpp-filtros" role="tablist">
          {FILTROS.map(f => (
            <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave} className={filtro === f.clave ? 'on' : ''} onClick={() => setFiltro(f.clave)}>
              {f.texto}
            </button>
          ))}
        </div>
        <button type="button" className="vpp-btn-sec" onClick={cargar}><RefreshCw size={16} /> Actualizar</button>
      </div>

      {error && <div className="vpp-alerta rojo"><AlertCircle size={16} /> {error}</div>}

      {cargando ? (
        <div className="vpp-cargando"><Loader2 size={24} className="vpp-girar" /> Cargando perfiles…</div>
      ) : lista.length === 0 ? (
        <div className="vpp-vacio">
          <ShieldCheck size={44} />
          <h3>{filtro === 'en_revision' ? '¡Todo al día!' : 'Sin perfiles'}</h3>
          <p>{filtro === 'en_revision' ? 'No hay perfiles de técnicos esperando validación.' : 'No hay perfiles en esta lista.'}</p>
        </div>
      ) : (
        <div className="vpp-grid">
          {lista.map(t => {
            const est = ESTADOS[t.estado] || ESTADOS.incompleto;
            return (
              <article key={t.user_id} className={`vpp-card ${est.clase}`}>
                <div className="vpp-card-head">
                  <div className="vpp-avatar">{String(t.foto || '').startsWith('http') ? <img src={t.foto} alt="" /> : (t.nombre || '?').charAt(0).toUpperCase()}</div>
                  <div className="vpp-card-txt">
                    <h3 title={t.nombre}>{t.nombre || 'Sin nombre'}</h3>
                    <span>{ROLES[t.role_id] || 'Técnico de la red'}</span>
                  </div>
                  <span className={`vpp-estado ${est.clase}`}>{est.texto}</span>
                </div>
                <div className="vpp-card-datos">
                  {t.email && <span title={t.email}><Mail size={14} /> <em>{t.email}</em></span>}
                  {t.telefono && <span><Phone size={14} /> <em>{t.telefono}</em></span>}
                  <span><Clock size={14} /> <em>Enviado: {fecha(t.enviado_at)}</em></span>
                </div>
                {t.estado === 'en_revision' && (
                  <span className={`vpp-tipo ${t.ya_aprobado_antes ? 'cambio' : 'nuevo'}`}>
                    {t.ya_aprobado_antes ? 'Cambió datos verificados (sigue trabajando)' : t.obligatorio ? 'Técnico nuevo: espera para usar su cuenta' : 'Técnico existente: solicita sus insignias'}
                  </span>
                )}
                <button type="button" className="vpp-btn" onClick={() => setDetalleId(t.user_id)}>
                  <Eye size={16} /> {t.estado === 'en_revision' ? 'Revisar perfil' : 'Ver perfil'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {detalleId && (
        <DetalleRevision
          userId={detalleId}
          onCerrar={() => setDetalleId(null)}
          onResuelto={() => { setDetalleId(null); cargar(); }}
        />
      )}
    </div>
  );
};

export default PerfilesPorValidar;
