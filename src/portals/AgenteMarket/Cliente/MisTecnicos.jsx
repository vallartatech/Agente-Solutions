import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Star, Ban, Search, Clock, Briefcase, MessageSquareQuote, Wrench, ShieldCheck, Undo2, CalendarDays, Eye, ScanLine
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import CasaLoader from '../../../components/Shared/CasaLoader';
import EscanerQr from '../Shared/EscanerQr';
import ModalTecnicoRed from './ModalTecnicoRed';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';
import '../../../styles/AgenteMarket/Cliente/MisTecnicos.css';

// Mis técnicos (cliente particular, rol 4): historial de técnicos que trabajaron con él o le
// cotizaron en la red, más los que contrató escaneando su QR. Puede marcar hasta 3 favoritos
// (a ellos les manda solicitudes directas) o bloquearlos; un técnico bloqueado ya no ve sus
// trabajos en la red ni puede mandarle mensajes (eso lo hace cumplir el servidor).

const API = import.meta.env.VITE_API_BASE_URL;

const FILTROS = [
  { id: 'todos', texto: 'Todos' },
  { id: 'favorito', texto: 'Favoritos' },
  { id: 'bloqueado', texto: 'Bloqueados' },
];

// Chips que caben en la tarjeta; el resto va en "+N" (todas se ven en "Ver detalles")
const CHIPS_VISIBLES = 2;

