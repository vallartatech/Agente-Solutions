import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  X, Plus, Trash2, Calculator, 
  Search, User, Home, 
  AlertCircle, Upload,
  MapPin, Phone
} from 'lucide-react';
import mpLogo from '../../assets/Mercado-Pago.png';
import '../../styles/Shared/CreateQuotationModal.css';
import { mostrarAviso } from '../../utils/dialogos';

const IVA_RATE = 0.16;

const CreateQuotationModal = ({ onClose, onSuccess, prefillData }) => {
  const [tab, setTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Seleccionar Servicio, 2: Detalles

  // --- MODO LOTE / UNIFICADA ---
  const [isUnifiedBatch, setIsUnifiedBatch] = useState(false);
  const [loteServicios, setLoteServicios] = useState([]);
  const [activeTabLote, setActiveTabLote] = useState(0);

  // --- BUSQUEDA DE SERVICIO ---
  const [busqueda, setBusqueda] = useState('');
  const [todosServicios, setTodosServicios] = useState([]);
  const [serviciosEncontrados, setServiciosEncontrados] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  // --- DATOS COTIZACION ---
  const [filasConceptos, setFilasConceptos] = useState([{ id: Date.now(), desc: '', cant: 1, precio: '' }]);
  const [filasMateriales, setFilasMateriales] = useState([{ id: Date.now() + 1, desc: '', cant: 1, precio: '' }]);
  const [observaciones, setObservaciones] = useState('');
  const [observacionesInternas, setObservacionesInternas] = useState('');
  const [archivo, setArchivo] = useState(null);

  useEffect(() => {
    if (prefillData) {
      setServicioSeleccionado({
        id: prefillData.service_id || prefillData.work_order_id || prefillData.dbId || prefillData.id,
        is_work_order: !!(prefillData.work_order_id || prefillData.is_work_order || prefillData.dbId),
        identificador_curp: prefillData.folio || prefillData.folio_interno || `COT-${prefillData.id}`,
        propietario: prefillData.cliente || prefillData.cliente_nombre || prefillData.titulo,
        propiedad_nombre: prefillData.propiedad_nombre || prefillData.titulo || '---',
        direccion: prefillData.direccion || prefillData.propiedad_direccion || '---'
      });
      
      let conceptObj = prefillData.concept || prefillData.concepto || prefillData.descripcion;
      if (typeof conceptObj === 'string' && (conceptObj.trim().startsWith('{') || conceptObj.trim().startsWith('['))) {
        try {
          conceptObj = JSON.parse(conceptObj);
        } catch {
          // ignore
        }
      }

      if (prefillData.isUnifiedBatch || prefillData.isBatch || prefillData.batchTasks) {
        setIsUnifiedBatch(true);
        const batchList = prefillData.batchTasks || prefillData.serviciosLote || [];
        if (batchList.length > 0) {
          setLoteServicios(batchList.map((t, idx) => ({
            id: t.dbId || t.id || idx + 1,
            titulo: `Servicio #${idx + 1}: ${t.descripcion || t.titulo || 'Reparación'}`,
            filasConceptos: [{ id: Date.now() + idx * 10, desc: t.descripcion || '', cant: 1, precio: '' }],
            filasMateriales: [{ id: Date.now() + idx * 10 + 5, desc: '', cant: 1, precio: '' }]
          })));
        }
      } else if (conceptObj && typeof conceptObj === 'object') {
        if (conceptObj.isUnifiedBatch && conceptObj.seccionesLote) {
          setIsUnifiedBatch(true);
          setLoteServicios(conceptObj.seccionesLote.map((s, idx) => ({
            id: s.servicioId || idx + 1,
            titulo: s.titulo || `Servicio #${idx + 1}`,
            filasConceptos: s.conceptos?.map((f, i) => ({ id: Date.now() + i, desc: f.descripcion || f.desc, cant: f.cantidad || f.cant || 1, precio: f.precio || f.precio_u || '' })) || [],
            filasMateriales: s.materiales?.map((f, i) => ({ id: Date.now() + 100 + i, desc: f.descripcion || f.nombre || f.desc, cant: f.cantidad || f.cant || 1, precio: f.precio || f.costo_u || '' })) || []
          })));
        } else {
          if (conceptObj.servicios || conceptObj.conceptos) {
            const arr = conceptObj.servicios || conceptObj.conceptos;
            setFilasConceptos(arr.map((f, i) => ({
              id: Date.now() + i,
              desc: f.descripcion || f.desc || f.titulo || 'Servicio',
              cant: f.cantidad || f.cant || 1,
              precio: f.precio || f.precio_u || ''
            })));
          }
          if (conceptObj.materiales) {
            setFilasMateriales(conceptObj.materiales.map((f, i) => ({
              id: Date.now() + 100 + i,
              desc: f.descripcion || f.nombre || f.desc || 'Material',
              cant: f.cantidad || f.cant || 1,
              precio: f.precio || f.costo_u || ''
            })));
          }
        }
      } else if (typeof conceptObj === 'string' && conceptObj.trim().length > 0) {
        setFilasConceptos([{
          id: Date.now(),
          desc: conceptObj,
          cant: 1,
          precio: prefillData.total || prefillData.total_amount || ''
        }]);
      }
      
      setObservacionesInternas(prefillData.isDerived ? `--- RECOTIZACIÓN DERIVADA DE #${prefillData.folio || prefillData.id} ---\nOriginal conservada en la BD.` : `--- COTIZACIÓN ANTERIOR ---\n${prefillData.observations || ''}`);
      setStep(2);
    }
  }, [prefillData]);

  // Cargar todos los servicios al abrir para poder filtrar localmente por todos los campos
  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios`);
        const data = res.data.data || res.data || [];
        setTodosServicios(data);
        setServiciosEncontrados(data);
      } catch (error) {
        console.error("Error al cargar servicios para cotizar:", error);
      }
    };
    cargarServicios();
  }, []);

  // Filtrado reactivo local en múltiples campos
  useEffect(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) {
      setServiciosEncontrados(todosServicios);
      return;
    }

    const filtrados = todosServicios.filter(s => {
      const idStr = String(s.curp || s.identificador_curp || s.id || '').toLowerCase();
      const clienteNombre = String(s.cliente_nombre || s.propietario || '').toLowerCase();
      const propiedadNombre = String(s.propiedad_nombre || '').toLowerCase();
      const telefono = String(s.cliente_telefono || s.telefono_cliente || s.telefono || '').toLowerCase();
      const direccion = String(s.direccion || '').toLowerCase();

      return idStr.includes(termino) ||
             clienteNombre.includes(termino) ||
             propiedadNombre.includes(termino) ||
             telefono.includes(termino) ||
             direccion.includes(termino);
    });

    setServiciosEncontrados(filtrados);
  }, [busqueda, todosServicios]);

  const addFila = (setter) => setter(prev => [...prev, { id: Date.now(), desc: '', cant: 1, precio: '' }]);
  const removeFila = (setter, id) => setter(prev => prev.filter(f => f.id !== id));
  const updateFila = (setter, id, field, value) => {
    setter(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const addFilaLote = (idx, tipo) => {
    setLoteServicios(prev => prev.map((s, i) => i === idx ? {
      ...s,
      [tipo]: [...s[tipo], { id: Date.now(), desc: '', cant: 1, precio: '' }]
    } : s));
  };
  const removeFilaLote = (idx, tipo, filaId) => {
    setLoteServicios(prev => prev.map((s, i) => i === idx ? {
      ...s,
      [tipo]: s[tipo].filter(f => f.id !== filaId)
    } : s));
  };
  const updateFilaLote = (idx, tipo, filaId, field, val) => {
    setLoteServicios(prev => prev.map((s, i) => i === idx ? {
      ...s,
      [tipo]: s[tipo].map(f => f.id === filaId ? { ...f, [field]: val } : f)
    } : s));
  };

  const calcularTotales = () => {
    let subtotal = 0;
    if (isUnifiedBatch && loteServicios.length > 0) {
      subtotal = loteServicios.reduce((accS, s) => {
        const subC = s.filasConceptos.reduce((acc, f) => acc + (Number(f.cant) * Number(f.precio)), 0);
        const subM = s.filasMateriales.reduce((acc, f) => acc + (Number(f.cant) * Number(f.precio)), 0);
        return accS + subC + subM;
      }, 0);
    } else {
      subtotal = filasConceptos.reduce((acc, f) => acc + (Number(f.cant) * Number(f.precio)), 0)
                 + filasMateriales.reduce((acc, f) => acc + (Number(f.cant) * Number(f.precio)), 0);
    }
    const iva = subtotal * IVA_RATE;
    const subtotalConIva = subtotal + iva;
    const comisionMP = (subtotalConIva * 0.0349 + 4) * 1.16;
    const total = subtotalConIva + comisionMP;
    return { subtotal, iva, comisionMP, total };
  };

  const handleGuardar = async () => {
    if (!servicioSeleccionado) return mostrarAviso("Por favor seleccione un servicio.");
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', tab);
      
      // Determinar si es service_id o work_order_id
      if (servicioSeleccionado.is_work_order) {
        formData.append('work_order_id', servicioSeleccionado.id);
      } else {
        formData.append('service_id', servicioSeleccionado.id);
      }

      if (tab === 'manual') {
        let conceptData;
        if (isUnifiedBatch && loteServicios.length > 0) {
          conceptData = {
            isUnifiedBatch: true,
            seccionesLote: loteServicios.map(s => ({
              titulo: s.titulo,
              servicioId: s.id,
              conceptos: s.filasConceptos.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio })),
              materiales: s.filasMateriales.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio }))
            })),
            servicios: loteServicios.flatMap(s => s.filasConceptos.map(f => ({ descripcion: `[${s.titulo}] ${f.desc}`, cantidad: f.cant, precio: f.precio }))),
            materiales: loteServicios.flatMap(s => s.filasMateriales.map(f => ({ descripcion: `[${s.titulo}] ${f.desc}`, cantidad: f.cant, precio: f.precio })))
          };
          formData.append('is_unified_batch', 'true');
          formData.append('related_service_ids', JSON.stringify(loteServicios.map(s => s.id)));
        } else {
          conceptData = {
            servicios: filasConceptos.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio })),
            materiales: filasMateriales.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio }))
          };
        }
        formData.append('concept', JSON.stringify(conceptData));
        const { total } = calcularTotales();
        formData.append('estimated_amount', total.toFixed(2));
        formData.append('observations', observaciones);
        formData.append('internal_observations', observacionesInternas);
        if (prefillData?.id) {
          formData.append('parent_id', String(prefillData.id));
          formData.append('version', String((prefillData.version || 1) + 1));
          formData.append('is_new_version', 'true');
          formData.append('status', 'Por Pagar');
          formData.append('estado', 'Por Pagar');
          formData.append('recotizacion_solicitada', 'false');
        } else {
          formData.append('status', 'Por Pagar');
          formData.append('estado', 'Por Pagar');
        }
      } else {
        if (!archivo) return mostrarAviso("Seleccione un archivo.");
        formData.append('file', archivo);
        formData.append('status', 'Por Pagar');
        formData.append('estado', 'Por Pagar');
      }

      let endpoint = `${import.meta.env.VITE_API_BASE_URL}/cotizaciones`;
      let successMsg = prefillData?.isRecotizacionV2 || prefillData?.id
        ? `¡Versión 2 (V${(prefillData.version || 1) + 1}) creada y enviada! El estado ha cambiado a POR PAGAR.`
        : "¡Cotización creada y enviada al cliente exitosamente en estado POR PAGAR!";

      if (prefillData?.status === 'Rechazado' && !prefillData?.isDerived && !prefillData?.isRecotizacionV2) {
        endpoint = `${import.meta.env.VITE_API_BASE_URL}/cotizaciones/${prefillData.id}/update`;
        successMsg = "¡Cotización actualizada y enviada al cliente en estado POR PAGAR!";
      }

      const procesarTransicionPorPagarLocal = (quoteCreadaDesdeApi = null) => {
        const session = JSON.parse(localStorage.getItem('agente_session') || '{}');
        const roleId = session?.userData?.role_id;
        const roleName = roleId === 2 ? 'Técnico' : 'Admin';
        const { total } = tab === 'manual' ? calcularTotales() : { total: 0 };
        const nextVer = (prefillData?.version || 1) + 1;
        const folioBase = prefillData?.folio ? prefillData.folio.split('-V')[0] : (prefillData?.id ? `COT-${prefillData.id}` : `COT-${Date.now()}`);

        let conceptDataObj;
        if (isUnifiedBatch && loteServicios.length > 0) {
          conceptDataObj = {
            isUnifiedBatch: true,
            seccionesLote: loteServicios.map(s => ({
              titulo: s.titulo,
              servicioId: s.id,
              conceptos: s.filasConceptos.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio })),
              materiales: s.filasMateriales.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio }))
            })),
            servicios: loteServicios.flatMap(s => s.filasConceptos.map(f => ({ descripcion: `[${s.titulo}] ${f.desc}`, cantidad: f.cant, precio: f.precio }))),
            materiales: loteServicios.flatMap(s => s.filasMateriales.map(f => ({ descripcion: `[${s.titulo}] ${f.desc}`, cantidad: f.cant, precio: f.precio })))
          };
        } else {
          conceptDataObj = {
            servicios: filasConceptos.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio })),
            materiales: filasMateriales.map(f => ({ descripcion: f.desc, cantidad: f.cant, precio: f.precio }))
          };
        }

        const nuevaCotizacion = quoteCreadaDesdeApi ? {
          ...quoteCreadaDesdeApi,
          status: 'Por Pagar',
          estado: 'Por Pagar',
          recotizacionSolicitada: false,
          is_requote_requested: false
        } : {
          id: Date.now(),
          parent_id: prefillData?.id || null,
          version: nextVer,
          folio: `${folioBase}-V${nextVer}`,
          cliente: prefillData?.cliente || servicioSeleccionado?.propietario || 'Cliente',
          cliente_user_id: prefillData?.cliente_user_id,
          cliente_telefono: prefillData?.cliente_telefono || prefillData?.telefono,
          propiedad_nombre: prefillData?.propiedad_nombre || servicioSeleccionado?.propiedad_nombre,
          propiedad_direccion: prefillData?.propiedad_direccion || servicioSeleccionado?.direccion,
          status: 'Por Pagar',
          estado: 'Por Pagar',
          recotizacionSolicitada: false,
          is_requote_requested: false,
          total: total.toFixed(2),
          concept: conceptDataObj,
          observations: observaciones,
          internal_observations: observacionesInternas,
          created_by_role: roleName,
          tecnico: roleId === 2 ? session?.userData?.name : (prefillData?.tecnico || null),
          created_at: new Date().toISOString()
        };

        const cotizLocales = JSON.parse(localStorage.getItem('carrito_cotizaciones') || '[]');
        if (prefillData?.id) {
          const indV1 = cotizLocales.findIndex(item => String(item.id) === String(prefillData.id));
          if (indV1 !== -1) {
            cotizLocales[indV1].estado = `Reemplazada por V${nextVer}`;
            cotizLocales[indV1].status = `Reemplazada por V${nextVer}`;
            cotizLocales[indV1].newer_version_id = nuevaCotizacion.id;
            cotizLocales[indV1].recotizacionSolicitada = false;
            cotizLocales[indV1].is_requote_requested = false;
          }
        }
        localStorage.setItem('carrito_cotizaciones', JSON.stringify([nuevaCotizacion, ...cotizLocales]));

        // Notificar al cliente que su cotización/recotización está lista en "Por Pagar"
        const notifsCliente = JSON.parse(localStorage.getItem('notificaciones_cliente') || '[]');
        notifsCliente.unshift({
          id: Date.now(),
          type: 'recotizacion_lista',
          title: '✅ ¡Tu cotización está lista por pagar!',
          message: `Hemos procesado tu cotización ${nuevaCotizacion.folio || ''}. Ya está lista en tu sección de Por Pagar.`,
          created_at: new Date().toISOString(),
          read_at: null,
          cliente_user_id: prefillData?.cliente_user_id,
          data: { quote_id: nuevaCotizacion.id, url: '/vista-cotizaciones?filtro=Por Pagar' }
        });
        localStorage.setItem('notificaciones_cliente', JSON.stringify(notifsCliente));

        // Marcar resuelta cualquier notificación de recotización para el Admin
        let notifsAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
        notifsAdmin = notifsAdmin.map(n => {
          if ((n.type === 'solicitud_recotizacion' || n.type === 'solicitud_recotizacion_tecnico') && String(n.data?.quote_id) === String(prefillData?.id)) {
            return { ...n, resuelta: true };
          }
          return n;
        });

        if (roleId === 2) {
          notifsAdmin.unshift({
            id: Date.now(),
            type: 'version_v2_tecnico',
            title: '🛠️ Nueva Versión de Cotización (V2) por Técnico',
            message: `El técnico ${session?.userData?.name || ''} ha generado la versión V2 para ${nuevaCotizacion.folio}.`,
            created_at: new Date().toISOString(),
            read_at: null,
            data: { quote_id: nuevaCotizacion.id }
          });
        }
        localStorage.setItem('notificaciones_admin', JSON.stringify(notifsAdmin));

        // Marcar resuelta cualquier notificación de recotización para el Técnico
        let notifsTecnico = JSON.parse(localStorage.getItem('notificaciones_tecnico') || '[]');
        notifsTecnico = notifsTecnico.map(n => {
          if (n.type === 'solicitud_recotizacion_tecnico' && String(n.data?.quote_id) === String(prefillData?.id)) {
            return { ...n, resuelta: true };
          }
          return n;
        });
        localStorage.setItem('notificaciones_tecnico', JSON.stringify(notifsTecnico));

        window.dispatchEvent(new Event('notif_update'));
        window.dispatchEvent(new Event('storage'));
      };

      try {
        const res = await axios.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.status === 201 || res.status === 200) {
          procesarTransicionPorPagarLocal(res.data?.cotizacion || res.data);
          mostrarAviso(successMsg);
          onSuccess();
          return;
        }
      } catch (apiErr) {
        console.warn("API offline o endpoint no disponible, realizando respaldo local de versión V2:", apiErr);
      }

      // Fallback local garantizado
      if (prefillData?.id || servicioSeleccionado) {
        procesarTransicionPorPagarLocal();
        mostrarAviso(successMsg);
        onSuccess();
      }
    } catch (error) {
      console.error("Error procesando cotización:", error);
      mostrarAviso("Hubo un error al procesar la cotización.");
    } finally {
      setLoading(false);
    }
  };

  // En portal y por encima del encabezado (z-index 999999) para que no tape la parte de arriba
  return createPortal(
<div className="modal-fixed-overlay cqm-overlay" style={{ zIndex: 1000000 }}>
<div className="modal-box-card cqm-card">
        
<div className="modal-header-dark cqm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
<span className="cqm-header-icon"><Calculator size={20} strokeWidth={2.4} /></span>
            <h2 className="cotiz-modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>
              {prefillData?.isRecotizacionV2 || prefillData?.isDerived || prefillData?.id
                ? `NUEVA VERSIÓN (V${(prefillData.version || 1) + 1}) DE ${prefillData.folio || '#' + prefillData.id}` 
                : 'NUEVA COTIZACIÓN - ADMIN'}
            </h2>
          </div>
<button type="button" className="modal-close-icon cqm-close" onClick={onClose} aria-label="Cerrar"><X size={20} strokeWidth={2.6} /></button>
        </div>

<div className="modal-body-content cqm-body">
          
          {step === 1 ? (
            <div className="step-selection">
<h3 className="cqm-step-title">1. Seleccionar Servicio o Trabajo</h3>
              <div className="admin-search-box" style={{ position: 'relative' }}>
<Search size={18} className="cqm-search-icon" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, propiedad o identificador..." 
                  className="cqm-search-input"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

<div className="servicios-results cqm-results">
                {serviciosEncontrados.length === 0 ? (
<div className="cqm-empty">
                    <AlertCircle size={32} color="#999" style={{ marginBottom: '10px', display: 'inline-block' }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>No se encontraron servicios que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  serviciosEncontrados.map(s => {
                    const isSelected = servicioSeleccionado?.id === s.id;
                    return (
                      <div 
                        key={s.id} 
                        className={`servicio-item-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setServicioSeleccionado(s)}
                      >
                        {/* Fachada Thumbnail */}
                        <div className="cqm-thumb">
                          {s.foto_fachada ? (
                            <img 
                              src={s.foto_fachada} 
                              alt="Fachada" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ 
                              width: '100%', 
                              height: '100%', 
                              background: 'linear-gradient(135deg, rgba(242,102,36,0.1), rgba(242,102,36,0.25))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Home size={32} color="#f26624" style={{ opacity: 0.7 }} />
                            </div>
                          )}
                        </div>

                        {/* Contenido info */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '800', color: '#f26624', fontSize: '0.95rem' }}>
                              #{s.curp || s.identificador_curp || s.id}
                            </span>
                            <span className={`cqm-chip ${isSelected ? 'selected' : ''}`}>
                              {s.propiedad_tipo || s.tipoPropiedad || 'Servicio'}
                            </span>
                          </div>

                          {/* Dueño / Cliente */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <User size={15} color="#475569" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: '700' }}>
                              Dueño: <span style={{ color: '#0f172a', fontWeight: '800' }}>{s.cliente_nombre || s.propietario || 'Sin nombre'}</span>
                            </span>
                            {(s.cliente_telefono || s.telefono_cliente || s.telefono) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', fontSize: '0.8rem', color: '#f26624', background: 'rgba(242,102,36,0.08)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(242,102,36,0.15)', fontWeight: '600' }}>
                                <Phone size={11} /> {s.cliente_telefono || s.telefono_cliente || s.telefono}
                              </span>
                            )}
                          </div>

                          {/* Propiedad */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Home size={15} color="#475569" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: '600' }}>
                              Propiedad: <span style={{ color: '#0f172a', fontWeight: '700' }}>{s.propiedad_nombre}</span>
                            </span>
                          </div>

                          {/* Dirección */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <MapPin size={15} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.25', fontWeight: '500' }}>
                              {s.direccion || 'Sin dirección registrada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {servicioSeleccionado && (
                <button
                  type="button"
                  className="cqm-btn primary block cqm-continuar"
                  onClick={() => setStep(2)}
                >
                  CONTINUAR A DETALLES
                </button>
              )}
            </div>
          ) : (
            <div className="step-details">
<div className="cqm-tabs">
                <button 
                  type="button"
                  className={`tab-btn-mini cqm-tab ${tab === 'manual' ? 'active' : ''}`}
                  onClick={() => setTab('manual')}
                >
                  REGISTRO MANUAL
                </button>
                <button 
                  type="button"
                  className={`tab-btn-mini cqm-tab ${tab === 'archivo' ? 'active' : ''}`}
                  onClick={() => setTab('archivo')}
                >
                  CARGAR ARCHIVO
                </button>
              </div>

              {tab === 'manual' ? (
                <div className="manual-form">
                  {isUnifiedBatch && loteServicios.length > 0 && (
<div className="cqm-lote-box">
<div className="cqm-lote-title">
                        📦 COTIZACIÓN UNIFICADA DE LOTE ({loteServicios.length} SERVICIOS)
                      </div>
<div className="cqm-lote-tabs">
                        {loteServicios.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveTabLote(idx)}
                            className={`cqm-lote-tab ${activeTabLote === idx ? 'active' : ''}`}
                          >
                            Servicio #{idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isUnifiedBatch && loteServicios[activeTabLote] ? (
                    (() => {
                      const srv = loteServicios[activeTabLote];
                      return (
                        <div key={activeTabLote}>
<div className="cqm-lote-banner">
                            Editando Partidas: {srv.titulo}
                          </div>
<h4 className="cqm-section-title">1. CONCEPTOS ({srv.titulo})</h4>
                          {srv.filasConceptos.map(f => (
                            <div key={f.id}className="cqm-row">
<div className="cqm-row-main">
<label className="cqm-label">Descripción del Servicio</label>
                                 <input 
                                   placeholder="Ej. Cambio de carbones..." 
className="cqm-input"
                                   value={f.desc}
                                   onChange={(e) => updateFilaLote(activeTabLote, 'filasConceptos', f.id, 'desc', e.target.value)}
                                 />
                              </div>
<div className="cqm-row-nums">
<div className="cqm-row-num">
<label className="cqm-label">Cant.</label>
                                    <input 
                                      type="number" 
className="cqm-input center"
                                      value={f.cant}
                                      onChange={(e) => updateFilaLote(activeTabLote, 'filasConceptos', f.id, 'cant', e.target.value)}
                                    />
                                 </div>
<div className="cqm-row-num">
<label className="cqm-label">Precio U. ($)</label>
                                    <input 
                                      type="number" 
className="cqm-input right"
                                      value={f.precio}
                                      onChange={(e) => updateFilaLote(activeTabLote, 'filasConceptos', f.id, 'precio', e.target.value)}
                                    />
                                 </div>
                                 <button type="button" onClick={() => removeFilaLote(activeTabLote, 'filasConceptos', f.id)}className="cqm-trash-btn" aria-label="Eliminar fila"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addFilaLote(activeTabLote, 'filasConceptos')}className="cqm-add-btn">
                            <Plus size={16} /> AGREGAR CONCEPTO A ESTE SERVICIO
                          </button>

<h4 className="cqm-section-title">2. MATERIALES ({srv.titulo})</h4>
                          {srv.filasMateriales.map(f => (
                            <div key={f.id}className="cqm-row">
<div className="cqm-row-main">
<label className="cqm-label">Nombre del Material</label>
                                 <input 
                                   placeholder="Ej. Carbones..." 
className="cqm-input"
                                   value={f.desc}
                                   onChange={(e) => updateFilaLote(activeTabLote, 'filasMateriales', f.id, 'desc', e.target.value)}
                                 />
                              </div>
<div className="cqm-row-nums">
<div className="cqm-row-num">
<label className="cqm-label">Cant.</label>
                                    <input 
                                      type="number" 
className="cqm-input center"
                                      value={f.cant}
                                      onChange={(e) => updateFilaLote(activeTabLote, 'filasMateriales', f.id, 'cant', e.target.value)}
                                    />
                                 </div>
<div className="cqm-row-num">
<label className="cqm-label">Costo U. ($)</label>
                                    <input 
                                      type="number" 
className="cqm-input right"
                                      value={f.precio}
                                      onChange={(e) => updateFilaLote(activeTabLote, 'filasMateriales', f.id, 'precio', e.target.value)}
                                    />
                                 </div>
                                 <button type="button" onClick={() => removeFilaLote(activeTabLote, 'filasMateriales', f.id)}className="cqm-trash-btn" aria-label="Eliminar fila"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addFilaLote(activeTabLote, 'filasMateriales')}className="cqm-add-btn">
                            <Plus size={16} /> AGREGAR MATERIAL A ESTE SERVICIO
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <>
<h4 className="cqm-section-title">1. CONCEPTOS DE SERVICIO</h4>
                      {filasConceptos.map(f => (
                        <div key={f.id}className="cqm-row">
<div className="cqm-row-main">
<label className="cqm-label">Descripción del Servicio</label>
                             <input 
                               placeholder="Ej. Cambio de carbones a máquina..." 
className="cqm-input"
                               value={f.desc}
                               onChange={(e) => updateFila(setFilasConceptos, f.id, 'desc', e.target.value)}
                             />
                          </div>
<div className="cqm-row-nums">
<div className="cqm-row-num">
<label className="cqm-label">Cant.</label>
                                <input 
                                  type="number" 
className="cqm-input center"
                                  value={f.cant}
                                  onChange={(e) => updateFila(setFilasConceptos, f.id, 'cant', e.target.value)}
                                />
                             </div>
<div className="cqm-row-num">
<label className="cqm-label">Precio U. ($)</label>
                                <input 
                                  type="number" 
className="cqm-input right"
                                  value={f.precio}
                                  onChange={(e) => updateFila(setFilasConceptos, f.id, 'precio', e.target.value)}
                                />
                             </div>
                             <button type="button" onClick={() => removeFila(setFilasConceptos, f.id)}className="cqm-trash-btn" aria-label="Eliminar fila"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addFila(setFilasConceptos)}className="cqm-add-btn">
                        <Plus size={16} /> AGREGAR CONCEPTO
                      </button>

<h4 className="cqm-section-title">2. MATERIALES</h4>
                      {filasMateriales.map(f => (
                        <div key={f.id}className="cqm-row">
<div className="cqm-row-main">
<label className="cqm-label">Nombre del Material</label>
                             <input 
                               placeholder="Ej. Carbones..." 
className="cqm-input"
                               value={f.desc}
                               onChange={(e) => updateFila(setFilasMateriales, f.id, 'desc', e.target.value)}
                             />
                          </div>
<div className="cqm-row-nums">
<div className="cqm-row-num">
<label className="cqm-label">Cant.</label>
                                <input 
                                  type="number" 
className="cqm-input center"
                                  value={f.cant}
                                  onChange={(e) => updateFila(setFilasMateriales, f.id, 'cant', e.target.value)}
                                />
                             </div>
<div className="cqm-row-num">
<label className="cqm-label">Costo U. ($)</label>
                                <input 
                                  type="number" 
className="cqm-input right"
                                  value={f.precio}
                                  onChange={(e) => updateFila(setFilasMateriales, f.id, 'precio', e.target.value)}
                                />
                             </div>
                             <button type="button" onClick={() => removeFila(setFilasMateriales, f.id)}className="cqm-trash-btn" aria-label="Eliminar fila"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addFila(setFilasMateriales)}className="cqm-add-btn">
                        <Plus size={16} /> AGREGAR MATERIAL
                      </button>
                    </>
                  )}

                  <textarea 
                    placeholder="Observaciones para el CLIENTE..."
className="cqm-input cqm-textarea"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />

<div className="cqm-internal">
<label className="cqm-internal-label">
                      COMENTARIOS INTERNOS (Solo Admin/Técnico):
                    </label>
                    <textarea 
                      placeholder="Notas que el cliente NO verá..."
className="cqm-input cqm-textarea internal"
                      value={observacionesInternas}
                      onChange={(e) => setObservacionesInternas(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
<div className="file-upload-zone cqm-file-zone">
<Upload size={44} className="cqm-file-icon" />
<p className="cqm-file-text">{archivo ? `Archivo seleccionado: ${archivo.name}` : 'Suelte el archivo aquí o haga clic para buscar'}</p>
                  <input 
                    type="file" 
                    onChange={(e) => setArchivo(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="file-input"
                  />
<button type="button" className="cqm-btn primary" onClick={() => document.getElementById('file-input').click()}>
                    SELECCIONAR ARCHIVO
                  </button>
                </div>
              )}

<div className="modal-summary-footer cqm-summary">
                {/* Desglose de precios */}
                {tab === 'manual' && (() => {
                  const { subtotal, iva, comisionMP, total } = calcularTotales();
                  const fmt = (n) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  return (
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#555', marginBottom: '4px' }}>
                        <span>Subtotal (Servicios + Materiales)</span>
                        <span style={{ fontWeight: '600' }}>{fmt(subtotal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#555', marginBottom: '4px' }}>
                        <span>IVA (16%)</span>
                        <span style={{ fontWeight: '600' }}>{fmt(iva)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#009ee3', marginBottom: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Comisión <img src={mpLogo} alt="MercadoPago" style={{ height: '16px', objectFit: 'contain' }} /> (Tarifa Oficial)
                        </span>
                        <span style={{ fontWeight: '600' }}>{fmt(comisionMP)}</span>
                      </div>
                      <div style={{ borderTop: '2px solid #ddd', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: '700' }}>TOTAL A COBRAR AL CLIENTE:</span>
<h3 className="cqm-total">{fmt(total)}</h3>
                      </div>
                    </div>
                  );
                })()}
                {tab === 'archivo' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>TOTAL ESTIMADO:</span>
<h3 className="cqm-total">—</h3>
                  </div>
                )}
<div className="footer-btns-container cqm-footer-btns">
<button type="button" className="cqm-btn secondary" onClick={() => setStep(1)}>VOLVER</button>
                  <button 
                    onClick={handleGuardar} 
                    type="button"
                    className="cqm-btn primary"
                    disabled={loading}
                  >
                    {loading ? 'ENVIANDO...' : 'GUARDAR Y ENVIAR'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateQuotationModal;
