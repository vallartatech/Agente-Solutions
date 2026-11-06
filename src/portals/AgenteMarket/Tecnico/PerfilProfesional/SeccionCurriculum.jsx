import { useRef, useState } from 'react';
import { GraduationCap, FileText, Award, Briefcase, Plus, Trash2, Paperclip, Loader2, AlertCircle, Eye } from 'lucide-react';
import { agregarCurso, borrarCurso, mensajeError, urlArchivoPrivado } from './perfilProfesionalApi';

const ANIO_ACTUAL = new Date().getFullYear();
const PRESENTACION_MIN = 20;
const PRESENTACION_MAX = 1500;

const NIVELES_POR_DEFECTO = {
  sin_estudios: 'Sin estudios formales',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  preparatoria: 'Preparatoria / Bachillerato',
  tecnico: 'Carrera técnica',
  licenciatura: 'Licenciatura / Ingeniería',
  posgrado: 'Posgrado',
};

const empleoVacio = () => ({ empresa: '', puesto: '', desde_anio: '', hasta_anio: '', actual: false, descripcion: '' });

export const formCurriculum = (p = {}) => ({
  nivel_estudios: p.nivel_estudios || '',
  presentacion: p.presentacion || '',
  sin_cursos: Boolean(p.sin_cursos),
  sin_empleos: Boolean(p.sin_empleos),
  experiencias: (p.experiencias || []).map(e => ({
    empresa: e.empresa || '',
    puesto: e.puesto || '',
    desde_anio: e.desde_anio ? String(e.desde_anio) : '',
    hasta_anio: e.hasta_anio ? String(e.hasta_anio) : '',
    actual: !e.hasta_anio,
    descripcion: e.descripcion || '',
  })),
});

export const payloadCurriculum = (f) => {
  const experiencias = f.sin_empleos ? [] : f.experiencias
    .filter(e => e.empresa.trim())
    .map(e => ({
      empresa: e.empresa.trim(),
      puesto: e.puesto.trim() || null,
      desde_anio: e.desde_anio ? Number(e.desde_anio) : null,
      hasta_anio: e.actual || !e.hasta_anio ? null : Number(e.hasta_anio),
      descripcion: e.descripcion.trim() || null,
    }));
  return {
    nivel_estudios: f.nivel_estudios || null,
    presentacion: f.presentacion.trim() || null,
    sin_cursos: f.sin_cursos,
    sin_empleos: f.sin_empleos,
    experiencias,
  };
};

export const erroresCurriculum = (f) => {
  const e = {};
  f.experiencias.forEach((x, i) => {
    if (!f.sin_empleos && !x.empresa.trim() && (x.puesto || x.desde_anio || x.descripcion)) e[`exp_${i}`] = 'Escribe la empresa o quita este empleo.';
    if (x.desde_anio && x.hasta_anio && !x.actual && Number(x.hasta_anio) < Number(x.desde_anio)) e[`exp_${i}`] = 'El año de fin no puede ser antes del de inicio.';
  });
  return e;
};

const anio = (v) => v.replace(/\D/g, '').slice(0, 4);

/**
 * Currículum breve: nivel de estudios y presentación (obligatorios), cursos con diploma opcional
 * y empleos anteriores (ambos opcionales: "No tengo").
 * Los cursos se guardan al momento (llevan archivo); lo demás con el botón de la sección.
 */
