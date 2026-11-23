import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, UserPlus, Clock, Copy, Share2, Lock, Unlock, UserMinus, ShieldCheck,
  GraduationCap, Star, Loader2, AlertCircle, Phone, ChevronDown, ChevronUp, HardHat, QrCode, X, Download
} from 'lucide-react';
import Header from '../../../components/Shared/Header';
import RegisterModal from '../../../components/Auth/Register';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';
import { enlaceInvitacionCuadrilla, dibujarQrCuadrilla } from '../Shared/qrCuadrilla';
import '../../../styles/AgenteMarket/Tecnico/MiCuadrilla.css';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

// QR para que el técnico lo escanee al registrarse (o lo abra con la cámara de su teléfono)
const ModalQrCuadrilla = ({ codigo, nombre, onCerrar }) => {
  const [imagen, setImagen] = useState(null);

  useEffect(() => {
    let vivo = true;
    dibujarQrCuadrilla(codigo).then((url) => { if (vivo) setImagen(url); }).catch(() => {});
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => { vivo = false; window.removeEventListener('keydown', alTeclear); };
  }, [codigo, onCerrar]);

  return (
    <div className="tqr-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="tqr-escaner mc-qr" role="dialog" aria-modal="true" aria-label="QR de tu cuadrilla">
        <header className="tqr-escaner-cabeza">
          <span className="tqr-escaner-icono"><QrCode size={18} /></span>
          <div>
            <h2>QR de tu cuadrilla</h2>
            <p>Tu técnico lo escanea al registrarse como Técnico de cuadrilla</p>
          </div>
          <button type="button" className="tqr-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="mc-qr-imagen">
          {imagen ? <img src={imagen} alt={`Código QR de la cuadrilla ${codigo}`} /> : <Loader2 size={28} className="mc-girar" />}
        </div>
        <strong className="mc-codigo mc-qr-codigo">{codigo}</strong>

        <a
          className={`tqr-btn tqr-btn-primario tqr-btn-ancho ${imagen ? '' : 'mc-desactivado'}`}
          href={imagen || undefined}
          download={`QR_cuadrilla_${String(nombre || codigo).replace(/[^\w]+/g, '_')}.png`}
          aria-disabled={!imagen}
        >
          <Download size={16} /> Descargar QR
        </a>
      </div>
    </div>
  );
};

const API = import.meta.env.VITE_API_BASE_URL;

// Del perfil profesional de su técnico, el contratista solo ve si ya está validado (nunca los documentos)
const PERFIL = {
  aprobado: { texto: 'Perfil validado', clase: 'ok' },
  en_revision: { texto: 'Perfil en revisión', clase: 'espera' },
  rechazado: { texto: 'Perfil por corregir', clase: 'alerta' },
  incompleto: { texto: 'Perfil sin completar', clase: 'alerta' },
};

const ESTADOS = { activo: 'Activo', bloqueado: 'Bloqueado', fuera: 'Fuera de la cuadrilla' };

const iniciales = (nombre) => String(nombre || '?')
  .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// "Mi cuadrilla" del contratista (rol 7): su equipo, el cupo, el código para invitar y la Sala de espera
