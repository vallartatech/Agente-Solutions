// Agente Market: detalle de un trabajo del Mercado abierto desde el Tablero global.
// Es el mismo detalle del Mercado (DetallePublicacionRed) en modo página: llegada, reporte, ajuste
// de precio, técnico con chat y perfil, cotizaciones, acceso (QR) y cancelación, ordenados en una página.
// Si el trabajo no es del Mercado (orden interna, servicio o levantamiento) abre el expediente de siempre.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../../../components/Shared/Header';
import { useAuth } from '../../../context/AuthContext';
import DetallePublicacionRed from './DetallePublicacionRed';
import { armarTrabajoMercado, esPublicacionDelUsuario } from './trabajoMercado';
import '../../../styles/AgenteMarket/Cliente/DetalleTrabajoMercado.css';

const API = import.meta.env.VITE_API_BASE_URL;
const CADA_MS = 5000; // mismo ritmo que el Mercado
const MINIMO_MS = 1500; // la página pide refrescar seguido: no más de una consulta cada 1.5 s

const encabezados = () => {
  const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const DetalleTrabajoMercado = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trabajo, setTrabajo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const ultima = useRef(0);
  const enCurso = useRef(false);

  // Expediente de siempre (trabajos que no son del Mercado)
  const irAlExpediente = useCallback(() => {
    if (state?.propId && state?.uid) {
      navigate(`/detalle-propiedad/${state.propId}/trabajo/${state.uid}`, { replace: true });
    } else {
      navigate('/tablero-global', { replace: true });
    }
  }, [navigate, state]);

  const cargar = useCallback(async (forzar = false) => {
    if (!user || enCurso.current) return;
    if (!forzar && Date.now() - ultima.current < MINIMO_MS) return;
    enCurso.current = true;
    ultima.current = Date.now();
    try {
      const res = await axios.get(`${API}/mercado-trabajos?only_mine=1&con_terminados=1`, { headers: encabezados() });
      if (!res.data?.success) return;
      const orden = (res.data.data || []).find(o => Number(o.id) === Number(id) && esPublicacionDelUsuario(o, user));
      if (orden) {
        setTrabajo(armarTrabajoMercado(orden, user));
      } else if (forzar) {
        // Primera carga y no está en el Mercado: expediente de siempre
        irAlExpediente();
      }
    } catch (e) {
      console.error('Error al cargar el trabajo del Mercado', e);
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }, [id, user, irAlExpediente]);

  useEffect(() => {
    cargar(true);
    const t = setInterval(() => cargar(true), CADA_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const volver = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/tablero-global');
  }, [navigate]);

  return (
    <div className="dtm-page">
      <Header />
      <main className="dtm-contenido">
        {cargando && !trabajo ? (
          <div className="dtm-cargando">Cargando trabajo…</div>
        ) : trabajo ? (
          <DetallePublicacionRed
            key={trabajo.id}
            modo="pagina"
            job={trabajo}
            user={user}
            onClose={volver}
            onRefresh={() => cargar()}
          />
        ) : (
          <div className="dtm-cargando">No encontramos este trabajo.</div>
        )}
      </main>
    </div>
  );
};

export default DetalleTrabajoMercado;