const fechaCorta = (valor) => {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MisTecnicos = () => {
  const [tecnicos, setTecnicos] = useState([]);
  const [limite, setLimite] = useState(3);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(null);
  const [detalle, setDetalle] = useState(null);     // id del técnico en "Ver detalles"
  const [escaneando, setEscaneando] = useState(false);
  const [codigoLeido, setCodigoLeido] = useState(null);

  const cargar = useCallback(() => axios.get(`${API}/mis-tecnicos`)
    .then(r => {
      setTecnicos(r.data?.tecnicos || []);
      if (r.data?.limite_favoritos) setLimite(r.data.limite_favoritos);
    })
    .catch(() => mostrarAviso('No se pudo cargar tu historial de técnicos.', 'error'))
    .finally(() => setCargando(false)), []);

  useEffect(() => { cargar(); }, [cargar]);

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
      await axios.put(`${API}/mis-tecnicos/${tecnico.id}`, { estado });
      // Un técnico agregado por QR sin historial desaparece de la lista al quitarle la marca
      const sinHistorial = !tecnico.trabajos_contigo && !tecnico.cotizaciones;
      setTecnicos(prev => (estado === null && sinHistorial
        ? prev.filter(t => t.id !== tecnico.id)
        : prev.map(t => (t.id === tecnico.id ? { ...t, estado } : t))));
      if (estado === 'bloqueado' || (estado === null && sinHistorial)) setDetalle(null);
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
  const lleno = conteo.favorito >= limite;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tecnicos.filter(t => {
      if (filtro !== 'todos' && t.estado !== filtro) return false;
      if (!q) return true;
      return [t.nombre, t.rol, ...(t.especialidades || [])].join(' ').toLowerCase().includes(q);
    });
  }, [tecnicos, filtro, busqueda]);

  const tecnicoDetalle = tecnicos.find(t => t.id === detalle) || null;

  // Botones de favorito y bloqueo (en la tarjeta y en "Ver detalles")
  const accionesDe = (t, { conDetalles }) => {
    const esFav = t.estado === 'favorito';
    const ocupado = guardando === t.id;
    if (t.estado === 'bloqueado') {
      return (
        <>
          {conDetalles && (
            <button type="button" className="mt-btn" onClick={() => setDetalle(t.id)}><Eye size={16} /> Ver detalles</button>
          )}
          <button type="button" className="mt-btn" disabled={ocupado} onClick={() => cambiarEstado(t, null)}>
            <Undo2 size={16} /> Desbloquear
          </button>
        </>
      );
    }
    return (
      <>
        {conDetalles && (
          <button type="button" className="mt-btn mt-btn-primario" onClick={() => setDetalle(t.id)}>
            <Eye size={16} /> Ver detalles
          </button>
        )}
        <button
          type="button"
          className={`mt-btn ${esFav ? 'mt-btn-fav-activo' : ''} ${conDetalles ? '' : 'mt-btn-primario'}`}
          disabled={ocupado || (!esFav && lleno)}
          onClick={() => cambiarEstado(t, esFav ? null : 'favorito')}
          title={!esFav && lleno ? `Ya tienes ${limite} favoritos: quita uno para agregar a otro` : undefined}
        >
          <Star size={16} fill={esFav ? 'currentColor' : 'none'} />
          {conDetalles ? 'Favorito' : (esFav ? 'Quitar de favoritos' : 'Agregar a favoritos')}
        </button>
        <button
          type="button"
          className={`mt-btn mt-btn-peligro ${conDetalles ? 'mt-btn-icono' : ''}`}
          disabled={ocupado}
          onClick={() => cambiarEstado(t, 'bloqueado')}
          title="Bloquear técnico"
          aria-label={`Bloquear a ${t.nombre}`}
        >
          <Ban size={16} />{!conDetalles && ' Bloquear'}
        </button>
      </>
    );
  };

  return (
    <div className="mt-page">
      <Header activeModule="mis-tecnicos" titulo="MIS TÉCNICOS" />

      <div className="mt-contenido">
        <div className="mt-titulo">
          <span className="mt-titulo-icono"><Wrench size={18} /></span>
          <div>
            <h1>Mis técnicos</h1>
            <p>Técnicos que han trabajado contigo, te han cotizado o contrataste con su código QR. Tus favoritos (máximo {limite}) son a quienes puedes enviarles solicitudes directas.</p>
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
          <button type="button" className="mt-escanear" onClick={() => setEscaneando(true)}>
            <ScanLine size={18} /> Escanear QR
          </button>
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
                {f.texto} <small>{f.id === 'favorito' ? `${conteo.favorito}/${limite}` : conteo[f.id]}</small>
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
                ? 'Aún no tienes técnicos'
                : filtro === 'favorito' ? 'No tienes técnicos favoritos'
                : filtro === 'bloqueado' ? 'No has bloqueado a ningún técnico'
                : 'Ningún técnico coincide con la búsqueda'}
            </strong>
            {tecnicos.length === 0 && <p>Cuando publiques un trabajo en la red y un técnico te cotice o lo atienda, aparecerá aquí. También puedes escanear el código QR de un técnico para contratarlo.</p>}
          </div>
        ) : (
          <div className="mt-grid">
            {visibles.map(t => {
              const esFav = t.estado === 'favorito';
              const bloqueado = t.estado === 'bloqueado';
              const esp = t.especialidades || [];
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

                  <div className="mt-chips">
                    {esp.length === 0 && <span className="mt-chip mt-chip-vacio">Sin especialidades</span>}
                    {esp.slice(0, CHIPS_VISIBLES).map(e => <span key={e} className="mt-chip" title={e}>{e}</span>)}
                    {esp.length > CHIPS_VISIBLES && <span className="mt-chip mt-chip-mas">+{esp.length - CHIPS_VISIBLES}</span>}
                  </div>

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

                  <p className="mt-miembro">
                    <CalendarDays size={13} /> {t.miembro_desde ? `En la red desde ${fechaCorta(t.miembro_desde)}` : 'Técnico de la red'}
                  </p>

                  <footer className="mt-acciones">{accionesDe(t, { conDetalles: true })}</footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {tecnicoDetalle && (
        <ModalTecnicoRed
          tecnico={tecnicoDetalle}
          pie={<div className="mt-acciones">{accionesDe(tecnicoDetalle, { conDetalles: false })}</div>}
          onCerrar={() => setDetalle(null)}
        />
      )}

      {escaneando && (
        <EscanerQr
          onCodigo={(codigo) => { setEscaneando(false); setCodigoLeido(codigo); }}
          onCerrar={() => setEscaneando(false)}
        />
      )}

      {codigoLeido && (
        <ModalTecnicoRed
          codigo={codigoLeido}
          onContratado={() => { setCodigoLeido(null); setFiltro('favorito'); cargar(); }}
          onCerrar={() => setCodigoLeido(null)}
        />
      )}
    </div>
  );
};

export default MisTecnicos;
