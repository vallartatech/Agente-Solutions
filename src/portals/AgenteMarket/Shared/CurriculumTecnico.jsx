import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  X, Loader2, ShieldCheck, GraduationCap, Briefcase, Award, Star, Clock, CheckCircle2,
  Receipt, Banknote, CreditCard, Landmark, Hourglass, CalendarDays, Wrench, Quote,
} from 'lucide-react';
import { IconoEspecialidad } from './iconoEspecialidad';
import '../../../styles/AgenteMarket/Shared/CurriculumTecnico.css';

// Currículum profesional de un técnico de la red (roles 6 y 8), para clientes de la red.
// Los datos vienen de GET /tecnicos/{id}/perfil-profesional. No se muestran teléfono, correo ni
// datos bancarios: el contacto y el pago van por la app.

const API = import.meta.env.VITE_API_BASE_URL;

const anio = (iso) => (iso ? new Date(iso).getFullYear() : null);
const hoy = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

/** Perfil mínimo con lo que ya trae la pantalla (cotización), por si el técnico no es de la red. */
const desdeRespaldo = (r = {}) => ({
  nombre: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || 'Técnico',
  foto: r.profile_picture || null,
  rol: 'Técnico',
  calificacion: r.total_reviews_count ? Number(r.rating_stars_avg) : null,
  puntualidad: r.total_reviews_count ? Number(r.rating_time_avg) : null,
  total_resenas: Number(r.total_reviews_count || 0),
  especialidades: (r.specialties || []).map(s => ({ id: s.id, name: s.name })),
  insignias: {},
  cursos: [],
  experiencias: [],
});

const Dato = ({ Icono, valor, etiqueta }) => (
  <div className="cvt-dato">
    <Icono size={18} />
    <strong>{valor}</strong>
    <span>{etiqueta}</span>
  </div>
);

/**
 * Ventana con el currículum del técnico.
 *  tecnicoId: id del usuario técnico
 *  respaldo:  objeto técnico que ya tiene la pantalla (nombre, foto, especialidades)
 *  onCerrar:  cierra la ventana
 */
