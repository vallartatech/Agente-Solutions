import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Star, Ban, Search, Clock, Briefcase, MessageSquareQuote, Wrench, ShieldCheck, Undo2, CalendarDays
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import CasaLoader from '../../../components/Shared/CasaLoader';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Cliente/MisTecnicos.css';

// Mis técnicos (cliente particular, rol 4): historial de técnicos que trabajaron con él o le
// cotizaron en la red. Puede marcarlos como favoritos o bloquearlos; un técnico bloqueado
// ya no ve sus trabajos en la red ni puede mandarle mensajes (eso lo hace cumplir el servidor).

const FILTROS = [
  { id: 'todos', texto: 'Todos' },
  { id: 'favorito', texto: 'Favoritos' },
  { id: 'bloqueado', texto: 'Bloqueados' },
];

const fechaCorta = (valor) => {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MisTecnicos = () => {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/mis-tecnicos`)
      .then(r => setTecnicos(r.data?.tecnicos || []))
      .catch(() => mostrarAviso('No se pudo cargar tu historial de técnicos.', 'error'))
      .finally(() => setCargando(false));
  }, []);

  const cambiarEstado = async (tecnico, estado) => {
    if (estado === 'bloqueado') {
      const ok = await confirmarAccion(
        `${tecnico.nombre} ya no verá los trabajos que publiques en la red y no podrá enviarte mensajes. Puedes desbloquearlo cuando quieras.`,
        { titulo: '¿Bloquear a este técnico?', confirmar: 'Sí, bloquear', peligro: true }
      );
      if (!ok) return;
    }
    setGuardando(tecnico.id);
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/mis-tecnicos/${tecnico.id}`, { estado });
      setTecnicos(prev => prev.map(t => (t.id === tecnico.id ? { ...t, estado } : t)));
    } catch (e) {
      mostrarAviso(e.response?.data?.message || 'No se pudo guardar el cambio.', 'error');
    } finally {
      setGuardando(null);
    }
  };

  const conteo = useMemo(() => ({
    todos: tecnicos.length,
    favorito: tecnicos.filter(t => t.estado === 'favorito').length,
    bloqueado: tecnicos.filter(t => t.estado === 'bloqueado').length,
  }), [tecnicos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tecnicos.filter(t => {
      if (filtro !== 'todos' && t.estado !== filtro) return false;
      if (!q) return true;
      return [t.nombre, t.rol, ...(t.especialidades || [])].join(' ').toLowerCase().includes(q);
    });
  }, [tecnicos, filtro, busqueda]);

  return (
    <div className="mt-page">
      <Header activeModule="mis-tecnicos" titulo="MIS TÉCNICOS" />

      <div className="mt-contenido">
        <div className="mt-titulo">
          <span className="mt-titulo-icono"><Wrench size={18} /></span>
          <div>
            <h1>Mis técnicos</h1>
            <p>Técnicos que han trabajado contigo o te han cotizado. Marca a tus favoritos o bloquea a quien no quieras volver a contratar.</p>
          </div>
        </div>

        <div className="mt-barra">
          <label className="mt-buscador">
            <Search size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
            />
          </label>
          <div className="mt-filtros" role="tablist">
            {FILTROS.map(f => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                className={`mt-filtro ${filtro === f.id ? 'activo' : ''}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.texto} <small>{conteo[f.id]}</small>
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <CasaLoader texto="Cargando tus técnicos..." />
        ) : visibles.length === 0 ? (
          <div className="mt-vacio">
            <span className="mt-vacio-icono"><Wrench size={26} /></span>
            <strong>
              {tecnicos.length === 0
                ? 'Aún no has trabajado con ningún técnico'
                : filtro === 'favorito' ? 'No tienes técnicos favoritos'
                : filtro === 'bloqueado' ? 'No has bloqueado a ningún técnico'
                : 'Ningún técnico coincide con la búsqueda'}
            </strong>
            {tecnicos.length === 0 && <p>Cuando publiques un trabajo en la red y un técnico te cotice o lo atienda, aparecerá aquí.</p>}
          </div>
        ) : (
          <div className="mt-grid">
            {visibles.map(t => {
              const esFav = t.estado === 'favorito';
              const bloqueado = t.estado === 'bloqueado';
              const ocupado = guardando === t.id;
              return (
                <article key={t.id} className={`mt-card ${bloqueado ? 'is-bloqueado' : ''} ${esFav ? 'is-favorito' : ''}`}>
                  <header className="mt-card-cabecera">
                    <div className="mt-avatar">
                      {t.foto ? <img src={t.foto} alt="" /> : <span>{(t.nombre || 'T').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="mt-identidad">
                      <h3>{t.nombre}</h3>
                      <span className="mt-rol"><ShieldCheck size={13} /> {t.rol}</span>
                    </div>
                    {esFav && <span className="mt-sello favorito"><Star size={13} fill="currentColor" /> Favorito</span>}
                    {bloqueado && <span className="mt-sello bloqueado"><Ban size={13} /> Bloqueado</span>}
                  </header>

                  {t.especialidades?.length > 0 && (
                    <div className="mt-chips">
                      {t.especialidades.slice(0, 4).map(e => <span key={e} className="mt-chip">{e}</span>)}
                      {t.especialidades.length > 4 && <span className="mt-chip">+{t.especialidades.length - 4}</span>}
                    </div>
                  )}

                  <div className="mt-datos">
                    <div className="mt-dato">
                      <Star size={15} />
                      <span>{t.calificacion != null ? t.calificacion.toFixed(1) : '—'}</span>
                      <small>{t.resenas ? `${t.resenas} reseña${t.resenas === 1 ? '' : 's'}` : 'Sin reseñas'}</small>
                    </div>
                    <div className="mt-dato">
                      <Clock size={15} />
                      <span>{t.puntualidad != null ? t.puntualidad.toFixed(1) : '—'}</span>
                      <small>Puntualidad</small>
                    </div>
                    <div className="mt-dato">
                      <Briefcase size={15} />
                      <span>{t.trabajos_contigo}</span>
                      <small>Trabajo{t.trabajos_contigo === 1 ? '' : 's'} contigo</small>
                    </div>
                    <div className="mt-dato">
                      <MessageSquareQuote size={15} />
                      <span>{t.cotizaciones}</span>
                      <small>Cotizacion{t.cotizaciones === 1 ? '' : 'es'}</small>
                    </div>
                  </div>

                  {t.servicios?.length > 0 && (
                    <ul className="mt-historial">
                      {t.servicios.slice(0, 3).map(s => (
                        <li key={s.id}>
                          <span className={`mt-punto ${s.trabajo ? 'trabajo' : ''}`} />
                          <span className="mt-historial-titulo">{s.titulo}</span>
                          <small>{s.trabajo ? 'Lo atendió' : 'Te cotizó'} · {fechaCorta(s.fecha)}</small>
                        </li>
                      ))}
                    </ul>
                  )}

                  {t.miembro_desde && (
                    <p className="mt-miembro"><CalendarDays size={13} /> En la red desde {fechaCorta(t.miembro_desde)}</p>
                  )}

                  <footer className="mt-acciones">
                    {bloqueado ? (
                      <button type="button" className="mt-btn" disabled={ocupado} onClick={() => cambiarEstado(t, null)}>
                        <Undo2 size={16} /> Desbloquear
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`mt-btn ${esFav ? 'mt-btn-fav-activo' : 'mt-btn-primario'}`}
                          disabled={ocupado}
                          onClick={() => cambiarEstado(t, esFav ? null : 'favorito')}
                        >
                          <Star size={16} fill={esFav ? 'currentColor' : 'none'} /> {esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        </button>
                        <button
                          type="button"
                          className="mt-btn mt-btn-peligro"
                          disabled={ocupado}
                          onClick={() => cambiarEstado(t, 'bloqueado')}
                          title="Bloquear técnico"
                          aria-label={`Bloquear a ${t.nombre}`}
                        >
                          <Ban size={16} /> Bloquear
                        </button>
                      </>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisTecnicos;
