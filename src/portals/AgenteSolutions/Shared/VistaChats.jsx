import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  MessageCircle, Search, Plus, ArrowLeft, Users, Send, ImagePlus, X, Check, CheckCheck,
  UserPlus, LogOut, Pencil, Loader2, UserMinus, Info
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import { comprimirImagen } from '../../../components/Shared/comprimirImagen';
import { avisarChatsActualizados } from '../../../components/Shared/chatService';
import '../../../styles/AgenteSolutions/Shared/VistaChats.css';

const API = import.meta.env.VITE_API_BASE_URL;
const POLL_CONVERSACION = 3000;
const POLL_LISTA = 8000;

const iniciales = (nombre) => (nombre || '?').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '');
const claveDia = (iso) => (iso ? new Date(iso).toDateString() : '');

const etiquetaDia = (iso) => {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Hora o fecha corta para la lista de chats
const cuandoCorto = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return hora(iso);
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const Avatar = ({ foto, nombre, grupo = false, size = 44 }) => (
  <span className={`vch-avatar ${grupo ? 'grupo' : ''}`} style={{ width: size, height: size }}>
    {grupo ? <Users size={size * 0.45} /> : foto ? <img src={foto} alt="" /> : iniciales(nombre)}
  </span>
);

// Selector de personas (nuevo chat y agregar al grupo)
const SelectorPersonas = ({ titulo, contactos, excluir = [], modoNuevo = false, enviando, onConfirmar, onCerrar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [nombreGrupo, setNombreGrupo] = useState('');

  const disponibles = contactos.filter(c => !excluir.includes(c.id));
  const q = sinAcentos(busqueda.trim());
  const filtrados = q ? disponibles.filter(c => sinAcentos(c.nombre).includes(q)) : disponibles;
  const toggle = (id) => setElegidos(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const esGrupo = modoNuevo && elegidos.length > 1;

  const textoBoton = !elegidos.length
    ? 'Elige al menos a una persona'
    : modoNuevo
      ? (esGrupo ? `Crear grupo (${elegidos.length + 1})` : 'Abrir chat')
      : `Agregar (${elegidos.length})`;

  return createPortal(
    <div className="vch-overlay" onClick={() => !enviando && onCerrar()}>
      <div className="vch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="vch-modal-head">
          <h3>{titulo}</h3>
          <button type="button" className="vch-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {elegidos.length > 0 && (
          <div className="vch-elegidos">
            {elegidos.map(id => {
              const c = contactos.find(x => x.id === id);
              return (
                <button type="button" key={id} className="vch-elegido" onClick={() => toggle(id)} title="Quitar">
                  {c?.nombre} <X size={12} />
                </button>
              );
            })}
          </div>
        )}

        {esGrupo && (
          <input
            className="vch-input"
            placeholder="Nombre del grupo (opcional)"
            maxLength={80}
            value={nombreGrupo}
            onChange={e => setNombreGrupo(e.target.value)}
          />
        )}

        <label className="vch-buscar">
          <Search size={16} />
          <input type="search" placeholder="Buscar admin o técnico" value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
        </label>

        <ul className="vch-personas">
          {filtrados.map(c => {
            const sel = elegidos.includes(c.id);
            return (
              <li key={c.id}>
                <button type="button" className={`vch-persona ${sel ? 'sel' : ''}`} onClick={() => toggle(c.id)}>
                  <Avatar foto={c.foto} nombre={c.nombre} size={36} />
                  <span className="vch-persona-nombre">{c.nombre}</span>
                  <span className={`vch-rol ${c.rol === 'Técnico' ? 'tec' : ''}`}>{c.rol}</span>
                  <span className="vch-check">{sel && <Check size={14} strokeWidth={3} />}</span>
                </button>
              </li>
            );
          })}
          {!filtrados.length && <li className="vch-vacio-lista">{contactos.length ? 'Nadie coincide con la búsqueda' : 'Cargando equipo…'}</li>}
        </ul>

        <button
          type="button"
          className="vch-btn-primary"
          disabled={!elegidos.length || enviando}
          onClick={() => onConfirmar(elegidos, nombreGrupo.trim())}
        >
          {enviando ? <Loader2 size={17} className="vch-spin" /> : null} {textoBoton}
        </button>
      </div>
    </div>,
    document.body
  );
};

const VistaChats = () => {
  const { id: chatIdParam } = useParams();
  const chatId = chatIdParam ? Number(chatIdParam) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const yo = Number(user?.id);

  // ── Lista de chats ──
  const [chats, setChats] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargarLista = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chats`);
      setChats(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando chats:', err);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    cargarLista();
    const t = setInterval(cargarLista, POLL_LISTA);
    return () => clearInterval(t);
  }, [cargarLista]);

  const chatsFiltrados = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? chats.filter(c => sinAcentos(c.titulo).includes(q)) : chats;
  }, [chats, busqueda]);

  // ── Conversación abierta ──
  const [conv, setConv] = useState(null);
  const [cargandoConv, setCargandoConv] = useState(false);
  const [errorConv, setErrorConv] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [visor, setVisor] = useState(null);

  const mensajesRef = useRef(null);
  const fotoRef = useRef(null);
  const textoRef = useRef(null);
  const pegadoAbajo = useRef(true);
  const scrollAntes = useRef(null);
  const convIdRef = useRef(null);

  // Último mensaje ya guardado (los que se están enviando tienen id temporal)
  const ultimoId = useMemo(() => {
    const reales = (conv?.mensajes || []).filter(m => !m.temporal);
    return reales.length ? reales[reales.length - 1].id : 0;
  }, [conv?.mensajes]);

  const bajarAlFinal = () => {
    const el = mensajesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Abrir un chat
  useEffect(() => {
    convIdRef.current = chatId;
    setConv(null);
    setErrorConv('');
    setTexto('');
    if (!chatId) return;
    let cancelado = false;
    setCargandoConv(true);
    axios.get(`${API}/chats/${chatId}/mensajes`)
      .then(res => {
        if (cancelado) return;
        pegadoAbajo.current = true;
        setConv(res.data);
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, no_leidos: 0 } : c)));
        avisarChatsActualizados();
      })
      .catch(err => { if (!cancelado) setErrorConv(err.response?.data?.error || 'No se pudo abrir el chat.'); })
      .finally(() => { if (!cancelado) setCargandoConv(false); });
    return () => { cancelado = true; };
  }, [chatId]);

  // Mensajes nuevos cada pocos segundos
  useEffect(() => {
    if (!chatId || !conv) return;
    const t = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
        if (convIdRef.current !== chatId) return;
        const nuevos = res.data.mensajes || [];
        setConv(prev => prev && ({
          ...prev,
          chat: res.data.chat,
          activo: res.data.activo,
          puede_administrar: res.data.puede_administrar,
          participantes: res.data.participantes,
          mensajes: nuevos.length
            ? [...prev.mensajes.filter(m => !m.temporal), ...nuevos.filter(n => !prev.mensajes.some(m => m.id === n.id))]
            : prev.mensajes,
        }));
        if (nuevos.length) avisarChatsActualizados();
      } catch { /* reintenta en el siguiente ciclo */ }
    }, POLL_CONVERSACION);
    return () => clearInterval(t);
  }, [chatId, conv, ultimoId]);

  // Mantener el scroll: abajo si ya estaba abajo; en su lugar al cargar anteriores
  useLayoutEffect(() => {
    const el = mensajesRef.current;
    if (!el) return;
    if (scrollAntes.current !== null) {
      el.scrollTop = el.scrollHeight - scrollAntes.current;
      scrollAntes.current = null;
    } else if (pegadoAbajo.current) {
      bajarAlFinal();
    }
  }, [conv?.mensajes]);

  const onScrollMensajes = () => {
    const el = mensajesRef.current;
    if (el) pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const cargarAnteriores = async () => {
    if (!conv?.mensajes?.length || cargandoAnteriores) return;
    setCargandoAnteriores(true);
    try {
      const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { before_id: conv.mensajes[0].id } });
      scrollAntes.current = mensajesRef.current ? mensajesRef.current.scrollHeight - mensajesRef.current.scrollTop : null;
      setConv(prev => ({ ...prev, mensajes: [...res.data.mensajes, ...prev.mensajes], hay_anteriores: res.data.hay_anteriores }));
    } catch { /* sin cambios */ } finally {
      setCargandoAnteriores(false);
    }
  };

  // Enviar (texto o foto) con el mensaje visible al instante
  const enviar = async (foto = null) => {
    const contenido = texto.trim();
    if ((!contenido && !foto) || enviando || !conv?.activo) return;
    const temporal = {
      id: `tmp-${Date.now()}`,
      temporal: true,
      tipo: foto ? 'image' : 'text',
      texto: foto ? null : contenido,
      imagen: foto ? URL.createObjectURL(foto) : null,
      autor_id: yo,
      fecha: new Date().toISOString(),
    };
    pegadoAbajo.current = true;
    setConv(prev => ({ ...prev, mensajes: [...prev.mensajes, temporal] }));
    if (!foto) setTexto('');
    setEnviando(true);
    try {
      const data = new FormData();
      if (foto) data.append('image', foto); else data.append('body', contenido);
      const res = await axios.post(`${API}/chats/${chatId}/mensajes`, data);
      setConv(prev => ({ ...prev, mensajes: prev.mensajes.map(m => (m.id === temporal.id ? res.data.mensaje : m)) }));
      cargarLista();
    } catch (err) {
      setConv(prev => ({ ...prev, mensajes: prev.mensajes.filter(m => m.id !== temporal.id) }));
      if (!foto) setTexto(contenido);
      Swal.fire({ icon: 'error', title: 'No se envió', text: err.response?.data?.error || 'Revisa tu conexión e inténtalo de nuevo.', confirmButtonColor: '#f26522' });
    } finally {
      setEnviando(false);
      textoRef.current?.focus();
    }
  };

  const elegirFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) enviar(await comprimirImagen(file));
  };

  const onKeyDownTexto = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  };

  // Textarea que crece con el texto (hasta 5 líneas)
  useLayoutEffect(() => {
    const el = textoRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [texto]);

  // ── Nuevo chat / agregar / info del chat ──
  const [contactos, setContactos] = useState([]);
  const [selector, setSelector] = useState(null); // 'nuevo' | 'agregar'
  const [procesando, setProcesando] = useState(false);
  const [infoAbierta, setInfoAbierta] = useState(false);

  const abrirSelector = (modo) => {
    setSelector(modo);
    axios.get(`${API}/chats/contactos`).then(res => setContactos(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  };

  const confirmarSelector = async (ids, nombreGrupo) => {
    setProcesando(true);
    try {
      if (selector === 'nuevo') {
        const res = await axios.post(`${API}/chats`, { user_ids: ids, title: nombreGrupo || null });
        setSelector(null);
        await cargarLista();
        navigate(`/chats/${res.data.chat.id}`);
      } else {
        await axios.post(`${API}/chats/${chatId}/participantes`, { user_ids: ids });
        setSelector(null);
        const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
        setConv(prev => ({ ...prev, ...res.data, mensajes: [...prev.mensajes, ...res.data.mensajes] }));
        cargarLista();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.error || 'Intenta de nuevo.', confirmButtonColor: '#f26522' });
    } finally {
      setProcesando(false);
    }
  };

  const quitarPersona = async (persona) => {
    const esYo = persona.id === yo;
    setInfoAbierta(false); // la confirmación se abre encima, no detrás
    const ok = await Swal.fire({
      icon: 'warning',
      title: esYo ? '¿Salir del grupo?' : `¿Sacar a ${persona.nombre}?`,
      text: esYo
        ? 'Conservarás los mensajes anteriores, pero ya no verás los nuevos ni podrás escribir.'
        : 'Conservará los mensajes anteriores, pero ya no verá los nuevos ni podrá escribir.',
      showCancelButton: true,
      confirmButtonText: esYo ? 'Salir' : 'Sacar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${API}/chats/${chatId}/participantes/${persona.id}`);
      const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
      setConv(prev => ({ ...prev, ...res.data, mensajes: [...prev.mensajes, ...res.data.mensajes] }));
      cargarLista();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  const renombrar = async () => {
    setInfoAbierta(false);
    const { value, isConfirmed } = await Swal.fire({
      title: 'Nombre del grupo',
      input: 'text',
      inputValue: conv.chat.nombre_grupo || '',
      inputAttributes: { maxlength: 80 },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f26522',
      inputValidator: (v) => (!v.trim() ? 'Escribe un nombre' : undefined)
    });
    if (!isConfirmed) return;
    try {
      await axios.put(`${API}/chats/${chatId}`, { title: value.trim() });
      const res = await axios.get(`${API}/chats/${chatId}/mensajes`, { params: { after_id: ultimoId } });
      setConv(prev => ({ ...prev, ...res.data, mensajes: [...prev.mensajes, ...res.data.mensajes] }));
      cargarLista();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    }
  };

  // "Visto": en chats de 2, si la otra persona ya leyó; en grupos, cuántos lo leyeron
  const vistoDe = (m) => {
    if (m.temporal) return { icono: <Check size={14} />, texto: 'Enviando' };
    const otros = (conv?.participantes || []).filter(p => p.id !== yo);
    const leyeron = otros.filter(p => p.last_read_message_id >= m.id).length;
    if (!otros.length || !leyeron) return { icono: <Check size={14} />, texto: 'Enviado' };
    if (leyeron === otros.length) return { icono: <CheckCheck size={14} />, texto: conv.chat.es_grupo ? 'Visto por todos' : 'Visto', visto: true };
    return { icono: <CheckCheck size={14} />, texto: `Visto por ${leyeron}` };
  };

  const ultimoMioId = useMemo(() => {
    const mios = (conv?.mensajes || []).filter(m => m.autor_id === yo && m.tipo !== 'system');
    return mios.length ? mios[mios.length - 1].id : null;
  }, [conv?.mensajes, yo]);

  // ── Render ──
  const renderMensajes = () => {
    let diaAnterior = null;
    return conv.mensajes.map((m, i) => {
      const dia = claveDia(m.fecha);
      const separador = dia !== diaAnterior ? <div className="vch-dia" key={`d-${m.id}`}><span>{etiquetaDia(m.fecha)}</span></div> : null;
      diaAnterior = dia;

      if (m.tipo === 'system') {
        return <React.Fragment key={m.id}>{separador}<div className="vch-sistema"><span>{m.texto}</span></div></React.Fragment>;
      }

      const mio = m.autor_id === yo;
      const anterior = conv.mensajes[i - 1];
      const mismoAutor = anterior && anterior.autor_id === m.autor_id && anterior.tipo !== 'system' && claveDia(anterior.fecha) === dia;
      const visto = mio && m.id === ultimoMioId ? vistoDe(m) : null;

      return (
        <React.Fragment key={m.id}>
          {separador}
          <div className={`vch-msg ${mio ? 'mio' : 'otro'} ${mismoAutor ? 'seguido' : ''}`}>
            {!mio && conv.chat.es_grupo && !mismoAutor && (
              <Avatar foto={m.autor_foto} nombre={m.autor} size={28} />
            )}
            <div className="vch-burbuja">
              {!mio && conv.chat.es_grupo && !mismoAutor && <span className="vch-autor">{m.autor}</span>}
              {m.imagen && (
                <button type="button" className="vch-foto" onClick={() => setVisor(m.imagen)}>
                  <img src={m.imagen} alt="Foto" loading="lazy" />
                </button>
              )}
              {m.texto && <p className="vch-texto">{m.texto}</p>}
              <span className="vch-hora">
                {hora(m.fecha)}
                {mio && <span className={`vch-check-icono ${m.temporal ? 'enviando' : ''}`}>{m.temporal ? <Check size={13} /> : null}</span>}
              </span>
            </div>
          </div>
          {visto && <div className={`vch-visto ${visto.visto ? 'ok' : ''}`}>{visto.icono} {visto.texto}</div>}
        </React.Fragment>
      );
    });
  };

  const chat = conv?.chat;

  return (
    <div className={`vch-root ${chatId ? 'con-chat' : ''}`}>
      <Header activeModule="chats" titulo="CHATS" />

      <div className="vch-layout">
        {/* ── LISTA ── */}
        <aside className="vch-lista">
          <div className="vch-lista-head">
            <h1><MessageCircle size={22} /> Chats</h1>
            <button type="button" className="vch-btn-nuevo" onClick={() => abrirSelector('nuevo')} title="Nuevo chat" aria-label="Nuevo chat">
              <Plus size={20} />
            </button>
          </div>
          <label className="vch-buscar">
            <Search size={16} />
            <input type="search" placeholder="Buscar chat" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </label>

          <div className="vch-lista-items">
            {cargandoLista ? (
              <div className="vch-vacio"><Loader2 size={22} className="vch-spin" /></div>
            ) : !chatsFiltrados.length ? (
              <div className="vch-vacio">
                <MessageCircle size={30} />
                <span>{chats.length ? 'Ningún chat coincide' : 'Aún no tienes chats'}</span>
                {!chats.length && <button type="button" className="vch-btn-primary" onClick={() => abrirSelector('nuevo')}><Plus size={16} /> Nuevo chat</button>}
              </div>
            ) : chatsFiltrados.map(c => {
              const u = c.ultimo_mensaje;
              const previa = !u ? 'Sin mensajes'
                : u.tipo === 'system' ? u.texto
                  : `${u.autor_id === yo ? 'Tú: ' : (c.es_grupo && u.autor ? `${u.autor.split(' ')[0]}: ` : '')}${u.tipo === 'image' && !u.texto ? '📷 Foto' : u.texto}`;
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`vch-item ${c.id === chatId ? 'activo' : ''} ${c.no_leidos ? 'sin-leer' : ''}`}
                  onClick={() => navigate(`/chats/${c.id}`)}
                >
                  <Avatar foto={c.foto} nombre={c.titulo} grupo={c.es_grupo} />
                  <span className="vch-item-cuerpo">
                    <span className="vch-item-top">
                      <strong>{c.titulo}</strong>
                      <small>{cuandoCorto(u?.fecha)}</small>
                    </span>
                    <span className="vch-item-bottom">
                      <span className={`vch-previa ${u?.tipo === 'system' ? 'sistema' : ''}`}>{!c.activo ? 'Ya no participas · ' : ''}{previa}</span>
                      {c.no_leidos > 0 && <span className="vch-badge">{c.no_leidos > 99 ? '99+' : c.no_leidos}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── CONVERSACIÓN ── */}
        <section className="vch-conv">
          {!chatId ? (
            <div className="vch-conv-vacia">
              <MessageCircle size={46} />
              <h2>Chat del equipo</h2>
              <p>Elige un chat o empieza uno nuevo. Puedes hablar con una persona o armar grupos.</p>
            </div>
          ) : cargandoConv && !conv ? (
            <div className="vch-conv-vacia"><Loader2 size={28} className="vch-spin" /></div>
          ) : errorConv ? (
            <div className="vch-conv-vacia"><p>{errorConv}</p></div>
          ) : conv && (
            <>
              <header className="vch-conv-head">
                <button type="button" className="vch-icon-btn vch-volver" onClick={() => navigate('/chats')} aria-label="Volver a chats"><ArrowLeft size={20} /></button>
                <button type="button" className="vch-conv-titulo" onClick={() => setInfoAbierta(true)}>
                  <Avatar foto={chat.foto} nombre={chat.titulo} grupo={chat.es_grupo} size={40} />
                  <span>
                    <strong>{chat.titulo}</strong>
                    <small>
                      {chat.es_grupo
                        ? conv.participantes.map(p => (p.id === yo ? 'Tú' : p.nombre.split(' ')[0])).join(', ')
                        : (conv.participantes.find(p => p.id !== yo)?.rol || '')}
                    </small>
                  </span>
                </button>
                <button type="button" className="vch-icon-btn" onClick={() => setInfoAbierta(true)} aria-label="Información del chat"><Info size={19} /></button>
              </header>

              <div className="vch-mensajes" ref={mensajesRef} onScroll={onScrollMensajes}>
                {conv.hay_anteriores && (
                  <button type="button" className="vch-anteriores" onClick={cargarAnteriores} disabled={cargandoAnteriores}>
                    {cargandoAnteriores ? 'Cargando…' : 'Ver mensajes anteriores'}
                  </button>
                )}
                {!conv.mensajes.length && <div className="vch-sistema"><span>Escribe el primer mensaje 👋</span></div>}
                {renderMensajes()}
              </div>

              {conv.activo ? (
                <div className="vch-escribir">
                  <button type="button" className="vch-icon-btn" onClick={() => fotoRef.current?.click()} disabled={enviando} aria-label="Enviar foto"><ImagePlus size={20} /></button>
                  <input ref={fotoRef} type="file" accept="image/*" hidden onChange={elegirFoto} />
                  <textarea
                    ref={textoRef}
                    rows={1}
                    className="vch-textarea"
                    placeholder="Escribe un mensaje"
                    value={texto}
                    maxLength={4000}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={onKeyDownTexto}
                  />
                  <button type="button" className="vch-enviar" onClick={() => enviar()} disabled={!texto.trim() || enviando} aria-label="Enviar">
                    <Send size={18} />
                  </button>
                </div>
              ) : (
                <div className="vch-fuera">Ya no participas en este grupo. Puedes leer los mensajes hasta tu salida.</div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Info del chat ── */}
      {infoAbierta && conv && createPortal(
        <div className="vch-overlay" onClick={() => setInfoAbierta(false)}>
          <div className="vch-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Información del chat">
            <div className="vch-modal-head">
              <h3>{chat.es_grupo ? 'Info del grupo' : 'Info del chat'}</h3>
              <button type="button" className="vch-icon-btn" onClick={() => setInfoAbierta(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>

            <div className="vch-info-top">
              <Avatar foto={chat.foto} nombre={chat.titulo} grupo={chat.es_grupo} size={64} />
              <strong>{chat.titulo}</strong>
              {chat.es_grupo && <small>{conv.participantes.length} participantes</small>}
              {chat.es_grupo && conv.puede_administrar && (
                <button type="button" className="vch-link" onClick={renombrar}><Pencil size={14} /> Cambiar nombre</button>
              )}
            </div>

            {conv.activo && conv.puede_administrar && (
              <button type="button" className="vch-accion" onClick={() => { setInfoAbierta(false); abrirSelector('agregar'); }}>
                <UserPlus size={18} /> {chat.es_grupo ? 'Agregar participantes' : 'Agregar personas (crear grupo)'}
              </button>
            )}

            <ul className="vch-personas vch-participantes">
              {conv.participantes.map(p => (
                <li key={p.id} className="vch-persona">
                  <Avatar foto={p.foto} nombre={p.nombre} size={36} />
                  <span className="vch-persona-nombre">{p.id === yo ? 'Tú' : p.nombre}</span>
                  {p.es_creador && <span className="vch-rol creador">Creador</span>}
                  <span className={`vch-rol ${p.rol === 'Técnico' ? 'tec' : ''}`}>{p.rol}</span>
                  {chat.es_grupo && conv.activo && conv.puede_administrar && p.id !== yo && (
                    <button type="button" className="vch-icon-btn peligro" onClick={() => quitarPersona(p)} title="Sacar del grupo" aria-label={`Sacar a ${p.nombre}`}>
                      <UserMinus size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {chat.es_grupo && conv.activo && (
              <button type="button" className="vch-accion peligro" onClick={() => quitarPersona({ id: yo, nombre: 'Tú' })}>
                <LogOut size={18} /> Salir del grupo
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {selector && (
        <SelectorPersonas
          titulo={selector === 'nuevo' ? 'Nuevo chat' : 'Agregar participantes'}
          contactos={contactos}
          excluir={selector === 'agregar' ? (conv?.participantes || []).map(p => p.id) : []}
          modoNuevo={selector === 'nuevo'}
          enviando={procesando}
          onConfirmar={confirmarSelector}
          onCerrar={() => setSelector(null)}
        />
      )}

      {visor && createPortal(
        <div className="vch-visor" onClick={() => setVisor(null)}>
          <button type="button" className="vch-visor-cerrar" aria-label="Cerrar"><X size={22} /></button>
          <img src={visor} alt="Foto" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default VistaChats;
