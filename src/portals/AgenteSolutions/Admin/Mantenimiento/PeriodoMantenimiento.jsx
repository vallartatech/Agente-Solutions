import { CalendarClock } from 'lucide-react';
import { CampoFecha, FRECUENCIAS, hoyISO, sumarMeses, textoFecha, tiempoRestante } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const etiquetaBoton = (n) => (n === 12 ? '1 año' : n === 1 ? '1 mes' : `${n} meses`);

// Próxima fecha del ciclo: último mantenimiento (o hoy) + N meses. Igual que el backend.
export const proximaDelPeriodo = (frecuencia, ultimo) => (frecuencia ? sumarMeses(ultimo || hoyISO(), Number(frecuencia)) : null);

// Mantenimiento preventivo por periodo: fecha del último mantenimiento y cada cuánto se hace.
// Si la próxima fecha calculada ya pasó, se avisa: queda vencida en la agenda hasta que se registre.
const PeriodoMantenimiento = ({ frecuencia, ultimo, onChange, idBase = 'periodo' }) => {
  const hoy = hoyISO();
  const proxima = proximaDelPeriodo(frecuencia, ultimo);
  const restante = proxima && tiempoRestante(proxima);

  return (
    <div className="mt-periodo">
      <div className="mt-campo">
        <span id={`${idBase}-frecuencia`}>¿Cada cuánto? *</span>
        <div className="mt-fecha mt-frecuencias" role="group" aria-labelledby={`${idBase}-frecuencia`}>
          {FRECUENCIAS.map((n) => (
            <button
              key={n}
              type="button"
              className={Number(frecuencia) === n ? 'on' : ''}
              aria-pressed={Number(frecuencia) === n}
              onClick={() => onChange({ frecuencia: n, ultimo })}
            >
              {etiquetaBoton(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-campo">
        <span>Último mantenimiento</span>
        <div className="mt-fecha">
          <CampoFecha
            max={hoy}
            ariaLabel="Fecha del último mantenimiento"
            value={ultimo || ''}
            onChange={(e) => onChange({ frecuencia, ultimo: e.target.value })}
          />
          {ultimo && (
            <button type="button" onClick={() => onChange({ frecuencia, ultimo: '' })}>No lo sé</button>
          )}
        </div>
        {!ultimo && <small className="mt-nota">Si no se sabe, se cuenta desde hoy.</small>}
      </div>

      {proxima && (
        <p className={`mt-proxima ${restante.tono}`}>
          <CalendarClock size={16} />
          <span>
            Próximo mantenimiento: <strong>{textoFecha(proxima)}</strong>
            <small>{restante.tono === 'vencido' ? `${restante.texto}. Quedará en rojo en la agenda hasta que se registre.` : restante.texto}</small>
          </span>
        </p>
      )}
    </div>
  );
};

export default PeriodoMantenimiento;
