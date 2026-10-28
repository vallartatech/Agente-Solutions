import { useNavigate } from 'react-router-dom';
import { FileText, Images, Building2, ClipboardList } from 'lucide-react';
import '../../styles/Shared/SelectorVistas.css';

// Vistas que comparten un solo botón en el menú del admin:
// este selector (en vidrio blanco) cambia entre las vistas del mismo grupo.
const GRUPOS = {
  cotizaciones: [
    { key: 'cotizaciones', label: 'Cotizaciones', Icon: FileText, path: '/vista-cotizaciones' },
    { key: 'reportes', label: 'Reportes', Icon: Images, path: '/reportes-globales' },
  ],
  propiedades: [
    { key: 'propiedades', label: 'Propiedades', Icon: Building2, path: '/propiedades' },
    { key: 'levantamientos', label: 'Levantamientos', Icon: ClipboardList, path: '/levantamientos' },
  ],
};

const SelectorVistas = ({ grupo, activo, conteo }) => {
  const navigate = useNavigate();

  return (
    <div className="src-selector" role="tablist">
      {GRUPOS[grupo].map(({ key, label, Icon, path }) => {
        const on = key === activo;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            className={`src-tab ${on ? 'on' : ''}`}
            onClick={() => !on && navigate(path)}
          >
            <Icon size={16} strokeWidth={2.4} />
            <span>{label}</span>
            {on && conteo != null && <span className="src-count">{conteo}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default SelectorVistas;
