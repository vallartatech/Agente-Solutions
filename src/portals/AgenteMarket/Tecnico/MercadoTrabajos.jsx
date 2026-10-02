import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import Header from '../../../components/Shared/Header';
import MaterialDateTimePicker, { formatDateTimeHuman } from '../../../components/Shared/MaterialDateTimePicker';
import { MapPin, DollarSign, Clock, Send, User, FileText, Maximize2, Image as ImageIcon, X, List, Map as MapIcon, MessageCircle, AlertCircle, CheckCircle2, Phone, Calendar, ChevronLeft, ExternalLink } from 'lucide-react';
import '../../../styles/AgenteMarket/Tecnico/MercadoTrabajos.css';
import { useAuth } from '../../../context/AuthContext';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 21.0181, lng: -89.6242 };

const limpiarDescripcion = (rawDesc) => {
  if (!rawDesc) return 'Sin descripción adicional';
  let clean = rawDesc;
  clean = clean.replace(/\[LOTE-[A-Z0-9]+\]\s*(\(\d+\/\d+\))?\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*(otro|Otro|ninguno|Ninguno|n\/a|N\/A)\s*/gi, '');
  clean = clean.replace(/\s*\[EQUIPO AFECTADO\]:\s*/gi, ' - Equipo: ');
  return clean.trim() || rawDesc;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// Función para extraer o detectar coordenadas precisas de un trabajo / propiedad
export const extraerCoordenadas = (job) => {
  if (!job) return null;

  // 1. Campos de coordenadas directas como string (e.g. "20.987654, -89.654321")
  const strCandidates = [
    job.coordinates,
    job.coordenadas,
    job.propiedad_coordenadas,
    job.property_coordinates,
    job.property?.coordinates,
    job.property?.coordenadas,
    job.location_coordinates,
    job.gps
  ];

  for (const str of strCandidates) {
    if (typeof str === 'string' && str.trim() !== '' && str.trim() !== 'null' && str.trim() !== 'undefined') {
      const parts = str.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
          return { lat, lng, formatted: `${lat},${lng}` };
        }
      }
    }
  }

  // 2. Pares de latitud / longitud directos o numéricos
  const latCandidates = [
    job.property?.lat,
    job.property?.latitude,
    job.property_latitude,
    job.lat,
    job.latitude,
    job.area_lat
  ];

  const lngCandidates = [
    job.property?.lng,
    job.property?.longitude,
    job.property_longitude,
    job.lng,
    job.longitude,
    job.area_lng
  ];

  for (let i = 0; i < latCandidates.length; i++) {
    const rawLat = latCandidates[i];
    const rawLng = lngCandidates[i];
    if (rawLat !== undefined && rawLat !== null && rawLng !== undefined && rawLng !== null) {
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
        return { lat, lng, formatted: `${lat},${lng}` };
      }
    }
  }

  // 3. Revisar si la dirección en texto tiene coordenadas numéricas tipo "20.12345, -89.12345"
  const textToCheck = [job.full_address, job.address, job.calle, job.property?.address];
  for (const text of textToCheck) {
    if (typeof text === 'string') {
      const match = text.match(/(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng, formatted: `${lat},${lng}` };
        }
      }
    }
  }

  return null;
};

