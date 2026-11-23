// Caja para escribir en un chat: crece hacia arriba conforme se escribe (como la del asistente),
// así se sigue viendo lo que ya se escribió. Enter envía y Shift+Enter hace un salto de línea.
// Va dentro de un <form>: al enviar dispara su onSubmit.
import { useEffect, useRef } from 'react';

const ALTO_MAX = 132; // ~5 renglones; después la caja se desplaza por dentro

const EntradaMensaje = ({ value, onChange, placeholder, disabled, className = '', maxLength, ariaLabel }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAX)}px`;
    el.style.overflowY = el.scrollHeight > ALTO_MAX ? 'auto' : 'hidden';
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={`entrada-mensaje ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          if (value.trim()) e.currentTarget.form?.requestSubmit();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      aria-label={ariaLabel || placeholder}
    />
  );
};

export default EntradaMensaje;
