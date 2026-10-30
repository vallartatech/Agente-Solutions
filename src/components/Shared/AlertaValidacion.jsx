import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Shared/AlertaValidacion.css';

// Trabajos terminados que esperan validación. Lo consultan el encabezado y la barra del celular:
// una sola consulta compartida (cada minuto, al volver a la pestaña o cuando algo cambia).
const REFRESCO_MS = 60000;
let estado = { mostrar: false, pendientes: 0, mascota: 'gato', es_validador: false, reportes_por_revisar: null };
const suscriptores = new Set();
let intervalo = null;
let enCurso = null;

const consultar = () => {
  if (!enCurso) {
    enCurso = axios.get(`${import.meta.env.VITE_API_BASE_URL}/validacion/pendientes`)
      .then(res => {
        estado = { ...estado, ...res.data };
        suscriptores.forEach(fn => fn(estado));
      })
      .catch(() => { /* sin alerta si falla */ })
      .finally(() => { enCurso = null; });
  }
  return enCurso;
};

const alVolver = () => { if (!document.hidden) consultar(); };

// Para que el cambio de mascota se vea al instante sin esperar la siguiente consulta
export const fijarMascotaLocal = (mascota) => {
  estado = { ...estado, mascota };
  suscriptores.forEach(fn => fn(estado));
};

export const usePendientesValidacion = () => {
  const { user } = useAuth();
  const esAdmin = [0, 1].includes(Number(user?.role_id));
  const [info, setInfo] = useState(estado);

  useEffect(() => {
    if (!esAdmin) return undefined;
    suscriptores.add(setInfo);
    if (suscriptores.size === 1) {
      consultar();
      intervalo = setInterval(alVolver, REFRESCO_MS);
      document.addEventListener('visibilitychange', alVolver);
      window.addEventListener('validacion-actualizada', consultar);
    }
    return () => {
      suscriptores.delete(setInfo);
      if (suscriptores.size === 0) {
        clearInterval(intervalo);
        document.removeEventListener('visibilitychange', alVolver);
        window.removeEventListener('validacion-actualizada', consultar);
      }
    };
  }, [esAdmin, user?.id]);

  return esAdmin ? info : { ...estado, mostrar: false, pendientes: 0, reportes_por_revisar: null };
};

export const MASCOTAS = [
  { id: 'gato', nombre: 'Gatito' },
  { id: 'perro', nombre: 'Perrito' },
  { id: 'fantasma', nombre: 'Fantasma' },
  { id: 'numero', nombre: 'Solo número' },
];

// ── Dibujos (SVG ligeros; se animan solo con CSS) ──
const Gato = () => (
  <svg viewBox="0 0 48 40" className="va-svg" aria-hidden="true">
    <path className="va-cola" d="M40 30 C47 27 47 18 42 15" fill="none" stroke="#ea580c" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M10 15 L12 3 L20 11 Z" fill="#f97316" />
    <path d="M38 15 L36 3 L28 11 Z" fill="#f97316" />
    <path d="M12.5 12 L13.5 6.5 L17.5 10.5 Z" fill="#fed7aa" />
    <path d="M35.5 12 L34.5 6.5 L30.5 10.5 Z" fill="#fed7aa" />
    <ellipse cx="24" cy="21" rx="15" ry="12.5" fill="#fb923c" />
    <path d="M24 9 L22.5 14 M24 9 L25.5 14" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" />
    <g className="va-ojos">
      <ellipse cx="18.5" cy="20" rx="2" ry="2.6" fill="#1f2937" />
      <ellipse cx="29.5" cy="20" rx="2" ry="2.6" fill="#1f2937" />
    </g>
    <path d="M22.6 24.2 L25.4 24.2 L24 25.8 Z" fill="#be185d" />
    <path d="M24 25.8 Q22 27.6 20.5 26.4 M24 25.8 Q26 27.6 27.5 26.4" fill="none" stroke="#1f2937" strokeWidth="1" strokeLinecap="round" />
    <path d="M9 23 L15 24 M9 26.5 L15 25.6 M39 23 L33 24 M39 26.5 L33 25.6" stroke="#7c2d12" strokeWidth="0.8" strokeLinecap="round" />
    <ellipse cx="15" cy="34.5" rx="4.6" ry="3.4" fill="#fdba74" />
    <ellipse cx="33" cy="34.5" rx="4.6" ry="3.4" fill="#fdba74" />
  </svg>
);

const Perro = () => (
  <svg viewBox="0 0 48 40" className="va-svg" aria-hidden="true">
    <path className="va-cola" d="M40 30 C46 26 46 20 44 17" fill="none" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
    <ellipse cx="24" cy="20" rx="14" ry="12.5" fill="#d97706" />
    <path className="va-oreja-izq" d="M11 11 C5 13 5 25 10 27 C13 24 14 16 13 11 Z" fill="#92400e" />
    <path className="va-oreja-der" d="M37 11 C43 13 43 25 38 27 C35 24 34 16 35 11 Z" fill="#92400e" />
    <ellipse cx="24" cy="25" rx="7.5" ry="5.5" fill="#fde68a" />
    <g className="va-ojos">
      <circle cx="18.5" cy="18.5" r="2.2" fill="#1f2937" />
      <circle cx="29.5" cy="18.5" r="2.2" fill="#1f2937" />
    </g>
    <ellipse cx="24" cy="23" rx="2.6" ry="1.9" fill="#1f2937" />
    <path d="M24 25 Q22 27.4 20.5 26.4 M24 25 Q26 27.4 27.5 26.4" fill="none" stroke="#1f2937" strokeWidth="1" strokeLinecap="round" />
    <ellipse cx="15" cy="34.5" rx="4.6" ry="3.4" fill="#fde68a" />
    <ellipse cx="33" cy="34.5" rx="4.6" ry="3.4" fill="#fde68a" />
  </svg>
);

