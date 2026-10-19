import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Users, X, UserPlus, Star, Trash2, CheckCircle2, Loader2, ClipboardCheck } from 'lucide-react';
import '../../styles/Modals/ModalEquipoLevantamiento.css';

const API = import.meta.env.VITE_API_BASE_URL;

const initials = (name = '') => name
  .replace(/[^\p{L}\s]/gu, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(p => p[0].toUpperCase())
  .join('') || '?';

const Avatar = ({ person }) => (
  <span className="mel-avatar">
    {person.profile_picture ? <img src={person.profile_picture} alt="" /> : initials(person.name)}
  </span>
);

/**
 * Equipo de trabajo del levantamiento de una propiedad (solo admins).
 * Todos los integrantes ven y editan el mismo levantamiento.
 */
const ModalEquipoLevantamiento = ({ propiedad, onClose, onChanged }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seleccion, setSeleccion] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/propiedades/${propiedad.id}/equipo-levantamiento`);
      setData(res.data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo cargar el equipo', text: err.response?.data?.error || 'Inténtalo de nuevo.' });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [propiedad.id, onClose]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const ejecutar = async (peticion, exito) => {
    setBusy(true);
    try {
      const res = await peticion();
      setData(res.data);
      onChanged?.();
      if (exito) Swal.fire({ icon: 'success', title: exito, timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err.response?.data?.error || 'Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const agregar = () => {
    if (!seleccion) return;
    const tecnico = data.available.find(t => String(t.id) === String(seleccion));
    ejecutar(
      () => axios.post(`${API}/propiedades/${propiedad.id}/equipo-levantamiento`, { technician_id: Number(seleccion) }),
      `${tecnico?.name || 'Técnico'} ${data.service ? 'se unió al equipo' : 'quedó asignado al levantamiento'}`
    ).then(() => setSeleccion(''));
  };

  const quitar = async (persona) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: `¿Quitar a ${persona.name} del equipo?`,
      text: 'Dejará de ver este levantamiento en su lista. Lo que ya registró se conserva.',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      reverseButtons: true
    });
    if (!r.isConfirmed) return;
    ejecutar(() => axios.delete(`${API}/propiedades/${propiedad.id}/equipo-levantamiento/${persona.id}`));
  };

  const finalizar = async () => {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Marcar el levantamiento como finalizado?',
      text: 'Quedará como completo. El equipo podrá seguir editándolo si hace falta.',
      showCancelButton: true,
      confirmButtonText: 'Finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      reverseButtons: true
    });
    if (!r.isConfirmed) return;
    ejecutar(() => axios.post(`${API}/propiedades/${propiedad.id}/equipo-levantamiento/finalizar`), 'Levantamiento finalizado');
  };

  const servicio = data?.service;

  return createPortal(
    <div className="mel-overlay" onClick={() => !busy && onClose()}>
      <div className="mel-window" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="mel-title">
        <div className="mel-header">
          <span className="mel-header-icon"><Users size={20} /></span>
          <div className="mel-header-text">
            <h3 id="mel-title">Equipo del levantamiento</h3>
            <p>{propiedad.nombre_propiedad || data?.property_name}</p>
          </div>
          <button type="button" className="mel-close" onClick={onClose} disabled={busy} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mel-body">
          {loading ? (
            <div className="mel-empty"><Loader2 size={22} className="mel-spin" /> Cargando equipo…</div>
          ) : (
            <>
              {servicio ? (
                <div className={`mel-status ${servicio.finalizado ? 'done' : 'open'}`}>
                  {servicio.finalizado
                    ? <><CheckCircle2 size={16} /> Finalizado · el equipo aún puede editarlo</>
                    : <><Loader2 size={16} /> En proceso</>}
                </div>
              ) : (
                <div className="mel-status open">
                  <ClipboardCheck size={16} /> Sin técnico asignado
                </div>
              )}

              <p className="mel-hint">
                {servicio
                  ? 'Todos los integrantes ven y editan el mismo levantamiento: lo que agrega uno, lo ven los demás.'
                  : data.zonas_registradas > 0
                    ? `Ya hay ${data.zonas_registradas} ${data.zonas_registradas === 1 ? 'zona registrada' : 'zonas registradas'}. Asigna uno o más técnicos para que continúen el levantamiento.`
                    : 'Asigna uno o más técnicos para que realicen el levantamiento. El primero que agregues será el responsable.'}
              </p>

              <ul className="mel-members">
                {(data.members || []).map(m => (
                  <li key={m.id}>
                    <Avatar person={m} />
                    <span className="mel-member-name">{m.name}</span>
                    {m.is_lead && <span className="mel-lead"><Star size={12} /> Responsable</span>}
                    {data.members.length > 1 && (
                      <button type="button" className="mel-remove" onClick={() => quitar(m)} disabled={busy} title="Quitar del equipo">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mel-add">
                <label htmlFor="mel-select">{servicio ? 'Agregar técnico' : 'Asignar técnico'}</label>
                <div className="mel-add-row">
                  <select
                    id="mel-select"
                    value={seleccion}
                    onChange={(e) => setSeleccion(e.target.value)}
                    disabled={busy || data.available.length === 0}
                  >
                    <option value="">
                      {data.available.length === 0 ? 'No hay más técnicos disponibles' : 'Selecciona un técnico…'}
                    </option>
                    {data.available.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button type="button" className="mel-btn-add" onClick={agregar} disabled={!seleccion || busy}>
                    <UserPlus size={16} /> {servicio ? 'Agregar' : 'Asignar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {servicio && !servicio.finalizado && (
          <div className="mel-footer">
            <button type="button" className="mel-btn-finish" onClick={finalizar} disabled={busy}>
              <CheckCircle2 size={16} /> Marcar levantamiento como finalizado
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ModalEquipoLevantamiento;
