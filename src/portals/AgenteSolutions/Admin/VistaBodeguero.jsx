import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, ClipboardList, AlertTriangle,
  Search, LayoutDashboard, History,
  RotateCcw, X
} from 'lucide-react';
import '../../../styles/AgenteSolutions/Admin/VistaBodeguero.css';
import { mostrarAviso } from '../../../utils/dialogos';

const VistaBodeguero = () => {
  const [view, setView] = useState('SOLICITUDES');
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [filtro, setFiltro] = useState('');

  // INVENTARIO (se mantiene estático por ahora, puedes migrarlo a API después)
  const [inventario, setInventario] = useState([
    { id: 101, nombre: 'Foco LED 12W', stock: 45, min: 10, unidad: 'pzas', categoria: 'Iluminación' },
    { id: 102, nombre: 'Cable Calibre 12', stock: 5, min: 15, unidad: 'rollos', categoria: 'Eléctrico' },
    { id: 103, nombre: 'Cinta de aislar Negra', stock: 120, min: 20, unidad: 'pzas', categoria: 'Consumibles' },
    { id: 104, nombre: 'Escalera 3m', stock: 2, min: 1, unidad: 'uds', categoria: 'Herramientas' },
    { id: 105, nombre: 'Taladro Inalámbrico', stock: 3, min: 1, unidad: 'uds', categoria: 'Herramientas' }
  ]);

  // SOLICITUDES (ahora vienen de la API)
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);

  // DEVOLUCIONES (seguirá funcionando localmente)
  const [devoluciones, setDevoluciones] = useState([
    {
      idSolicitud: 'PREV-101',
      tecnico: 'Juan Pérez',
      equipo: 'Martillo Pro',
      fechaPrestamo: '27-03-2026',
      horaPrestamo: '08:30 AM',
      retornado: false,
      fechaRetorno: null,
      horaRetorno: null
    }
  ]);

  // HISTORIAL (se llena al entregar)
  const [historial, setHistorial] = useState([]);

  // NUEVO MATERIAL
  const [nuevoMaterial, setNuevoMaterial] = useState({
    nombre: '',
    categoria: '',
    stock: '',
    unidad: 'pzas'
  });

  // ============== OBTENER SOLICITUDES PENDIENTES ==============
  useEffect(() => {
    obtenerSolicitudes();
    const interval = setInterval(obtenerSolicitudes, 30000); // refresco cada 30s
    return () => clearInterval(interval);
  }, []);

  const obtenerSolicitudes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/despacho`, {
        params: { estado: 'pendiente' }
      });
      // Parsear los JSON si vienen como string
      const data = res.data.map(s => ({
        ...s,
        materiales: typeof s.materiales === 'string' ? JSON.parse(s.materiales) : s.materiales,
        equipo: typeof s.equipo === 'string' ? JSON.parse(s.equipo) : s.equipo
      }));
      setSolicitudes(data);
    } catch (error) {
      console.error('Error al cargar despachos:', error);
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  // ============== MODIFICAR STOCK (inventario local) ==============
  const modificarStock = (id, cantidad) => {
    setInventario(prev =>
      prev.map(item =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + Number(cantidad)) } : item
      )
    );
  };

  // ============== CHECK DE MATERIALES / EQUIPO ==============
  const handleCheck = (solicitudId, index, tipo) => {
    setSolicitudes(prev =>
      prev.map(s => {
        if (s.id === solicitudId) {
          const nuevaLista = [...s[tipo]];
          nuevaLista[index] = { ...nuevaLista[index], ok: !nuevaLista[index].ok };
          return { ...s, [tipo]: nuevaLista };
        }
        return s;
      })
    );
  };

  // ============== FINALIZAR Y ARCHIVAR (ENTREGA) ==============
  const finalizarYArchivar = async (solicitud) => {
    try {
      // Llamar al backend para marcar como entregado
      await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/despacho/${solicitud.id}/entregar`);

      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fechaStr = ahora.toLocaleDateString();

      // Si tiene equipo, lo pasamos a la lista de devoluciones
      if (solicitud.equipo && solicitud.equipo.length > 0) {
        const nuevosRetornos = solicitud.equipo.map(e => ({
          idSolicitud: solicitud.cotizacion_id ? `COT-${solicitud.cotizacion_id}` : solicitud.id,
          tecnico: solicitud.tecnico,
          equipo: e.nombre,
          fechaPrestamo: fechaStr,
          horaPrestamo: horaStr,
          retornado: false,
          fechaRetorno: null,
          horaRetorno: null
        }));
        setDevoluciones(prev => [...nuevosRetornos, ...prev]);
      }

      // Archivar en historial local
      setHistorial(prev => [{ ...solicitud, fechaFin: `${fechaStr} ${horaStr}` }, ...prev]);

      // Quitar de solicitudes
      setSolicitudes(prev => prev.filter(s => s.id !== solicitud.id));
    } catch (error) {
      console.error('Error al finalizar despacho:', error);
      mostrarAviso('Error al marcar como entregado');
    }
  };

  // ============== RECIBIR EQUIPO EN RETORNOS ==============
  const recibirEquipo = (idx) => {
    const ahora = new Date();
    const item = devoluciones[idx];

    setDevoluciones(prev =>
      prev.map((d, i) =>
        i === idx
          ? {
              ...d,
              retornado: true,
              fechaRetorno: ahora.toLocaleDateString(),
              horaRetorno: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          : d
      )
    );

    const invItem = inventario.find(i => i.nombre === item.equipo);
    if (invItem) modificarStock(invItem.id, 1);
  };

  // ============== GUARDAR NUEVO MATERIAL ==============
  const handleGuardarMaterial = (e) => {
    e.preventDefault();
    setInventario([
      ...inventario,
      {
        ...nuevoMaterial,
        id: Date.now(),
        stock: Number(nuevoMaterial.stock),
        min: 5
      }
    ]);
    setShowModalNuevo(false);
    setNuevoMaterial({ nombre: '', categoria: '', stock: '', unidad: 'pzas' });
  };

  return (
    <div className="vb-container">
      {/* HEADER */}
      <header className="vb-header">
        <div className="vb-brand">
          <LayoutDashboard size={28} color="#FF6B00" />
          <div>
            <h1>PANEL DE BODEGA</h1>
            <p>Agente Solutions | Control de Activos</p>
          </div>
        </div>
        <div className="vb-stats">
          <AlertTriangle size={20} color="#FF6B00" />
          <span>
            Stock Crítico: <strong>{inventario.filter(i => i.stock <= i.min).length}</strong>
          </span>
        </div>
      </header>

      {/* NAV */}
      <nav className="vb-nav">
        <button className={view === 'SOLICITUDES' ? 'active' : ''} onClick={() => setView('SOLICITUDES')}>
          <Truck size={18} /> DESPACHO ({solicitudes.length})
        </button>
        <button className={view === 'STOCK' ? 'active' : ''} onClick={() => setView('STOCK')}>
          <ClipboardList size={18} /> INVENTARIO
        </button>
        <button className={view === 'RETORNOS' ? 'active' : ''} onClick={() => setView('RETORNOS')}>
          <RotateCcw size={18} /> RETORNOS ({devoluciones.filter(d => !d.retornado).length})
        </button>
        <button className={view === 'HISTORIAL' ? 'active' : ''} onClick={() => setView('HISTORIAL')}>
          <History size={18} /> ENTREGADOS
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="vb-main">
        <AnimatePresence mode="wait">
          {/* SOLICITUDES */}
          {view === 'SOLICITUDES' && (
            <motion.div
              key="despacho"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="vb-grid"
            >
              {cargandoSolicitudes ? (
                <p style={{ padding: '2rem', color: '#666' }}>Cargando solicitudes...</p>
              ) : solicitudes.length === 0 ? (
                <p style={{ padding: '2rem', color: '#666' }}>No hay solicitudes pendientes.</p>
              ) : (
                solicitudes.map(s => {
                  const todoListo = [...(s.materiales || []), ...(s.equipo || [])].every(m => m.ok);
                  return (
                    <div key={s.id} className="ruta-card">
                      <div className="card-top">
                        <span className="badge-status COTIZACION_ACEPTADA">COTIZACION ACEPTADA</span>
                      </div>
                      <h3>{s.tecnico}</h3>
                      <p className="card-sub">
                        ID: {s.cotizacion_id ? `COT-${s.cotizacion_id}` : s.id} | {s.fecha_entrega}
                      </p>
                      <div className="card-body-container">
                        {/* MATERIALES */}
                        <div className="list-section">
                          <h4>
                            <Package size={12} /> MATERIALES
                          </h4>
                          {(s.materiales || []).map((m, idx) => (
                            <label key={idx} className="item-row">
                              <input
                                type="checkbox"
                                checked={m.ok}
                                onChange={() => handleCheck(s.id, idx, 'materiales')}
                              />
                              <span>
                                {m.nombre} ({m.cant})
                              </span>
                            </label>
                          ))}
                        </div>
                        {/* EQUIPO */}
                        <div className="list-section">
                          <h4>
                            <Truck size={12} /> EQUIPO
                          </h4>
                          {(s.equipo || []).map((e, idx) => (
                            <label key={idx} className="item-row">
                              <input
                                type="checkbox"
                                checked={e.ok}
                                onChange={() => handleCheck(s.id, idx, 'equipo')}
                              />
                              <span>{e.nombre}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        className="btn-action-main"
                        disabled={!todoListo}
                        onClick={() => finalizarYArchivar(s)}
                      >
                        {todoListo ? 'Marcar Entregado' : 'Faltan Artículos'}
                      </button>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* STOCK (INVENTARIO) */}
          {view === 'STOCK' && (
            <motion.div
              key="stock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="stock-container"
            >
              <div className="inventory-controls">
                <div className="search-box">
                  <Search size={20} color="#A0AEC0" />
                  <input
                    type="text"
                    placeholder="Buscar material..."
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                  />
                </div>
                <button className="btn-orange-new" onClick={() => setShowModalNuevo(true)}>
                  + Nuevo Material
                </button>
              </div>
              <div className="inventory-card">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>MATERIAL</th>
                      <th>STOCK</th>
                      <th>ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario
                      .filter(i => i.nombre.toLowerCase().includes(filtro.toLowerCase()))
                      .map(item => (
                        <tr key={item.id}>
                          <td>
                            <span className="p-name">{item.nombre}</span>
                            <span className="p-cat">{item.categoria}</span>
                          </td>
                          <td className="p-stock">
                            {item.stock} {item.unidad}
                          </td>
                          <td>
                            <div className="qty-btns">
                              <button className="q-plus" onClick={() => modificarStock(item.id, 1)}>+</button>
                              <button className="q-minus" onClick={() => modificarStock(item.id, -1)}>-</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* RETORNOS */}
          {view === 'RETORNOS' && (
            <motion.div
              key="retornos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="stock-container"
            >
              <div className="inventory-card">
                <h2>Control de Préstamos</h2>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>TÉCNICO</th>
                      <th>EQUIPO</th>
                      <th>SALIDA</th>
                      <th>RETORNO</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devoluciones.map((d, i) => (
                      <tr key={i}>
                        <td>
                          <span className="p-name">{d.tecnico}</span>
                          <small>Ticket: {d.idSolicitud}</small>
                        </td>
                        <td className="p-name">{d.equipo}</td>
                        <td>
                          <div className="time-info">
                            <span>{d.fechaPrestamo}</span>
                            <small>{d.horaPrestamo}</small>
                          </div>
                        </td>
                        <td>
                          {d.retornado ? (
                            <div className="time-info success">
                              <span>{d.fechaRetorno}</span>
                              <small>{d.horaRetorno}</small>
                            </div>
                          ) : (
                            '---'
                          )}
                        </td>
                        <td>
                          {!d.retornado ? (
                            <button className="btn-confirm-return" onClick={() => recibirEquipo(i)}>
                              Dar Recibido
                            </button>
                          ) : (
                            <span className="badge-finalizado">En Bodega</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* HISTORIAL */}
          {view === 'HISTORIAL' && (
            <motion.div
              key="historial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="stock-container"
            >
              <div className="inventory-card">
                <h2>Historial de Entregas Realizadas</h2>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>TÉCNICO</th>
                      <th>ID TICKET</th>
                      <th>FINALIZADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h, i) => (
                      <tr key={i}>
                        <td>{h.tecnico}</td>
                        <td>{h.cotizacion_id ? `COT-${h.cotizacion_id}` : h.id}</td>
                        <td>{h.fechaFin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL NUEVO MATERIAL */}
      <AnimatePresence>
        {showModalNuevo && (
          <div className="modal-overlay" onClick={() => setShowModalNuevo(false)}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Registrar Material</h2>
                <X className="close-icon" onClick={() => setShowModalNuevo(false)} />
              </div>
              <form onSubmit={handleGuardarMaterial} className="modal-form">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    required
                    value={nuevoMaterial.nombre}
                    onChange={e => setNuevoMaterial({ ...nuevoMaterial, nombre: e.target.value })}
                  />
                </div>
                <div className="form-row-inputs">
                  <div className="form-group">
                    <label>Categoría</label>
                    <input
                      type="text"
                      required
                      value={nuevoMaterial.categoria}
                      onChange={e => setNuevoMaterial({ ...nuevoMaterial, categoria: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Inicial</label>
                    <input
                      type="number"
                      required
                      value={nuevoMaterial.stock}
                      onChange={e => setNuevoMaterial({ ...nuevoMaterial, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-modal-close">
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VistaBodeguero;
