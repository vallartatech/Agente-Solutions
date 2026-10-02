import React, { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, Check, X, Sparkles } from 'lucide-react';
import '../../styles/Shared/MaterialDateTimePicker.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const formatDateTimeHuman = (isoOrDateStr) => {
  if (!isoOrDateStr) return 'Seleccionar fecha y hora';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoOrDateStr;
  }
};

const MaterialDateTimePicker = ({
  isOpen,
  value,
  onChange,
  onClose,
  title = "Seleccionar Horario"
}) => {
  const [activeTab, setActiveTab] = useState('time'); // 'time' | 'date'
  const [timeMode, setTimeMode] = useState('hours'); // 'hours' | 'minutes'

  // Internal Date & Time State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const [hour12, setHour12] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState('PM');

  const clockRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Parse incoming value when opened or changed
  useEffect(() => {
    if (isOpen) {
      let d = new Date();
      if (value) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          d = parsed;
        }
      }
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());

      const rawH = d.getHours();
      const m = d.getMinutes();
      setMinute(m);
      if (rawH >= 12) {
        setAmpm('PM');
        setHour12(rawH === 12 ? 12 : rawH - 12);
      } else {
        setAmpm('AM');
        setHour12(rawH === 0 ? 12 : rawH);
      }

      setTimeMode('hours');
      setActiveTab('time');
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  // Convert 12-hour + AM/PM to 24-hour
  const get24Hour = (h12, meridiem) => {
    let h24 = h12 % 12;
    if (meridiem === 'PM') h24 += 12;
    return h24;
  };

  const computeCurrentIso = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const h24 = String(get24Hour(hour12, ampm)).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    return `${year}-${month}-${day}T${h24}:${minStr}`;
  };

  const handleConfirm = () => {
    const isoString = computeCurrentIso();
    if (onChange) onChange(isoString);
    if (onClose) onClose();
  };

  // -------------------------------------------------------------
  // CLOCK ANGLE & INTERACTION MATH
  // -------------------------------------------------------------
  const updateTimeFromCoordinates = (clientX, clientY, isEndEvent = false) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    if (timeMode === 'hours') {
      let h = Math.round(deg / 30);
      if (h === 0) h = 12;
      setHour12(h);
      if (isEndEvent) {
        // Auto-switch to minutes mode for smooth workflow
        setTimeMode('minutes');
      }
    } else {
      let m = Math.round(deg / 6) % 60;
      setMinute(m);
    }
  };

  const handleClockMouseDown = (e) => {
    isDraggingRef.current = true;
    updateTimeFromCoordinates(e.clientX, e.clientY, false);

    const onMouseMove = (moveEvent) => {
      if (isDraggingRef.current) {
        updateTimeFromCoordinates(moveEvent.clientX, moveEvent.clientY, false);
      }
    };

    const onMouseUp = (upEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        updateTimeFromCoordinates(upEvent.clientX, upEvent.clientY, true);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClockTouchStart = (e) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      const touch = e.touches[0];
      updateTimeFromCoordinates(touch.clientX, touch.clientY, false);

      const onTouchMove = (moveEvent) => {
        if (isDraggingRef.current && moveEvent.touches.length > 0) {
          moveEvent.preventDefault();
          updateTimeFromCoordinates(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY, false);
        }
      };

      const onTouchEnd = (endEvent) => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          if (endEvent.changedTouches.length > 0) {
            updateTimeFromCoordinates(endEvent.changedTouches[0].clientX, endEvent.changedTouches[0].clientY, true);
          }
        }
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }
  };

  // Clock Hand Angle Calculation
  const handAngle = timeMode === 'hours' ? (hour12 % 12) * 30 : minute * 6;

  // -------------------------------------------------------------
  // DATE PICKER LOGIC
  // -------------------------------------------------------------
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (dayNum) => {
    const newD = new Date(viewYear, viewMonth, dayNum, get24Hour(hour12, ampm), minute);
    setSelectedDate(newD);
    // Auto switch to time picker to confirm time
    setActiveTab('time');
  };

  const applyQuickDate = (daysToAdd) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    setSelectedDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setActiveTab('time');
  };

  const applyQuickTime = (h12, m, meridiem) => {
    setHour12(h12);
    setMinute(m);
    setAmpm(meridiem);
  };

  return (
    <div className="mdtp-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="mdtp-modal">
        {/* Header Tabs */}
        <div className="mdtp-header-tabs">
          <button
            type="button"
            className={`mdtp-header-tab ${activeTab === 'date' ? 'active' : ''}`}
            onClick={() => setActiveTab('date')}
          >
            <Calendar size={16} />
            <span>{selectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
          </button>
          <button
            type="button"
            className={`mdtp-header-tab ${activeTab === 'time' ? 'active' : ''}`}
            onClick={() => setActiveTab('time')}
          >
            <Clock size={16} />
            <span>{String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')} {ampm}</span>
          </button>
        </div>

        <div className="mdtp-body">
          {/* ========================================================
              TAB 1: RELOJ INTERACTIVO (TIME PICKER)
             ======================================================== */}
          {activeTab === 'time' && (
            <>
              <div className="mdtp-section-title">
                {timeMode === 'hours' ? 'Seleccionar Hora' : 'Seleccionar Minutos'}
              </div>

              {/* Digital Big Display */}
              <div className="mdtp-time-display-row">
                <div className="mdtp-digits-group">
                  <div
                    className={`mdtp-digit-box ${timeMode === 'hours' ? 'active' : ''}`}
                    onClick={() => setTimeMode('hours')}
                    title="Clic para seleccionar hora"
                  >
                    {String(hour12).padStart(2, '0')}
                  </div>
                  <span className="mdtp-time-colon">:</span>
                  <div
                    className={`mdtp-digit-box ${timeMode === 'minutes' ? 'active' : ''}`}
                    onClick={() => setTimeMode('minutes')}
                    title="Clic para seleccionar minutos"
                  >
                    {String(minute).padStart(2, '0')}
                  </div>
                </div>

                {/* AM / PM Toggle */}
                <div className="mdtp-ampm-pill">
                  <button
                    type="button"
                    className={`mdtp-ampm-btn ${ampm === 'AM' ? 'active' : ''}`}
                    onClick={() => setAmpm('AM')}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`mdtp-ampm-btn ${ampm === 'PM' ? 'active' : ''}`}
                    onClick={() => setAmpm('PM')}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Analog Clock Dial Face */}
              <div
                ref={clockRef}
                className="mdtp-clock-container"
                onMouseDown={handleClockMouseDown}
                onTouchStart={handleClockTouchStart}
              >
                {/* Center Pivot Dot */}
                <div className="mdtp-clock-center-dot" />

                {/* Clock Hand Line & Bubble */}
                <div
                  className="mdtp-clock-hand"
                  style={{
                    height: '84px',
                    transform: `translate(-50%, -100%) rotate(${handAngle}deg)`
                  }}
                >
                  <div className="mdtp-clock-selection-bubble">
                    {timeMode === 'hours' ? hour12 : String(minute).padStart(2, '0')}
                  </div>
                </div>

                {/* Dial Numbers: Hours (1-12) */}
                {timeMode === 'hours' &&
                  HOURS_12.map((num) => {
                    const angleDeg = (num % 12) * 30 - 90;
                    const rad = (angleDeg * Math.PI) / 180;
                    const radius = 88;
                    const x = 120 + radius * Math.cos(rad) - 16;
                    const y = 120 + radius * Math.sin(rad) - 16;
                    const isSelected = hour12 === num;

                    return (
                      <div
                        key={`h-${num}`}
                        className={`mdtp-clock-number ${isSelected ? 'selected' : ''}`}
                        style={{ left: `${x}px`, top: `${y}px` }}
                      >
                        {num}
                      </div>
                    );
                  })}

                {/* Dial Numbers: Minutes (00-55) */}
                {timeMode === 'minutes' &&
                  MINUTES_STEPS.map((minNum) => {
                    const angleDeg = minNum * 6 - 90;
                    const rad = (angleDeg * Math.PI) / 180;
                    const radius = 88;
                    const x = 120 + radius * Math.cos(rad) - 16;
                    const y = 120 + radius * Math.sin(rad) - 16;
                    const isSelected = minute === minNum;

                    return (
                      <div
                        key={`m-${minNum}`}
                        className={`mdtp-clock-number ${isSelected ? 'selected' : ''}`}
                        style={{ left: `${x}px`, top: `${y}px` }}
                      >
                        {String(minNum).padStart(2, '0')}
                      </div>
                    );
                  })}
              </div>

              {/* Quick Preset Time Chips */}
              <div className="mdtp-quick-chips">
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickTime(9, 0, 'AM')}
                >
                  🌅 9:00 AM
                </button>
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickTime(12, 0, 'PM')}
                >
                  ☀️ 12:00 PM
                </button>
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickTime(4, 0, 'PM')}
                >
                  🌇 4:00 PM
                </button>
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickTime(7, 0, 'PM')}
                >
                  🌙 7:00 PM
                </button>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 2: CALENDARIO DE FECHAS (DATE PICKER)
             ======================================================== */}
          {activeTab === 'date' && (
            <div className="mdtp-date-view">
              <div className="mdtp-month-header">
                <span className="mdtp-month-title">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" className="mdtp-nav-btn" onClick={prevMonth}>
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" className="mdtp-nav-btn" onClick={nextMonth}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="mdtp-weekdays-grid">
                {WEEKDAY_NAMES.map((wd, i) => (
                  <span key={i}>{wd}</span>
                ))}
              </div>

              {/* Days Grid */}
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

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      className={`mdtp-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => handleSelectDay(dayNum)}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Quick Date Chips */}
              <div className="mdtp-quick-date-chips">
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickDate(0)}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickDate(1)}
                >
                  Mañana
                </button>
                <button
                  type="button"
                  className="mdtp-quick-chip"
                  onClick={() => applyQuickDate(2)}
                >
                  En 2 días
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mdtp-footer">
          <button type="button" className="mdtp-action-btn mdtp-cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="mdtp-action-btn mdtp-ok-btn" onClick={handleConfirm}>
            ✓ Aceptar Horario
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialDateTimePicker;
