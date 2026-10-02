import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Shared/Header';
import '../../../styles/AgenteMarket/Cliente/CalendarioCliente.css';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Phone,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ListFilter,
  PlusCircle,
  ExternalLink,
  MessageSquare,
  Building,
  Wrench,
  Search,
  X,
  Sparkles
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const CalendarioCliente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'confirmed' | 'proposed' | 'network' | 'progress'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [jobsData, setJobsData] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cargar trabajos y citas del cliente desde la API
  const fetchClientJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('agente_token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/mercado-trabajos?only_mine=1`, { headers });
      
      let rawOrders = [];
      if (res.data?.success && Array.isArray(res.data.data)) {
        rawOrders = res.data.data;
      }

      // Procesar y normalizar cada orden como un evento del calendario
      const parsedEvents = rawOrders.map(order => {
        const quotes = order.network_quotes || [];
        const acceptedQuote = quotes.find(q => q.status === 'accepted') || quotes[0] || null;

        // Determinar fecha clave para el calendario (scheduled_at > fecha_visita > due_date > created_at)
        let eventDateStr = order.scheduled_at || order.fecha_visita || order.due_date || order.created_at;
        let eventDate = new Date(eventDateStr);
        if (isNaN(eventDate.getTime())) {
          eventDate = new Date();
        }

        // Determinar hora formateada
        let timeFormatted = 'Por definir';
        if (order.scheduled_at) {
          try {
            timeFormatted = new Date(order.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          } catch {
            timeFormatted = '10:00 AM';
          }
        } else if (order.hora_visita) {
          timeFormatted = order.hora_visita;
        } else if (order.time_slot) {
          timeFormatted = order.time_slot;
        }

        // Determinar estado visual
        let statusType = 'network'; // default
        let statusLabel = 'En Red / Cotizando';

        if (order.status === 'Asignado' || acceptedQuote?.status === 'accepted' || order.status === 'En Progreso') {
          if (order.scheduled_at) {
            statusType = 'confirmed';
            statusLabel = 'Visita Confirmada';
          } else {
            statusType = 'progress';
            statusLabel = 'Técnico Asignado';
          }
        } else if (order.scheduled_at) {
          statusType = 'proposed';
          statusLabel = 'Horario Propuesto';
        } else if (order.type?.toLowerCase().includes('urgente') || order.type?.toLowerCase().includes('sos')) {
          statusType = 'urgent';
          statusLabel = 'Urgencia / SOS';
        }

        const techName = acceptedQuote?.technician?.first_name
          ? `${acceptedQuote.technician.first_name} ${acceptedQuote.technician.last_name || ''}`.trim()
          : (acceptedQuote?.technician?.name || order.technician?.name || 'Técnico de la Red');

        return {
          id: order.id,
          title: order.type ? `${order.type}${order.equipment ? ' - ' + order.equipment : ''}` : 'Servicio Solicitado',
          equipment: order.equipment || 'General',
          description: order.description || 'Sin descripción adicional',
          property: order.property?.name || order.colonia_cercana || order.zona || 'Mi Propiedad',
          address: order.property?.address || order.colonia_cercana || 'Mérida, Yucatán',
          date: eventDate,
          dateKey: eventDate.toISOString().slice(0, 10), // 'YYYY-MM-DD'
          time: timeFormatted,
          statusType,
          statusLabel,
          techName,
          techPhone: acceptedQuote?.technician?.phone || order.technician?.phone || 'No disponible',
          price: acceptedQuote?.price ? `$${acceptedQuote.price} MXN` : 'Por cotizar',
          rawOrder: order,
          evidencePhoto: order.evidence_path || order.property?.facade_photo_path || null
        };
      });

      // Si no tiene citas registradas aún, creamos un par de eventos demostrativos para que la experiencia sea visual e interactiva
      if (parsedEvents.length === 0) {
        const today = new Date();
        const demoDate1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 30);
        const demoDate2 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0);
        const demoDate3 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 11, 0);

        parsedEvents.push(
          {
            id: 'demo-1',
            title: 'Mantenimiento Preventivo Clima',
            equipment: 'Minisplit Inverter 18k BTU',
            description: 'Limpieza de serpentín, turbina y revisión de presiones de gas refrigerante.',
            property: 'Casa Principal (Montebello)',
            address: 'Calle 10 #120 x 23 y 25, Montebello',
            date: demoDate1,
            dateKey: demoDate1.toISOString().slice(0, 10),
            time: '10:30 AM',
            statusType: 'confirmed',
            statusLabel: 'Visita Confirmada',
            techName: 'Ing. Carlos Dzib (Técnico HVAC)',
            techPhone: '999-123-4567',
            price: '$650 MXN',
            evidencePhoto: null
          },
          {
            id: 'demo-2',
            title: 'Revisión Filtración de Agua',
            equipment: 'Tubería Principal Baño Máster',
            description: 'Detección de fuga en conexión de agua caliente.',
            property: 'Depto Altabrisa',
            address: 'Av. República de Corea #200, Altabrisa',
            date: demoDate2,
            dateKey: demoDate2.toISOString().slice(0, 10),
            time: '04:00 PM',
            statusType: 'proposed',
            statusLabel: 'Propuesta de Visita',
            techName: 'Plomería Rodríguez',
            techPhone: '999-987-6543',
            price: '$450 MXN',
            evidencePhoto: null
          },
          {
            id: 'demo-3',
            title: 'Instalación de Lámparas Led',
            equipment: 'Iluminación Terraza',
            description: 'Colocación de 4 arbotantes exteriores de alta eficiencia.',
            property: 'Casa Principal (Montebello)',
            address: 'Calle 10 #120 x 23 y 25, Montebello',
            date: demoDate3,
            dateKey: demoDate3.toISOString().slice(0, 10),
            time: '11:00 AM',
            statusType: 'network',
            statusLabel: 'En Red / Cotizando',
            techName: 'Por asignar',
            techPhone: 'Pendiente',
            price: '$350 MXN',
            evidencePhoto: null
          }
        );
      }

      setJobsData(parsedEvents);
    } catch (err) {
      console.error('Error fetching client calendar jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientJobs();
  }, []);

  // Filtrado de eventos por búsqueda y categoría
  const filteredEvents = useMemo(() => {
    return jobsData.filter(event => {
      const matchFilter = selectedFilter === 'all' || event.statusType === selectedFilter;
      const matchSearch = searchQuery.trim() === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.techName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.equipment.toLowerCase().includes(searchQuery.toLowerCase());

      return matchFilter && matchSearch;
    });
  }, [jobsData, selectedFilter, searchQuery]);

  // Navegación de Fechas
  const handlePrev = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (currentView === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 7);
      setCurrentDate(newD);
    } else {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 1);
      setCurrentDate(newD);
    }
  };

  const handleNext = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (currentView === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 7);
      setCurrentDate(newD);
    } else {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 1);
      setCurrentDate(newD);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generación de celdas del Mes
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: Dom, 1: Lun...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = new Date().toISOString().slice(0, 10);
    const cells = [];

    // Días del mes anterior para completar la primera semana
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = prevDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: dayNum,
        date: prevDate,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    // Días del mes actual
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const thisDate = new Date(year, month, dayNum);
      const dateKey = thisDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: dayNum,
        date: thisDate,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    // Días del siguiente mes para completar las 35 o 42 celdas del grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateKey = nextDate.toISOString().slice(0, 10);
      cells.push({
        dayNumber: i,
        date: nextDate,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayStr,
        events: filteredEvents.filter(e => e.dateKey === dateKey)
      });
    }

    return cells;
  }, [currentDate, filteredEvents]);

  // Agrupar eventos para la vista de Agenda
  const agendaGroupedEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.date - b.date);
    const groups = {};
    sorted.forEach(ev => {
      if (!groups[ev.dateKey]) {
        groups[ev.dateKey] = {
          dateStr: ev.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          items: []
        };
      }
      groups[ev.dateKey].items.push(ev);
    });
    return Object.values(groups);
  }, [filteredEvents]);

  const handleOpenEventModal = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  return (
    <div className="calendario-page-container">
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="CLIENTE PARTICULAR" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />

      <main className="calendario-main-wrapper">
        {/* ── BANNER HERO SUPERIOR ── */}
        <div className="cal-hero-header">
          <div className="cal-hero-title-group">
            <h2>
              <CalendarIcon size={28} color="#FF6600" />
              <span>Agenda y Calendario de <span className="hero-accent">Servicios</span></span>
            </h2>
            <p className="cal-hero-subtitle">
              Visualiza en tiempo real las fechas de visita coordinadas con tus técnicos, cotizaciones y trabajos activos.
            </p>
          </div>

          <div className="cal-hero-actions">
            <button 
              className="btn-nueva-solicitud"
              onClick={() => navigate('/red-autonomos')}
            >
              <PlusCircle size={18} />
              Publicar Nuevo Servicio
            </button>
            <button 
              className="btn-ver-red"
              onClick={() => navigate('/red-autonomos')}
            >
              <ExternalLink size={17} />
              Ver Mercado / Red
            </button>
          </div>
        </div>

        {/* ── TOOLBAR PRINCIPAL (Estilo Telerik KendoReact) ── */}
        <div className="scheduler-toolbar-card">
          {/* Navegación y Fecha */}
          <div className="cal-nav-group">
            <button className="btn-cal-today" onClick={handleToday}>
              Hoy
            </button>

            <div className="cal-arrows">
              <button className="btn-cal-arrow" onClick={handlePrev} title="Anterior">
                <ChevronLeft size={20} />
              </button>
              <button className="btn-cal-arrow" onClick={handleNext} title="Siguiente">
                <ChevronRight size={20} />
              </button>
            </div>

            <h3 className="cal-current-date-title">
              <CalendarDays size={22} color="#FF6600" />
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
          </div>

          {/* Controles Derecha: Buscador & Switcher de Vistas */}
          <div className="cal-controls-right">
            <div className="cal-search-box">
              <Search size={16} className="cal-search-icon" />
              <input 
                type="text"
                placeholder="Buscar servicio o técnico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: '8px', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="cal-view-selector">
              <button 
                className={`btn-view-tab ${currentView === 'month' ? 'active' : ''}`}
                onClick={() => setCurrentView('month')}
              >
                Mes
              </button>
              <button 
                className={`btn-view-tab ${currentView === 'agenda' ? 'active' : ''}`}
                onClick={() => setCurrentView('agenda')}
              >
                Agenda
              </button>
            </div>
          </div>
        </div>

        {/* ── BARRA DE LEYENDAS Y FILTROS RÁPIDOS ── */}
        <div className="scheduler-legend-bar">
          <span style={{ color: '#0f172a', fontWeight: 800 }}>Filtrar:</span>
          <button 
            className={`legend-item ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Todos ({jobsData.length})
          </button>
          <button 
            className={`legend-item ${selectedFilter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setSelectedFilter(selectedFilter === 'confirmed' ? 'all' : 'confirmed')}
          >
            <span className="legend-dot dot-confirmed"></span>
            <span>Visitas Confirmadas</span>
          </button>
          <button 
            className={`legend-item ${selectedFilter === 'proposed' ? 'active' : ''}`}
            onClick={() => setSelectedFilter(selectedFilter === 'proposed' ? 'all' : 'proposed')}
          >
            <span className="legend-dot dot-proposed"></span>
            <span>Horarios Propuestos</span>
          </button>
          <button 
            className={`legend-item ${selectedFilter === 'network' ? 'active' : ''}`}
            onClick={() => setSelectedFilter(selectedFilter === 'network' ? 'all' : 'network')}
          >
            <span className="legend-dot dot-network"></span>
            <span>En Red / Cotizando</span>
          </button>
        </div>

        {/* ── CONTENIDO PRINCIPAL: GRID DEL CALENDARIO ── */}
        <div className="scheduler-canvas-card">
          {loading ? (
            <div className="cal-loading-container">
              <div className="cal-spinner"></div>
              <p style={{ fontWeight: 700 }}>Cargando tu calendario...</p>
            </div>
          ) : currentView === 'month' ? (
            <div className="cal-month-grid">
              {/* Encabezados de Días (Domingo a Sábado) */}
              <div className="cal-month-header-row">
                {DAY_NAMES.map((name, index) => (
                  <div key={index} className="cal-header-cell">
                    {name}
                  </div>
                ))}
              </div>

              {/* Días del Mes */}
              <div className="cal-month-days-grid">
                {monthMatrix.map((cell, idx) => (
                  <div 
                    key={idx} 
                    className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
                  >
                    <div className="cal-day-header">
                      <span className="cal-day-number">{cell.dayNumber}</span>
                      {cell.events.length > 0 && (
                        <span className="cal-day-count-badge">
                          {cell.events.length} {cell.events.length === 1 ? 'servicio' : 'servicios'}
                        </span>
                      )}
                    </div>

                    {/* Lista de Chips / Trabajos del Día */}
                    <div className="cal-events-list">
                      {cell.events.map((event) => (
                        <div 
                          key={event.id}
                          className={`cal-event-chip status-${event.statusType}`}
                          onClick={() => handleOpenEventModal(event)}
                          title={`${event.title} - ${event.time} (${event.statusLabel})`}
                        >
                          <div className="chip-time-row">
                            <span className="chip-time-tag">
                              <Clock size={11} /> {event.time}
                            </span>
                          </div>
                          <span className="chip-title">{event.title}</span>
                          <span className="chip-tech">
                            <User size={10} /> {event.techName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── VISTA DE AGENDA CRONOLÓGICA ── */
            <div className="cal-agenda-view">
              {agendaGroupedEvents.length === 0 ? (
                <div className="cal-empty-state">
                  <CalendarDays size={48} color="#cbd5e1" />
                  <h4>No hay servicios en esta fecha</h4>
                  <p>Publica un nuevo trabajo en la red para coordinar citas con los técnicos calificados.</p>
                </div>
              ) : (
                agendaGroupedEvents.map((group, gIdx) => (
                  <div key={gIdx} className="agenda-day-group">
                    <div className="agenda-date-header">
                      <CalendarDays size={20} color="#FF6600" />
                      {group.dateStr}
                    </div>

                    <div className="agenda-cards-grid">
                      {group.items.map((event) => (
                        <div 
                          key={event.id}
                          className={`agenda-item-card status-${event.statusType}`}
                          onClick={() => handleOpenEventModal(event)}
                        >
                          <div className="agenda-card-top">
                            <h4 className="agenda-card-title">{event.title}</h4>
                            <span className={`agenda-status-pill pill-${event.statusType}`}>
                              {event.statusLabel}
                            </span>
                          </div>

                          <div className="agenda-card-info">
                            <div className="agenda-info-row">
                              <Clock size={14} color="#ff6600" />
                              <strong>Horario:</strong> {event.time}
                            </div>
                            <div className="agenda-info-row">
                              <Building size={14} color="#64748b" />
                              <span>{event.property}</span>
                            </div>
                            <div className="agenda-info-row">
                              <User size={14} color="#64748b" />
                              <span>{event.techName}</span>
                            </div>
                            <div className="agenda-info-row">
                              <DollarSign size={14} color="#10b981" />
                              <span style={{ color: '#059669', fontWeight: 700 }}>{event.price}</span>
                            </div>
                          </div>

                          <div className="agenda-card-actions">
                            <button 
                              className="btn-modal-action primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEventModal(event);
                              }}
                            >
                              Ver Detalle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL DETALLE DE EVENTO / TRABAJO ── */}
      {modalOpen && selectedEvent && (
        <div className="cal-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="cal-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h3>
                <Wrench size={22} color="#FF6600" />
                Detalle del Servicio y Visita
              </h3>
              <button className="btn-close-modal" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="cal-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <span className={`agenda-status-pill pill-${selectedEvent.statusType}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  {selectedEvent.statusLabel}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                  ID Trabajo: #{selectedEvent.id}
                </span>
              </div>

              <div className="modal-section-card">
                <h4><Wrench size={16} /> {selectedEvent.title}</h4>
                <p style={{ margin: 0, color: '#334155', fontSize: '0.92rem' }}>
                  {selectedEvent.description}
                </p>
              </div>

              <div className="modal-info-grid">
                <div className="modal-section-card">
                  <h4><Clock size={16} /> Horario y Fecha</h4>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                    {selectedEvent.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <span style={{ color: '#ff6600', fontWeight: 800, fontSize: '0.95rem' }}>
                    ⏰ {selectedEvent.time}
                  </span>
                </div>

                <div className="modal-section-card">
                  <h4><MapPin size={16} /> Ubicación</h4>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                    {selectedEvent.property}
                  </p>
                  <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                    {selectedEvent.address}
                  </span>
                </div>
              </div>

              <div className="modal-section-card">
                <h4><User size={16} /> Técnico Asignado / Contacto</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{selectedEvent.techName}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>📞 {selectedEvent.techPhone}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Presupuesto:</span>
                    <strong style={{ color: '#059669', fontSize: '1.1rem' }}>{selectedEvent.price}</strong>
                  </div>
                </div>
              </div>

              {selectedEvent.evidencePhoto && (
                <div className="modal-section-card">
                  <h4>📸 Evidencia de la Solicitud</h4>
                  <img 
                    src={selectedEvent.evidencePhoto} 
                    alt="Evidencia" 
                    style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', marginTop: '4px' }} 
                  />
                </div>
              )}
            </div>

            <div className="cal-modal-footer">
              <button 
                className="btn-modal-action secondary"
                onClick={() => setModalOpen(false)}
              >
                Cerrar
              </button>
              <button 
                className="btn-modal-action primary"
                onClick={() => {
                  setModalOpen(false);
                  navigate('/red-autonomos');
                }}
              >
                <MessageSquare size={16} />
                Ir a Chat / Ver en Red
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioCliente;