const MiCuadrilla = () => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [verFuera, setVerFuera] = useState(false);
  const [ocupadoId, setOcupadoId] = useState(null);
  const [verQr, setVerQr] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await axios.get(`${API}/cuadrilla`);
      setDatos(data);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo cargar tu cuadrilla. Revisa tu conexión e intenta de nuevo.');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const codigo = datos?.cuadrilla?.codigo || '';
  const cupo = datos?.cupo || { ocupados: 0, limite: 0 };
  const llena = cupo.ocupados >= cupo.limite;
  const equipo = datos?.equipo || [];
  const activos = equipo.filter(t => t.estado !== 'fuera');
  const fuera = equipo.filter(t => t.estado === 'fuera');
  const enlaceRegistro = codigo ? enlaceInvitacionCuadrilla(codigo) : '';
  const cerrarQr = useCallback(() => setVerQr(false), []);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      mostrarAviso('Código copiado. Pásaselo a tu técnico para que se registre como Técnico de cuadrilla.', 'success');
    } catch {
      mostrarAviso(`Tu código es: ${codigo}`, 'info');
    }
  };

  const compartirCodigo = async () => {
    const texto = `Únete a mi cuadrilla en Agente Market. Regístrate como Técnico de cuadrilla con mi código ${codigo}: ${enlaceRegistro}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Únete a mi cuadrilla', text: texto }); } catch { /* lo cerró: no pasa nada */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const cambiarBloqueo = async (t) => {
    const bloquear = t.estado !== 'bloqueado';
    const ok = await confirmarAccion(bloquear
      ? `¿Bloquear a ${t.nombre}? No podrá entrar a su cuenta hasta que lo desbloquees.`
      : `¿Desbloquear a ${t.nombre}? Podrá volver a entrar a su cuenta.`, { peligro: bloquear });
    if (!ok) return;
    setOcupadoId(t.id);
    try {
      await axios.put(`${API}/usuarios/u_${t.id}/toggle-bloqueo`);
      await cargar();
    } catch (e) {
      mostrarAviso(e.response?.data?.error || 'No se pudo cambiar el acceso del técnico.', 'error');
    } finally {
      setOcupadoId(null);
    }
  };

  const quitar = async (t) => {
    const ok = await confirmarAccion(
      `¿Quitar a ${t.nombre} de tu cuadrilla? Su cuenta se desactivará y dejará de trabajar contigo. `
      + 'Los trabajos que ya hizo se conservan en tu historial.',
      { titulo: 'Quitar de mi cuadrilla', confirmar: 'Sí, quitar', peligro: true }
    );
    if (!ok) return;
    setOcupadoId(t.id);
    try {
      const { data } = await axios.post(`${API}/cuadrilla/${t.id}/quitar`);
      mostrarAviso(data?.message || 'Técnico quitado de tu cuadrilla.', 'success');
      await cargar();
    } catch (e) {
      mostrarAviso(e.response?.data?.error || 'No se pudo quitar al técnico.', 'error');
    } finally {
      setOcupadoId(null);
    }
  };

  // Tarjeta de un técnico (los que ya salieron se muestran sin acciones, solo por su historial)
  const tarjeta = (t) => {
    const perfil = PERFIL[t.perfil?.estado] || PERFIL.incompleto;
    const salio = t.estado === 'fuera';
    const ocupado = ocupadoId === t.id;

    return (
      <li key={t.id} className={`mc-tecnico ${salio ? 'mc-tecnico-fuera' : ''}`}>
        <div className="mc-tecnico-cabeza">
          {t.foto
            ? <img src={t.foto} alt="" className="mc-avatar" />
            : <div className="mc-avatar mc-avatar-letras">{iniciales(t.nombre)}</div>}
          <div className="mc-tecnico-datos">
            <strong>{t.nombre}</strong>
            {t.telefono && <span className="mc-dato"><Phone size={13} /> {t.telefono}</span>}
            {t.calificacion !== null && t.calificacion !== undefined && (
              <span className="mc-dato"><Star size={13} /> {t.calificacion} ({t.total_resenas})</span>
            )}
          </div>
          <span className={`mc-estado mc-estado-${t.estado}`}>{ESTADOS[t.estado] || t.estado}</span>
        </div>

        {t.especialidades?.length > 0 && (
          <div className="mc-chips">
            {t.especialidades.map(e => <span key={e.id} className="mc-chip">{e.icon ? `${e.icon} ` : ''}{e.name}</span>)}
          </div>
        )}

        {!salio && (
          <div className="mc-perfil">
            <span className={`mc-insignia mc-insignia-${perfil.clase}`}>{perfil.texto}</span>
            {t.con_red && <span className="mc-insignia mc-insignia-espera">🌐 También trabaja en el Mercado</span>}
            {t.perfil?.identidad_verificada && <span className="mc-insignia mc-insignia-ok"><ShieldCheck size={13} /> Identidad verificada</span>}
            {t.perfil?.estudios_verificados && <span className="mc-insignia mc-insignia-ok"><GraduationCap size={13} /> Estudios verificados</span>}
          </div>
        )}

        {!salio && (
          <div className="mc-acciones">
            <button type="button" className="mc-btn mc-btn-suave" disabled={ocupado} onClick={() => cambiarBloqueo(t)}>
              {t.estado === 'bloqueado' ? <><Unlock size={16} /> Desbloquear</> : <><Lock size={16} /> Bloquear</>}
            </button>
            <button type="button" className="mc-btn mc-btn-peligro" disabled={ocupado} onClick={() => quitar(t)}>
              <UserMinus size={16} /> Quitar
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mc-pagina">
      <Header activeModule="cuadrilla" />

      <main className="mc-contenido">
        <div className="mc-titulo">
          <HardHat size={28} />
          <div>
            <h1>Mi cuadrilla</h1>
            <p>{datos?.cuadrilla?.nombre || 'Tu equipo de trabajo'}</p>
          </div>
        </div>

        {error && (
          <div className="mc-aviso mc-aviso-error">
            <AlertCircle size={18} /> <span>{error}</span>
            <button type="button" className="mc-btn mc-btn-suave" onClick={cargar}>Reintentar</button>
          </div>
        )}

        {!datos && !error && (
          <div className="mc-cargando"><Loader2 size={28} className="mc-girar" /> Cargando tu cuadrilla...</div>
        )}

        {datos && (
          <>
            <section className="mc-resumen">
              <article className="mc-tarjeta">
                <span className="mc-etiqueta"><Users size={16} /> Técnicos</span>
                <strong className="mc-numero">{cupo.ocupados} <small>de {cupo.limite}</small></strong>
                <div className="mc-barra" aria-hidden="true">
                  <span style={{ width: `${cupo.limite ? Math.min(100, (cupo.ocupados / cupo.limite) * 100) : 0}%` }} />
                </div>
                <button type="button" className="mc-btn mc-btn-principal" disabled={llena} onClick={() => setMostrarAlta(true)}>
                  <UserPlus size={16} /> Agregar técnico
                </button>
                {llena && <small className="mc-nota">Tu cuadrilla está llena. Quita a alguien o pide ampliar tu equipo.</small>}
              </article>

              <article className="mc-tarjeta">
                <span className="mc-etiqueta"><Share2 size={16} /> Código de tu cuadrilla</span>
                <strong className="mc-codigo">{codigo || '—'}</strong>
                <small className="mc-nota">Tu técnico se registra como &quot;Técnico de cuadrilla&quot; con este código o escaneando tu QR, y te llega a la Sala de espera.</small>
                <div className="mc-fila-botones">
                  <button type="button" className="mc-btn mc-btn-suave" disabled={!codigo} onClick={copiarCodigo}><Copy size={16} /> Copiar</button>
                  <button type="button" className="mc-btn mc-btn-suave" disabled={!codigo} onClick={compartirCodigo}><Share2 size={16} /> Compartir</button>
                  <button type="button" className="mc-btn mc-btn-suave" disabled={!codigo} onClick={() => setVerQr(true)}><QrCode size={16} /> Ver QR</button>
                </div>
              </article>

              <article className="mc-tarjeta">
                <span className="mc-etiqueta"><Clock size={16} /> Sala de espera</span>
                <strong className="mc-numero">{datos.pendientes} <small>{datos.pendientes === 1 ? 'solicitud' : 'solicitudes'}</small></strong>
                <small className="mc-nota">Técnicos que se registraron con tu código y esperan que los aceptes.</small>
                <button type="button" className="mc-btn mc-btn-suave" onClick={() => navigate('/sala-espera-tecnicos')}>
                  Ver Sala de espera
                </button>
              </article>
            </section>

            <section className="mc-seccion">
              <h2>Tu equipo</h2>
              <p className="mc-privacidad">
                <ShieldCheck size={14} /> De cada técnico ves si su perfil ya fue validado. Sus documentos (INE, comprobantes) son privados.
              </p>

              {activos.length === 0 ? (
                <div className="mc-vacio">
                  <Users size={36} />
                  <strong>Aún no tienes técnicos en tu cuadrilla</strong>
                  <span>Comparte tu código para que se registren, o agrégalos tú con &quot;Agregar técnico&quot;.</span>
                </div>
              ) : (
                <ul className="mc-lista">{activos.map(tarjeta)}</ul>
              )}
            </section>

            {fuera.length > 0 && (
              <section className="mc-seccion">
                <button type="button" className="mc-plegable" onClick={() => setVerFuera(v => !v)} aria-expanded={verFuera}>
                  Fuera de la cuadrilla ({fuera.length}) {verFuera ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {verFuera && (
                  <>
                    <p className="mc-privacidad">Ya no trabajan contigo. Se conservan aquí por el historial de sus trabajos.</p>
                    <ul className="mc-lista">{fuera.map(tarjeta)}</ul>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <RegisterModal isOpen={mostrarAlta} onClose={() => setMostrarAlta(false)} onSuccess={cargar} />
      {verQr && codigo && (
        <ModalQrCuadrilla codigo={codigo} nombre={datos?.cuadrilla?.nombre} onCerrar={cerrarQr} />
      )}
    </div>
  );
};

export default MiCuadrilla;
