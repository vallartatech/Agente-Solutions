import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Loader2, History, AlertCircle } from 'lucide-react';
import FichaTecnicoQr from '../Shared/FichaTecnicoQr';
import ContratarTecnico from '../Shared/ContratarTecnico';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

const API = import.meta.env.VITE_API_BASE_URL;

const fechaCorta = (valor) => {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Perfil mínimo con lo que ya trae la tarjeta, por si el técnico no es de la red (sin QR)
const desdeTarjeta = (t = {}) => ({
  nombre: t.nombre,
  foto: t.foto,
  rol: t.rol,
  miembro_desde: t.miembro_desde,
  calificacion: t.calificacion,
  puntualidad: t.puntualidad,
  total_resenas: t.resenas,
  especialidades: t.especialidades || [],
});

/**
 * Perfil de un técnico para el cliente de la red.
 *  - "Ver detalles" (tecnico = fila de Mis técnicos): ficha + historial contigo + QR + `pie` (favorito/bloquear)
 *  - Escaneo (codigo):                                 ficha + botón Contratar
 */
const ModalTecnicoRed = ({ tecnico = null, codigo = null, pie = null, onContratado, onCerrar }) => {
  const [perfil, setPerfil] = useState(null);
  const [relacion, setRelacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Por qué no hay QR en "Ver detalles": 'no_red' (técnico interno, el servidor respondió 404) o 'error'
  const [sinQr, setSinQr] = useState(null);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    setSinQr(null);
    const url = codigo ? `${API}/red/qr/${codigo}` : `${API}/mis-tecnicos/${tecnico.id}/detalle`;
    axios.get(url)
      .then((r) => { if (vivo) { setPerfil(r.data.data); setRelacion(r.data.relacion || null); } })
      .catch((e) => {
        if (!vivo) return;
        if (tecnico) {
          setPerfil(desdeTarjeta(tecnico));
          setSinQr(e.response?.status === 404 && e.response?.data?.message ? 'no_red' : 'error');
        } else setError(e.response?.status === 404 ? 'Este código QR no corresponde a ningún técnico de la red.' : 'No se pudo cargar el perfil del técnico.');
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [codigo, tecnico?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const servicios = tecnico?.servicios || [];

  return createPortal(
    <div className="tqr-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="tqr-modal" role="dialog" aria-modal="true" aria-label={`Perfil de ${perfil?.nombre || tecnico?.nombre || 'técnico'}`}>
        <div className="tqr-modal-barra">
          <span>{codigo ? 'Técnico escaneado' : 'Detalles del técnico'}</span>
          <button type="button" className="tqr-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="tqr-modal-scroll">
          {cargando ? (
            <div className="tqr-cargando"><Loader2 size={26} className="tqr-girar" /> Cargando perfil…</div>
          ) : error ? (
            <div className="tqr-cargando tqr-error"><AlertCircle size={26} /> {error}</div>
          ) : (
            <FichaTecnicoQr perfil={perfil}>
              {servicios.length > 0 && (
                <section className="tqr-seccion">
                  <h3><History size={15} /> Contigo</h3>
                  <ul className="tqr-historial">
                    {servicios.map(s => (
                      <li key={s.id}>
                        <span className={`tqr-punto ${s.trabajo ? 'trabajo' : ''}`} />
                        <strong>{s.titulo}</strong>
                        <small>{s.trabajo ? 'Lo atendió' : 'Te cotizó'} · {fechaCorta(s.fecha)}</small>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {sinQr === 'no_red' && (
                <p className="tqr-nota"><AlertCircle size={15} /> Este técnico no es de la red de técnicos independientes, por eso no tiene código QR.</p>
              )}
              {sinQr === 'error' && (
                <p className="tqr-nota tqr-nota-alerta"><AlertCircle size={15} /> No se pudo cargar el perfil completo ni el código QR. Intenta de nuevo en unos minutos.</p>
              )}
            </FichaTecnicoQr>
          )}
        </div>

        {!cargando && !error && (codigo ? (
          <div className="tqr-modal-pie">
            <ContratarTecnico codigo={codigo} nombre={perfil?.nombre} relacion={relacion} enMisTecnicos onContratado={onContratado} />
          </div>
        ) : pie && <div className="tqr-modal-pie">{pie}</div>)}
      </div>
    </div>,
    document.body
  );
};

export default ModalTecnicoRed;
