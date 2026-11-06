import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Clock, RefreshCw, AlertCircle, Eye, X, Check, Ban, Phone, Mail, IdCard, Receipt,
  Wrench, GraduationCap, Briefcase, Award, Loader2, FileText, ExternalLink, MessageSquare, History,
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
];

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
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

/** Foto de un lado de la INE (o PDF), con opción de abrirla en grande. */
const FotoIne = ({ userId, tipo, titulo, existe }) => {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!existe) return undefined;
    let actual = null;
    let cancelado = false;
    archivoPrivado(userId, tipo)
      .then((a) => { actual = a; if (!cancelado) setArchivo(a); })
      .catch(() => !cancelado && setError(true));
    return () => { cancelado = true; if (actual) URL.revokeObjectURL(actual.url); };
  }, [userId, tipo, existe]);

  return (
    <figure className="vpp-ine">
      <figcaption>{titulo}</figcaption>
      {!existe ? (
        <div className="vpp-ine-vacio falta">No la subió</div>
      ) : error ? (
        <div className="vpp-ine-vacio falta">No se pudo cargar</div>
      ) : !archivo ? (
        <div className="vpp-ine-vacio"><Loader2 size={20} className="vpp-girar" /></div>
      ) : archivo.pdf ? (
        <a className="vpp-ine-vacio" href={archivo.url} target="_blank" rel="noreferrer"><FileText size={22} /> Abrir PDF</a>
      ) : (
        <a href={archivo.url} target="_blank" rel="noreferrer" title="Abrir en grande">
          <img src={archivo.url} alt={`INE ${titulo}`} />
        </a>
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

  useEffect(() => {
    axios.get(`${API}/admin/perfiles-profesionales/${userId}`)
      .then((res) => setP(res.data.data))
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el perfil.')));
  }, [userId]);

  const verDiploma = async (cursoId) => {
    try {
      const a = await archivoPrivado(userId, 'curso', cursoId);
      window.open(a.url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(a.url), 60000);
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

  return (
    <div className="vpp-overlay" onClick={() => !enviando && onCerrar()}>
      <div className="vpp-modal" role="dialog" aria-modal="true" aria-label="Revisar perfil" onClick={(e) => e.stopPropagation()}>
        <header className="vpp-modal-head">
          <div>
            <span className="vpp-kicker">Revisión de perfil profesional</span>
            <h2>{p?.nombre || 'Cargando…'}</h2>
            {p && <span className="vpp-sub">{ROLES[p.role_id] || 'Técnico de la red'} · ID {p.user_id}</span>}
          </div>
          <button type="button" className="vpp-cerrar" onClick={onCerrar} disabled={enviando} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="vpp-modal-cuerpo">
          {error && <div className="vpp-alerta rojo"><AlertCircle size={16} /> {error}</div>}
          {!p && !error && <div className="vpp-cargando"><Loader2 size={24} className="vpp-girar" /> Cargando perfil…</div>}

          {p && (
            <>
              <div className="vpp-resumen">
                <span className={`vpp-estado ${estado.clase}`}>{estado.texto}</span>
                <span><Clock size={14} /> Enviado: {fecha(p.enviado_at)}</span>
                {p.revisado_at && <span><History size={14} /> Última revisión: {fecha(p.revisado_at)}</span>}
                {p.email && <a href={`mailto:${p.email}`}><Mail size={14} /> {p.email}</a>}
                {tel && <a href={`https://wa.me/521${tel}`} target="_blank" rel="noreferrer"><MessageSquare size={14} /> WhatsApp {tel}</a>}
                {p.telefono && <a href={`tel:${tel}`}><Phone size={14} /> Llamar</a>}
              </div>

              {p.estado === 'rechazado' && p.motivo_rechazo && (
                <div className="vpp-alerta rojo"><Ban size={16} /> <div><strong>Motivo del último rechazo:</strong> {p.motivo_rechazo}</div></div>
              )}
              {faltantes.length > 0 && (
                <div className="vpp-alerta naranja"><AlertCircle size={16} /> <div><strong>Le falta:</strong> {faltantes.join(', ')}.</div></div>
              )}

              <section className="vpp-bloque">
                <h3><IdCard size={17} /> Identidad {p.insignias?.identidad_verificada && <span className="vpp-ok"><ShieldCheck size={14} /> Verificada</span>}</h3>
                <p className="vpp-nota">Compara el nombre y la foto de la INE con los datos de la cuenta: <strong>{p.nombre}</strong>.</p>
                <div className="vpp-ines">
                  <FotoIne userId={p.user_id} tipo="ine_frente" titulo="Frente" existe={p.tiene_ine_frente} />
                  <FotoIne userId={p.user_id} tipo="ine_reverso" titulo="Reverso" existe={p.tiene_ine_reverso} />
                </div>
              </section>

              <section className="vpp-bloque">
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

              <section className="vpp-bloque">
                <h3><Wrench size={17} /> Habilidades · {p.anios_experiencia ?? '—'} {p.anios_experiencia === 1 ? 'año' : 'años'} de experiencia</h3>
                <div className="vpp-chips">
                  {(p.especialidades || []).map(e => <span key={e.id}>{e.icon || '🔧'} {e.name}</span>)}
                  {!p.especialidades?.length && <span className="vacio">Sin habilidades</span>}
                </div>
              </section>

              <section className="vpp-bloque">
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
                          ? <button type="button" className="vpp-btn-link" onClick={() => verDiploma(c.id)}><ExternalLink size={14} /> Ver diploma</button>
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
    </div>
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
              <article key={t.user_id} className="vpp-card">
                <div className="vpp-card-head">
                  <div className="vpp-avatar">{String(t.foto || '').startsWith('http') ? <img src={t.foto} alt="" /> : (t.nombre || '?').charAt(0).toUpperCase()}</div>
                  <div className="vpp-card-txt">
                    <h3>{t.nombre || 'Sin nombre'}</h3>
                    <span>{ROLES[t.role_id] || 'Técnico de la red'}</span>
                  </div>
                  <span className={`vpp-estado ${est.clase}`}>{est.texto}</span>
                </div>
                <div className="vpp-card-datos">
                  {t.email && <span><Mail size={14} /> {t.email}</span>}
                  {t.telefono && <span><Phone size={14} /> {t.telefono}</span>}
                  <span><Clock size={14} /> Enviado: {fecha(t.enviado_at)}</span>
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
