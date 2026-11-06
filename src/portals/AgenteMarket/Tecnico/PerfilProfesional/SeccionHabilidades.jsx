import { useEffect, useMemo, useState } from 'react';
import { Wrench, Plus, Check, Search, X, Hourglass } from 'lucide-react';
import { catalogoEspecialidades } from './perfilProfesionalApi';

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Formulario: especialidades elegidas (ids del catálogo o nombres nuevos) y años de experiencia. */
export const formHabilidades = (p = {}) => ({
  especialidades: (p.especialidades || []).map(e => ({ id: e.id, name: e.name, icon: e.icon })),
  anios_experiencia: p.anios_experiencia ?? '',
});

export const payloadHabilidades = (f) => ({
  // Las del catálogo van por id; las nuevas por nombre (el backend las agrega al catálogo para todos)
  especialidades: f.especialidades.map(e => e.id ?? e.name),
  anios_experiencia: f.anios_experiencia === '' ? null : Number(f.anios_experiencia),
});

/**
 * Habilidades del catálogo compartido. Si su especialidad no está, la escribe y se agrega
 * al listado para todos los técnicos al guardar.
 */
const SeccionHabilidades = ({ form, setForm }) => {
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nueva, setNueva] = useState('');

  useEffect(() => {
    catalogoEspecialidades().then(setCatalogo).catch(() => setCatalogo([]));
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

  const agregarNueva = () => {
    const nombre = nueva.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    // Si ya existe en el catálogo, se elige esa en lugar de duplicarla
    const existente = catalogo.find(c => normalizar(c.name) === normalizar(nombre));
    const esp = existente || { id: null, name: nombre.charAt(0).toUpperCase() + nombre.slice(1), icon: '🔧' };
    if (!estaElegida(esp)) alternar(esp);
    setNueva('');
    setBusqueda('');
  };

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return q ? catalogo.filter(c => normalizar(c.name).includes(q)) : catalogo;
  }, [catalogo, busqueda]);

  // Nuevas (aún no están en el catálogo): se muestran arriba para poder quitarlas
  const nuevas = elegidas.filter(e => !e.id);

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
          {nuevas.map(e => (
            <button key={`nueva-${e.name}`} type="button" className="pp-chip activo nueva" onClick={() => alternar(e)} title="Quitar">
              <span>{e.icon || '🔧'}</span> {e.name} <small>nueva</small> <X size={13} />
            </button>
          ))}
          {visibles.map(esp => {
            const on = estaElegida(esp);
            return (
              <button key={esp.id} type="button" className={`pp-chip ${on ? 'activo' : ''}`} aria-pressed={on} onClick={() => alternar(esp)}>
                <span>{esp.icon || '🔧'}</span> {esp.name} {on && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
          {visibles.length === 0 && busqueda && <p className="pp-nota">No encontramos «{busqueda}». Agrégala abajo.</p>}
        </div>

        <div className="pp-agregar">
          <input
            type="text"
            maxLength={60}
            placeholder="¿No está tu especialidad? Escríbela aquí"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarNueva(); } }}
          />
          <button type="button" className="pp-btn-sec" onClick={agregarNueva} disabled={!nueva.trim()}>
            <Plus size={16} /> Agregar
          </button>
        </div>
        <small className="pp-ayuda">{elegidas.length} {elegidas.length === 1 ? 'habilidad elegida' : 'habilidades elegidas'}</small>
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
