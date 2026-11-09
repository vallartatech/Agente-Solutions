import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, ChevronLeft, ChevronRight, Sunrise, Sun, Sunset, Moon, Check } from 'lucide-react';
import '../../styles/Shared/MaterialDateTimePicker.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Geometría del reloj (debe coincidir con .mdtp-clock-container en el CSS)
const DIAL = 216;
const CENTER = DIAL / 2;
const RADIUS = 80;
const NUM_SIZE = 30;

const QUICK_TIMES = [
  { h: 9, m: 0, ap: 'AM', label: '9:00 AM', Icon: Sunrise },
  { h: 12, m: 0, ap: 'PM', label: '12:00 PM', Icon: Sun },
  { h: 4, m: 0, ap: 'PM', label: '4:00 PM', Icon: Sunset },
  { h: 7, m: 0, ap: 'PM', label: '7:00 PM', Icon: Moon },
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Convierte el valor recibido a Date local. Acepta:
 *  - 'YYYY-MM-DD'          (input date)       → se interpreta en hora local, no UTC
 *  - 'HH:MM'               (input time)       → hoy a esa hora
 *  - 'YYYY-MM-DDTHH:MM'    (datetime-local) o cualquier ISO
 */
export const parsePickerValue = (value) => {
  if (!value) return null;
  const s = String(value);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0);
  m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const d = new Date();
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDateTimeHuman = (isoOrDateStr, mode = 'datetime') => {
  if (!isoOrDateStr) {
    if (mode === 'date') return 'Seleccionar fecha';
    if (mode === 'time') return 'Seleccionar hora';
    return 'Seleccionar fecha y hora';
  }
  const d = parsePickerValue(isoOrDateStr);
  if (!d) return isoOrDateStr;
  if (mode === 'date') {
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (mode === 'time') {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Selector de fecha/hora con reloj analógico.
 * mode: 'datetime' (por defecto) → devuelve 'YYYY-MM-DDTHH:MM'
 *       'date'                   → devuelve 'YYYY-MM-DD'
 *       'time'                   → devuelve 'HH:MM'
 * min / max (opcionales): 'YYYY-MM-DD' (o ISO) para bloquear días del calendario.
 */
const MaterialDateTimePicker = ({
  isOpen,
  value,
  onChange,
  onClose,
  mode = 'datetime',
  min,
  max,
}) => {
  const showDate = mode !== 'time';
  const showTime = mode !== 'date';

  const [activeTab, setActiveTab] = useState(showTime ? 'time' : 'date');
  const [timeMode, setTimeMode] = useState('hours'); // 'hours' | 'minutes'

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const [hour12, setHour12] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState('PM');

  const clockRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const d = parsePickerValue(value) || new Date();
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());

      const rawH = d.getHours();
      setMinute(d.getMinutes());
      if (rawH >= 12) {
        setAmpm('PM');
        setHour12(rawH === 12 ? 12 : rawH - 12);
      } else {
        setAmpm('AM');
        setHour12(rawH === 0 ? 12 : rawH);
      }

      setTimeMode('hours');
      setActiveTab(showTime ? 'time' : 'date');
    }
  }, [isOpen, value, showTime]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const minDate = parsePickerValue(min);
  const maxDate = parsePickerValue(max);
  const dayKey = (y, m, d) => y * 10000 + m * 100 + d;
  const minKey = minDate ? dayKey(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
  const maxKey = maxDate ? dayKey(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null;
  const isDayDisabled = (y, m, d) => {
    const k = dayKey(y, m, d);
    return (minKey !== null && k < minKey) || (maxKey !== null && k > maxKey);
  };

  const get24Hour = (h12, meridiem) => {
    let h24 = h12 % 12;
    if (meridiem === 'PM') h24 += 12;
    return h24;
  };

  const computeValue = () => {
    const datePart = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
    const timePart = `${pad(get24Hour(hour12, ampm))}:${pad(minute)}`;
    if (mode === 'date') return datePart;
    if (mode === 'time') return timePart;
    return `${datePart}T${timePart}`;
  };

  const handleConfirm = () => {
    if (onChange) onChange(computeValue());
    if (onClose) onClose();
  };

  // -------------------------------------------------------------
  // RELOJ: ángulo e interacción
  // -------------------------------------------------------------
  const updateTimeFromCoordinates = (clientX, clientY, isEndEvent = false) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (timeMode === 'hours') {
      let h = Math.round(deg / 30);
      if (h === 0) h = 12;
      setHour12(h);
      if (isEndEvent) setTimeMode('minutes');
    } else {
      setMinute(Math.round(deg / 6) % 60);
    }
  };

  const handleClockMouseDown = (e) => {
    isDraggingRef.current = true;
    updateTimeFromCoordinates(e.clientX, e.clientY, false);

    const onMouseMove = (ev) => {
      if (isDraggingRef.current) updateTimeFromCoordinates(ev.clientX, ev.clientY, false);
    };
    const onMouseUp = (ev) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateTimeFromCoordinates(ev.clientX, ev.clientY, true);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClockTouchStart = (e) => {
    if (e.touches.length === 0) return;
    isDraggingRef.current = true;
    const touch = e.touches[0];
    updateTimeFromCoordinates(touch.clientX, touch.clientY, false);

    const onTouchMove = (ev) => {
      if (isDraggingRef.current && ev.touches.length > 0) {
        ev.preventDefault();
        updateTimeFromCoordinates(ev.touches[0].clientX, ev.touches[0].clientY, false);
      }
    };
    const onTouchEnd = (ev) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (ev.changedTouches.length > 0) {
          updateTimeFromCoordinates(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY, true);
        }
      }
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handAngle = timeMode === 'hours' ? (hour12 % 12) * 30 : minute * 6;

  const dialPos = (angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      left: `${CENTER + RADIUS * Math.cos(rad) - NUM_SIZE / 2}px`,
      top: `${CENTER + RADIUS * Math.sin(rad) - NUM_SIZE / 2}px`,
    };
  };

  // -------------------------------------------------------------
  // CALENDARIO
  // -------------------------------------------------------------
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (dayNum) => {
    setSelectedDate(new Date(viewYear, viewMonth, dayNum, get24Hour(hour12, ampm), minute));
    if (showTime) setActiveTab('time');
  };

  const applyQuickDate = (daysToAdd) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    target.setHours(get24Hour(hour12, ampm), minute, 0, 0);
    setSelectedDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    if (showTime) setActiveTab('time');
  };

  const quickDateDisabled = (daysToAdd) => {
    const t = new Date();
    t.setDate(t.getDate() + daysToAdd);
    return isDayDisabled(t.getFullYear(), t.getMonth(), t.getDate());
  };

  const applyQuickTime = (h12, m, meridiem) => {
    setHour12(h12);
    setMinute(m);
    setAmpm(meridiem);
  };

  const okLabel = mode === 'date' ? 'Aceptar fecha' : mode === 'time' ? 'Aceptar hora' : 'Aceptar horario';

  // Portal al body: así el modal queda centrado aunque el padre tenga transform/overflow
  return createPortal(
    <div className="mdtp-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="mdtp-modal" role="dialog" aria-modal="true">
        {/* Encabezado: Fecha / Hora */}
        <div className="mdtp-header-tabs">
          {showDate && (
            <button
              type="button"
              className={`mdtp-header-tab ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
            >
              <Calendar size={15} />
              <span>
                {selectedDate.toLocaleDateString('es-MX', mode === 'date'
                  ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
                  : { day: 'numeric', month: 'short' })}
              </span>
            </button>
          )}
          {showTime && (
            <button
              type="button"
              className={`mdtp-header-tab ${activeTab === 'time' ? 'active' : ''}`}
              onClick={() => setActiveTab('time')}
            >
              <Clock size={15} />
              <span>{pad(hour12)}:{pad(minute)} {ampm}</span>
            </button>
          )}
        </div>

        <div className="mdtp-body">
          {/* ========= RELOJ ========= */}
          {showTime && activeTab === 'time' && (
            <>
              <div className="mdtp-section-title">
                {timeMode === 'hours' ? 'Seleccionar hora' : 'Seleccionar minutos'}
              </div>

              <div className="mdtp-time-display-row">
                <div className="mdtp-digits-group">
                  <div
                    className={`mdtp-digit-box ${timeMode === 'hours' ? 'active' : ''}`}
                    onClick={() => setTimeMode('hours')}
                    title="Clic para seleccionar hora"
                  >
                    {pad(hour12)}
                  </div>
                  <span className="mdtp-time-colon">:</span>
                  <div
                    className={`mdtp-digit-box ${timeMode === 'minutes' ? 'active' : ''}`}
                    onClick={() => setTimeMode('minutes')}
                    title="Clic para seleccionar minutos"
                  >
                    {pad(minute)}
                  </div>
                </div>

                <div className="mdtp-ampm-pill">
                  <button type="button" className={`mdtp-ampm-btn ${ampm === 'AM' ? 'active' : ''}`} onClick={() => setAmpm('AM')}>
                    AM
                  </button>
                  <button type="button" className={`mdtp-ampm-btn ${ampm === 'PM' ? 'active' : ''}`} onClick={() => setAmpm('PM')}>
                    PM
                  </button>
                </div>
              </div>

              <div
                ref={clockRef}
                className="mdtp-clock-container"
                onMouseDown={handleClockMouseDown}
                onTouchStart={handleClockTouchStart}
              >
                <div className="mdtp-clock-center-dot" />

                <div
                  className="mdtp-clock-hand"
                  style={{ height: `${RADIUS}px`, transform: `translate(-50%, -100%) rotate(${handAngle}deg)` }}
                >
                  <div className="mdtp-clock-selection-bubble">
                    {/* Solo para minutos fuera de los pasos de 5 (los demás ya se ven en la esfera) */}
                    {timeMode === 'minutes' && minute % 5 !== 0 ? pad(minute) : null}
                  </div>
                </div>

                {timeMode === 'hours' &&
                  HOURS_12.map((num) => (
                    <div
                      key={`h-${num}`}
                      className={`mdtp-clock-number ${hour12 === num ? 'selected' : ''}`}
                      style={dialPos((num % 12) * 30)}
                    >
                      {num}
                    </div>
                  ))}

                {timeMode === 'minutes' &&
                  MINUTES_STEPS.map((minNum) => (
                    <div
                      key={`m-${minNum}`}
                      className={`mdtp-clock-number ${minute === minNum ? 'selected' : ''}`}
                      style={dialPos(minNum * 6)}
                    >
                      {pad(minNum)}
                    </div>
                  ))}
              </div>

              <div className="mdtp-quick-chips">
                {QUICK_TIMES.map(({ h, m, ap, label, Icon }) => {
                  const active = hour12 === h && minute === m && ampm === ap;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`mdtp-quick-chip ${active ? 'active' : ''}`}
                      onClick={() => applyQuickTime(h, m, ap)}
                    >
                      <Icon size={13} strokeWidth={2.2} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ========= CALENDARIO ========= */}
          {showDate && activeTab === 'date' && (
            <div className="mdtp-date-view">
              <div className="mdtp-month-header">
                <span className="mdtp-month-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" className="mdtp-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" className="mdtp-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mdtp-weekdays-grid">
                {WEEKDAY_NAMES.map((wd, i) => <span key={i}>{wd}</span>)}
              </div>

              <div className="mdtp-days-grid">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="mdtp-day-cell empty" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected =
                    selectedDate.getFullYear() === viewYear &&
                    selectedDate.getMonth() === viewMonth &&
                    selectedDate.getDate() === dayNum;
                  const today = new Date();
                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === dayNum;
                  const disabled = isDayDisabled(viewYear, viewMonth, dayNum);

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      disabled={disabled}
                      className={`mdtp-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => handleSelectDay(dayNum)}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              <div className="mdtp-quick-date-chips">
                {[[0, 'Hoy'], [1, 'Mañana'], [2, 'En 2 días']].map(([n, label]) => (
                  <button
                    key={label}
                    type="button"
                    className="mdtp-quick-chip"
                    disabled={quickDateDisabled(n)}
                    onClick={() => applyQuickDate(n)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mdtp-footer">
          <button type="button" className="mdtp-action-btn mdtp-cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="mdtp-action-btn mdtp-ok-btn" onClick={handleConfirm}>
            <Check size={15} strokeWidth={2.6} />
            <span>{okLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MaterialDateTimePicker;
