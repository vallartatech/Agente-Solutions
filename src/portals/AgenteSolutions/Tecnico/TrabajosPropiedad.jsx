import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Header from "../../../components/Shared/Header";
import Swal from 'sweetalert2';
import ModalCrearCotizacion from "../../../components/Shared/ModalCrearCotizacion";
import ChatModal from "../../../components/Shared/ChatModal";
import "../../../styles/AgenteSolutions/Tecnico/TrabajoPropiedad.css";
import "../../../styles/AgenteSolutions/Tecnico/MercadoTrabajos.css";
import { 
  MapPin, Phone, User, Wrench, Clock, 
  ChevronLeft, Navigation, CheckCircle2, AlertCircle,
  FileText, ArrowRight, Package, Lock, Camera, Layout,
  X, Maximize2, ChevronRight, AlertTriangle, Zap,
  Plus, Trash2, Upload, Calculator, Calendar, MessageCircle, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from "../../../context/AuthContext";

const TrabajoPropiedad = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const [showModalMateriales, setShowModalMateriales] = useState(false);
  const [materialesConfirmados, setMaterialesConfirmados] = useState(false);
  const [itemsCheck, setItemsCheck] = useState({ materiales: [], equipo: [], herramientas: [] });
  const [hasReports, setHasReports] = useState(false);
  const [activeChatQuote, setActiveChatQuote] = useState(null);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const effectiveRole = Number(user?.role_id ?? storedUser?.role_id ?? 0);
  const isTecnicoRed = effectiveRole === 8 || user?.role_id === 8 || user?.role_id === '8' || storedUser?.role_id === 8;
  const puedeIniciarReporte = isTecnicoRed || materialesConfirmados;

  // --- ESTADOS PARA CONSULTA DE LEVANTAMIENTO ---
  const [modalSurveyVisible, setModalSurveyVisible] = useState(false);
  const [surveyData, setSurveyData] = useState([]);
  const [surveyDataCompleto, setSurveyDataCompleto] = useState([]);
  const [surveyDataFiltradoEquipo, setSurveyDataFiltradoEquipo] = useState([]);
  const [modoFiltroEquipo, setModoFiltroEquipo] = useState(false);
  const [equipoAfectadoNombre, setEquipoAfectadoNombre] = useState('');
  const [cargandoSurvey, setCargandoSurvey] = useState(false);
  const [areaActivaSurvey, setAreaActivaSurvey] = useState(null);
  const [verEvidencias, setVerEvidencias] = useState(false);
  const [imagenExpandida, setImagenExpandida] = useState(null);

  // --- ESTADOS PARA COTIZACIÓN ---
  const [showModalCotizacion, setShowModalCotizacion] = useState(false);
  const [cotizacionExistente, setCotizacionExistente] = useState(null);

  // --- ESTADOS PARA SEGUNDA VISITA ---
  const [showModalSegundaVisita, setShowModalSegundaVisita] = useState(false);
  const [fechaSegundaVisita, setFechaSegundaVisita] = useState('');
  const [motivoSegundaVisita, setMotivoSegundaVisita] = useState('');
  const [submittingSegundaVisita, setSubmittingSegundaVisita] = useState(false);

  const handleSolicitarSegundaVisita = async (e) => {
    e.preventDefault();
    if (!fechaSegundaVisita) {
      Swal.fire('Atención', 'Debes ingresar la fecha y hora sugerida para la segunda visita.', 'warning');
      return;
    }

    setSubmittingSegundaVisita(true);
    try {
      const token = localStorage.getItem('agente_token');
      const cleanId = encodeURIComponent(String(id).trim());
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${cleanId}/solicitar-segunda-visita`, {
        fecha_propuesta: fechaSegundaVisita,
        motivo: motivoSegundaVisita
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Solicitud Registrada',
        text: 'Se ha enviado la solicitud de 2da visita. Se notificó al Cliente y al Administrador.',
        timer: 2000,
        showConfirmButton: false
      });

      setShowModalSegundaVisita(false);
      setFechaSegundaVisita('');
      setMotivoSegundaVisita('');
      fetchJobDetails();
    } catch (error) {
      console.error("Error solicitando 2da visita:", error);
      Swal.fire('Error', 'No se pudo enviar la solicitud de segunda visita.', 'error');
    } finally {
      setSubmittingSegundaVisita(false);
    }
  };

  const handleResponderSegundaVisita = async (accion, fechaConfirmada) => {
    setSubmittingSegundaVisita(true);
    try {
      const token = localStorage.getItem('agente_token');
      const cleanId = encodeURIComponent(String(id).trim());
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/servicios/${cleanId}/responder-segunda-visita`, {
        accion: accion,
        fecha_confirmada: fechaConfirmada
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: accion === 'aceptar' ? '¡Fecha Aceptada!' : '¡Nueva Fecha Enviada!',
          text: accion === 'aceptar' 
            ? 'Has aceptado la fecha de la 2da visita.' 
            : 'Has propuesto una nueva fecha para la 2da visita. Se notificó al cliente y administración.',
          timer: 2000,
          showConfirmButton: false
        });
        fetchJobDetails();
      }
    } catch (error) {
      console.error("Error al responder 2da visita:", error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo procesar la respuesta a la segunda visita.', 'error');
    } finally {
      setSubmittingSegundaVisita(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
    checkExistingQuote();
  }, [id]);

  const getRealId = (rawId) => {
    if (!rawId) return '';
    const str = decodeURIComponent(String(rawId)).trim();
    const match = str.match(/\d+/);
    return match ? match[0] : str;
  };

  const checkExistingQuote = async () => {
    try {
      const realId = getRealId(id);
      const decoded = decodeURIComponent(String(id));
      const isWorkOrder = /work[_\s-]*order/i.test(decoded);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`);
      const allQuotes = res.data.data || res.data;
      const found = allQuotes.find(q => 
        (isWorkOrder && parseInt(q.work_order_id) === parseInt(realId)) || 
        (!isWorkOrder && parseInt(q.service_id) === parseInt(realId))
      );
      if (found) {
        setCotizacionExistente(found);
      }
    } catch (error) {
      console.error("Error al buscar cotización previa:", error);
    }
  };

  useEffect(() => {
    if (data) {
      const realId = getRealId(id);
      const confirmado = localStorage.getItem(`materiales_confirmados_${realId}`) === 'true';
      setMaterialesConfirmados(confirmado);

      const cl = data.custom_checklist 
        ? (typeof data.custom_checklist === 'string' ? JSON.parse(data.custom_checklist) : data.custom_checklist)
        : { materiales: [], equipo: [], herramientas: [] };
      
      const mats = cl.materiales || cl.material || [];
      const eqs = cl.equipo || [];
      const hers = cl.herramientas || [];

      setItemsCheck({
        materiales: new Array(mats.length).fill(confirmado),
        equipo: new Array(eqs.length).fill(confirmado),
        herramientas: new Array(hers.length).fill(confirmado)
      });
    }
  }, [data, id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const cleanId = encodeURIComponent(String(id).trim());
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${cleanId}`);
      setData(res.data.data || res.data);
      try {
        const reportsRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/servicios/${cleanId}/reportes`);
        if (reportsRes.data && reportsRes.data.length > 0) {
          setHasReports(true);
        }
      } catch (err) {
        console.error("Error checking reports:", err);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCotizacion = () => {
    setShowModalCotizacion(true);
  };

  const handleFinalizar = async () => {
    const confirmacion = window.confirm(`¿Estás seguro que deseas finalizar este reporte en la propiedad ${data?.propiedad_nombre}?`);
    if (!confirmacion) return;

    try {
      const realId = getRealId(id);
      
      // Cambiar estado a Listo
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${realId}/status`, {
        status: 'Listo'
      });

      // Enviar notificación al Admin
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/notifications/send-to-admin`, {
          title: "Trabajo Finalizado",
          message: `El Técnico ${user?.name || ''} finalizó el trabajo en la propiedad ${data?.propiedad_nombre || ''}.`,
          type: "work_order_finished",
          work_order_id: realId
        });
      } catch (notifError) {
        console.warn("No se pudo enviar la notificación o el backend ya se encarga de esto:", notifError);
      }

      setShowModalFinalizar(true);
    } catch (error) {
      console.error("Error finalizing job:", error);
      alert("Hubo un error al finalizar el trabajo. Por favor intenta de nuevo.");
    }
  };

  const abrirSurvey = async () => {
    if (!data?.property_id) return alert("Esta orden no tiene propiedad asociada.");
    
    setCargandoSurvey(true);
    setModalSurveyVisible(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/propiedades/${data.property_id}/survey`);
      
      let rawSurvey = response.data;
      
      const normalizeStr = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      };
      
      const rawZone = data?.zone || (data?.titulo?.includes(" - ") ? data.titulo.split(" - ")[1] : null);
      
      if (rawZone && normalizeStr(rawZone) !== 'general') {
        const targetZone = normalizeStr(rawZone);
        
        let filteredSurvey = [];
        for (let area of rawSurvey) {
          const areaNameNorm = normalizeStr(area.name);
          if (areaNameNorm === targetZone) {
            filteredSurvey.push(area);
            continue;
          }
          const matchingSubareas = (area.subareas || []).filter(sub => normalizeStr(sub.name) === targetZone);
          if (matchingSubareas.length > 0) {
            filteredSurvey.push({
              ...area,
              subareas: matchingSubareas
            });
          }
        }
        
        if (filteredSurvey.length === 0) {
          for (let area of rawSurvey) {
            const areaNameNorm = normalizeStr(area.name);
            if (areaNameNorm.includes(targetZone) || targetZone.includes(areaNameNorm)) {
              filteredSurvey.push(area);
              continue;
            }
            const matchingSubareas = (area.subareas || []).filter(sub => {
              const subNameNorm = normalizeStr(sub.name);
              return subNameNorm.includes(targetZone) || targetZone.includes(subNameNorm);
            });
            if (matchingSubareas.length > 0) {
              filteredSurvey.push({
                ...area,
                subareas: matchingSubareas
              });
            }
          }
        }
        
        if (filteredSurvey.length > 0) {
          rawSurvey = filteredSurvey;
        }
      }

      const surveyZonaOrTotal = rawSurvey;
      setSurveyDataCompleto(surveyZonaOrTotal);

      // 2. FILTRADO POR EQUIPO / COMPONENTE AFECTADO
      let eqNombre = data?.equipment || data?.equipo_afectado || data?.item_affected || data?.affected_item || data?.equipo || null;
      if (!eqNombre && data?.descripcion && data.descripcion.includes('[EQUIPO AFECTADO]:')) {
        const cleanEqDesc = data.descripcion.replace(/\n?\[(SOLICITUD 2DA VISITA|RESPUESTA CLIENTE 2DA VISITA|PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN)\].*/gs, '').trim();
        const parts = cleanEqDesc.split('[EQUIPO AFECTADO]:');
        eqNombre = parts[1]?.trim();
      }

      if (eqNombre && typeof eqNombre === 'string' && eqNombre.trim() !== '') {
        const eqClean = eqNombre.trim();
        setEquipoAfectadoNombre(eqClean);
        const eqNorm = normalizeStr(eqClean);
        const eqWords = eqNorm.split(/[\s,()/-]+/).filter(w => w.length >= 3);

        const itemCoincide = (it) => {
          const subCat = normalizeStr(it.sub_category);
          const marca = normalizeStr(it.brand);
          const mod = normalizeStr(it.model_or_color);
          const nombre = normalizeStr(it.name || it.item_name || it.title || '');
          const completo = `${subCat} ${marca} ${mod} ${nombre}`.trim();

          if (subCat === eqNorm || completo.includes(eqNorm) || eqNorm.includes(completo)) return true;
          if (subCat && (eqNorm.includes(subCat) || subCat.includes(eqNorm))) return true;
          if (eqWords.length > 0 && eqWords.some(w => completo.includes(w) || subCat.includes(w) || marca.includes(w))) return true;
          return false;
        };

        const filtrarCategoriasYSubareas = (areasList) => {
          let areasConEquipo = [];
          for (let area of areasList) {
            let areaClone = JSON.parse(JSON.stringify(area));
            let subareasFiltradas = [];
            let categoriasFiltradasArea = {};
            let hayItemsEnArea = false;

            if (areaClone.subareas && areaClone.subareas.length > 0) {
              for (let sub of areaClone.subareas) {
                let catsFiltradasSub = {};
                let hayItemsEnSub = false;
                if (sub.categories) {
                  for (let [catName, items] of Object.entries(sub.categories)) {
                    const itemsMatched = (items || []).filter(it => itemCoincide(it));
                    if (itemsMatched.length > 0) {
                      catsFiltradasSub[catName] = itemsMatched;
                      hayItemsEnSub = true;
                    }
                  }
                }
                if (hayItemsEnSub) {
                  sub.categories = catsFiltradasSub;
                  subareasFiltradas.push(sub);
                  hayItemsEnArea = true;
                }
              }
            } else if (areaClone.categories) {
              for (let [catName, items] of Object.entries(areaClone.categories)) {
                const itemsMatched = (items || []).filter(it => itemCoincide(it));
                if (itemsMatched.length > 0) {
                  categoriasFiltradasArea[catName] = itemsMatched;
                  hayItemsEnArea = true;
                }
              }
            }

            if (hayItemsEnArea) {
              if (subareasFiltradas.length > 0) {
                areaClone.subareas = subareasFiltradas;
              } else {
                areaClone.categories = categoriasFiltradasArea;
              }
              areasConEquipo.push(areaClone);
            }
          }
          return areasConEquipo;
        };

        let surveyPorEquipo = filtrarCategoriasYSubareas(surveyZonaOrTotal);
        if (surveyPorEquipo.length === 0) {
          surveyPorEquipo = filtrarCategoriasYSubareas(response.data);
        }

        if (surveyPorEquipo.length > 0) {
          setSurveyDataFiltradoEquipo(surveyPorEquipo);
          setSurveyData(surveyPorEquipo);
          setAreaActivaSurvey(surveyPorEquipo[0].id);
          setModoFiltroEquipo(true);
        } else {
          // Si no hay plantilla coincidente en inventario, mostrar la tarjeta exclusiva del equipo dañado
          const areaVirtual = [{
            id: 'equipo-danado-unico',
            name: 'EQUIPO AFECTADO',
            categories: {
              [eqClean]: [{
                id: 'item-unique-1',
                sub_category: eqClean,
                brand: 'Reportado en Orden',
                model_or_color: 'Falla/Componente',
                image_path: data?.foto_fachada || data?.evidencias?.[0] || '/placeholder-item.jpg'
              }]
            }
          }];
          setSurveyDataFiltradoEquipo(areaVirtual);
          setSurveyData(areaVirtual);
          setAreaActivaSurvey('equipo-danado-unico');
          setModoFiltroEquipo(true);
        }
      } else {
        setEquipoAfectadoNombre('');
        setSurveyDataFiltradoEquipo([]);
        setSurveyData(surveyZonaOrTotal);
        if (surveyZonaOrTotal.length > 0) setAreaActivaSurvey(surveyZonaOrTotal[0].id);
        setModoFiltroEquipo(false);
      }
    } catch (error) {
      console.error("Error cargando inventario:", error);
      alert("No se pudo cargar el inventario de la propiedad.");
    } finally {
      setCargandoSurvey(false);
    }
  };

  const toggleItem = (tipo, index) => {
    const nuevos = { ...itemsCheck };
    nuevos[tipo][index] = !nuevos[tipo][index];
    setItemsCheck(nuevos);
  };

  const todoMarcado = () => {
    return [...itemsCheck.materiales, ...itemsCheck.equipo, ...itemsCheck.herramientas].every(v => v === true);
  };

  const confirmarMateriales = () => {
    const realId = id.includes('-') ? id.split('-')[1] : id;
    localStorage.setItem(`materiales_confirmados_${realId}`, 'true');
    setMaterialesConfirmados(true);
    setShowModalMateriales(false);
  };

  const openInGoogleMaps = () => {
    const coords = data?.coordenadas || data?.coordinates;
    if (coords && typeof coords === 'string' && coords.trim() !== '' && coords.trim() !== 'null') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.trim())}`, '_blank');
      return;
    }
    const dir = data?.address || data?.direccion;
    if (dir && typeof dir === 'string' && dir.trim() !== '' && dir.trim() !== 'null') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir.trim())}`, '_blank');
      return;
    }
    alert("Esta propiedad no tiene coordenadas ni dirección registradas.");
  };

  const checklistObj = data?.custom_checklist 
    ? (typeof data.custom_checklist === 'string' ? JSON.parse(data.custom_checklist) : data.custom_checklist)
    : null;

  if (loading) {
    return (
      <div className="tp-loading-container">
        <div className="tp-loader"></div>
        <p>Cargando detalles del trabajo...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tp-error-container">
        <AlertCircle size={48} color="#f26624" />
        <h2>No se encontró el trabajo</h2>
        <button onClick={() => navigate('/trabajos-tecnico')}>VOLVER AL LISTADO</button>
      </div>
    );
  }

  return (
    <div className="tp-page-wrapper">
      <Header />
      
      <div className="tp-content-body">
        <div className="tp-navigation-bar">
          <button 
            onClick={() => navigate('/trabajos-tecnico')} 
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            <ChevronLeft size={20} />
            <span>REGRESAR</span>
          </button>
          <div className="tp-status-pill" data-status={data.estado}>
            {data.estado}
          </div>
        </div>

        <section className="tp-property-hero">
          <div className="tp-hero-overlay"></div>
          {data.foto_fachada && (
            <img src={data.foto_fachada} alt="Fachada" className="tp-hero-bg" />
          )}
          
          <div className="tp-hero-content">
            <div className="tp-hero-text">
              <span className="tp-id-badge">{data.identificador_curp}</span>
              <h1 className="tp-property-name">{data.propiedad_nombre}</h1>
              <div className="tp-property-address">
                <MapPin size={16} />
                <p>{data.direccion}</p>
              </div>
            </div>
            
            <div className="tp-hero-actions">
              <button className="tp-action-btn maps" onClick={openInGoogleMaps}>
                <Navigation size={18} />
                <span>GPS</span>
              </button>
              <button className="tp-action-btn call" onClick={() => window.open(`tel:${data.telefono_cliente || ''}`)}>
                <Phone size={18} />
                <span>Llamar</span>
              </button>
            </div>
          </div>
        </section>

        <div className="tp-main-grid">
          <div className="tp-details-column">
            <motion.div 
              className="tp-card tp-work-description-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="tp-card-header">
                <FileText size={20} />
                <h3>CONSISTE EN:</h3>
              </div>
              <div className="tp-work-description-v2">
                {(() => {
                  if (!data.descripcion) return <p className="tp-empty-desc">Sin descripción detallada.</p>;
                  
                  const cleanDesc = data.descripcion
                    .replace(/\n?\[(SOLICITUD 2DA VISITA|RESPUESTA CLIENTE 2DA VISITA|PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN)\].*/gs, '')
                    .trim();

                  if (cleanDesc.includes('[EQUIPO AFECTADO]:')) {
                    const parts = cleanDesc.split('[EQUIPO AFECTADO]:');
                    const problema = parts[0].trim().replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '').trim();
                    const equipo = parts[1].trim();

                    return (
                      <div className="tp-description-grid">
                        <div className="tp-desc-item">
                          <div className="tp-desc-icon problem">
                            <AlertTriangle size={20} />
                          </div>
                          <div className="tp-desc-text">
                            <label>TIPO DE FALLA / PROBLEMA</label>
                            <strong>{problema || 'No especificado'}</strong>
                          </div>
                        </div>

                        <div className="tp-desc-item">
                          <div className="tp-desc-icon equipment">
                            <Zap size={20} />
                          </div>
                          <div className="tp-desc-text">
                            <label>EQUIPO O COMPONENTE AFECTADO</label>
                            <strong>{equipo || 'No especificado'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="tp-desc-fallback">
                      <div className="tp-desc-icon general">
                        <FileText size={20} />
                      </div>
                      <div className="tp-desc-text">
                        <label>DETALLES DEL SERVICIO</label>
                        <p style={{ whiteSpace: 'pre-line' }}>{cleanDesc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="tp-work-meta">
                <div className="tp-meta-item">
                  <Clock size={16} />
                  <span>Programado: {data.fecha_programada || 'Pendiente'}</span>
                </div>
                <div className="tp-meta-item">
                  <Wrench size={16} />
                  <span>Título: {data.titulo}</span>
                </div>
              </div>
            </motion.div>

            {checklistObj && (
              <motion.div 
                className="tp-card tp-materials-preview-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="tp-card-header">
                  <Package size={20} />
                  <h3>MATERIALES Y EQUIPO</h3>
                </div>
                <div className="tp-materials-summary">
                  <div className="tp-mat-tag">{(checklistObj.materiales || checklistObj.material || []).length} Materiales</div>
                  <div className="tp-mat-tag">{(checklistObj.equipo || []).length} Equipos</div>
                  <div className="tp-mat-tag">{(checklistObj.herramientas || []).length} Herramientas</div>
                </div>
              </motion.div>
            )}

            <motion.div 
              className="tp-card tp-client-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="tp-card-header">
                <User size={20} />
                <h3>DATOS DEL CLIENTE</h3>
              </div>
              <div className="tp-client-info">
                <p><strong>Nombre:</strong> {data.propietario}</p>
                <p><strong>Teléfono:</strong> {data.telefono_cliente || 'No registrado'}</p>
                <p><strong>Tipo:</strong> {data.tipoPropiedad}</p>
              </div>
            </motion.div>

            {/* FOTOS DE EVIDENCIAS DIRECTAS DEBAJO DE DATOS DEL CLIENTE */}
            <motion.div 
              className="tp-card tp-evidence-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="tp-card-header">
                <Camera size={20} />
                <h3>EVIDENCIAS REGISTRADAS</h3>
              </div>
              <div className="tp-evidence-content" style={{ marginTop: '12px' }}>
                {data.evidencias && data.evidencias.length > 0 ? (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {data.evidencias.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt={`Evidencia ${i + 1}`} 
                        onClick={() => setImagenExpandida(img)}
                        style={{ width: '135px', height: '100px', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '2px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} 
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay evidencias fotográficas enviadas para este reporte.</p>
                )}
              </div>
            </motion.div>

            <motion.div 
              className="tp-card tp-team-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="tp-card-header">
                <User size={20} />
                <h3>EQUIPO DE TRABAJO</h3>
              </div>
              <div className="tp-team-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {(data?.technicians || []).map((tech, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e2e2e2', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#d1d1d1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tech.picture ? <img src={tech.picture} alt={tech.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={24} color="#000" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{tech.name}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>ID: {tech.id} | ÁREA: {tech.role || 'TÉCNICO'}</p>
                    </div>
                  </div>
                ))}
                {(data?.technicians || []).length === 0 && <p style={{color: '#000'}}>No hay equipo asignado.</p>}
              </div>
            </motion.div>
          </div>

          <div className="tp-actions-column">
            <motion.div 
              className="tp-card tp-flow-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3>ACCIONES DE FLUJO</h3>
              <p className="tp-flow-instruction">¿Listo para comenzar o terminar?</p>
              
              <div className="tp-flow-buttons">

                <button className="tp-btn-consult variant-dark" onClick={abrirSurvey}>
                  <Layout size={18} />
                  <span>CONSULTAR LEVANTAMIENTO</span>
                </button>

                <button className="tp-btn-consult variant-quote" onClick={handleAbrirCotizacion}>
                  <Calculator size={18} />
                  <span>
                    {isTecnicoRed 
                      ? (data?.network_quotes && data.network_quotes.length > 0 ? 'VER PROPUESTAS' : 'COTIZACIÓN RED') 
                      : (cotizacionExistente ? 'VER / EDITAR COTIZACIÓN' : 'COTIZAR TRABAJO')
                    }
                  </span>
                </button>

                <div className="tp-divider-mini"></div>

                {!isTecnicoRed && (
                  <button 
                    className={`tp-btn-checklist-trigger ${materialesConfirmados ? 'confirmed' : 'pending'}`}
                    onClick={() => setShowModalMateriales(true)}
                  >
                    <Package size={20} />
                    <span>{materialesConfirmados ? "MATERIALES LISTOS" : "CONFIRMAR MATERIALES"}</span>
                  </button>
                )}

                <button 
                  className={`tp-btn-primary ${!puedeIniciarReporte ? 'locked' : ''}`} 
                  onClick={() => {
                    if (puedeIniciarReporte) {
                      navigate(hasReports ? `/galeria-reportes/${id}` : `/nuevo-reporte`, { state: { trabajoId: id, servicio: data } });
                    }
                  }}
                  disabled={!puedeIniciarReporte}
                  style={hasReports ? { background: '#3b82f6', borderColor: '#3b82f6' } : {}}
                >
                  {!puedeIniciarReporte && <Lock size={18} />}
                  <span>{hasReports ? 'CONTINUAR REPORTE' : 'INICIAR REPORTE'}</span>
                  <ArrowRight size={18} />
                </button>

                {!isTecnicoRed && !materialesConfirmados && (
                  <p className="tp-lock-msg" style={{ marginTop: '4px', textAlign: 'center', fontSize: '0.8rem', color: '#ea580c' }}>
                    Debe confirmar materiales para iniciar
                  </p>
                )}

                {data.estado !== 'Listo' && data.estado !== 'Finalizado' && (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '10px' }}>
                    <button 
                      className={`tp-btn-secondary ${!hasReports ? 'locked' : ''}`}
                      onClick={handleFinalizar}
                      disabled={!hasReports}
                      style={{ 
                        background: hasReports ? '#22c55e' : '#374151', 
                        borderColor: hasReports ? '#22c55e' : '#374151',
                        color: hasReports ? '#ffffff' : '#9ca3af',
                        cursor: hasReports ? 'pointer' : 'not-allowed',
                        width: '100%'
                      }}
                    >
                      {!hasReports ? <Lock size={18} /> : <CheckCircle2 size={18} />}
                      <span>{user?.role_id === 2 ? 'FINALIZAR TRABAJO' : 'MARCAR COMO LISTO (ADMIN)'}</span>
                    </button>
                    
                    {!hasReports && (
                      <p className="tp-lock-msg" style={{ marginTop: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                        Debe levantar al menos un reporte para finalizar
                      </p>
                    )}
                  </div>
                )}

                {/* BOTÓN / BANNER SEGUNDA VISITA CON ESTADOS DINÁMICOS Y NEGOCIACIÓN */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', width: '100%' }}>
                  {(() => {
                    const fullDesc = data?.description || data?.descripcion || '';

                    const isSolicitada = 
                      data?.estado === 'Segunda Visita Solicitada' || 
                      data?.status === 'Segunda Visita Solicitada' || 
                      fullDesc.includes('[SOLICITUD 2DA VISITA]') ||
                      fullDesc.includes('[ALERTA DE REPROGRAMACIÓN 2DA VISITA]') ||
                      fullDesc.includes('[RESPUESTA CLIENTE 2DA VISITA]');

                    const isProgramada = 
                      data?.estado === 'Segunda Visita Programada' || 
                      data?.status === 'Segunda Visita Programada' || 
                      fullDesc.includes('[RESPUESTA 2DA VISITA]: Cita ACEPTADA') ||
                      fullDesc.includes('[PROGRAMACIÓN DIRECTA 2DA VISITA POR ADMIN]');

                    let fechaProp = data?.second_visit_proposed_date;
                    let motivo2da = data?.second_visit_reason;
                    if (!fechaProp && fullDesc.includes('fecha:')) {
                      const mF = fullDesc.match(/fecha:\s*([^\.\n]+)/i);
                      if (mF) fechaProp = mF[1].trim();
                    }

                    if (isSolicitada && !isProgramada) {
                      return (
                        <div style={{ background: '#fff7ed', border: '2px solid #ea580c', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: '900', fontSize: '0.95rem', marginBottom: '6px' }}>
                            <AlertTriangle size={20} color="#ea580c" />
                            <span>SEGUNDA VISITA EN NEGOCIACIÓN</span>
                          </div>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.84rem', color: '#431407', lineHeight: '1.4' }}>
                            Fecha Propuesta Actual: <strong>{fechaProp || 'Por confirmar'}</strong>
                            {motivo2da && <span style={{ display: 'block', marginTop: '2px' }}>Motivo: <em>"{motivo2da}"</em></span>}
                          </p>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button 
                              type="button"
                              onClick={() => handleResponderSegundaVisita('aceptar', fechaProp || new Date().toISOString().slice(0,10))}
                              disabled={submittingSegundaVisita}
                              style={{ flex: 1, minWidth: '140px', background: '#16a34a', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '12px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(22,163,74,0.25)' }}
                            >
                              <CheckCircle2 size={16} />
                              <span>ACEPTAR FECHA</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setShowModalSegundaVisita(true)}
                              disabled={submittingSegundaVisita}
                              style={{ flex: 1, minWidth: '140px', background: '#ea580c', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '12px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(234,88,12,0.25)' }}
                            >
                              <Calendar size={16} />
                              <span>PROPONER OTRA</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (isProgramada) {
                      return (
                        <button 
                          disabled
                          style={{ 
                            width: '100%',
                            background: '#16a34a', 
                            color: '#ffffff', 
                            border: 'none',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            fontWeight: '800',
                            fontSize: '0.82rem',
                            cursor: 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>SEGUNDA VISITA PROGRAMADA</span>
                        </button>
                      );
                    }

                    return (
                      <button 
                        onClick={() => setShowModalSegundaVisita(true)}
                        style={{ 
                          width: '100%',
                          background: '#ea580c', 
                          color: '#ffffff', 
                          border: 'none',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          fontWeight: '800',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                          textTransform: 'uppercase'
                        }}
                      >
                        <Calendar size={18} />
                        <span>¿NO SE TERMINÓ? SOLICITAR 2DA VISITA</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
              
              {!materialesConfirmados && (
                <p className="tp-lock-msg">Debe confirmar materiales para iniciar</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModalMateriales && (
          <div className="tp-modal-overlay">
            <motion.div 
              className="tp-modal-content-checklist"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="tp-modal-header-check">
                <Package size={24} color="#f26624" />
                <h2>Lista de Ruta / Materiales</h2>
                <button className="tp-close-modal-btn" onClick={() => setShowModalMateriales(false)}>×</button>
              </div>

              <div className="tp-modal-scroll-body">
                {(checklistObj?.materiales || checklistObj?.material || []).length > 0 && (
                  <div className="tp-check-section">
                    <h4>Materiales</h4>
                    <div className="tp-check-grid">
                      {(checklistObj.materiales || checklistObj.material).map((m, i) => (
                        <label key={i} className={`tp-check-label ${itemsCheck.materiales[i] ? 'checked' : ''}`}>
                          <input type="checkbox" checked={itemsCheck.materiales[i]} onChange={() => toggleItem('materiales', i)} />
                          <span>{typeof m === 'string' ? m : m.nombre || m.task || m.concepto}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(checklistObj?.equipo || []).length > 0 && (
                  <div className="tp-check-section">
                    <h4>Equipo</h4>
                    <div className="tp-check-grid">
                      {checklistObj.equipo.map((e, i) => (
                        <label key={i} className={`tp-check-label ${itemsCheck.equipo[i] ? 'checked' : ''}`}>
                          <input type="checkbox" checked={itemsCheck.equipo[i]} onChange={() => toggleItem('equipo', i)} />
                          <span>{typeof e === 'string' ? e : e.nombre || e.task || e.concepto}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(checklistObj?.herramientas || []).length > 0 && (
                  <div className="tp-check-section">
                    <h4>Herramientas</h4>
                    <div className="tp-check-grid">
                      {checklistObj.herramientas.map((h, i) => (
                        <label key={i} className={`tp-check-label ${itemsCheck.herramientas[i] ? 'checked' : ''}`}>
                          <input type="checkbox" checked={itemsCheck.herramientas[i]} onChange={() => toggleItem('herramientas', i)} />
                          <span>{typeof h === 'string' ? h : h.nombre || h.task || h.concepto}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="tp-modal-footer-check">
                <button 
                  className={`tp-btn-confirm-check ${todoMarcado() ? 'ready' : 'disabled'}`}
                  disabled={!todoMarcado() && (checklistObj?.materiales || checklistObj?.material || checklistObj?.equipo || checklistObj?.herramientas)}
                  onClick={confirmarMateriales}
                >
                  {todoMarcado() ? "CONFIRMAR Y DESBLOQUEAR" : "FALTA MARCAR ITEMS"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalSurveyVisible && (
          <div className="tp-modal-overlay survey-theme">
            <motion.div 
              className="tp-modal-survey-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="tp-survey-header">
                <div className="tp-survey-header-info">
                  <Layout size={24} color="#F26522" />
                  <div>
                    <h3>INVENTARIO TÉCNICO {data?.zone ? ` - ZONA: ${data.zone.toUpperCase()}` : ''}</h3>
                    <p>{data.propiedad_nombre}</p>
                  </div>
                </div>
                <button className="tp-close-survey-btn" onClick={() => setModalSurveyVisible(false)}>✕</button>
              </div>

              {equipoAfectadoNombre && surveyDataFiltradoEquipo.length > 0 && (
                <div style={{ background: '#fff7ed', border: '1px solid #fdba74', padding: '12px 18px', borderRadius: '10px', margin: '15px 20px 5px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>🎯</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 'bold', letterSpacing: '0.5px' }}>FILTRADO POR EQUIPO REPORTADO DAÑADO</div>
                      <div style={{ fontSize: '1.05rem', color: '#9a3412', fontWeight: '800' }}>{equipoAfectadoNombre}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (modoFiltroEquipo) {
                        setSurveyData(surveyDataCompleto);
                        if (surveyDataCompleto.length > 0) setAreaActivaSurvey(surveyDataCompleto[0].id);
                        setModoFiltroEquipo(false);
                      } else {
                        setSurveyData(surveyDataFiltradoEquipo);
                        if (surveyDataFiltradoEquipo.length > 0) setAreaActivaSurvey(surveyDataFiltradoEquipo[0].id);
                        setModoFiltroEquipo(true);
                      }
                    }}
                    style={{
                      background: modoFiltroEquipo ? '#334155' : '#F26522',
                      color: 'white',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {modoFiltroEquipo ? '👁️ Ver Todo el Levantamiento' : '🎯 Solo Ver Equipo Dañado'}
                  </button>
                </div>
              )}

              <div className="tp-survey-body">
                {cargandoSurvey ? (
                  <div className="tp-survey-loading">Cargando inventario...</div>
                ) : (
                  <div className="tp-survey-content-layout">
                    <aside className="tp-survey-sidebar">
                      {(surveyData || []).map(area => (
                        <button 
                          key={area.id} 
                          className={`tp-area-nav-item ${areaActivaSurvey === area.id ? 'active' : ''}`}
                          onClick={() => setAreaActivaSurvey(area.id)}
                        >
                          {area.name}
                        </button>
                      ))}
                    </aside>

                    <main className="tp-survey-main">
                      {surveyData && surveyData.find(a => a.id === areaActivaSurvey) ? (
                        (() => {
                          const area = surveyData.find(a => a.id === areaActivaSurvey);
                          return (
                            <div className="tp-area-details">
                              <div className="tp-area-banner">
                                <img src={area.photo || '/placeholder-area.jpg'} alt={area.name || 'Área'} />
                                <h2>{area.name || 'Sin nombre'}</h2>
                              </div>
                              <div className="tp-categories-stack">
                                {area.subareas && area.subareas.length > 0 ? (
                                  area.subareas.map(sub => (
                                    <div key={sub.id} className="tp-subarea-section" style={{ marginBottom: '25px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                                      <h3 style={{ color: '#F26522', fontWeight: '800', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                                        <span style={{ width: '4px', height: '18px', background: '#F26522', borderRadius: '2px', display: 'inline-block' }}></span>
                                        {sub.name}
                                      </h3>
                                      {Object.entries(sub.categories || {}).length === 0 ? (
                                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', paddingLeft: '12px' }}>No hay elementos registrados en esta zona.</p>
                                      ) : (
                                        Object.entries(sub.categories || {}).map(([catName, items]) => (
                                          <div key={catName} className="tp-category-group" style={{ paddingLeft: '12px', marginTop: '10px' }}>
                                            <h4 style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>{catName}</h4>
                                            <div className="tp-items-grid">
                                              {items.map(item => (
                                                <div key={item.id} className="tp-tech-item">
                                                  <img src={item.image_path || '/placeholder-item.jpg'} onClick={() => setImagenExpandida(item.image_path)} alt={item.sub_category} />
                                                  <div className="tp-tech-item-info">
                                                    <strong>{item.sub_category}</strong>
                                                    <div className="tp-specs">
                                                      <span>M: {item.brand || '---'}</span>
                                                      <span>MOD: {item.model_or_color || '---'}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  Object.entries(area.categories || {}).map(([catName, items]) => (
                                    <div key={catName} className="tp-category-group">
                                      <h4>{catName.toUpperCase()}</h4>
                                      <div className="tp-items-grid">
                                        {items.map(item => (
                                          <div key={item.id} className="tp-tech-item">
                                            <img src={item.image_path || '/placeholder-item.jpg'} onClick={() => setImagenExpandida(item.image_path)} alt={item.sub_category} />
                                            <div className="tp-tech-item-info">
                                              <strong>{item.sub_category}</strong>
                                              <div className="tp-specs">
                                                <span>M: {item.brand || '---'}</span>
                                                <span>MOD: {item.model_or_color || '---'}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="tp-select-area">Selecciona un área</div>
                      )}
                    </main>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verEvidencias && (
          <div className="tp-modal-overlay">
            <motion.div 
              className="tp-modal-content evidencias-theme"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="tp-modal-header-check">
                <Camera size={24} color="#f26624" />
                <h2>Evidencias del Servicio</h2>
                <button className="tp-close-modal-btn" onClick={() => setVerEvidencias(false)}>×</button>
              </div>
              <div className="tp-evidencias-scroll">
                {data.evidencias && data.evidencias.length > 0 ? (
                  <div className="tp-evidencias-grid">
                    {data.evidencias.map((img, i) => (
                      <div key={i} className="tp-evidencia-card" onClick={() => setImagenExpandida(img)}>
                        <img src={img} alt={`Evidencia ${i}`} />
                        <div className="tp-zoom-overlay-icon"><Maximize2 size={20} /></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tp-empty-evidencias">No hay evidencias enviadas para este reporte.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imagenExpandida && (
          <div className="tp-zoom-full-overlay" onClick={() => setImagenExpandida(null)}>
            <motion.img 
              src={imagenExpandida} 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
            />
            <button className="tp-close-zoom" onClick={() => setImagenExpandida(null)}><X size={32}/></button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModalFinalizar && (
          <div className="tp-modal-overlay">
            <motion.div 
              className="tp-modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="tp-success-icon">
                <CheckCircle2 size={64} color="#f26624" />
              </div>
              <h2>¡TRABAJO FINALIZADO!</h2>
              <p>Se ha enviado para verificación del administrador.</p>
              <button onClick={() => navigate('/trabajos-tecnico')}>VOLVER AL TABLERO</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showModalCotizacion && !isTecnicoRed && (
        <ModalCrearCotizacion
          workOrderId={data?.tipo_registro === 'work_order' || id.includes('work_order') ? getRealId(id) : null}
          serviceId={data?.tipo_registro !== 'work_order' && !id.includes('work_order') ? getRealId(id) : null}
          cotizacionExistente={cotizacionExistente}
          onClose={() => setShowModalCotizacion(false)}
          onSuccess={(resData) => {
            setCotizacionExistente(resData.cotizacion || resData);
            checkExistingQuote();
          }}
        />
      )}

      {/* MODAL SOLICITAR SEGUNDA VISITA */}
      {showModalSegundaVisita && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', padding: '28px', width: '100%', maxWidth: '500px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button onClick={() => setShowModalSegundaVisita(false)} style={{ position: 'absolute', top: '18px', right: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '16px', border: '1px solid #ffedd5' }}>
                <Calendar size={28} color="#ea580c" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>SOLICITAR SEGUNDA VISITA</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Proponer fecha para regresar a finalizar el trabajo</p>
              </div>
            </div>

            <form onSubmit={handleSolicitarSegundaVisita} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  FECHA Y HORA SUGERIDA PARA 2DA VISITA <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="datetime-local" 
                  value={fechaSegundaVisita}
                  onChange={(e) => setFechaSegundaVisita(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                  MOTIVO / EXPLICACIÓN DE LO QUE FALTÓ
                </label>
                <textarea 
                  rows={3}
                  value={motivoSegundaVisita}
                  onChange={(e) => setMotivoSegundaVisita(e.target.value)}
                  placeholder="Ej. Faltó refacción especializada, secado de pintura 24 hrs..."
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModalSegundaVisita(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  CANCELAR
                </button>
                <button type="submit" disabled={submittingSegundaVisita} style={{ flex: 1, padding: '12px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: submittingSegundaVisita ? 'not-allowed' : 'pointer', opacity: submittingSegundaVisita ? 0.7 : 1, textTransform: 'uppercase' }}>
                  {submittingSegundaVisita ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL PARA VER COTIZACIÓN / PROPUESTAS EN EL MAPA (SOLO TÉCNICO DE LA RED) ─── */}
      {showModalCotizacion && isTecnicoRed && (
        <div className="mercado-modal-overlay" onClick={() => setShowModalCotizacion(false)}>
          <div className="mercado-premium-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="mercado-premium-header">
              <h2>💼 Cotización del Trabajo #{data?.id}</h2>
              <span className="mercado-modal-close" onClick={() => setShowModalCotizacion(false)}>×</span>
            </div>

            <div className="mercado-premium-body">
              {/* Left Panel: Info & Photos */}
              <div className="mercado-premium-details">
                {data?.foto_fachada || (data?.evidencias && data.evidencias[0]) ? (
                  <div className="mercado-photo-gallery">
                    <div 
                      className="mercado-premium-image-wrapper" 
                      onClick={() => setImagenExpandida(data.foto_fachada || data.evidencias[0])}
                      title="Clic para ampliar"
                    >
                      <img src={data.foto_fachada || data.evidencias[0]} alt="Evidencia" className="mercado-premium-image" />
                      <div className="mercado-image-zoom-badge">
                        <Maximize2 size={12} /> Clic para ampliar foto
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mercado-no-photo-placeholder">
                    <ImageIcon size={36} color="#94a3b8" />
                    <span>Sin fotografías de evidencia</span>
                  </div>
                )}

                <div className="mercado-premium-text">
                  <h3>{data?.titulo || 'Trabajo Asignado'}</h3>
                  <div className="mercado-premium-info-grid">
                    <div className="mercado-info-item full-width" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                      <MapPin size={18} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#ea580c' }}>Ubicación / Propiedad</strong>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{data?.propiedad_nombre}</span>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{data?.direccion}</div>
                      </div>
                    </div>

                    <div className="mercado-info-item">
                      <User size={14} className="mercado-icon-blue" />
                      <div><strong>Cliente</strong><span>{data?.propietario}</span></div>
                    </div>

                    <div className="mercado-info-item">
                      <Phone size={14} className="mercado-icon-blue" />
                      <div><strong>Teléfono</strong><span>{data?.telefono_cliente || 'No disponible'}</span></div>
                    </div>

                    <div className="mercado-info-item full-width">
                      <FileText size={14} className="mercado-icon-blue" />
                      <div><strong>Descripción del Problema</strong><span>{data?.descripcion || 'Sin descripción'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Proposals list & Live Chat */}
              <div className="mercado-premium-form" style={{ background: '#ffffff', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📋 Historial de Propuestas en el Mapa
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Ofertas y cotizaciones enviadas para este trabajo:
                  </p>
                </div>

                {/* List of Quotes */}
                {data?.network_quotes && data.network_quotes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.network_quotes.map((q) => {
                      const isMine = String(q.technician_id) === String(user?.id);
                      return (
                        <div 
                          key={q.id} 
                          style={{
                            background: q.status === 'accepted' ? '#f0fdf4' : (q.status === 'rejected' ? '#fef2f2' : '#ffffff'),
                            border: q.status === 'accepted' ? '1.5px solid #86efac' : (q.status === 'rejected' ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0'),
                            borderRadius: '14px',
                            padding: '14px 16px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: q.status === 'accepted' ? '#15803d' : '#0f172a' }}>
                              ${parseFloat(q.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              background: q.status === 'accepted' ? '#dcfce7' : (q.status === 'rejected' ? '#fee2e2' : '#fff7ed'),
                              color: q.status === 'accepted' ? '#15803d' : (q.status === 'rejected' ? '#b91c1c' : '#ea580c'),
                              border: q.status === 'accepted' ? '1px solid #86efac' : (q.status === 'rejected' ? '1px solid #fca5a5' : '1px solid #fed7aa')
                            }}>
                              {q.status === 'accepted' ? '✓ ACEPTADA' : (q.status === 'rejected' ? '✕ RECHAZADA' : '⏳ PENDIENTE')}
                            </span>
                          </div>

                          {q.message && (
                            <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginBottom: '8px', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                              "{q.message}"
                            </div>
                          )}

                          <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📅 {new Date(q.created_at).toLocaleString('es-MX')}</span>
                            {isMine && <span style={{ fontWeight: '700', color: '#ea580c' }}>Tu Propuesta</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : cotizacionExistente ? (
                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
                      ${parseFloat(cotizacionExistente.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Folio: {cotizacionExistente.folio} | Estado: {cotizacionExistente.status}
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 15px', background: '#f8fafc', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Sin cotizaciones registradas</p>
                  </div>
                )}

                {/* Botón de Chat Directo con el Cliente */}
                <button
                  type="button"
                  onClick={() => {
                    const myQuote = data?.network_quotes?.find(q => String(q.technician_id) === String(user?.id)) || data?.network_quotes?.[0] || { id: data?.id };
                    setActiveChatQuote({
                      id: myQuote.id,
                      jobTitle: data?.titulo,
                      cliente: data?.propietario,
                      chat_history: myQuote.chat_history || []
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    marginTop: 'auto'
                  }}
                >
                  <MessageCircle size={16} />
                  <span>💬 Chat con el Cliente ({data?.propietario})</span>
                </button>
              </div>
            </div>

            <div className="mercado-premium-footer">
              <button className="mercado-btn-cancel" onClick={() => setShowModalCotizacion(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CHAT EN VIVO CON EL CLIENTE ─── */}
      {activeChatQuote && (
        <ChatModal
          quoteId={activeChatQuote.id}
          isNetworkQuote={true}
          jobTitle={activeChatQuote.jobTitle || data?.titulo || 'Trabajo en la Red'}
          otherPartyName={activeChatQuote.cliente || data?.propietario || 'Cliente'}
          otherPartyRole="Cliente / Autónomo"
          initialMessages={activeChatQuote.chat_history || []}
          onClose={() => setActiveChatQuote(null)}
        />
      )}
    </div>
  );
};

export default TrabajoPropiedad;
