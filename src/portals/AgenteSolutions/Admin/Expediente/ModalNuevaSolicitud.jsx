import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  X, FileText, Home, Wrench, MessageSquare, Camera, ImageIcon, PlusCircle,
  UserCheck, User, ClipboardList, Hammer
} from 'lucide-react';
import { API, authHeaders } from './flujoTrabajo';
import '../../../../styles/AgenteSolutions/Admin/VistaPropiedades.css';
import '../../../../styles/AgenteSolutions/Admin/ExpedientePropiedad.css';

// Solicitud de trabajo o de levantamiento para una propiedad, con técnico (rol 2) asignado.
// Reutiliza el diseño "Reportar Problema" (rp-*) de Propiedades.
const FORM_VACIO = { tipo: '', zona: '', area_id: '', equipo: '', descripcion: '', fotos: [], supervisor: '' };

const ModalNuevaSolicitud = ({ propiedad, onClose, onCreada }) => {
  const [modo, setModo] = useState('trabajo');
  const [form, setForm] = useState(FORM_VACIO);
  const [tecnicoId, setTecnicoId] = useState('');
  const [tecnicos, setTecnicos] = useState([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);
  const [zonas, setZonas] = useState([]);
  const [cargandoZonas, setCargandoZonas] = useState(true);
  const [equipos, setEquipos] = useState({});
  const [cargandoEquipos, setCargandoEquipos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [menuFoto, setMenuFoto] = useState(false);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    const headers = authHeaders();
    axios.get(`${API}/usuarios`, { headers })
      .then((res) => (res.data || []).filter((u) => Number(u.role_id) === 2))
      .catch(() => axios.get(`${API}/usuarios/tecnicos`, { headers }).then((r) => r.data || []))
      .then((lista) => setTecnicos(lista.map((u) => ({ ...u, id: String(u.id).replace(/^u_/, '') }))))
      .catch(() => setTecnicos([]))
      .finally(() => setCargandoTecnicos(false));

    axios.get(`${API}/properties/${propiedad.id}/areas`, { headers })
      .then((res) => setZonas(res.data || []))
      .catch(() => setZonas([]))
      .finally(() => setCargandoZonas(false));
  }, [propiedad.id]);

  const cambiarZona = async (areaId) => {
    if (areaId === 'otro') {
      setForm((f) => ({ ...f, area_id: 'otro', zona: 'Otro', equipo: '' }));
      setEquipos({});
      return;
    }
    let area = zonas.find((z) => z.id === parseInt(areaId));
    if (!area) {
      for (const z of zonas) {
        const sub = (z.sub_areas || z.subAreas || []).find((s) => s.id === parseInt(areaId));
        if (sub) { area = { ...sub, name: `${z.name} - ${sub.name}` }; break; }
      }
    }
    setForm((f) => ({ ...f, area_id: areaId, zona: area ? area.name : '', equipo: '' }));
    setEquipos({});
    if (!areaId) return;

    setCargandoEquipos(true);
    try {
      const res = await axios.get(`${API}/areas/${areaId}/components`, { headers: authHeaders() });
      setEquipos((res.data || []).reduce((acc, c) => {
        const cat = c.category || 'General';
        (acc[cat] = acc[cat] || []).push(c);
        return acc;
      }, {}));
    } catch {
      setEquipos({});
    } finally {
      setCargandoEquipos(false);
    }
  };

  const agregarFotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setForm((f) => ({ ...f, fotos: [...f.fotos, ...files].slice(0, 2) }));
    e.target.value = '';
  };

  const nombreTecnico = () => {
    const t = tecnicos.find((x) => String(x.id) === String(tecnicoId));
    return t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : null;
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (modo === 'trabajo' && (!form.tipo || !form.area_id || !form.descripcion.trim())) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completa el tipo, la zona y la descripción.', confirmButtonColor: '#f26522' });
      return;
    }

    setEnviando(true);
    try {
      const idTec = tecnicoId ? Number(tecnicoId) : null;
      if (modo === 'trabajo') {
        const fd = new FormData();
        fd.append('property_id', propiedad.id);
        fd.append('type', form.tipo);
        fd.append('zone', form.zona);
        fd.append('equipment', form.equipo || '');
        fd.append('description', form.equipo
          ? `${form.descripcion}\n\n[EQUIPO AFECTADO]: ${form.equipo}`
          : form.descripcion);
        if (idTec) fd.append('tecnico_id', idTec);
        form.fotos.forEach((foto, i) => fd.append(`evidence_${i + 1}`, foto));
        await axios.post(`${API}/work-orders/cliente`, fd, {
          headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const tec = nombreTecnico();
        await axios.post(`${API}/servicios`, {
          property_id: propiedad.id,
          title: 'Levantamiento Inicial',
          description: form.descripcion.trim() ||
            `Solicitud de visita técnica para registro inicial de la propiedad.${tec ? ` Técnico asignado: ${tec}` : ''}`,
          priority: 'Media',
          supervisor_name: form.supervisor.trim() || tec || 'El propietario',
          technician_id: idTec,
          tecnico_id: idTec,
        }, { headers: authHeaders() });
      }

      Swal.fire({
        icon: 'success',
        title: modo === 'trabajo' ? '¡Trabajo solicitado!' : '¡Levantamiento solicitado!',
        text: idTec ? `Se asignó a ${nombreTecnico()}.` : 'Puedes asignar un técnico después desde Servicios.',
        confirmButtonColor: '#f26522',
      });
      onCreada?.();
      onClose();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar',
        text: error.response?.data?.message || 'Hubo un error al crear la solicitud.',
        confirmButtonColor: '#f26522',
      });
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <>
      <div className="rp-overlay" onClick={onClose}>
        <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="rp-header">
            <div className="rp-header-text">
              <span className="rp-tag">NUEVA SOLICITUD</span>
              <h2 className="rp-title">{modo === 'trabajo' ? 'Solicitar Trabajo' : 'Solicitar Levantamiento'}</h2>
            </div>
            <button type="button" className="rp-close" onClick={onClose} aria-label="Cerrar">
              <X size={18} color="#ffffff" strokeWidth={2.6} />
            </button>
          </div>

          <form className="rp-form" onSubmit={enviar}>
            <div className="xp-seg" role="tablist">
              <button type="button" className={modo === 'trabajo' ? 'on' : ''} onClick={() => setModo('trabajo')}>
                <Hammer size={15} /> Trabajo
              </button>
              <button type="button" className={modo === 'levantamiento' ? 'on' : ''} onClick={() => setModo('levantamiento')}>
                <ClipboardList size={15} /> Levantamiento
              </button>
            </div>

            <p className="xp-rp-propiedad">
              <Home size={15} color="#ff8c42" />
              {propiedad.property_name || propiedad.nombre_propiedad || propiedad.address}
            </p>

            <div className="rp-group">
              <label className="rp-label"><UserCheck size={16} color="#ff8c42" /> Técnico asignado (Rol 2)</label>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} disabled={cargandoTecnicos}>
                <option value="">
                  {cargandoTecnicos ? 'Cargando técnicos...' : tecnicos.length ? 'Sin asignar por ahora' : 'No hay técnicos de rol 2'}
                </option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{`${t.first_name || ''} ${t.last_name || ''}`.trim()} ({t.email})</option>
                ))}
              </select>
            </div>

            {modo === 'trabajo' ? (
              <>
                <div className="rp-group">
                  <label className="rp-label"><FileText size={16} color="#ff8c42" /> Tipo de servicio *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="">Selecciona el tipo...</option>
                    <option value="Mantenimiento">Mantenimiento Preventivo</option>
                    <option value="Problema">Problema / Reparación</option>
                    <option value="SOS">SOS / Urgente</option>
                  </select>
                </div>

                <div className="rp-group">
                  <label className="rp-label"><Home size={16} color="#ff8c42" /> Zona de la propiedad *</label>
                  <select required value={form.area_id} onChange={(e) => cambiarZona(e.target.value)} disabled={cargandoZonas}>
                    <option value="">{cargandoZonas ? 'Cargando zonas...' : 'Seleccionar zona...'}</option>
                    {zonas.map((z) => {
                      const subs = z.sub_areas || z.subAreas || [];
                      return subs.length ? (
                        <optgroup key={`g-${z.id}`} label={z.name.toUpperCase()}>
                          <option value={z.id}>{z.name} (Área General)</option>
                          {subs.map((s) => <option key={`s-${s.id}`} value={s.id}>{s.name}</option>)}
                        </optgroup>
                      ) : (
                        <option key={`z-${z.id}`} value={z.id}>{z.name}</option>
                      );
                    })}
                    <option value="otro">Otro (No está en la lista)</option>
                  </select>
                </div>

                <div className="rp-group">
                  <label className="rp-label"><Wrench size={16} color="#ff8c42" /> Equipo afectado (Opcional)</label>
                  <select
                    value={form.equipo}
                    disabled={!form.area_id || cargandoEquipos}
                    onChange={(e) => setForm({ ...form, equipo: e.target.value })}
                  >
                    <option value="">
                      {!form.area_id ? 'Primero selecciona una zona' : cargandoEquipos ? 'Cargando equipos...' : 'Seleccionar equipo...'}
                    </option>
                    {Object.entries(equipos).map(([cat, items]) => (
                      <optgroup key={cat} label={cat.toUpperCase()}>
                        {items.map((it) => (
                          <option key={it.id} value={`${it.sub_category} ${it.brand ? `(${it.brand})` : ''}`}>
                            {it.sub_category} {it.brand ? `(${it.brand})` : ''} {it.model_or_color ? `- ${it.model_or_color}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="otro">Otro (No está en la lista)</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="rp-group">
                <label className="rp-label"><User size={16} color="#ff8c42" /> Supervisor en sitio (Opcional)</label>
                <input
                  type="text"
                  className="xp-rp-input"
                  placeholder="Ej. Juan Pérez (Conserje)"
                  value={form.supervisor}
                  onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                />
              </div>
            )}

            <div className="rp-group">
              <label className="rp-label">
                <MessageSquare size={16} color="#ff8c42" /> Descripción {modo === 'trabajo' ? '*' : '(Opcional)'}
              </label>
              <textarea
                required={modo === 'trabajo'}
                rows="3"
                placeholder={modo === 'trabajo' ? 'Describe detalladamente el trabajo...' : 'Indicaciones para el levantamiento...'}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            {modo === 'trabajo' && (
              <div className="rp-group">
                <label className="rp-label"><Camera size={16} color="#ff8c42" /> Evidencia visual (Máx 2 fotos)</label>
                <input type="file" ref={cameraRef} hidden accept="image/*" capture="environment" onChange={agregarFotos} />
                <input type="file" ref={galleryRef} hidden accept="image/*" multiple onChange={agregarFotos} />
                <div className="xp-rp-fotos">
                  {form.fotos.map((foto, i) => (
                    <div key={i} className="xp-rp-foto">
                      <img src={URL.createObjectURL(foto)} alt="Evidencia" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                        aria-label="Quitar foto"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {form.fotos.length < 2 && (
                    <button type="button" className="xp-rp-foto-add" onClick={() => setMenuFoto(true)}>
                      <PlusCircle size={22} color="#ff8c42" />
                      <span>AÑADIR</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="rp-footer">
              <button type="submit" className="xp-btn-primary" disabled={enviando}>
                {enviando ? 'Enviando...' : modo === 'trabajo' ? 'Solicitar trabajo' : 'Solicitar levantamiento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {menuFoto && (
        <div className="rp-overlay xp-rp-fuente" onClick={() => setMenuFoto(false)}>
          <div className="xp-rp-fuente-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Seleccionar origen</h3>
            <button type="button" onClick={() => { setMenuFoto(false); cameraRef.current?.click(); }}>
              <Camera size={19} color="#ff8c42" /> Tomar foto
            </button>
            <button type="button" onClick={() => { setMenuFoto(false); galleryRef.current?.click(); }}>
              <ImageIcon size={19} color="#ff8c42" /> Elegir de la galería
            </button>
            <button type="button" className="cancelar" onClick={() => setMenuFoto(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default ModalNuevaSolicitud;
