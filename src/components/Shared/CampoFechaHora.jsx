import { useState, useRef } from 'react';
import { Calendar, Clock, CalendarClock } from 'lucide-react';
import MaterialDateTimePicker, { formatDateTimeHuman } from './MaterialDateTimePicker';

const MODO_POR_TIPO = { date: 'date', time: 'time', 'datetime-local': 'datetime', datetime: 'datetime' };
const ICONO_POR_MODO = { date: Calendar, time: Clock, datetime: CalendarClock };

/**
 * Reemplazo directo de <input type="date" | "time" | "datetime-local">.
 * Abre el selector con reloj analógico y entrega el valor en el MISMO formato que el input nativo
 * ('YYYY-MM-DD', 'HH:MM' o 'YYYY-MM-DDTHH:MM').
 *
 * - Controlado: `value` + `onChange`. onChange recibe un objeto tipo evento ({ target: { name, value } })
 *   para que los handlers existentes como `e => setFecha(e.target.value)` sigan funcionando.
 * - No controlado: `defaultValue` + `id`. Se mantiene un <input> oculto con ese id, así el código que lee
 *   `document.getElementById(id).value` sigue funcionando igual.
 * - `required` conserva la validación nativa del formulario (resalta el campo si queda vacío).
 */
const CampoFechaHora = ({
  type = 'datetime-local',
  value,
  defaultValue,
  onChange,
  name,
  id,
  min,
  max,
  disabled = false,
  required = false,
  placeholder,
  className = '',
  overlayClassName = '', // tema del selector (se aplica al modal, no al campo)
  style,
  title,
  'aria-label': ariaLabel,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [interno, setInterno] = useState(defaultValue || '');
  const [invalido, setInvalido] = useState(false);
  const botonRef = useRef(null);

  const controlado = value !== undefined;
  const actual = (controlado ? value : interno) || '';
  const mode = MODO_POR_TIPO[type] || 'datetime';
  const Icono = ICONO_POR_MODO[mode];

  const emitir = (nuevo) => {
    if (!controlado) setInterno(nuevo);
    setInvalido(false);
    onChange?.({ target: { name, id, value: nuevo, type }, currentTarget: { name, id, value: nuevo, type } });
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className={`mdtp-campo ${invalido ? 'invalido' : ''} ${className}`.trim()}
        style={style}
        title={title}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setAbierto(true)}
      >
        <span className="mdtp-campo-icono"><Icono size={16} /></span>
        <span className={`mdtp-campo-texto ${actual ? '' : 'vacio'}`}>
          {actual ? formatDateTimeHuman(actual, mode) : (placeholder || formatDateTimeHuman('', mode))}
        </span>
      </button>

      {/* Input nativo oculto: conserva id/name para formularios y la validación de `required` */}
      <input
        className="mdtp-campo-nativo"
        tabIndex={-1}
        aria-hidden="true"
        id={id}
        name={name}
        value={actual}
        required={required}
        disabled={disabled}
        onChange={() => {}}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalido(true);
          botonRef.current?.focus();
        }}
      />

      <MaterialDateTimePicker
        isOpen={abierto}
        mode={mode}
        value={actual}
        min={min}
        max={max}
        overlayClassName={overlayClassName}
        onChange={emitir}
        onClose={() => setAbierto(false)}
      />
    </>
  );
};

export default CampoFechaHora;
