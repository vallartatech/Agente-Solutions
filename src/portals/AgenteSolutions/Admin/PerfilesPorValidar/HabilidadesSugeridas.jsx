import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Lightbulb, Check, GitMerge, Ban, RefreshCw, Loader2, AlertCircle, Users } from 'lucide-react';
import { mostrarAviso } from '../../../../utils/dialogos';
import '../../../../styles/AgenteSolutions/Admin/HabilidadesSugeridas.css';

// Habilidades que sugieren los técnicos: Root y Admin las aprueban (con el nombre corregido),
// las unen a una que ya existe o las rechazan. Al resolverlas, se agregan a los técnicos y se les avisa.
// Copia propia de Agente Solutions: no usa archivos de AgenteMarket.

const API = import.meta.env.VITE_API_BASE_URL;

const ICONOS_RAPIDOS = ['🔧', '💻', '☀️', '🏊', '🚪', '🪟', '🧯', '📡', '🛗', '🐜'];

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const ESTADOS = {
  aprobada: { texto: 'Aprobada', clase: 'verde' },
  unida: { texto: 'Unida', clase: 'azul' },
  rechazada: { texto: 'Rechazada', clase: 'rojo' },
};

const errorDe = (e, porDefecto) => {
  const d = e?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || porDefecto;
};

