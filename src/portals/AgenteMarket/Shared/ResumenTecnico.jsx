import { ShieldCheck, Hourglass, FileText, Clock3 } from 'lucide-react';
import { useResumenTecnico } from './resumenTecnicos';
import { IconoEspecialidad } from './iconoEspecialidad';
import Calificacion from './Calificacion';
import '../../../styles/AgenteMarket/Shared/ResumenTecnico.css';

// Currículum simplificado del técnico dentro de cada cotización que recibe el cliente.
// El completo se abre con "Ver currículum completo" (solo consulta, sin descarga).

/** Foto del técnico para el círculo de la tarjeta (o su inicial mientras carga / sin foto). */
export const FotoTecnico = ({ tecnicoId, inicial = 'T' }) => {
  const { resumen } = useResumenTecnico(tecnicoId);
  const foto = String(resumen?.foto || '').startsWith('http') ? resumen.foto : null;
  return foto ? <img className="rt-foto" src={foto} alt="" /> : <>{inicial}</>;
};

/** Insignia real bajo el nombre: verificado o en validación (antes decía "Verificado" siempre). */
export const InsigniaTecnico = ({ tecnicoId }) => {
  const { resumen, cargando } = useResumenTecnico(tecnicoId);
  if (cargando || !resumen) return null;
  return resumen.verificado
    ? <span className="rt-insignia ok"><ShieldCheck size={12} /> Identidad verificada</span>
    : <span className="rt-insignia pend"><Clock3 size={12} /> En validación</span>;
};

const ResumenTecnico = ({ tecnicoId, onVerCompleto }) => {
  const { resumen, cargando } = useResumenTecnico(tecnicoId);

  if (cargando) {
    return <div className="rt rt-cargando" aria-hidden="true"><span /><span /></div>;
  }
  if (!resumen) {
    return onVerCompleto ? (
      <div className="rt">
        <button type="button" className="rt-btn" onClick={onVerCompleto}><FileText size={14} /> Ver perfil del técnico</button>
      </div>
    ) : null;
  }

  const anios = resumen.anios_experiencia;

  return (
    <div className="rt">
      <div className="rt-fila">
        <Calificacion
          estrellas={resumen.calificacion}
          relojes={resumen.puntualidad}
          total={resumen.total_resenas}
          etiquetas={{ estrellas: 'Calidad', relojes: 'Puntualidad' }}
        />
      </div>

      {anios != null && (
        <div className="rt-fila rt-datos">
          <span><Hourglass size={13} /> {anios} {Number(anios) === 1 ? 'año' : 'años'} de experiencia</span>
        </div>
      )}

      {resumen.especialidades?.length > 0 && (
        <div className="rt-fila rt-chips">
          {resumen.especialidades.map(e => (
            <span key={e.id}><IconoEspecialidad nombre={e.name} size={13} /> {e.name}</span>
          ))}
          {resumen.mas_especialidades > 0 && <span className="mas">+{resumen.mas_especialidades}</span>}
        </div>
      )}

      {onVerCompleto && (
        <button type="button" className="rt-btn" onClick={onVerCompleto}>
          <FileText size={14} /> Ver currículum completo
        </button>
      )}
    </div>
  );
};

export default ResumenTecnico;
