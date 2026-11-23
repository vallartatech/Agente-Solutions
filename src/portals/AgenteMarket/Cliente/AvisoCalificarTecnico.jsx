// Agente Market: el técnico terminó el trabajo (envió el reporte) → el cliente lo califica:
// estrellas (calidad del trabajo) y relojes (puntualidad). Se abre sola, una por trabajo.
// Se puede dejar para después: vuelve a aparecer en la siguiente sesión hasta que califique.
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ModalCalificarTecnico from '../../../components/Shared/ModalCalificarTecnico';

const API = import.meta.env.VITE_API_BASE_URL;
const CADA_MS = 30000;
const CLAVE_DESPUES = 'red_calificar_despues_';

// Evita que dos pantallas montadas a la vez abran la ventana dos veces
let ventanaAbierta = false;

const dejadoParaDespues = (id) => {
  try { return sessionStorage.getItem(CLAVE_DESPUES + id) === '1'; } catch { return false; }
};
const dejarParaDespues = (id) => {
  try { sessionStorage.setItem(CLAVE_DESPUES + id, '1'); } catch { /* sin almacenamiento: se vuelve a preguntar */ }
};

const AvisoCalificarTecnico = ({ onCalificado }) => {
  const [pendiente, setPendiente] = useState(null);
  const propia = useRef(false);

  const revisar = useCallback(async () => {
    if (ventanaAbierta) return;
    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/red/calificaciones-tecnico/pendientes`, { headers: { Authorization: `Bearer ${token}` } });
      const primera = (res.data?.data || []).find((p) => p.tecnico?.id && !dejadoParaDespues(p.work_order_id));
      if (primera && !ventanaAbierta) {
        ventanaAbierta = true;
        propia.current = true;
        setPendiente(primera);
      }
    } catch {
      // Sin conexión o sin la ruta todavía: se vuelve a intentar en la siguiente vuelta
    }
  }, []);

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
    if (!calificado) dejarParaDespues(pendiente.work_order_id);
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