// Función para abrir Google Maps priorizando coordenadas GPS exactas
export const abrirEnGoogleMaps = (job) => {
  if (!job) return;
  const coords = extraerCoordenadas(job);

  if (coords) {
    // Abre el pin exacto por coordenadas GPS evitando discrepancias de nomenclatura de calles
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
    return;
  }

  // Fallback si no hay coordenadas: usar la dirección en texto
  const direccion = job.full_address || job.calle || job.property?.address || job.address || job.zona || job.lugar;
  if (direccion && typeof direccion === 'string' && direccion.trim() !== '' && direccion.trim() !== 'null') {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion.trim())}`;
    window.open(url, '_blank');
    return;
  }

  alert("No se encontraron coordenadas ni dirección para este trabajo.");
};

// Función para normalizar y resolver URLs de fotos locales o remotas
export const resolveImageUrl = (path) => {
  if (!path || typeof path !== 'string') return null;
  const clean = path.trim();
  if (clean === '' || clean === 'null' || clean === 'undefined') return null;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image')) {
    return clean;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const hostBase = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = clean.replace(/^\/?(storage\/)?/, '');
  return `${hostBase}/storage/${cleanPath}`;
};

// Función para extraer y catalogar fotos del problema vs fachada de la propiedad
export const extraerFotosDeTrabajo = (order) => {
  if (!order) return { problemPhotos: [], facadePhoto: null, allPhotos: [] };

  // 1. Evidencias del problema / equipo averiado
  const rawEvidences = [
    order.evidence_path,
    order.evidence_path_2,
    order.evidence_path_3,
    order.evidence_photo,
    order.evidence_photo_2,
    order.foto_evidencia,
    order.foto_evidencia_2
  ].filter(Boolean);

  const problemPhotos = rawEvidences.map(resolveImageUrl).filter(Boolean);

  // 2. Foto de la fachada de la propiedad (registrada en el levantamiento / inmueble)
  const rawFacade = 
    order.property?.facade_photo_path ||
    order.property?.facade_photo ||
    order.property?.foto_fachada ||
    order.property?.facade_photo_url ||
    order.property?.property_photo ||
    order.property?.facade_url ||
    order.property_facade_photo_path ||
    order.property_facade_photo ||
    order.facade_photo_path ||
    order.facade_photo ||
    order.foto_fachada ||
    null;

  const facadePhoto = resolveImageUrl(rawFacade);

  // 3. Catálogo combinado sin duplicados
  const allPhotos = [];
  problemPhotos.forEach(p => {
    if (p && !allPhotos.includes(p)) allPhotos.push(p);
  });
  if (facadePhoto && !allPhotos.includes(facadePhoto)) {
    allPhotos.push(facadePhoto);
  }

  return {
    problemPhotos,
    facadePhoto,
    allPhotos
  };
};

const MercadoTrabajos = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw"
  });

  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [networkJobs, setNetworkJobs] = useState([]);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStep, setQuoteStep] = useState(1);
  const [activePhoto, setActivePhoto] = useState(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('disponibles'); // 'disponibles' | 'aceptados'
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [activeModalTab, setActiveModalTab] = useState('detalle'); // 'detalle' | 'chat'
  
  // Embedded Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Visit Scheduling State
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const { user: authUser } = useAuth();

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos`, { headers });
      if (res.data.success) {
        // 1. Trabajos de la Red
        const rawJobs = (res.data.data || []).map(order => {
          let myQuote = null;
          let myQuotesHistory = [];
          if (authUser && order.network_quotes) {
            const userQuotes = order.network_quotes.filter(q => Number(q.technician_id) === Number(authUser.id));
            if (userQuotes.length > 0) {
              userQuotes.sort((a, b) => b.id - a.id);
              myQuote = userQuotes[0];
              myQuotesHistory = userQuotes;
            }
          }

          const photoData = extraerFotosDeTrabajo(order);
          const fotos = photoData.allPhotos;
          const facadePhoto = photoData.facadePhoto;
          const problemPhotos = photoData.problemPhotos;

          const coordsObj = extraerCoordenadas(order);
          const hasRealCoords = Boolean(coordsObj);
          const rawLat = coordsObj ? coordsObj.lat : (order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025)));
          const rawLng = coordsObj ? coordsObj.lng : (order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025)));
          const coloniaTexto = order.colonia_cercana || order.zona_colonia || order.zona || 'Mérida, Yucatán';
          const tituloProblema = order.type 
            ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` 
            : 'Problema / Servicio Solicitado';

          // Detectar último mensaje del cliente en el chat para alertas
          const chatHistory = myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          const isAccepted = Boolean(
            order.is_accepted ||
            order.status === 'Asignado' ||
            order.status === 'En Progreso' ||
            (authUser && Number(order.tecnico_id) === Number(authUser.id)) ||
            myQuote?.status === 'accepted'
          );

          const fullAddress = order.full_address || order.property?.address || 'Dirección confirmada';
          const clientName = order.client_name || order.property?.client?.name || order.creator?.name || 'Cliente';
          const clientPhone = order.client_phone || order.property?.client?.phone || order.property?.client?.phone_number || '';

          return {
            id: order.id,
            titulo: tituloProblema,
            tipo: order.type || 'Problema',
            equipo: order.equipment || '',
            lat: rawLat,
            lng: rawLng,
            coordinates: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            coordenadas: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            has_real_coords: hasRealCoords,
            property: order.property || null,
            presupuesto: "A convenir",
            cliente: clientName,
            client_name: clientName,
            client_phone: clientPhone,
            lugar: order.property?.property_name || 'Lugar no especificado',
            property_name: order.property?.property_name || '',
            zona: coloniaTexto,
            colonia: coloniaTexto,
            calle: isAccepted ? fullAddress : 'Dirección protegida',
            full_address: fullAddress,
            descripcion: limpiarDescripcion(order.description),
            foto: problemPhotos[0] || facadePhoto || fotos[0] || null,
            fotos: fotos,
            facade_photo: facadePhoto,
            foto_fachada: facadePhoto,
            problem_photos: problemPhotos,
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: order.network_quotes_count || 0,
            priority: order.priority || 'Normal',
            is_urgent: Boolean(order.is_urgent || order.priority === 'Urgente' || order.type === 'SOS'),
            scheduled_at: order.scheduled_at,
            agreed_price: myQuote?.price ? parseFloat(myQuote.price) : 0,
            is_accepted: isAccepted,
            myQuote,
            myQuotesHistory,
            lastClientMsg,
          };
        });

        // 2. Trabajos Aceptados / Asignados para este Técnico
        const acceptedMap = new Map();

        (res.data.accepted_jobs || []).forEach(order => {
          const chatHistory = order.myQuote?.chat_history || [];
          const lastMsg = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
          const lastClientMsg = (lastMsg && (Number(lastMsg.sender_id) !== Number(authUser?.id) || lastMsg.sender_role === 'Cliente')) ? lastMsg : null;

          const photoData = extraerFotosDeTrabajo(order);
          const fotos = photoData.allPhotos;
          const facadePhoto = photoData.facadePhoto;
          const problemPhotos = photoData.problemPhotos;

          const coordsObj = extraerCoordenadas(order);
          const hasRealCoords = Boolean(coordsObj);
          const rawLat = coordsObj ? coordsObj.lat : (order.lat ? parseFloat(order.lat) : (order.area_lat ? parseFloat(order.area_lat) : (21.0181 + Math.sin(order.id * 17) * 0.025)));
          const rawLng = coordsObj ? coordsObj.lng : (order.lng ? parseFloat(order.lng) : (order.area_lng ? parseFloat(order.area_lng) : (-89.6242 + Math.cos(order.id * 17) * 0.025)));

          acceptedMap.set(order.id, {
            ...order,
            lat: rawLat,
            lng: rawLng,
            coordinates: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            coordenadas: coordsObj ? coordsObj.formatted : (order.coordinates || order.coordenadas || order.property?.coordinates || null),
            has_real_coords: hasRealCoords,
            property: order.property || null,
            foto: problemPhotos[0] || facadePhoto || fotos[0] || null,
            fotos: fotos,
            facade_photo: facadePhoto,
            foto_fachada: facadePhoto,
            problem_photos: problemPhotos,
            is_accepted: true,
            zona: order.zone || order.zona || 'Mérida, Yucatán',
            calle: order.full_address || order.calle,
            descripcion: limpiarDescripcion(order.description),
            fecha: new Date(order.created_at).toLocaleDateString('es-MX'),
            cotizaciones: 1,
            lastClientMsg,
          });
        });

        // Unificar cualquier trabajo de rawJobs que tenga is_accepted === true
        rawJobs.forEach(job => {
          if (job.is_accepted) {
            const existing = acceptedMap.get(job.id);
            if (existing) {
              const mergedLat = existing.has_real_coords ? existing.lat : (job.has_real_coords ? job.lat : (existing.lat || job.lat));
              const mergedLng = existing.has_real_coords ? existing.lng : (job.has_real_coords ? job.lng : (existing.lng || job.lng));
              const mergedCoords = existing.coordinates || job.coordinates || existing.coordenadas || job.coordenadas;
              const mergedFacade = existing.facade_photo || job.facade_photo || null;
              const mergedProblemPhotos = (existing.problem_photos && existing.problem_photos.length > 0) ? existing.problem_photos : (job.problem_photos || []);
              const mergedFotos = (existing.fotos && existing.fotos.length > 0) ? existing.fotos : (job.fotos || []);

              acceptedMap.set(job.id, {
                ...job,
                ...existing,
                lat: mergedLat,
                lng: mergedLng,
                coordinates: mergedCoords,
                coordenadas: mergedCoords,
                has_real_coords: existing.has_real_coords || job.has_real_coords,
                property: existing.property || job.property,
                fotos: mergedFotos,
                foto: existing.foto || job.foto || mergedFotos[0] || null,
                facade_photo: mergedFacade,
                foto_fachada: mergedFacade,
                problem_photos: mergedProblemPhotos,
                is_accepted: true,
                myQuote: existing.myQuote || job.myQuote,
                myQuotesHistory: job.myQuotesHistory || existing.myQuotesHistory || [],
                agreed_price: existing.agreed_price || job.agreed_price || 0,
                full_address: existing.full_address || job.full_address,
                calle: existing.calle || job.calle,
                client_name: existing.client_name || job.client_name,
                client_phone: existing.client_phone || job.client_phone,
                scheduled_at: existing.scheduled_at || job.scheduled_at,
              });
            } else {
              acceptedMap.set(job.id, {
                ...job,
                is_accepted: true,
              });
            }
          }
        });

        const acceptedList = Array.from(acceptedMap.values());
        const availableList = rawJobs.filter(j => !j.is_accepted && !acceptedMap.has(j.id));

        setNetworkJobs(availableList);
        setAcceptedJobs(acceptedList);

        // Si tenemos un trabajo seleccionado en el modal, actualizar su estado en vivo dando prioridad a la lista aceptada
        if (selectedJob) {
          const updated = [...acceptedList, ...availableList].find(j => j.id === selectedJob.id);
          if (updated) {
            setSelectedJob(updated);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching jobs", e);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [authUser]);

  // Polling de alta frecuencia (1.5s) para chat en tiempo real cuando el modal está abierto
  useEffect(() => {
    if (!showQuoteModal || !selectedJob || quoteStep !== 1) return;

    const pollLiveChat = async () => {
      const quoteId = selectedJob.myQuote?.id;
      if (!quoteId) return;

      try {
        const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`, { headers });
        if (res.data?.success && res.data.chat_history) {
          setSelectedJob(prev => {
            if (!prev || !prev.myQuote) return prev;
            const currentLen = prev.myQuote.chat_history?.length || 0;
            const newLen = res.data.chat_history.length;
            if (currentLen !== newLen || JSON.stringify(prev.myQuote.chat_history) !== JSON.stringify(res.data.chat_history)) {
              return {
                ...prev,
                myQuote: {
                  ...prev.myQuote,
                  chat_history: res.data.chat_history
                }
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // silent polling
      }
    };

    const liveInterval = setInterval(pollLiveChat, 1500);
    return () => clearInterval(liveInterval);
  }, [showQuoteModal, selectedJob?.myQuote?.id, quoteStep]);

  useEffect(() => {
    if (showQuoteModal && quoteStep === 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJob?.myQuote?.chat_history, showQuoteModal, quoteStep]);

  const handleSendEmbeddedChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || sendingChat || !selectedJob) return;

    const textToSend = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    // Actualización optimista instantánea (0ms)
    const myName = authUser ? (authUser.first_name ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() : (authUser.name || 'Tú (Técnico)')) : 'Tú (Técnico)';
    const optimisticMessage = {
      sender_id: authUser?.id,
      sender_name: myName,
      sender_role: 'Técnico',
      message: textToSend,
      created_at: new Date().toISOString()
    };

    setSelectedJob(prev => {
      if (!prev) return prev;
      const currentQuote = prev.myQuote || { chat_history: [] };
      return {
        ...prev,
        myQuote: {
          ...currentQuote,
          chat_history: [...(currentQuote.chat_history || []), optimisticMessage]
        }
      };
    });

    const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let quoteId = selectedJob.myQuote?.id;

      // Si no existe cotización/chat previo, iniciamos la sesión
      if (!quoteId) {
        const initRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJob.id}/iniciar-chat`,
          {},
          { headers }
        );
        if (initRes.data?.success && initRes.data?.quote) {
          quoteId = initRes.data.quote.id;
        }
      }

      if (quoteId) {
        const chatRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/network-quotes/${quoteId}/chat`,
          { message: textToSend },
          { headers }
        );
        if (chatRes.data?.chat_history) {
          setSelectedJob(prev => {
            if (!prev || !prev.myQuote) return prev;
            return {
              ...prev,
              myQuote: {
                ...prev.myQuote,
                chat_history: chatRes.data.chat_history
              }
            };
          });
        }
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleEnviarCotizacion = async () => {
    if (!selectedJob) return;
    if (!quotePrice) {
      alert("Por favor ingresa una propuesta económica.");
      return;
    }
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${selectedJob.id}/cotizar`,
        { price: quotePrice, message: quoteMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setQuoteStep(1);
        setQuotePrice('');
        setQuoteMessage('');
        fetchJobs();
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al enviar tu cotización. Intenta de nuevo.");
    }
  };

  const handleProgramarVisita = async (jobId) => {
    if (!scheduleDate) {
      alert("Por favor selecciona una fecha y hora para la visita.");
      return;
    }
    setSavingSchedule(true);
    try {
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos/${jobId}/programar-visita`,
        { scheduled_at: scheduleDate, notes: scheduleNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        alert("✅ " + res.data.message);
        setScheduleNotes('');
        fetchJobs();
      }
    } catch (e) {
      console.error("Error programando visita", e);
      alert("Hubo un error al programar la visita. Intenta de nuevo.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const openQuoteModalForJob = (job) => {
    const isJobAccepted = Boolean(job.is_accepted || acceptedJobs.some(a => a.id === job.id) || job.myQuote?.status === 'accepted');
    const targetJob = isJobAccepted ? (acceptedJobs.find(a => a.id === job.id) || { ...job, is_accepted: true }) : job;
    setSelectedJob(targetJob);
    setQuotePrice(targetJob.myQuote && targetJob.myQuote.price > 0 ? targetJob.myQuote.price : '');
    setQuoteMessage(targetJob.myQuote ? targetJob.myQuote.message : '');
    setActivePhoto(targetJob.fotos?.[0] || targetJob.foto || null);
    if (targetJob.scheduled_at) {
      const d = new Date(targetJob.scheduled_at);
      if (!isNaN(d.getTime())) {
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduleDate(localIso);
      }
    } else {
      // Default to next day 10:00 AM
      const nextDay = new Date(Date.now() + 86400000);
      nextDay.setHours(10, 0, 0, 0);
      const localIso = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduleDate(localIso);
    }
    setScheduleNotes('');
    setActiveModalTab('detalle');
    setQuoteStep(1);
    setShowQuoteModal(true);
  };

  const getStatusLabel = (status) => {
    if (status === 'rejected') return 'Rechazada';
    if (status === 'accepted') return 'Aceptada';
    return 'Pendiente';
  };

  const chatMessages = selectedJob?.myQuote?.chat_history || [];
  const lastClientMsg = selectedJob?.lastClientMsg;

  // Respuestas del cliente sobre la visita
  const scheduleResponses = chatMessages.filter(m => m.is_schedule_response);
  const lastScheduleResponse = scheduleResponses.length > 0 ? scheduleResponses[scheduleResponses.length - 1] : null;

  // Propuestas de horario del técnico
  const scheduleProposals = chatMessages.filter(m => m.is_schedule);
  const lastScheduleProposal = scheduleProposals.length > 0 ? scheduleProposals[scheduleProposals.length - 1] : null;

  // Determinar si el cliente solicitó re-coordinar
  const isRescheduleRequested = Boolean(
    lastScheduleResponse &&
    lastScheduleResponse.schedule_confirmed === false &&
    (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
  );

  // Determinar si el cliente confirmó el horario
  const isScheduleConfirmed = Boolean(
    lastScheduleResponse &&
    lastScheduleResponse.schedule_confirmed === true &&
    (!lastScheduleProposal || new Date(lastScheduleResponse.created_at) >= new Date(lastScheduleProposal.created_at))
  );

  // Determinar si el horario está propuesto y esperando confirmación del cliente
  const isPendingClientConfirm = Boolean(
    selectedJob?.scheduled_at &&
    !isScheduleConfirmed &&
    !isRescheduleRequested
  );

  return (
    <div className="mercado-container">
      <Header title="Mercado de Trabajos" />

      <div className="mercado-content">
        {/* Floating Mobile Toggle Button (Tipo Uber) */}
        <button 
          className="mercado-mobile-toggle-btn"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        >
          {mobileDrawerOpen ? (
            <><MapIcon size={16} /> Ver Mapa</>
          ) : (
            <><List size={16} /> Ver Lista ({networkJobs.length})</>
          )}
        </button>

        {/* ─── Map ─── */}
        <div className="mercado-map-section">
          {isLoaded ? (
            <>
              <div className="mercado-map-overlay-badge">
                <span className="mercado-map-live-dot" />
                {activeTab === 'disponibles' ? `${networkJobs.length} disponibles` : `${acceptedJobs.length} aceptados`}
              </div>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={13}
                options={{ disableDefaultUI: false }}
              >
                {/* Marcadores de Trabajos Disponibles */}
                {activeTab === 'disponibles' && networkJobs.map(job => (
                  <React.Fragment key={job.id}>
                    <Circle
                      center={{ lat: job.lat, lng: job.lng }}
                      radius={550}
                      options={{
                        fillColor: job.is_urgent ? '#ef4444' : (job.lastClientMsg ? '#2563eb' : '#ff6600'),
                        fillOpacity: 0.16,
                        strokeColor: job.is_urgent ? '#dc2626' : (job.lastClientMsg ? '#1d4ed8' : '#ea580c'),
                        strokeOpacity: 0.7,
                        strokeWeight: 1.5,
                        clickable: true
                      }}
                      onClick={() => openQuoteModalForJob(job)}
                    />
                    <Marker
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => openQuoteModalForJob(job)}
                      title={`Zona: ${job.zona}`}
                      icon={{
                        url: job.is_urgent
                          ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                          : (job.lastClientMsg
                            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            : (job.myQuote ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'))
                      }}
                    />
                  </React.Fragment>
                ))}

                {/* Marcadores de Trabajos Aceptados */}
                {activeTab === 'aceptados' && acceptedJobs.map(job => (
                  <Marker
                    key={`acc-${job.id}`}
                    position={{ lat: job.lat, lng: job.lng }}
                    onClick={() => openQuoteModalForJob(job)}
                    title={`Trabajo Aceptado: ${job.titulo}`}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    }}
                  />
                ))}

                {selectedJob && !showQuoteModal && (
                  <InfoWindow
                    position={{ lat: selectedJob.lat, lng: selectedJob.lng }}
                    onCloseClick={() => setSelectedJob(null)}
                  >
                    <div className="mercado-info-window">
                      <h4>{selectedJob.titulo}</h4>
                      <p style={{ color: '#ea580c', fontWeight: '700', margin: '4px 0' }}>
                        <MapPin size={12} /> Zona: {selectedJob.zona}
                      </p>
                      <button
                        className="mercado-btn-details"
                        onClick={() => openQuoteModalForJob(selectedJob)}
                      >
                        {selectedJob.is_accepted ? '✅ Ver Detalle y Visita' : (selectedJob.myQuote ? '📋 Ver Detalle y Chat' : '💼 Cotizar este trabajo')}
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </>
          ) : (
            <div className="mercado-loading-map">Cargando Mapa...</div>
          )}
        </div>

        {/* ─── Sidebar (Tipo Uber) ─── */}
        <div className={`mercado-sidebar ${mobileDrawerOpen ? 'mobile-open' : ''}`}>
          <div className="mercado-sidebar-header">
            <div 
              className="mercado-mobile-drag-handle" 
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} 
            />
            <p className="mercado-sidebar-title">🔴 Panel Técnico</p>
            <h2 className="mercado-sidebar-subtitle">Mercado de la Red</h2>
            <p className="mercado-sidebar-desc">Cotiza trabajos o gestiona tus servicios aceptados</p>
          </div>

          {/* Selector de Pestañas (Disponibles vs Aceptados) */}
          <div className="mercado-sidebar-tabs">
            <button
              type="button"
              className={`mercado-tab-btn ${activeTab === 'disponibles' ? 'active' : ''}`}
              onClick={() => setActiveTab('disponibles')}
            >
              🌐 Disponibles
              <span className="mercado-tab-badge">{networkJobs.length}</span>
            </button>
            <button
              type="button"
              className={`mercado-tab-btn tab-accepted ${activeTab === 'aceptados' ? 'active' : ''}`}
              onClick={() => setActiveTab('aceptados')}
            >
              ✓ Aceptados
              <span className="mercado-tab-badge">{acceptedJobs.length}</span>
            </button>
          </div>

          <div className="mercado-job-list">
            {/* PESTAÑA 1: TRABAJOS DISPONIBLES */}
            {activeTab === 'disponibles' && (
              <>
                {networkJobs.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                    No hay trabajos disponibles para cotizar en este momento.
                  </div>
                )}
                {networkJobs.map(job => (
                  <div
                    key={job.id}
                    className={`mercado-job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => openQuoteModalForJob(job)}
                  >
                    {/* 1. Colonia cercana, Urgencia y Badge de Estado */}
                    <div className="mercado-job-card-top">
                      <div className="mercado-job-colonia-tag">
                        <MapPin size={13} color="#ea580c" />
                        <span>{job.zona}</span>
                      </div>
                      
                      {job.is_urgent && (
                        <span className="mercado-urgency-badge urgent">⚡ Urgente</span>
                      )}
                      
                      {job.myQuote ? (
                        <span className={`mercado-job-badge ${job.myQuote.status === 'rejected' ? 'badge-rejected' : (job.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                          {job.myQuote.status === 'rejected' ? 'Rechazada' : (job.myQuote.price > 0 ? `$${parseFloat(job.myQuote.price).toLocaleString('es-MX')}` : 'Chat')}
                        </span>
                      ) : (
                        <span className="mercado-job-badge-disponible">Disponible</span>
                      )}
                    </div>

                    {/* 2. Problema Solicitado */}
                    <h4 className="mercado-job-card-title">{job.titulo}</h4>
                    <p className="mercado-job-card-desc">{job.descripcion}</p>

                    {/* 3. ALERTA DE MENSAJE DEL CLIENTE */}
                    {job.lastClientMsg && (
                      <div className="mercado-job-msg-alert">
                        <span className="mercado-msg-dot-pulse" />
                        <span>💬 <strong>Mensaje del Cliente:</strong> "{job.lastClientMsg.message}"</span>
                      </div>
                    )}

                    {/* Footer del Cuadrito */}
                    <div className="mercado-job-card-footer">
                      <span className="mercado-ofertas-count">{job.cotizaciones} ofertas enviadas</span>
                      <span className="mercado-fecha-tag"><Clock size={11} /> {job.fecha}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* PESTAÑA 2: TRABAJOS ACEPTADOS / GANADOS */}
            {activeTab === 'aceptados' && (
              <>
                {acceptedJobs.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px', fontSize: '14px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Sin trabajos aceptados aún</strong>
                    Envía cotizaciones a los trabajos disponibles para ganar servicios.
                  </div>
                )}
                {acceptedJobs.map(job => (
                  <div
                    key={`acc-${job.id}`}
                    className={`mercado-accepted-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                    onClick={() => openQuoteModalForJob(job)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        ✓ OFERTA ACEPTADA
                      </span>
                      <span className="mercado-accepted-price-tag">
                        ${parseFloat(job.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <h4 className="mercado-job-card-title" style={{ color: '#0f172a', marginBottom: '4px' }}>
                      {job.titulo}
                    </h4>

                    <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', marginBottom: '6px' }}>
                      📍 {job.full_address}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                      👤 Cliente: <strong>{job.client_name}</strong> {job.client_phone && `(${job.client_phone})`}
                    </div>

                    {/* Estado de Programación de Visita */}
                    <div style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '8px', background: job.scheduled_at ? '#eff6ff' : '#fff7ed', border: `1px solid ${job.scheduled_at ? '#bfdbfe' : '#fed7aa'}`, color: job.scheduled_at ? '#1d4ed8' : '#c2410c', fontWeight: '700', marginBottom: '8px' }}>
                      {job.scheduled_at 
                        ? `📅 Visita: ${new Date(job.scheduled_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
                        : `⚠️ Pendiente programar hora de llegada`}
                    </div>

                    {/* Alerta de mensaje */}
                    {job.lastClientMsg && (
                      <div className="mercado-job-msg-alert">
                        <span className="mercado-msg-dot-pulse" />
                        <span>💬 <strong>Mensaje del Cliente:</strong> "{job.lastClientMsg.message}"</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                      <span>Fecha: {job.fecha}</span>
                      <span style={{ color: '#16a34a', fontWeight: '800' }}>Ver detalles y coordinar →</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL PREMIUM 2 COLUMNAS (DETALLES + CHAT INTEGRADO) ─── */}
      {showQuoteModal && selectedJob && (
        <div className="mercado-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowQuoteModal(false)}>
          <div className="mercado-premium-modal" style={{ maxWidth: '1080px' }}>
            
            {/* ══════════════════════════════════════════════════
                PASO 1: DETALLES DEL TRABAJO / COORDINACIÓN / CHAT
            ══════════════════════════════════════════════════ */}
            {quoteStep === 1 && (
              <>
                <div className="mercado-premium-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <h2 style={{ margin: 0 }}>
                      {selectedJob.is_accepted ? '✅ Trabajo Aceptado' : '💼 Detalle del Trabajo'}
                    </h2>
                  </div>

                  {/* Selector de Pestañas en el Header para TODOS los trabajos */}
                  <div className="mercado-modal-header-tabs">
                    <button
                      type="button"
                      className={`mercado-modal-header-tab ${activeModalTab === 'detalle' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('detalle')}
                    >
                      {selectedJob.is_accepted ? <Clock size={14} /> : <FileText size={14} />}
                      {selectedJob.is_accepted ? 'Coordinación & Horario' : 'Detalle & Cotización'}
                    </button>
                    <button
                      type="button"
                      className={`mercado-modal-header-tab ${activeModalTab === 'chat' ? 'active' : ''}`}
                      onClick={() => setActiveModalTab('chat')}
                    >
                      <MessageCircle size={14} /> Chat con el Cliente ({chatMessages.length})
                      {lastClientMsg && <span className="mercado-tab-alert-dot" />}
                    </button>
                  </div>

                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* ─────────────────────────────────────────────────────────────
                      CASO A: TRABAJO ACEPTADO - VISTA DE COORDINACIÓN Y HORARIO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && activeModalTab === 'detalle' && (
                    <>
                      {/* Columna Izquierda: Galería de Fotos y Problema Reportado */}
                      <div className="mercado-premium-details" style={{ flex: '0.95', gap: '14px' }}>
                        {/* Galería de Fotos */}
                        {activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              {activePhoto === selectedJob.facade_photo ? (
                                <span className="mercado-gallery-type-badge facade">
                                  🏡 Fachada del Inmueble (Registro del Levantamiento)
                                </span>
                              ) : (
                                <span className="mercado-gallery-type-badge problem">
                                  📸 Evidencia de Falla {selectedJob.problem_photos && selectedJob.problem_photos.length > 1 ? `(${selectedJob.problem_photos.indexOf(activePhoto) + 1} de ${selectedJob.problem_photos.length})` : ''}
                                </span>
                              )}
                            </div>

                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
                            >
                              <img src={activePhoto} alt="Fotografía del servicio" className="mercado-premium-image" />
                              <div className="mercado-image-zoom-badge">
                                <Maximize2 size={12} /> Clic para ampliar foto
                              </div>
                            </div>

                            {selectedJob.fotos && selectedJob.fotos.length > 1 && (
                              <div className="mercado-thumbnails-row">
                                {selectedJob.fotos.map((f, idx) => {
                                  const isFacade = f === selectedJob.facade_photo;
                                  const probIndex = selectedJob.problem_photos ? selectedJob.problem_photos.indexOf(f) : idx;
                                  return (
                                    <div key={idx} className="mercado-thumb-wrapper">
                                      <div
                                        className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                        onClick={() => setActivePhoto(f)}
                                        title={isFacade ? 'Ver Fachada de la Casa' : `Ver Evidencia ${probIndex + 1}`}
                                      >
                                        <img src={f} alt={isFacade ? 'Fachada' : `Evidencia ${probIndex + 1}`} />
                                      </div>
                                      <span className={`mercado-thumb-badge ${isFacade ? 'facade' : (activePhoto === f ? 'active' : '')}`}>
                                        {isFacade ? '🏡 Fachada' : `📸 Falla ${probIndex >= 0 ? probIndex + 1 : idx + 1}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mercado-no-photo-placeholder" style={{ height: '140px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span>Sin fotografías adjuntas</span>
                          </div>
                        )}

                        {/* Detalle del Problema Solicitado */}
                        <div className="mercado-problem-detail-box">
                          <div className="mercado-problem-detail-header">
                            <FileText size={18} color="#ea580c" />
                            <span>{selectedJob.titulo}</span>
                          </div>
                          <div className="mercado-problem-detail-desc">
                            {selectedJob.descripcion}
                          </div>
                          <div className="mercado-problem-detail-footer">
                            <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Solicitado: {selectedJob.fecha}</span>
                            <span style={{ fontWeight: '700', color: '#16a34a' }}>✓ Servicio Asignado a Ti</span>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: HORARIO HERO, DIRECCIÓN ESPACIOSA Y ACCESO AL CHAT */}
                      <div className="mercado-premium-form" style={{ flex: '1.25', padding: '20px 24px', gap: '14px', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* 1. SECCIÓN HERO: PROGRAMAR HORA DE IDA / VISITA */}
                        <div className="mercado-hero-scheduler-box">
                          <div className="mercado-hero-scheduler-header">
                            <strong>
                              <Clock size={18} color="#16a34a" /> Programar Hora de Llegada / Visita
                            </strong>
                            {isRescheduleRequested ? (
                              <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
                                ⚠️ Re-coordinación Solicitada
                              </span>
                            ) : isScheduleConfirmed ? (
                              <span className="mercado-hero-scheduler-badge">
                                ✓ Confirmada por el Cliente
                              </span>
                            ) : isPendingClientConfirm ? (
                              <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
                                ⏳ Esperando Confirmación
                              </span>
                            ) : selectedJob.scheduled_at ? (
                              <span className="mercado-hero-scheduler-badge">
                                ✓ Programada
                              </span>
                            ) : (
                              <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                                Pendiente
                              </span>
                            )}
                          </div>

                          {/* Alerta de re-coordinación solicitada */}
                          {isRescheduleRequested && lastScheduleResponse && (
                            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontWeight: '800', fontSize: '13px' }}>
                                <AlertCircle size={16} /> El cliente solicitó acordar otro horario:
                              </div>
                              <div style={{ margin: '6px 0 2px 0', fontSize: '13px', color: '#7c2d12', fontWeight: '600', fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                "{lastScheduleResponse.message.replace(/^⚠️\s*[^:]+:\s*/, '').replace(/^"|"$/g, '') || lastScheduleResponse.message}"
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#ea580c', marginTop: '6px', fontWeight: '700' }}>
                                👉 Selecciona abajo la nueva hora acordada con el cliente y haz clic en "Proponer Nuevo Horario":
                              </div>
                            </div>
                          )}

                          {isScheduleConfirmed && (
                            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '800', fontSize: '13px' }}>
                                <CheckCircle2 size={16} /> Cita Confirmada por el Cliente
                              </div>
                              <div style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#0f172a', fontWeight: '800' }}>
                                📅 {new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                              </div>
                            </div>
                          )}

                          {isPendingClientConfirm && (
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontWeight: '800', fontSize: '13px' }}>
                                <Clock size={16} /> Horario Propuesto Enviado al Cliente
                              </div>
                              <div style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#1e3a8a', fontWeight: '800' }}>
                                📅 {new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#3b82f6', marginTop: '4px' }}>
                                El cliente ha recibido la propuesta y te responderá confirmando o re-coordinando.
                              </div>
                            </div>
                          )}

                          {!selectedJob.scheduled_at && !isRescheduleRequested && (
                            <div className="mercado-hero-scheduler-status">
                              ⚠️ Selecciona cuándo acudirás al domicilio para que el cliente confirme el horario:
                            </div>
                          )}

                          <div className="mercado-hero-scheduler-input-row">
                            <button
                              type="button"
                              className="mdtp-trigger-btn"
                              onClick={() => setShowDatePickerModal(true)}
                              title="Clic para seleccionar fecha y hora con el reloj dinámico"
                            >
                              <div className="mdtp-trigger-content">
                                <span className="mdtp-trigger-icon"><Clock size={16} /></span>
                                <span>{formatDateTimeHuman(scheduleDate)}</span>
                              </div>
                              <span style={{ fontSize: '12px', color: '#6200ee', fontWeight: '800' }}>Cambiar ▾</span>
                            </button>

                            <button
                              type="button"
                              className="mercado-hero-scheduler-btn"
                              onClick={() => handleProgramarVisita(selectedJob.id)}
                              disabled={savingSchedule}
                            >
                              <Clock size={16} />
                              <span>{savingSchedule ? 'Guardando...' : (isRescheduleRequested ? '📅 Proponer Nuevo Horario' : (selectedJob.scheduled_at ? '✏️ Modificar Horario' : '📅 Proponer Hora de Ida'))}</span>
                            </button>
                          </div>

                          <MaterialDateTimePicker
                            isOpen={showDatePickerModal}
                            value={scheduleDate}
                            onChange={(newVal) => setScheduleDate(newVal)}
                            onClose={() => setShowDatePickerModal(false)}
                            title="Programar Hora de Llegada"
                          />
                        </div>

                        {/* 2. DIRECCIÓN EXACTA Y CONTACTO DIRECTO */}
                        <div className="mercado-accepted-address-box">
                          <div className="mercado-address-header">
                            <span className="mercado-address-label">
                              📍 DIRECCIÓN COMPLETA DEL CLIENTE
                            </span>
                            <button
                              type="button"
                              onClick={() => abrirEnGoogleMaps(selectedJob)}
                              className="mercado-maps-btn"
                              title={extraerCoordenadas(selectedJob) ? "Abrir ubicación exacta por coordenadas GPS" : "Abrir dirección en Google Maps"}
                            >
                              <ExternalLink size={12} /> Abrir Maps ↗
                            </button>
                          </div>

                          <div className="mercado-address-text">
                            {selectedJob.full_address}
                          </div>

                          {extraerCoordenadas(selectedJob) && (
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🛰️ GPS Detectado: {extraerCoordenadas(selectedJob).formatted}</span>
                            </div>
                          )}

                          {/* Ficha Visual de Fachada de la Propiedad (Levantamiento) */}
                          {selectedJob.facade_photo ? (
                            <div 
                              className="mercado-facade-card-accepted"
                              onClick={() => { setActivePhoto(selectedJob.facade_photo); setIsPhotoZoomed(true); }}
                              title="Clic para ampliar y ver la fachada de la propiedad"
                            >
                              <img src={selectedJob.facade_photo} alt="Fachada del Inmueble" className="mercado-facade-card-img" />
                              <div className="mercado-facade-card-info">
                                <span className="mercado-facade-card-tag">🏡 Fachada del Inmueble</span>
                                <span className="mercado-facade-card-text">{selectedJob.property_name || selectedJob.full_address}</span>
                                <span className="mercado-facade-card-zoom">🔍 Clic para ampliar foto de fachada</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mercado-facade-card-empty">
                              <span>🏡 Sin foto de fachada registrada en el levantamiento</span>
                            </div>
                          )}

                          {selectedJob.property_name && selectedJob.property_name !== selectedJob.full_address && (
                            <div className="mercado-address-property-name" style={{ marginTop: '6px' }}>
                              Propiedad: {selectedJob.property_name}
                            </div>
                          )}

                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Cliente: <strong style={{ color: '#0f172a' }}>{selectedJob.client_name}</strong>
                          </div>

                          {/* Botones de WhatsApp y Llamada amplios */}
                          <div className="mercado-contact-actions-row">
                            {selectedJob.client_phone ? (
                              <>
                                <a
                                  href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mercado-contact-action-btn whatsapp"
                                >
                                  <MessageCircle size={17} />
                                  <span>WhatsApp ({selectedJob.client_phone})</span>
                                </a>
                                <a
                                  href={`tel:${selectedJob.client_phone}`}
                                  className="mercado-contact-action-btn call"
                                >
                                  <Phone size={16} />
                                  <span>Llamar</span>
                                </a>
                              </>
                            ) : (
                              <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                Teléfono directo no disponible. Utiliza el chat interno.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. MONTO ACORDADO GANADO */}
                        <div className="mercado-accepted-price-box">
                          <span className="mercado-accepted-price-label">Monto Aceptado del Trabajo:</span>
                          <span className="mercado-accepted-price-val">
                            ${parseFloat(selectedJob.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </span>
                        </div>

                        {/* 4. BOTÓN DESTACADO PARA ABRIR EL CHAT */}
                        <div>
                          {lastClientMsg && (
                            <div className="mercado-chat-alert-banner" style={{ marginBottom: '8px' }}>
                              <div className="mercado-chat-alert-icon">🔔</div>
                              <div className="mercado-chat-alert-text">
                                <strong>Mensaje reciente del Cliente:</strong>
                                <span>"{lastClientMsg.message}"</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="mercado-open-chat-card-btn"
                            onClick={() => setActiveModalTab('chat')}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageCircle size={18} />
                              <span>Abrir Conversación con el Cliente ({chatMessages.length})</span>
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '900' }}>→</span>
                          </button>
                        </div>

                      </div>
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO B: TRABAJO ACEPTADO - VISTA DE CHAT DIRECTO
                  ───────────────────────────────────────────────────────────── */}
                  {selectedJob.is_accepted && activeModalTab === 'chat' && (
                    <>
                      {/* Columna Izquierda: Botón de volver y Resumen Rápido */}
                      <div className="mercado-premium-details" style={{ flex: '0.85', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('detalle')}
                          style={{
                            padding: '10px 14px',
                            background: '#ffffff',
                            color: '#ea580c',
                            border: '1.5px solid #fed7aa',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)'
                          }}
                        >
                          <ChevronLeft size={16} /> Volver a Coordinación y Horario
                        </button>

                        <div className="mercado-accepted-address-box">
                          <span className="mercado-address-label">📍 Ubicación</span>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                            {selectedJob.full_address}
                          </div>
                          {selectedJob.client_phone && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <a
                                href={`https://wa.me/52${selectedJob.client_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mercado-contact-action-btn whatsapp"
                                style={{ padding: '6px 10px', fontSize: '11.5px' }}
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {selectedJob.scheduled_at && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#166534' }}>
                            <strong>📅 Hora de Visita:</strong>
                            <div>{new Date(selectedJob.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                          </div>
                        )}

                        <div className="mercado-accepted-price-box" style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Monto:</span>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>
                            ${parseFloat(selectedJob.agreed_price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Columna Derecha: CHAT INTEGRADO */}
                      <div className="mercado-embedded-chat-panel" style={{ flex: '1.25' }}>
                        <div className="mercado-chat-header">
                          <div className="mercado-chat-header-title">
                            <h3><MessageCircle size={18} color="#ea580c" /> Chat con {selectedJob.client_name}</h3>
                          </div>
                          <div className="mercado-chat-online-badge">
                            <span className="mercado-chat-online-dot" /> En línea
                          </div>
                        </div>

                        {/* Stream de Mensajes */}
                        <div className="mercado-chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="mercado-chat-empty-state">
                              <div className="icon-wrap">
                                <MessageCircle size={26} />
                              </div>
                              <p>Inicia el chat con el cliente</p>
                              <span>Escribe aquí abajo para aclarar dudas, avisar que vas en camino o confirmar el servicio.</span>
                            </div>
                          ) : (
                            chatMessages.map((msg, idx) => {
                              const isMe = Number(msg.sender_id) === Number(authUser?.id) || msg.sender_role === 'Técnico de la Red' || msg.sender_role === 'Técnico';
                              return (
                                <div
                                  key={idx}
                                  className={`mercado-chat-bubble-row ${isMe ? 'sent' : 'received'}`}
                                >
                                  <span className="mercado-chat-bubble-sender">
                                    {isMe ? 'Tú (Técnico)' : (msg.sender_name || 'Cliente')}
                                  </span>
                                  <div className="mercado-chat-bubble">
                                    {msg.message}
                                  </div>
                                  <span className="mercado-chat-bubble-time">
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Input Bar integrado */}
                        <form onSubmit={handleSendEmbeddedChat} className="mercado-chat-input-bar">
                          <input
                            type="text"
                            placeholder="Escribe un mensaje al cliente..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={sendingChat}
                          />
                          <button
                            type="submit"
                            className="mercado-chat-send-btn"
                            disabled={sendingChat || !chatInput.trim()}
                          >
                            <Send size={15} />
                            <span>{sendingChat ? 'Enviando...' : 'Enviar'}</span>
                          </button>
                        </form>
                      </div>
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO C: TRABAJO DISPONIBLE - VISTA DE DETALLE & COTIZACIÓN
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'detalle' && (
                    <>
                      {/* Columna Izquierda: Galería de Fotos y Problema Solicitado */}
                      <div className="mercado-premium-details" style={{ flex: '0.95', gap: '14px' }}>
                        {activePhoto ? (
                          <div className="mercado-photo-gallery">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              {activePhoto === selectedJob.facade_photo ? (
                                <span className="mercado-gallery-type-badge facade">
                                  🏡 Fachada del Inmueble (Registro del Levantamiento)
                                </span>
                              ) : (
                                <span className="mercado-gallery-type-badge problem">
                                  📸 Evidencia de Falla {selectedJob.problem_photos && selectedJob.problem_photos.length > 1 ? `(${selectedJob.problem_photos.indexOf(activePhoto) + 1} de ${selectedJob.problem_photos.length})` : ''}
                                </span>
                              )}
                            </div>

                            <div
                              className="mercado-premium-image-wrapper"
                              onClick={() => setIsPhotoZoomed(true)}
                              title="Clic para ampliar imagen"
                              style={{ height: '200px' }}
                            >
                              <img src={activePhoto} alt="Fotografía del problema" className="mercado-premium-image" />
                              <div className="mercado-image-zoom-badge">
                                <Maximize2 size={12} /> Clic para ampliar foto
                              </div>
                            </div>

                            {selectedJob.fotos && selectedJob.fotos.length > 1 && (
                              <div className="mercado-thumbnails-row">
                                {selectedJob.fotos.map((f, idx) => {
                                  const isFacade = f === selectedJob.facade_photo;
                                  const probIndex = selectedJob.problem_photos ? selectedJob.problem_photos.indexOf(f) : idx;
                                  return (
                                    <div key={idx} className="mercado-thumb-wrapper">
                                      <div
                                        className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                        onClick={() => setActivePhoto(f)}
                                        title={isFacade ? 'Ver Fachada de la Casa' : `Ver Evidencia ${probIndex + 1}`}
                                      >
                                        <img src={f} alt={isFacade ? 'Fachada' : `Evidencia ${probIndex + 1}`} />
                                      </div>
                                      <span className={`mercado-thumb-badge ${isFacade ? 'facade' : (activePhoto === f ? 'active' : '')}`}>
                                        {isFacade ? '🏡 Fachada' : `📸 Falla ${probIndex >= 0 ? probIndex + 1 : idx + 1}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mercado-no-photo-placeholder" style={{ height: '140px' }}>
                            <ImageIcon size={32} color="#94a3b8" />
                            <span>Sin fotografías adjuntas</span>
                          </div>
                        )}

                        {/* Detalle del Problema Solicitado */}
                        <div className="mercado-problem-detail-box">
                          <div className="mercado-problem-detail-header">
                            <FileText size={17} color="#ea580c" />
                            <span>{selectedJob.titulo}</span>
                          </div>
                          <div className="mercado-problem-detail-desc">
                            {selectedJob.descripcion}
                          </div>
                          <div className="mercado-problem-detail-footer">
                            <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Publicado: {selectedJob.fecha}</span>
                            <span style={{ fontWeight: '600', color: '#ea580c' }}>{selectedJob.cotizaciones} ofertas enviadas</span>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: Colonia, Mi Cotización y Botón para Abrir Chat */}
                      <div className="mercado-premium-form" style={{ flex: '1.25', padding: '20px 24px', gap: '14px', display: 'flex', flexDirection: 'column' }}>
                        {/* 1. Zona / Colonia aproximada */}
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <MapPin size={22} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#ea580c', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Colonia Cercana
                              </strong>
                              {selectedJob.is_urgent && (
                                <span className="mercado-urgency-badge urgent">⚡ Urgente</span>
                              )}
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                              {selectedJob.zona}
                            </span>
                            <div style={{ fontSize: '11.5px', color: '#9a3412', marginTop: '4px' }}>
                              🔒 La dirección exacta y datos de contacto se te revelarán una vez que el cliente acepte tu cotización.
                            </div>
                          </div>
                        </div>

                        {/* 2. Mi Propuesta Económica */}
                        <div style={{ background: selectedJob.myQuote?.status === 'rejected' ? '#fff1f2' : (selectedJob.myQuote?.status === 'accepted' ? '#f0fdf4' : '#ffffff'), border: `1.5px solid ${selectedJob.myQuote?.status === 'rejected' ? '#fecdd3' : (selectedJob.myQuote?.status === 'accepted' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', color: selectedJob.myQuote?.status === 'rejected' ? '#e11d48' : '#ea580c', letterSpacing: '0.5px' }}>
                              📋 Mi Propuesta Económica
                            </span>
                            {selectedJob.myQuote && (
                              <span className={`mercado-job-badge ${selectedJob.myQuote.status === 'rejected' ? 'badge-rejected' : (selectedJob.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`}>
                                {getStatusLabel(selectedJob.myQuote.status)}
                              </span>
                            )}
                          </div>

                          {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? (
                            <div>
                              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
                                ${parseFloat(selectedJob.myQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>MXN</span>
                              </div>
                              {selectedJob.myQuote.message && (
                                <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic', marginTop: '6px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                  "{selectedJob.myQuote.message}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 8px' }}>
                              Aún no has enviado una cotización económica a este trabajo.
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setQuoteStep(2)}
                            style={{
                              width: '100%',
                              marginTop: '12px',
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, #ff6600 0%, #ea580c 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '800',
                              fontSize: '13.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <DollarSign size={16} />
                            <span>{selectedJob.myQuote && selectedJob.myQuote.price > 0 ? '✏️ Modificar Cotización' : '💼 Enviar Cotización'}</span>
                          </button>
                        </div>

                        {/* 3. Botón de acceso al Chat con el Cliente */}
                        <div>
                          {lastClientMsg && (
                            <div className="mercado-chat-alert-banner" style={{ marginBottom: '8px' }}>
                              <div className="mercado-chat-alert-icon">🔔</div>
                              <div className="mercado-chat-alert-text">
                                <strong>El Cliente te envió un mensaje:</strong>
                                <span>"{lastClientMsg.message}"</span>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="mercado-open-chat-card-btn"
                            onClick={() => setActiveModalTab('chat')}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageCircle size={18} />
                              <span>Consultar / Chat con el Cliente ({chatMessages.length})</span>
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '900' }}>→</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      CASO D: TRABAJO DISPONIBLE - VISTA DE CHAT DIRECTO
                  ───────────────────────────────────────────────────────────── */}
                  {!selectedJob.is_accepted && activeModalTab === 'chat' && (
                    <>
                      {/* Columna Izquierda: Botón de volver y Resumen Rápido */}
                      <div className="mercado-premium-details" style={{ flex: '0.85', gap: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('detalle')}
                          style={{
                            padding: '10px 14px',
                            background: '#ffffff',
                            color: '#ea580c',
                            border: '1.5px solid #fed7aa',
                            borderRadius: '12px',
                            fontWeight: '800',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)'
                          }}
                        >
                          <ChevronLeft size={16} /> Volver a Detalle y Cotización
                        </button>

                        {/* Resumen del Trabajo */}
                        <div className="mercado-accepted-address-box">
                          <span className="mercado-address-label" style={{ color: '#ea580c' }}>
                            📋 {selectedJob.titulo}
                          </span>
                          <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                            📍 Zona: <strong>{selectedJob.zona}</strong>
                          </div>
                          {selectedJob.is_urgent && (
                            <span className="mercado-urgency-badge urgent" style={{ marginTop: '4px', alignSelf: 'flex-start' }}>
                              ⚡ Urgente
                            </span>
                          )}
                        </div>

                        {/* Mini resumen de la cotización con botón de cotizar */}
                        <div className="mercado-accepted-price-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>Mi Cotización:</span>
                            {selectedJob.myQuote && (
                              <span className={`mercado-job-badge ${selectedJob.myQuote.status === 'rejected' ? 'badge-rejected' : (selectedJob.myQuote.status === 'accepted' ? 'badge-accepted' : 'badge-pending')}`} style={{ fontSize: '10px' }}>
                                {getStatusLabel(selectedJob.myQuote.status)}
                              </span>
                            )}
                          </div>

                          {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? (
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                              ${parseFloat(selectedJob.myQuote.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              Sin cotización enviada
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setQuoteStep(2)}
                            style={{
                              padding: '8px 12px',
                              background: '#fff7ed',
                              color: '#ea580c',
                              border: '1px solid #fed7aa',
                              borderRadius: '8px',
                              fontWeight: '800',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <DollarSign size={14} />
                            <span>{selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Modificar Cotización' : 'Cotizar Trabajo'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Columna Derecha: CHAT INTEGRADO AMPLIO */}
                      <div className="mercado-embedded-chat-panel" style={{ flex: '1.25' }}>
                        <div className="mercado-chat-header">
                          <div className="mercado-chat-header-title">
                            <h3><MessageCircle size={18} color="#ea580c" /> Consultar con el Cliente</h3>
                          </div>
                          <div className="mercado-chat-online-badge">
                            <span className="mercado-chat-online-dot" /> En línea
                          </div>
                        </div>

                        {lastClientMsg && (
                          <div className="mercado-chat-alert-banner">
                            <div className="mercado-chat-alert-icon">🔔</div>
                            <div className="mercado-chat-alert-text">
                              <strong>El Cliente te envió un mensaje:</strong>
                              <span>"{lastClientMsg.message}"</span>
                            </div>
                          </div>
                        )}

                        {/* Stream de Mensajes */}
                        <div className="mercado-chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="mercado-chat-empty-state">
                              <div className="icon-wrap">
                                <MessageCircle size={26} />
                              </div>
                              <p>Inicia el chat con el cliente</p>
                              <span>Escribe aquí para aclarar detalles sobre el trabajo o coordinar tu cotización.</span>
                            </div>
                          ) : (
                            chatMessages.map((msg, idx) => {
                              const isMe = Number(msg.sender_id) === Number(authUser?.id) || msg.sender_role === 'Técnico de la Red' || msg.sender_role === 'Técnico';
                              return (
                                <div
                                  key={idx}
                                  className={`mercado-chat-bubble-row ${isMe ? 'sent' : 'received'}`}
                                >
                                  <span className="mercado-chat-bubble-sender">
                                    {isMe ? 'Tú (Técnico)' : (msg.sender_name || 'Cliente')}
                                  </span>
                                  <div className="mercado-chat-bubble">
                                    {msg.message}
                                  </div>
                                  <span className="mercado-chat-bubble-time">
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Input Bar integrado */}
                        <form onSubmit={handleSendEmbeddedChat} className="mercado-chat-input-bar">
                          <input
                            type="text"
                            placeholder="Escribe un mensaje al cliente..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={sendingChat}
                          />
                          <button
                            type="submit"
                            className="mercado-chat-send-btn"
                            disabled={sendingChat || !chatInput.trim()}
                          >
                            <Send size={15} />
                            <span>{sendingChat ? 'Enviando...' : 'Enviar'}</span>
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>

                <div className="mercado-premium-footer" style={{ justifyContent: 'space-between' }}>
                  <button className="mercado-btn-cancel" onClick={() => setShowQuoteModal(false)}>Cerrar Ventana</button>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedJob.is_accepted 
                      ? '✅ Coordina la hora de visita y confirma con el cliente por WhatsApp o chat.'
                      : '💬 Usa las pestañas para revisar los detalles o consultar en el chat.'}
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                PASO 2: FORMULARIO DE COTIZACIÓN (CON FOTOS Y DETALLE)
            ══════════════════════════════════════════════════ */}
            {quoteStep === 2 && (
              <>
                <div className="mercado-premium-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>
                      💰 {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Modificar Cotización' : 'Enviar Cotización de Trabajo'}
                    </h2>
                  </div>
                  <span className="mercado-modal-close" onClick={() => setShowQuoteModal(false)}>×</span>
                </div>

                <div className="mercado-premium-body">
                  {/* Columna Izquierda: Fotos de Evidencia y Detalle Completo del Problema */}
                  <div className="mercado-premium-details" style={{ flex: '1', gap: '14px' }}>
                    {activePhoto ? (
                      <div className="mercado-photo-gallery">
                        <div
                          className="mercado-premium-image-wrapper"
                          onClick={() => setIsPhotoZoomed(true)}
                          title="Clic para ampliar imagen"
                          style={{ height: '220px' }}
                        >
                          <img src={activePhoto} alt="Evidencia del problema" className="mercado-premium-image" />
                          <div className="mercado-image-zoom-badge">
                            <Maximize2 size={12} /> Clic para ampliar foto
                          </div>
                        </div>

                        {selectedJob.fotos && selectedJob.fotos.length > 1 && (
                          <div className="mercado-thumbnails-row">
                            {selectedJob.fotos.map((f, idx) => (
                              <div
                                key={idx}
                                className={`mercado-thumb-item ${activePhoto === f ? 'active' : ''}`}
                                onClick={() => setActivePhoto(f)}
                              >
                                <img src={f} alt={`Evidencia ${idx + 1}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mercado-no-photo-placeholder" style={{ height: '150px' }}>
                        <ImageIcon size={34} color="#94a3b8" />
                        <span>Sin fotografías de evidencia adjuntas</span>
                      </div>
                    )}

                    {/* Detalle del Problema Solicitado */}
                    <div className="mercado-problem-detail-box">
                      <div className="mercado-problem-detail-header">
                        <FileText size={17} color="#ea580c" />
                        <span>{selectedJob.titulo}</span>
                      </div>
                      <div className="mercado-problem-detail-desc">
                        {selectedJob.descripcion}
                      </div>
                      <div className="mercado-problem-detail-footer">
                        <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '3px', color: '#ea580c' }} /> Zona: {selectedJob.zona}</span>
                        <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {selectedJob.fecha}</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Formulario de Cotización */}
                  <div className="mercado-premium-form" style={{ flex: '1.1', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Propuesta de Servicio
                        </span>
                        {selectedJob.is_urgent && (
                          <span className="mercado-urgency-badge urgent">⚡ Urgente (Hoy Mismo)</span>
                        )}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        Ingresa tu Oferta Económica
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        Define el costo que cobrarás por solucionar este problema. El cliente revisará tu propuesta.
                      </p>
                    </div>

                    {/* Alerta si fue rechazada */}
                    {selectedJob.myQuote && selectedJob.myQuote.status === 'rejected' && (
                      <div className="mq-rejection-warning">
                        <span className="mq-rejection-icon">⚠️</span>
                        <div className="mq-rejection-text">
                          <strong>Tu última oferta (${selectedJob.myQuote.price}) fue rechazada</strong>
                          <p>Puedes mejorar tu precio o enviar un mensaje para llegar a un acuerdo con el cliente.</p>
                        </div>
                      </div>
                    )}

                    <div className="mercado-form-group" style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                        Propuesta Económica ($ MXN) *
                      </label>
                      <div className="mercado-input-wrapper">
                        <DollarSign size={18} className="mercado-input-icon" />
                        <input
                          type="number"
                          placeholder="Ej. 350"
                          className="mercado-premium-input"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          autoFocus
                          style={{ fontSize: '16px', fontWeight: '700' }}
                        />
                      </div>
                    </div>

                    <div className="mercado-form-group" style={{ marginTop: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'block' }}>
                        Mensaje para el cliente
                      </label>
                      <textarea
                        placeholder="Ej. Hola, cuento con las herramientas y refacciones necesarias. Puedo ir hoy mismo a revisarlo..."
                        className="mercado-premium-textarea"
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        rows={4}
                        style={{ flex: 1, minHeight: '100px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mercado-premium-footer">
                  <button className="mercado-btn-cancel" onClick={() => setQuoteStep(1)}>
                    ← Volver al Chat y Detalle
                  </button>
                  <button className="mercado-premium-submit" onClick={handleEnviarCotizacion}>
                    <Send size={16} />
                    {selectedJob.myQuote && selectedJob.myQuote.price > 0 ? 'Actualizar Oferta' : 'Enviar Cotización'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ─── Lightbox Fullscreen Zoom Modal ─── */}
      {isPhotoZoomed && activePhoto && (
        <div className="mercado-lightbox-overlay" onClick={() => setIsPhotoZoomed(false)}>
          <div className="mercado-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="mercado-lightbox-close" onClick={() => setIsPhotoZoomed(false)} title="Cerrar imagen">
              <X size={26} />
            </button>
            <img src={activePhoto} alt="Evidencia en tamaño completo" className="mercado-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MercadoTrabajos;
