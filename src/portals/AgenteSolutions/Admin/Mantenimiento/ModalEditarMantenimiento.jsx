import { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Check, X } from 'lucide-react';
import { API, authHeaders } from '../Expediente/flujoTrabajo';
import { CampoFecha, CampoFoto, dentroDeMeses, hoyISO, proximaFecha } from './CamposMantenimiento';
import '../../../../styles/AgenteSolutions/Admin/Mantenimiento.css';

const ATAJOS_MESES = [3, 6, 12];

// Ajustar la fecha y los datos de un equipo. onGuardado recibe el equipo actualizado.
const ModalEditarMantenimiento = ({ equipo, onCerrar, onGuardado }) => {
  const fechaActual = proximaFecha(equipo) || '';
  const [form, setForm] = useState({
    tipo: equipo.tipo || '',
    cantidad: equipo.cantidad || 1,
    detalle: equipo.detalle || '',
    fecha: fechaActual,
    foto_equipo: null,
    foto_datos: null,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const hoy = hoyISO();
  const vencida = fechaActual && fechaActual < hoy;

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    if (!form.tipo.trim() || !form.fecha) {
      setError('Indica el equipo y la fecha del próximo mantenimiento.');
      return;
    }

    const fd = new FormData();
    fd.append('_method', 'PUT');
    fd.append('tipo', form.tipo.trim());
    fd.append('cantidad', form.cantidad || 1);
    fd.append('fecha', form.fecha);
    fd.append('detalle', form.detalle.trim());
    if (form.foto_equipo) fd.append('foto_equipo', form.foto_equipo);
    if (form.foto_datos) fd.append('foto_datos', form.foto_datos);

    setGuardando(true);
    setError('');
    try {
      const { data } = await axios.post(`${API}/mantenimiento/equipos/${equipo.id}`, fd, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      onGuardado(data.equipo);
      onCerrar();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'No se pudo guardar. Intenta de nuevo.');
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="mt-overlay" onClick={onCerrar}>
      <form className="mt-modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <div className="mt-modal-cabecera">
          <h2>Editar mantenimiento</h2>
          <button type="button" className="mt-icono" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="mt-campo">
          <span>Fecha del próximo mantenimiento *</span>
          <div className="mt-fecha">
            {ATAJOS_MESES.map((n) => {
              const valor = dentroDeMeses(n);
              return (
                <button key={n} type="button" className={form.fecha === valor ? 'on' : ''} onClick={() => setForm({ ...form, fecha: valor })} aria-pressed={form.fecha === valor}>
                  En {n} meses
                </button>
              );
            })}
            <CampoFecha
              min={vencida && form.fecha === fechaActual ? undefined : hoy}
              ariaLabel="Fecha del próximo mantenimiento"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          {vencida && <small className="mt-nota-vencida">Esta fecha ya pasó: elige una nueva si se reprograma.</small>}
        </div>

        <div className="mt-fila">
          <label className="mt-campo mt-campo-equipo">
            <span>Equipo *</span>
            <input type="text" maxLength={150} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
          </label>
          <label className="mt-campo mt-campo-cantidad">
            <span>Cantidad</span>
            <input type="number" min="1" max="1000" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          </label>
        </div>

        <label className="mt-campo">
          <span>Detalle (opcional)</span>
          <input type="text" maxLength={1000} value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
        </label>

        <div className="mt-fotos">
          <CampoFoto etiqueta="Foto del equipo" actual={equipo.foto_equipo_url} archivo={form.foto_equipo} onChange={(f) => setForm({ ...form, foto_equipo: f })} />
          <CampoFoto etiqueta="Tarjeta de datos" actual={equipo.foto_datos_url} archivo={form.foto_datos} onChange={(f) => setForm({ ...form, foto_datos: f })} />
        </div>

        {error && <p className="mt-error" role="alert">{error}</p>}

        <div className="mt-modal-pie">
          <button type="button" className="mt-btn-cancelar" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="xp-btn-primary" disabled={guardando}>
            <Check size={17} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default ModalEditarMantenimiento;
