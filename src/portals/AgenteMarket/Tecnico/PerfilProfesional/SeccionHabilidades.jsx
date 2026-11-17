import { useEffect, useMemo, useState } from 'react';
import { Wrench, Check, Search, X, Hourglass, Lightbulb, Clock } from 'lucide-react';
import { catalogoEspecialidades, sugerirEspecialidad, misSugerencias, mensajeError } from './perfilProfesionalApi';
import { IconoEspecialidad } from '../../Shared/iconoEspecialidad';

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Formulario: especialidades elegidas (ids del catálogo) y años de experiencia. */
export const formHabilidades = (p = {}) => ({
  especialidades: (p.especialidades || []).map(e => ({ id: e.id, name: e.name, icon: e.icon })),
  anios_experiencia: p.anios_experiencia ?? '',
});

export const payloadHabilidades = (f) => ({
  // Solo habilidades del catálogo: las que faltan se sugieren aparte y Root/Admin las agregan
  especialidades: f.especialidades.filter(e => e.id).map(e => e.id),
  anios_experiencia: f.anios_experiencia === '' ? null : Number(f.anios_experiencia),
});

/**
 * Habilidades del catálogo compartido (fijo). Si su especialidad no está, la sugiere:
 * Root/Admin la revisan y, al aprobarla, se le agrega sola y le llega un aviso.
 */
const SeccionHabilidades = ({ form, setForm }) => {
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [sugerencia, setSugerencia] = useState('');
  const [enRevision, setEnRevision] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }

  useEffect(() => {
    catalogoEspecialidades().then(setCatalogo).catch(() => setCatalogo([]));
    misSugerencias().then(setEnRevision).catch(() => setEnRevision([]));
  }, []);

  const elegidas = form.especialidades;
  const estaElegida = (esp) => elegidas.some(e => (esp.id && e.id === esp.id) || normalizar(e.name) === normalizar(esp.name));

  const alternar = (esp) => {
    setForm(prev => ({
      ...prev,
      especialidades: estaElegida(esp)
        ? prev.especialidades.filter(e => !((esp.id && e.id === esp.id) || normalizar(e.name) === normalizar(esp.name)))
        : [...prev.especialidades, { id: esp.id, name: esp.name, icon: esp.icon }],
    }));
  };

  const sugerir = async () => {
    const nombre = sugerencia.trim().replace(/\s+/g, ' ');
    if (nombre.length < 3) return setAviso({ tipo: 'error', texto: 'Escribe al menos 3 letras.' });
    setAviso(null);

    // Si ya existe en el catálogo, se marca esa en lugar de sugerirla
    const existente = catalogo.find(c => normalizar(c.name) === normalizar(nombre));
    if (existente) {
      if (!estaElegida(existente)) alternar(existente);
      setSugerencia('');
      setBusqueda('');
      return setAviso({ tipo: 'ok', texto: `«${existente.name}» ya está en la lista; la marcamos por ti.` });
    }

    setEnviando(true);
    try {
      const res = await sugerirEspecialidad(nombre);
      if (res.ya_existe && res.specialty) {
        if (!estaElegida(res.specialty)) alternar(res.specialty);
      } else if (res.sugerencia && !enRevision.some(s => s.id === res.sugerencia.id)) {
        setEnRevision(prev => [...prev, res.sugerencia]);
      }
      setSugerencia('');
      setBusqueda('');
      setAviso({ tipo: 'ok', texto: res.message });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err, 'No se pudo enviar tu sugerencia. Intenta de nuevo.') });
    } finally {
      setEnviando(false);
    }
  };

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return q ? catalogo.filter(c => normalizar(c.name).includes(q)) : catalogo;
  }, [catalogo, busqueda]);

  return (
    <div className="pp-seccion">
      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Wrench size={18} /> ¿Qué servicios haces?</h3>
        <p className="pp-nota">Elige todas las que domines. Los clientes te encontrarán por estas habilidades.</p>

        {catalogo.length > 8 && (
          <label className="pp-buscar">
            <Search size={15} />
            <input type="text" placeholder="Buscar habilidad…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && <button type="button" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda"><X size={14} /></button>}
          </label>
        )}

        <div className="pp-chips">
          {visibles.map(esp => {
            const on = estaElegida(esp);
            return (
              <button key={esp.id} type="button" className={`pp-chip ${on ? 'activo' : ''}`} aria-pressed={on} onClick={() => alternar(esp)}>
                <IconoEspecialidad nombre={esp.name} size={15} /> {esp.name} {on && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
          {visibles.length === 0 && busqueda && (
            <p className="pp-nota">
              No encontramos «{busqueda}».{' '}
              <button type="button" className="pp-enlace" onClick={() => setSugerencia(busqueda)}>Sugerirla</button>
            </p>
          )}
        </div>
        <small className="pp-ayuda">{elegidas.length} {elegidas.length === 1 ? 'habilidad elegida' : 'habilidades elegidas'}</small>

        <div className="pp-sugerir">
          <span className="pp-sugerir-titulo"><Lightbulb size={15} /> ¿No está tu especialidad? Sugiérela</span>
          <div className="pp-agregar">
            <input
              type="text"
              maxLength={60}
              placeholder="Ej. Paneles solares"
              value={sugerencia}
              onChange={(e) => setSugerencia(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sugerir(); } }}
              disabled={enviando}
            />
            <button type="button" className="pp-btn-sec" onClick={sugerir} disabled={enviando || !sugerencia.trim()}>
              {enviando ? 'Enviando…' : 'Sugerir'}
            </button>
          </div>
          <small className="pp-ayuda">La revisamos y, si la aprobamos, se agrega a tus habilidades y te avisamos.</small>
          {aviso && <small className={aviso.tipo === 'ok' ? 'pp-ok' : 'pp-error'} role="status">{aviso.texto}</small>}

          {enRevision.length > 0 && (
            <div className="pp-chips pp-en-revision" aria-label="Sugerencias en revisión">
              {enRevision.map(s => (
                <span key={s.id} className="pp-chip pendiente" title="En revisión">
                  <Clock size={14} /> {s.nombre} <small>en revisión</small>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pp-bloque">
        <h3 className="pp-bloque-titulo"><Hourglass size={18} /> Experiencia</h3>
        <label className="pp-campo pp-campo-corto">
          <span>Años de experiencia en el oficio</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={70}
            value={form.anios_experiencia}
            placeholder="Ej. 5"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2);
              setForm(prev => ({ ...prev, anios_experiencia: v === '' ? '' : String(Math.min(Number(v), 70)) }));
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default SeccionHabilidades;