const Tarjeta = ({ s, catalogo, onResuelta }) => {
  const [modo, setModo] = useState(null); // 'aprobar' | 'unir' | 'rechazar'
  const [nombre, setNombre] = useState(s.nombre);
  const [icono, setIcono] = useState('🔧');
  const [unirCon, setUnirCon] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    setError('');
    let ruta;
    let cuerpo;
    if (modo === 'aprobar') {
      if (nombre.trim().length < 3) return setError('Escribe el nombre de la habilidad.');
      ruta = 'aprobar';
      cuerpo = { nombre: nombre.trim(), icono };
    } else if (modo === 'unir') {
      if (!unirCon) return setError('Elige la habilidad con la que se une.');
      ruta = 'unir';
      cuerpo = { specialty_id: Number(unirCon) };
    } else {
      ruta = 'rechazar';
      cuerpo = { motivo: motivo.trim() };
    }
    setEnviando(true);
    try {
      const res = await axios.post(`${API}/admin/especialidades/sugerencias/${s.id}/${ruta}`, cuerpo);
      onResuelta(s.id, res.data?.message);
    } catch (e) {
      setError(errorDe(e, 'No se pudo guardar. Intenta de nuevo.'));
      setEnviando(false);
    }
  };

  return (
    <article className="hs-card">
      <div className="hs-card-head">
        <span className="hs-icono"><Lightbulb size={18} /></span>
        <div className="hs-card-txt">
          <strong>{s.nombre}</strong>
          <span>
            {s.tecnico?.nombre || 'Técnico'} · {fecha(s.creada)}
          </span>
        </div>
        {s.veces > 1 && (
          <span className="hs-veces" title="Técnicos que sugirieron lo mismo"><Users size={13} /> {s.veces}</span>
        )}
      </div>
      {s.comentario && <p className="hs-comentario">“{s.comentario}”</p>}

      {!modo && (
        <div className="hs-acciones">
          <button type="button" className="hs-btn verde" onClick={() => setModo('aprobar')}><Check size={15} /> Aprobar</button>
          <button type="button" className="hs-btn" onClick={() => setModo('unir')}><GitMerge size={15} /> Unir con otra</button>
          <button type="button" className="hs-btn rojo" onClick={() => setModo('rechazar')}><Ban size={15} /> Rechazar</button>
        </div>
      )}

      {modo === 'aprobar' && (
        <div className="hs-form">
          <label className="hs-campo">
            <span>Nombre como aparecerá en la lista (corrígelo si hace falta)</span>
            <input className="hs-input" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <div className="hs-campo">
            <span>Ícono</span>
            <div className="hs-iconos" role="radiogroup" aria-label="Ícono">
              {ICONOS_RAPIDOS.map((i) => (
                <button key={i} type="button" role="radio" aria-checked={icono === i} className={icono === i ? 'on' : ''} onClick={() => setIcono(i)}>{i}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modo === 'unir' && (
        <div className="hs-form">
          <label className="hs-campo">
            <span>Es lo mismo que…</span>
            <select className="hs-input" value={unirCon} onChange={(e) => setUnirCon(e.target.value)}>
              <option value="">Elige una habilidad de la lista</option>
              {catalogo.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
            </select>
          </label>
          <small className="hs-ayuda">Se le agrega esa habilidad al técnico y no se crea una nueva.</small>
        </div>
      )}

      {modo === 'rechazar' && (
        <div className="hs-form">
          <label className="hs-campo">
            <span>Motivo para el técnico <em>(opcional)</em></span>
            <input className="hs-input" maxLength={300} placeholder="Ej. Es muy general; elige Mantenimiento General." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
        </div>
      )}

      {error && <p className="hs-error" role="alert"><AlertCircle size={14} /> {error}</p>}

      {modo && (
        <div className="hs-acciones">
          <button type="button" className="hs-btn" onClick={() => { setModo(null); setError(''); }} disabled={enviando}>Volver</button>
          <button type="button" className={`hs-btn ${modo === 'rechazar' ? 'rojo' : 'verde'} lleno`} onClick={enviar} disabled={enviando}>
            {enviando ? 'Guardando…' : modo === 'aprobar' ? 'Agregar a la lista' : modo === 'unir' ? 'Unir' : 'Rechazar'}
          </button>
        </div>
      )}
    </article>
  );
};

const HabilidadesSugeridas = ({ onConteo }) => {
  const [vista, setVista] = useState('pendiente'); // 'pendiente' | 'resueltas'
  const [lista, setLista] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    setLista(null);
    try {
      const [res, cat] = await Promise.all([
        axios.get(`${API}/admin/especialidades/sugerencias`, { params: { estado: vista } }),
        axios.get(`${API}/specialties`),
      ]);
      const data = res.data?.data || [];
      setLista(data);
      setCatalogo(Array.isArray(cat.data) ? cat.data : []);
      if (vista === 'pendiente') onConteo?.(data.length);
    } catch (e) {
      setLista([]);
      setError(errorDe(e, 'No se pudieron cargar las sugerencias.'));
    }
  }, [vista, onConteo]);

  useEffect(() => { cargar(); }, [cargar]);

  const resuelta = (_id, mensaje) => {
    // Las sugerencias con el mismo nombre se resolvieron juntas: se recarga la lista
    if (mensaje) mostrarAviso(mensaje);
    cargar();
  };

  return (
    <div className="hs">
      <div className="hs-intro">
        <Lightbulb size={22} />
        <p>
          Habilidades que los técnicos no encontraron en la lista. Al aprobarlas o unirlas, se les agregan solas y les avisamos.
          Mantener la lista sin repetidos hace que los trabajos les lleguen a los técnicos correctos.
        </p>
      </div>

      <div className="hs-barra">
        <div className="hs-filtros" role="tablist">
          {[{ clave: 'pendiente', texto: 'Por revisar' }, { clave: 'resueltas', texto: 'Revisadas' }].map((f) => (
            <button key={f.clave} type="button" role="tab" aria-selected={vista === f.clave} className={vista === f.clave ? 'on' : ''} onClick={() => setVista(f.clave)}>
              {f.texto}
            </button>
          ))}
        </div>
        <button type="button" className="hs-btn" onClick={cargar}><RefreshCw size={15} /> Actualizar</button>
      </div>

      {error && <p className="hs-error" role="alert"><AlertCircle size={14} /> {error}</p>}

      {lista === null ? (
        <div className="hs-vacio"><Loader2 size={22} className="hs-girar" /> Cargando…</div>
      ) : lista.length === 0 ? (
        <div className="hs-vacio">{vista === 'pendiente' ? 'No hay habilidades por revisar.' : 'Aún no hay sugerencias revisadas.'}</div>
      ) : vista === 'pendiente' ? (
        <div className="hs-lista">
          {lista.map((s) => <Tarjeta key={s.id} s={s} catalogo={catalogo} onResuelta={resuelta} />)}
        </div>
      ) : (
        <div className="hs-lista">
          {lista.map((s) => {
            const est = ESTADOS[s.estado] || { texto: s.estado, clase: '' };
            const final = catalogo.find((c) => c.id === s.specialty_id);
            return (
              <article key={s.id} className="hs-card resuelta">
                <div className="hs-card-head">
                  <div className="hs-card-txt">
                    <strong>{s.nombre}{final && final.name !== s.nombre ? ` → ${final.name}` : ''}</strong>
                    <span>{s.tecnico?.nombre || 'Técnico'} · {fecha(s.creada)}</span>
                  </div>
                  <span className={`hs-estado ${est.clase}`}>{est.texto}</span>
                </div>
                {s.motivo && <p className="hs-comentario">Motivo: {s.motivo}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HabilidadesSugeridas;
