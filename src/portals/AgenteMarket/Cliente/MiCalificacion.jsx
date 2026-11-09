import { useEffect, useState } from 'react';
import axios from 'axios';
import { Award } from 'lucide-react';
import Calificacion from '../Shared/Calificacion';

// El cliente de la red ve su propia calificación (★ trato, ⏱ pago) como la ven los técnicos,
// sin saber quién lo calificó.
const MiCalificacion = () => {
  const [datos, setDatos] = useState(undefined);

  useEffect(() => {
    let vivo = true;
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/cliente/mi-calificacion`)
      .then((res) => { if (vivo) setDatos(res.data?.data || null); })
      .catch(() => { if (vivo) setDatos(null); });
    return () => { vivo = false; };
  }, []);

  if (datos === undefined) return null;

  return (
    <div className="cal-mia">
      <h4><Award size={16} /> Tu calificación como cliente</h4>
      <Calificacion
        estrellas={datos?.trato}
        relojes={datos?.pago}
        total={datos?.total || 0}
        etiquetas={{ estrellas: 'Trato', relojes: 'Pago' }}
        textoNuevo="Aún sin calificaciones"
      />
      <p>Los técnicos te califican al terminar cada trabajo y la ven antes de cotizar. Un buen trato y pagar a tiempo te ayudan a recibir mejores ofertas.</p>
    </div>
  );
};

export default MiCalificacion;
