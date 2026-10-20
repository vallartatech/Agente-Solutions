import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  ReceiptText as Receipt, Camera, ImagePlus, X, Send, CheckCircle2, Clock, Search,
  FileText, Loader2, Plus
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import { comprimirImagen } from '../../../components/Shared/comprimirImagen';
import '../../../styles/AgenteSolutions/Shared/VistaComprobantes.css';

const API = import.meta.env.VITE_API_BASE_URL;
const MAX_ARCHIVOS = 6;
const EMPRESAS = [
  { key: 'agente', nombre: 'Agente Solutions', color: '#f26522' },
  { key: 'mantenere', nombre: 'Mantenere', color: '#2563eb' }
];
const empresaDe = (key) => EMPRESAS.find(e => e.key === key) || { key, nombre: key, color: '#64748b' };

const dinero = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fecha = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const nombre = (u) => (u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '');
const esPdf = (f) => (f.mime || '').includes('pdf') || /\.pdf($|\?)/i.test(f.url || '');

const formularioVacio = () => ({ archivos: [], empresa: '', nota: '', monto: '' });

const VistaComprobantes = () => {
  const { user } = useAuth();

  // Solo los secretarios (y root) ven comprobantes; los demás únicamente suben
  const [permisos, setPermisos] = useState(null);
  const tieneBandeja = (permisos?.inbox_companies?.length || 0) > 0;
  const vista = tieneBandeja ? 'bandeja' : 'subir';

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');

  const [items, setItems] = useState([]);
  const [pagina, setPagina] = useState({ actual: 1, ultima: 1, total: 0 });
  const [cargando, setCargando] = useState(true);

  const [mostrarSubir, setMostrarSubir] = useState(false);
  const [form, setForm] = useState(formularioVacio);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [visor, setVisor] = useState(null);

  const camaraRef = useRef(null);
  const galeriaRef = useRef(null);

  const cargarPermisos = useCallback(() => {
    axios.get(`${API}/comprobantes/estado`)
      .then(res => setPermisos(res.data))
      .catch(() => setPermisos({ can_upload: true, inbox_companies: [], pending_inbox: 0 }));
  }, []);

  useEffect(() => { cargarPermisos(); }, [cargarPermisos, user?.id]);

  // La bandeja abre en Pendientes
  useEffect(() => {
    setFiltroEstado(vista === 'bandeja' ? 'pendiente' : '');
  }, [vista]);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Al cambiar de pestaña o filtro se ignoran respuestas de peticiones anteriores
  const peticionRef = useRef(0);

  const cargar = useCallback(async (page = 1) => {
    if (!permisos) return;
    if (!tieneBandeja) { setCargando(false); return; }
    const peticion = ++peticionRef.current;
    setCargando(true);
    try {
      const res = await axios.get(`${API}/comprobantes`, {
        params: {
          page,
          estado: filtroEstado || undefined,
          empresa: filtroEmpresa || undefined,
          q: busquedaAplicada || undefined
        }
      });
      if (peticion !== peticionRef.current) return;
      const data = res.data;
      setItems(prev => (page === 1 ? data.data : [...prev, ...data.data]));
      setPagina({ actual: data.current_page, ultima: data.last_page, total: data.total });
    } catch (err) {
      if (peticion !== peticionRef.current) return;
      console.error('Error cargando comprobantes:', err);
      if (page === 1) setItems([]);
    } finally {
      if (peticion === peticionRef.current) setCargando(false);
    }
  }, [permisos, tieneBandeja, filtroEstado, filtroEmpresa, busquedaAplicada]);

  useEffect(() => { cargar(1); }, [cargar]);

  // ── Formulario de subida ──
  const abrirSubir = () => {
    setForm(formularioVacio());
    setMostrarSubir(true);
  };

  const cerrarSubir = () => {
    if (enviando) return;
    form.archivos.forEach(a => a.preview && URL.revokeObjectURL(a.preview));
    setMostrarSubir(false);
  };

  const agregarArchivos = async (fileList) => {
    const nuevos = Array.from(fileList || []);
    if (!nuevos.length) return;
    const espacio = MAX_ARCHIVOS - form.archivos.length;
    if (nuevos.length > espacio) {
      Swal.fire({ icon: 'info', title: `Máximo ${MAX_ARCHIVOS} archivos`, text: 'Se agregaron solo los que caben.', confirmButtonColor: '#f26522' });
    }
    const listos = await Promise.all(nuevos.slice(0, Math.max(0, espacio)).map(async (f) => {
      const file = await comprimirImagen(f);
      return { file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null };
    }));
    setForm(prev => ({ ...prev, archivos: [...prev.archivos, ...listos] }));
  };

  const quitarArchivo = (idx) => {
    setForm(prev => {
      const a = prev.archivos[idx];
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return { ...prev, archivos: prev.archivos.filter((_, i) => i !== idx) };
    });
  };

  const faltante = !form.archivos.length
    ? 'Agrega al menos una foto'
    : !form.empresa
      ? 'Elige la empresa'
      : !form.nota.trim()
        ? 'Escribe una nota'
        : '';

  const enviar = async (e) => {
    e.preventDefault();
    if (faltante || enviando) return;
    setEnviando(true);
    try {
      const data = new FormData();
      data.append('company', form.empresa);
      data.append('note', form.nota.trim());
      if (form.monto !== '') data.append('amount', form.monto);
      form.archivos.forEach(a => data.append('files[]', a.file));

      const res = await axios.post(`${API}/comprobantes`, data);
      form.archivos.forEach(a => a.preview && URL.revokeObjectURL(a.preview));
      setMostrarSubir(false);

      const empresa = empresaDe(form.empresa).nombre;
      const push = res.data?.push;
      Swal.fire({
        icon: push && !push.sent && push.recipients === 0 ? 'warning' : 'success',
        title: 'Comprobante enviado',
        text: push && !push.sent && push.recipients === 0
          ? `Se guardó, pero ${empresa} aún no tiene un secretario asignado.`
          : `Le llegó al secretario de ${empresa}.`,
        timer: 2600,
        showConfirmButton: false
      });

      if (tieneBandeja) { cargar(1); cargarPermisos(); }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar',
        text: err.response?.status === 413
          ? 'Las fotos pesan demasiado. Intenta con menos fotos.'
          : (err.response?.data?.error || 'Revisa tu conexión e inténtalo de nuevo.'),
        confirmButtonColor: '#f26522'
      });
    } finally {
      setEnviando(false);
    }
  };

  // ── Acciones de la bandeja ──
  const confirmar = async (item) => {
    setConfirmandoId(item.id);
    try {
      const res = await axios.post(`${API}/comprobantes/${item.id}/confirmar`);
      const actualizado = res.data.receipt;
      setItems(prev => filtroEstado === 'pendiente'
        ? prev.filter(i => i.id !== item.id)
        : prev.map(i => (i.id === item.id ? actualizado : i)));
      setPagina(prev => (filtroEstado === 'pendiente' ? { ...prev, total: Math.max(0, prev.total - 1) } : prev));
      setPermisos(prev => prev ? { ...prev, pending_inbox: Math.max(0, (prev.pending_inbox || 0) - 1) } : prev);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo confirmar', text: err.response?.data?.error || 'Intenta de nuevo.' });
    } finally {
      setConfirmandoId(null);
    }
  };

  const filtrosEstado = [
    { key: '', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'confirmado', label: 'Confirmados' }
  ];

  return (
    <div className="vcb-root">
      <Header activeModule="comprobantes" titulo="COMPROBANTES" />

      <main className="vcb-main">
        {!permisos ? (
          <div className="vcb-empty"><Loader2 size={26} className="vcb-spin" /> Cargando…</div>
        ) : vista === 'subir' ? (
          /* Técnicos y admins: solo envían; los comprobantes los ve el secretario */
          <section className="vcb-intro">
            <span className="vcb-intro-icon"><Receipt size={34} /></span>
            <h1>Comprobantes</h1>
            <p>Toma foto a la nota, ticket o factura, elige la empresa y agrega una nota. Le llegará al secretario correspondiente.</p>
            <button type="button" className="vcb-btn-primary vcb-intro-btn" onClick={abrirSubir}>
              <Plus size={18} /> Subir comprobante
            </button>
          </section>
        ) : (
        <>
        <div className="vcb-head">
          <div>
            <h1 className="vcb-title">
              <Receipt size={24} /> Comprobantes
              {permisos?.pending_inbox > 0 && <span className="vcb-badge" title="Pendientes de confirmar">{permisos.pending_inbox}</span>}
            </h1>
            <p className="vcb-subtitle">
              Comprobantes que te enviaron{permisos?.inbox_companies?.length === 1 ? ` para ${empresaDe(permisos.inbox_companies[0]).nombre}` : ''}
            </p>
          </div>
          <button type="button" className="vcb-btn-primary" onClick={abrirSubir}>
            <Plus size={18} /> Subir comprobante
          </button>
        </div>

        <div className="vcb-filters">
          <div className="vcb-chips">
            {filtrosEstado.map(f => (
              <button key={f.key || 'todos'} type="button" className={`vcb-chip ${filtroEstado === f.key ? 'active' : ''}`} onClick={() => setFiltroEstado(f.key)}>
                {f.label}
              </button>
            ))}
            {permisos?.inbox_companies?.length > 1 && (
              <select className="vcb-select" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)} aria-label="Empresa">
                <option value="">Ambas empresas</option>
                {EMPRESAS.map(e => <option key={e.key} value={e.key}>{e.nombre}</option>)}
              </select>
            )}
          </div>
          <label className="vcb-search">
            <Search size={16} />
            <input type="search" placeholder="Buscar por nota o por quien lo envió" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
        </div>

        {cargando && items.length === 0 ? (
          <div className="vcb-empty"><Loader2 size={26} className="vcb-spin" /> Cargando…</div>
        ) : items.length === 0 ? (
          <div className="vcb-empty">
            <Receipt size={34} />
            <strong>No hay comprobantes aquí</strong>
          </div>
        ) : (
          <>
            <p className="vcb-count">{pagina.total} comprobante{pagina.total === 1 ? '' : 's'}</p>
            <ul className="vcb-list">
              {items.map(item => {
                const emp = empresaDe(item.company);
                const confirmado = item.status === 'confirmado';
                return (
                  <li key={item.id} className={`vcb-card ${confirmado ? 'is-done' : ''}`}>
                    <div className="vcb-thumbs">
                      {item.files.map(f => (
                        esPdf(f) ? (
                          <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="vcb-thumb vcb-thumb-pdf" title="Abrir PDF">
                            <FileText size={22} /><span>PDF</span>
                          </a>
                        ) : (
                          <button key={f.id} type="button" className="vcb-thumb" onClick={() => setVisor(f.url)} title="Ver foto">
                            <img src={f.url} alt="Comprobante" loading="lazy" />
                          </button>
                        )
                      ))}
                    </div>

                    <div className="vcb-card-body">
                      <div className="vcb-card-top">
                        <span className="vcb-company" style={{ '--c': emp.color }}>{emp.nombre}</span>
                        {item.amount != null && <span className="vcb-amount">{dinero(item.amount)}</span>}
                      </div>
                      <p className="vcb-note">{item.note}</p>
                      <p className="vcb-meta">
                        Enviado por <strong>{nombre(item.sender) || 'Usuario'}</strong> · {fecha(item.created_at)}
                      </p>

                      <div className="vcb-card-foot">
                        {confirmado ? (
                          <span className="vcb-status done">
                            <CheckCircle2 size={15} /> Confirmado{item.confirmer ? ` por ${nombre(item.confirmer)}` : ''} · {fecha(item.confirmed_at)}
                          </span>
                        ) : (
                          <span className="vcb-status pending"><Clock size={15} /> Pendiente de confirmar</span>
                        )}

                        <div className="vcb-actions">
                          {!confirmado && (
                            <button type="button" className="vcb-btn-confirm" onClick={() => confirmar(item)} disabled={confirmandoId === item.id}>
                              {confirmandoId === item.id ? <Loader2 size={16} className="vcb-spin" /> : <CheckCircle2 size={16} />}
                              Confirmar recibido
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {pagina.actual < pagina.ultima && (
              <button type="button" className="vcb-more" onClick={() => cargar(pagina.actual + 1)} disabled={cargando}>
                {cargando ? 'Cargando…' : 'Ver más'}
              </button>
            )}
          </>
        )}
        </>
        )}
      </main>

      {/* ── Hoja para subir comprobante ── */}
      {mostrarSubir && createPortal(
        <div className="vcb-overlay" onClick={cerrarSubir}>
          <form className="vcb-sheet" onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
            <div className="vcb-sheet-head">
              <div>
                <span className="vcb-sheet-tag">NUEVO</span>
                <h2>Subir comprobante</h2>
              </div>
              <button type="button" className="vcb-close" onClick={cerrarSubir} aria-label="Cerrar"><X size={18} /></button>
            </div>

            <div className="vcb-sheet-body">
              {/* 1. Fotos */}
              <section>
                <span className="vcb-label">1. Foto de la nota o factura</span>
                <div className="vcb-upload-grid">
                  {form.archivos.map((a, i) => (
                    <div key={i} className="vcb-upload-item">
                      {a.preview ? <img src={a.preview} alt="" /> : <span className="vcb-upload-pdf"><FileText size={22} /> PDF</span>}
                      <button type="button" className="vcb-upload-remove" onClick={() => quitarArchivo(i)} aria-label="Quitar"><X size={14} /></button>
                    </div>
                  ))}
                  {form.archivos.length < MAX_ARCHIVOS && (
                    <>
                      <button type="button" className="vcb-upload-add" onClick={() => camaraRef.current?.click()}>
                        <Camera size={22} /> Tomar foto
                      </button>
                      <button type="button" className="vcb-upload-add" onClick={() => galeriaRef.current?.click()}>
                        <ImagePlus size={22} /> Galería / PDF
                      </button>
                    </>
                  )}
                </div>
                <input ref={camaraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ''; }} />
                <input ref={galeriaRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ''; }} />
              </section>

              {/* 2. Empresa */}
              <section>
                <span className="vcb-label">2. ¿Para qué empresa es?</span>
                <div className="vcb-company-pick">
                  {EMPRESAS.map(e => (
                    <button
                      key={e.key}
                      type="button"
                      className={`vcb-company-btn ${form.empresa === e.key ? 'active' : ''}`}
                      style={{ '--c': e.color }}
                      onClick={() => setForm(prev => ({ ...prev, empresa: e.key }))}
                      aria-pressed={form.empresa === e.key}
                    >
                      {form.empresa === e.key && <CheckCircle2 size={16} />} {e.nombre}
                    </button>
                  ))}
                </div>
              </section>

              {/* 3. Nota */}
              <section>
                <label className="vcb-label" htmlFor="vcb-nota">3. Nota</label>
                <textarea
                  id="vcb-nota"
                  className="vcb-input"
                  rows={3}
                  maxLength={500}
                  placeholder="¿Qué se compró y para qué? Ej. Material para reparación de baño en Calle 60"
                  value={form.nota}
                  onChange={(e) => setForm(prev => ({ ...prev, nota: e.target.value }))}
                  required
                />
              </section>

              {/* Monto opcional */}
              <section>
                <label className="vcb-label" htmlFor="vcb-monto">Monto <em>(opcional)</em></label>
                <div className="vcb-money">
                  <span>$</span>
                  <input
                    id="vcb-monto"
                    className="vcb-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={(e) => setForm(prev => ({ ...prev, monto: e.target.value }))}
                  />
                </div>
              </section>
            </div>

            <div className="vcb-sheet-foot">
              <button type="submit" className="vcb-btn-primary vcb-btn-block" disabled={Boolean(faltante) || enviando}>
                {enviando ? <><Loader2 size={18} className="vcb-spin" /> Enviando…</> : faltante ? faltante : <><Send size={18} /> Enviar a {empresaDe(form.empresa).nombre}</>}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ── Visor de foto ── */}
      {visor && createPortal(
        <div className="vcb-viewer" onClick={() => setVisor(null)}>
          <button type="button" className="vcb-viewer-close" aria-label="Cerrar"><X size={22} /></button>
          <img src={visor} alt="Comprobante" onClick={(e) => e.stopPropagation()} />
          <a href={visor} target="_blank" rel="noreferrer" className="vcb-viewer-open" onClick={(e) => e.stopPropagation()}>Abrir original</a>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VistaComprobantes;