const Fantasma = () => (
  <svg viewBox="0 0 48 40" className="va-svg va-flota" aria-hidden="true">
    <path d="M10 36 L10 18 C10 8 17 3 24 3 C31 3 38 8 38 18 L38 36 L33.5 32 L29 36 L24 32 L19 36 L14.5 32 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
    <g className="va-ojos">
      <ellipse cx="19" cy="17" rx="2.4" ry="3.2" fill="#1f2937" />
      <ellipse cx="29" cy="17" rx="2.4" ry="3.2" fill="#1f2937" />
    </g>
    <ellipse cx="24" cy="24" rx="2.6" ry="2" fill="#1f2937" />
    <circle cx="15" cy="21.5" r="1.8" fill="#fecaca" />
    <circle cx="33" cy="21.5" r="1.8" fill="#fecaca" />
  </svg>
);

const DIBUJOS = { gato: Gato, perro: Perro, fantasma: Fantasma };

// Cada quien elige cómo quiere su alerta (lo ve solo quien recibe la alerta)
export const SelectorMascota = () => {
  const { mostrar, mascota } = usePendientesValidacion();
  const [guardando, setGuardando] = useState(false);
  if (!mostrar) return null;

  const elegir = async (id) => {
    if (id === mascota || guardando) return;
    const anterior = mascota;
    fijarMascotaLocal(id);
    setGuardando(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/mi-mascota-alerta`, { mascota: id });
    } catch {
      fijarMascotaLocal(anterior);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="va-selector" role="radiogroup" aria-label="Alerta de trabajos por validar">
      <span className="va-selector-label">Tu alerta</span>
      {MASCOTAS.map(m => {
        const Dibujo = DIBUJOS[m.id];
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mascota === m.id}
            className={mascota === m.id ? 'activa' : ''}
            onClick={() => elegir(m.id)}
            title={m.nombre}
          >
            {Dibujo ? <Dibujo /> : '#'}
          </button>
        );
      })}
    </div>
  );
};

const CLAVE_CERRADA = 'va_reportes_cerrada';
const leerCerrada = () => {
  try {
    return Number(sessionStorage.getItem(CLAVE_CERRADA)) || 0;
  } catch {
    return 0;
  }
};

// Fantasma flotante "Verifica tus reportes": solo para las cuentas que indica el backend y mientras haya
// reportes de técnicos sin cerrar. Si se cierra, vuelve en la siguiente sesión o cuando llegue uno más.
export const AlertaReportesFlotante = () => {
  const { reportes_por_revisar: total } = usePendientesValidacion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [cerradaEn, setCerradaEn] = useState(leerCerrada);

  if (!total || total <= cerradaEn || pathname.toLowerCase().includes('/reportes-globales')) return null;

  const cerrar = () => {
    setCerradaEn(total);
    try {
      sessionStorage.setItem(CLAVE_CERRADA, String(total));
    } catch {
      // Sin almacenamiento: se oculta hasta recargar
    }
  };

  return createPortal(
    <div className="va-flotante" role="status">
      <button type="button" className="va-flotante-abrir" onClick={() => navigate('/reportes-globales')}>
        <span className="va-flotante-fantasma"><Fantasma /></span>
        <span className="va-flotante-texto">
          <strong>Verifica tus reportes</strong>
          <small>{total} {total === 1 ? 'trabajo tiene' : 'trabajos tienen'} reportes de técnicos</small>
        </span>
      </button>
      <button type="button" className="va-flotante-cerrar" onClick={cerrar} aria-label="Cerrar alerta">
        <X size={15} />
      </button>
    </div>,
    document.body
  );
};

/**
 * Alerta sobre el botón "Cotización y reporte": la mascota se asoma sosteniendo el número
 * de trabajos por validar. Solo aparece mientras haya pendientes; con "numero", solo el contador.
 */
export const MascotaAlerta = ({ variante = 'menu' }) => {
  const { mostrar, pendientes, mascota } = usePendientesValidacion();
  if (!mostrar || pendientes <= 0) return null;

  const Dibujo = DIBUJOS[mascota];
  const texto = `${pendientes} trabajo${pendientes === 1 ? '' : 's'} por validar`;
  return (
    <span className={`va-alerta va-${variante} ${Dibujo ? '' : 'solo-numero'}`} title={texto} aria-label={texto} role="status">
      {Dibujo && <span className="va-mascota"><Dibujo /></span>}
      <span className="va-contador">{pendientes > 99 ? '99+' : pendientes}</span>
    </span>
  );
};