const SeccionCurriculum = ({ form, setForm, perfil, onPerfil, errores = {} }) => {
  const niveles = perfil?.niveles_estudios || NIVELES_POR_DEFECTO;
  const cursos = perfil?.cursos || [];
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  // ── Cursos ──
  const [curso, setCurso] = useState({ nombre: '', institucion: '', anio: '', archivo: null });
  const [guardandoCurso, setGuardandoCurso] = useState(false);
  const [errorCurso, setErrorCurso] = useState('');
  const archivoRef = useRef(null);

  const guardarCurso = async () => {
    if (!curso.nombre.trim()) { setErrorCurso('Escribe el nombre del curso o certificación.'); return; }
    setGuardandoCurso(true);
    setErrorCurso('');
    try {
      const data = await agregarCurso({ ...curso, nombre: curso.nombre.trim() });
      onPerfil(data);
      set('sin_cursos', false);
      setCurso({ nombre: '', institucion: '', anio: '', archivo: null });
      if (archivoRef.current) archivoRef.current.value = '';
    } catch (err) {
      setErrorCurso(mensajeError(err, 'No se pudo agregar el curso.'));
    } finally {
      setGuardandoCurso(false);
    }
  };

  const quitarCurso = async (id) => {
    try {
      onPerfil(await borrarCurso(id));
    } catch (err) {
      setErrorCurso(mensajeError(err, 'No se pudo quitar el curso.'));
    }
  };

  const verDiploma = async (id) => {
    try {
      const url = await urlArchivoPrivado(perfil.user_id, 'curso', id);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setErrorCurso('No se pudo abrir el diploma.');
    }
  };

  // ── Empleos ──
  const setEmpleo = (i, campo, valor) => setForm(prev => ({
    ...prev,
    experiencias: prev.experiencias.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)),
  }));
  const agregarEmpleo = () => setForm(prev => ({ ...prev, sin_empleos: false, experiencias: [...prev.experiencias, empleoVacio()] }));
  const quitarEmpleo = (i) => setForm(prev => ({ ...prev, experiencias: prev.experiencias.filter((_, j) => j !== i) }));

  const largo = form.presentacion.trim().length;

  return (
    <div className="pp-seccion">
      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><GraduationCap size={18} /> Estudios</h3>
        <label className="pp-campo">
          <span>Último nivel de estudios</span>
          <select value={form.nivel_estudios} onChange={(e) => set('nivel_estudios', e.target.value)}>
            <option value="">Elige una opción</option>
            {Object.entries(niveles).map(([clave, texto]) => <option key={clave} value={clave}>{texto}</option>)}
          </select>
        </label>
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><FileText size={18} /> Preséntate</h3>
        <label className="pp-campo">
          <span>Cuéntale a los clientes quién eres y en qué eres bueno</span>
          <textarea
            rows={4}
            maxLength={PRESENTACION_MAX}
            value={form.presentacion}
            placeholder="Ej. Soy electricista con 8 años de experiencia en casas y locales. Hago instalaciones, tableros y reparación de cortos. Trabajo limpio y a tiempo."
            onChange={(e) => set('presentacion', e.target.value)}
          />
          <small className={largo > 0 && largo < PRESENTACION_MIN ? 'pp-error' : 'pp-ayuda'}>
            {largo < PRESENTACION_MIN ? `Mínimo ${PRESENTACION_MIN} caracteres (llevas ${largo})` : `${largo} / ${PRESENTACION_MAX}`}
          </small>
        </label>
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Award size={18} /> Cursos y certificaciones <em>opcional</em></h3>

        {cursos.length > 0 && (
          <ul className="pp-lista">
            {cursos.map(c => (
              <li key={c.id}>
                <div>
                  <strong>{c.nombre}</strong>
                  <span>{[c.institucion, c.anio].filter(Boolean).join(' · ') || 'Sin institución'}</span>
                </div>
                {c.tiene_archivo && (
                  <button type="button" className="pp-icono" onClick={() => verDiploma(c.id)} title="Ver diploma" aria-label={`Ver diploma de ${c.nombre}`}>
                    <Eye size={16} />
                  </button>
                )}
                <button type="button" className="pp-icono peligro" onClick={() => quitarCurso(c.id)} title="Quitar" aria-label={`Quitar ${c.nombre}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!form.sin_cursos && (
          <div className="pp-subform">
            <div className="pp-grid-2">
              <label className="pp-campo">
                <span>Nombre del curso</span>
                <input type="text" maxLength={191} value={curso.nombre} placeholder="Ej. Instalaciones eléctricas residenciales" onChange={(e) => setCurso(c => ({ ...c, nombre: e.target.value }))} />
              </label>
              <label className="pp-campo">
                <span>Institución</span>
                <input type="text" maxLength={191} value={curso.institucion} placeholder="Ej. CONALEP, ICATEY, SENA" onChange={(e) => setCurso(c => ({ ...c, institucion: e.target.value }))} />
              </label>
              <label className="pp-campo">
                <span>Año</span>
                <input type="text" inputMode="numeric" value={curso.anio} placeholder={String(ANIO_ACTUAL)} onChange={(e) => setCurso(c => ({ ...c, anio: anio(e.target.value) }))} />
              </label>
              <label className="pp-campo">
                <span>Diploma (foto o PDF, opcional)</span>
                <span className="pp-archivo">
                  <Paperclip size={15} />
                  <span>{curso.archivo ? curso.archivo.name : 'Elegir archivo'}</span>
                  <input ref={archivoRef} type="file" accept="image/*,application/pdf" onChange={(e) => setCurso(c => ({ ...c, archivo: e.target.files?.[0] || null }))} />
                </span>
              </label>
            </div>
            {errorCurso && <small className="pp-error"><AlertCircle size={13} /> {errorCurso}</small>}
            <button type="button" className="pp-btn-sec" onClick={guardarCurso} disabled={guardandoCurso}>
              {guardandoCurso ? <Loader2 size={16} className="pp-girar" /> : <Plus size={16} />} Agregar curso
            </button>
          </div>
        )}

        {cursos.length === 0 && (
          <label className="pp-check">
            <input type="checkbox" checked={form.sin_cursos} onChange={(e) => set('sin_cursos', e.target.checked)} />
            No tengo cursos ni certificaciones
          </label>
        )}
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Briefcase size={18} /> Empleos anteriores <em>opcional</em></h3>

        {!form.sin_empleos && form.experiencias.map((e, i) => (
          <div key={i} className="pp-subform">
            <div className="pp-subform-head">
              <strong>Empleo {i + 1}</strong>
              <button type="button" className="pp-icono peligro" onClick={() => quitarEmpleo(i)} aria-label={`Quitar empleo ${i + 1}`}><Trash2 size={16} /></button>
            </div>
            <div className="pp-grid-2">
              <label className="pp-campo">
                <span>Empresa o patrón</span>
                <input type="text" maxLength={191} value={e.empresa} placeholder="Ej. Constructora del Sureste" onChange={(ev) => setEmpleo(i, 'empresa', ev.target.value)} />
              </label>
              <label className="pp-campo">
                <span>Puesto</span>
                <input type="text" maxLength={191} value={e.puesto} placeholder="Ej. Ayudante de electricista" onChange={(ev) => setEmpleo(i, 'puesto', ev.target.value)} />
              </label>
              <label className="pp-campo">
                <span>Desde (año)</span>
                <input type="text" inputMode="numeric" value={e.desde_anio} placeholder="2018" onChange={(ev) => setEmpleo(i, 'desde_anio', anio(ev.target.value))} />
              </label>
              <label className="pp-campo">
                <span>Hasta (año)</span>
                <input type="text" inputMode="numeric" value={e.actual ? '' : e.hasta_anio} disabled={e.actual} placeholder={e.actual ? 'Actual' : String(ANIO_ACTUAL)} onChange={(ev) => setEmpleo(i, 'hasta_anio', anio(ev.target.value))} />
              </label>
            </div>
            <label className="pp-check">
              <input type="checkbox" checked={e.actual} onChange={(ev) => setEmpleo(i, 'actual', ev.target.checked)} />
              Trabajo aquí actualmente
            </label>
            <label className="pp-campo">
              <span>¿Qué hacías? (opcional)</span>
              <input type="text" maxLength={500} value={e.descripcion} placeholder="Ej. Instalaciones en fraccionamientos" onChange={(ev) => setEmpleo(i, 'descripcion', ev.target.value)} />
            </label>
            {errores[`exp_${i}`] && <small className="pp-error"><AlertCircle size={13} /> {errores[`exp_${i}`]}</small>}
          </div>
        ))}

        {!form.sin_empleos && form.experiencias.length < 10 && (
          <button type="button" className="pp-btn-sec" onClick={agregarEmpleo}>
            <Plus size={16} /> Agregar empleo
          </button>
        )}

        {form.experiencias.length === 0 && (
          <label className="pp-check">
            <input type="checkbox" checked={form.sin_empleos} onChange={(e) => set('sin_empleos', e.target.checked)} />
            No tengo empleos anteriores (trabajo por mi cuenta)
          </label>
        )}
      </div>
    </div>
  );
};

export default SeccionCurriculum;