const CurriculumTecnico = ({ tecnicoId, respaldo = null, onCerrar }) => {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    axios.get(`${API}/tecnicos/${tecnicoId}/perfil-profesional`)
      .then((res) => { if (!cancelado) setPerfil(res.data.data); })
      .catch(() => { if (!cancelado) setPerfil(desdeRespaldo(respaldo || {})); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [tecnicoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape cierra; el fondo no se desplaza mientras está abierta
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar]);

  const p = perfil;
  const formasPago = p ? [
    p.acepta_efectivo && { Icono: Banknote, texto: 'Efectivo' },
    p.acepta_transferencia && { Icono: Landmark, texto: 'Transferencia' },
    p.tiene_terminal && { Icono: CreditCard, texto: 'Tarjeta (terminal)' },
    p.emite_factura && { Icono: Receipt, texto: 'Emite factura' },
  ].filter(Boolean) : [];
  const verificado = p?.insignias?.identidad_verificada;
  const foto = String(p?.foto || '').startsWith('http') ? p.foto : null;

  return createPortal(
    <div className="cvt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="cvt-modal" role="dialog" aria-modal="true" aria-label={`Currículum de ${p?.nombre || 'técnico'}`}>
        <div className="cvt-barra">
          <span>Currículum profesional</span>
          <div className="cvt-barra-acciones">
            <button type="button" className="cvt-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
          </div>
        </div>

        <div className="cvt-scroll">
          {cargando ? (
            <div className="cvt-cargando"><Loader2 size={26} className="cvt-girar" /> Cargando currículum…</div>
          ) : (
            <article className="cvt-hoja">
              {/* ── Encabezado ── */}
              <header className="cvt-cabeza">
                <div className="cvt-foto">
                  {foto ? <img src={foto} alt="" crossOrigin="anonymous" /> : (p.nombre || 'T').charAt(0).toUpperCase()}
                </div>
                <div className="cvt-identidad">
                  <h2>{p.nombre}</h2>
                  <p>{p.rol || 'Técnico de la red'}{p.miembro_desde ? ` · En Agente Market desde ${anio(p.miembro_desde)}` : ''}</p>
                  <div className="cvt-insignias">
                    {verificado
                      ? <span className="ok"><ShieldCheck size={14} /> Identidad verificada</span>
                      : <span className="pend">Identidad sin verificar</span>}
                    {p.insignias?.estudios_verificados && <span className="ok"><GraduationCap size={14} /> Estudios verificados</span>}
                  </div>
                </div>
              </header>

              {/* ── Cifras ── */}
              <section className="cvt-datos cvt-evitar-corte">
                <Dato Icono={Star} valor={p.calificacion != null ? Number(p.calificacion).toFixed(1) : '—'} etiqueta={p.total_resenas ? `${p.total_resenas} ${p.total_resenas === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas'} />
                <Dato Icono={Clock} valor={p.puntualidad != null ? Number(p.puntualidad).toFixed(1) : '—'} etiqueta="Puntualidad" />
                <Dato Icono={CheckCircle2} valor={p.trabajos_terminados ?? '—'} etiqueta="Trabajos terminados" />
                <Dato Icono={Hourglass} valor={p.anios_experiencia ?? '—'} etiqueta={p.anios_experiencia === 1 ? 'Año de experiencia' : 'Años de experiencia'} />
              </section>

              <div className="cvt-cuerpo">
                {/* ── Columna lateral ── */}
                <aside className="cvt-lateral">
                  <section className="cvt-evitar-corte">
                    <h3>Especialidades</h3>
                    {p.especialidades?.length ? (
                      <ul className="cvt-especialidades">
                        {p.especialidades.map(e => (
                          <li key={e.id || e.name}><IconoEspecialidad nombre={e.name} size={15} /> {e.name}</li>
                        ))}
                      </ul>
                    ) : <p className="cvt-vacio">Sin especialidades registradas.</p>}
                  </section>

                  {formasPago.length > 0 && (
                    <section className="cvt-evitar-corte">
                      <h3>Formas de pago</h3>
                      <ul className="cvt-lista-simple">
                        {formasPago.map(({ Icono, texto }) => <li key={texto}><Icono size={14} /> {texto}</li>)}
                      </ul>
                    </section>
                  )}
                </aside>

                {/* ── Columna principal ── */}
                <div className="cvt-principal">
                  <section className="cvt-evitar-corte">
                    <h3><Quote size={16} /> Perfil profesional</h3>
                    {p.presentacion
                      ? <p className="cvt-presentacion">{p.presentacion}</p>
                      : <p className="cvt-vacio">El técnico aún no escribe su presentación.</p>}
                  </section>

                  <section>
                    <h3><Briefcase size={16} /> Experiencia</h3>
                    {p.experiencias?.length ? (
                      <ol className="cvt-linea">
                        {p.experiencias.map(e => (
                          <li key={e.id} className="cvt-evitar-corte">
                            <span className="cvt-periodo"><CalendarDays size={13} /> {e.desde_anio || '¿?'} – {e.hasta_anio || 'Actual'}</span>
                            <strong>{e.puesto || 'Técnico'}</strong>
                            <em>{e.empresa}</em>
                            {e.descripcion && <p>{e.descripcion}</p>}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="cvt-vacio">{p.anios_experiencia ? `Trabaja por su cuenta · ${p.anios_experiencia} ${p.anios_experiencia === 1 ? 'año' : 'años'} en el oficio.` : 'Sin empleos registrados.'}</p>
                    )}
                  </section>

                  <section>
                    <h3><GraduationCap size={16} /> Formación</h3>
                    {p.nivel_estudios_texto && (
                      <p className="cvt-nivel"><strong>Nivel de estudios:</strong> {p.nivel_estudios_texto}</p>
                    )}
                    {p.cursos?.length ? (
                      <ul className="cvt-cursos">
                        {p.cursos.map(c => (
                          <li key={c.id} className="cvt-evitar-corte">
                            <Award size={16} />
                            <div>
                              <strong>{c.nombre}</strong>
                              <span>{[c.institucion, c.anio].filter(Boolean).join(' · ') || 'Curso / certificación'}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : !p.nivel_estudios_texto && <p className="cvt-vacio">Sin formación registrada.</p>}
                  </section>
                </div>
              </div>

              <footer className="cvt-pie">
                <span><Wrench size={13} /> Agente Market · Red de técnicos</span>
                <span>{verificado ? 'Perfil validado por Agente Solutions' : 'Perfil en validación'} · {hoy()}</span>
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CurriculumTecnico;
