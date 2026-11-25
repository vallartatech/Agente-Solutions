// Agente Market: el técnico terminó el trabajo (envió el reporte) →
//  1. Al cliente le llega el aviso "Te llegó el reporte": lo lleva a revisarlo y confirmarlo.
//     Si no lo confirma, el backend lo confirma solo a las 48 horas.
//  2. Ya confirmado, el cliente califica al técnico: estrellas (calidad) y relojes (puntualidad).
// Se abre sola, una por trabajo. Se puede dejar para después: vuelve a aparecer en la siguiente sesión.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import ModalCalificarTecnico from '../../../components/Shared/ModalCalificarTecnico';
import { fechaConfirmacionAuto } from '../../../utils/confirmacionReporte';

const API = import.meta.env.VITE_API_BASE_URL;
const CADA_MS = 30000;
const CLAVE_DESPUES = 'red_calificar_despues_';
const CLAVE_REPORTE_DESPUES = 'red_reporte_despues_';

// Evita que dos pantallas montadas a la vez abran la ventana dos veces
let ventanaAbierta = false;

const leer = (clave) => {
  try { return sessionStorage.getItem(clave) === '1'; } catch { return false; }
};
const guardar = (clave) => {
  try { sessionStorage.setItem(clave, '1'); } catch { /* sin almacenamiento: se vuelve a preguntar */ }
};

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const AvisoCalificarTecnico = ({ onCalificado }) => {
  const [pendiente, setPendiente] = useState(null);
  const propia = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const enReportes = location.pathname.toLowerCase().includes('/reportes-globales');

  const avisarReporte = useCallback(async (reporte) => {
    ventanaAbierta = true;
    const fecha = fechaConfirmacionAuto(reporte.confirma_solo_at);
    const r = await Swal.fire({
      icon: 'info',
      title: 'Te llegó un reporte',
      html: `<b>${escapar(reporte.tecnico?.nombre || 'El técnico')}</b> terminó <b>"${escapar(reporte.titulo)}"</b> (folio #${Number(reporte.work_order_id)}).<br><br>`
        + 'Revisa las evidencias y confirma que todo está correcto. Después podrás calificar al técnico.'
        + (fecha ? `<br><br><small>Si no lo confirmas, se confirmará solo el ${fecha}.</small>` : ''),
      showCancelButton: true,
      confirmButtonText: 'Revisar reporte',
      cancelButtonText: 'Después',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
    });
    ventanaAbierta = false;
    if (r.isConfirmed) navigate(`/reportes-globales?trabajo=${reporte.work_order_id}`);
    else guardar(CLAVE_REPORTE_DESPUES + reporte.work_order_id);
  }, [navigate]);

  const revisar = useCallback(async () => {
    if (ventanaAbierta) return;
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/red/calificaciones-tecnico/pendientes`, { headers: { Authorization: `Bearer ${token}` } });
      if (ventanaAbierta) return;
      // En la pantalla de reportes el cliente confirma ahí mismo
      const reporte = !enReportes && (res.data?.por_confirmar || []).find((p) => !leer(CLAVE_REPORTE_DESPUES + p.work_order_id));
      if (reporte) {
        avisarReporte(reporte);
        return;
      }
      const primera = (res.data?.data || []).find((p) => p.tecnico?.id && !leer(CLAVE_DESPUES + p.work_order_id));
      if (primera) {
        ventanaAbierta = true;
        propia.current = true;
        setPendiente(primera);
      }
    } catch {
      // Sin conexión o sin la ruta todavía: se vuelve a intentar en la siguiente vuelta
    }
  }, [enReportes, avisarReporte]);

  useEffect(() => {
    revisar();
    const intervalo = setInterval(revisar, CADA_MS);
    return () => {
      clearInterval(intervalo);
      if (propia.current) ventanaAbierta = false;
    };
  }, [revisar]);

  if (!pendiente) return null;

  const cerrar = (calificado) => {
    // El modal llama onSuccess y después onClose: solo cuenta la primera
    if (!propia.current) return;
    if (!calificado) guardar(CLAVE_DESPUES + pendiente.work_order_id);
    ventanaAbierta = false;
    propia.current = false;
    setPendiente(null);
    if (calificado) onCalificado?.();
    // Si hay otro trabajo por calificar, se muestra enseguida
    setTimeout(revisar, 400);
  };

  return (
    <ModalCalificarTecnico
      isOpen
      onClose={() => cerrar(false)}
      onSuccess={() => cerrar(true)}
      technician={{ id: pendiente.tecnico.id, name: pendiente.tecnico.nombre, picture: pendiente.tecnico.foto, specialty: pendiente.titulo }}
      workOrderId={pendiente.work_order_id}
      scheduledAt={pendiente.scheduled_at}
      arrivedAt={pendiente.arrived_at}
      encabezado="El trabajo terminó"
    />
  );
};

export default AvisoCalificarTecnico;
