import React, { useState, useEffect } from 'react';
import '../../styles/AgenteSolutions/Admin/VistaCotizaciones.css'; // Reusing styles

const AssignWorkModal = ({ cotizacion, onClose, onAssign }) => {
  const [tecnicos, setTecnicos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [tecnicoId, setTecnicoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Custom Checklist State (The 3 Tabs)
  const [activeTab, setActiveTab] = useState('herramientas');
  const [checklist, setChecklist] = useState({
    herramientas: [],
    equipo: [],
    material: []
  });
  const [newItem, setNewItem] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetchTecnicos();
    fetchTemplates();
  }, []);

  const fetchTecnicos = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTecnicos(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('agente_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/checklist-templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([]);
      }
    } catch (e) {
      console.error(e);
      setTemplates([]);
    }
  };

  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    if (tId === 'new' || tId === '') {
      setChecklist({ herramientas: [], equipo: [], material: [] });
    } else {
      const t = templates.find(temp => temp.id == tId);
      if (t && t.content) {
        setChecklist(t.content);
      }
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setChecklist(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { id: Date.now(), task: newItem, completed: false }]
    }));
    setNewItem('');
  };

  const handleRemoveItem = (tab, id) => {
    setChecklist(prev => ({
      ...prev,
      [tab]: prev[tab].filter(item => item.id !== id)
    }));
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return mostrarAviso("Por favor ingresa un nombre para la plantilla");
    setSavingTemplate(true);
    try {
      const token = localStorage.getItem('agente_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/checklist-templates`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newTemplateName, content: checklist })
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAviso("Plantilla guardada con éxito");
        setTemplates([...templates, data.template]);
        setSelectedTemplateId(data.template.id);
        setNewTemplateName('');
      } else {
        mostrarAviso("Error al guardar: " + data.message);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingTemplate(false);
  };

  const handleSubmit = async () => {
    if (!tecnicoId || !fechaInicio) {
      return mostrarAviso("Por favor selecciona un técnico y una fecha/hora.");
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('agente_token');
      // The API uses the service ID. The cotizacion should have a service_id or be linked.
      // Wait, let's assume cotizacion has service_id.
      const serviceId = cotizacion.service_id || cotizacion.id; // Fallback
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/servicios/${serviceId}/asignar-trabajo`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tecnico_id: tecnicoId,
          scheduled_start: fechaInicio,
          custom_checklist: checklist
        })
      });

      const data = await res.json();
      if (res.ok) {
        mostrarAviso("Trabajo asignado correctamente");
        onAssign();
      } else {
        mostrarAviso("Error: " + data.message);
      }
    } catch (e) {
      console.error(e);
      mostrarAviso("Error de red");
    }
    setLoading(false);
  };

  return (
    <div className="modal-fixed-overlay" onClick={onClose}>
      <div className="modal-box-card" style={{ maxWidth: '800px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header-dark" style={{ flexShrink: 0 }}>
            <span>ASIGNAR TRABAJO: {cotizacion.folio}</span>
            <button className="modal-close-icon" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body-content" style={{ overflowY: 'auto', flexGrow: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontWeight: 'bold' }}>Asignar Técnico:</label>
              <select className="cotiz-input-field" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} style={{ padding: '10px' }}>
                <option value="">-- Seleccionar Técnico --</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 'bold' }}>Fecha y Hora Programada:</label>
              <input type="datetime-local" className="cotiz-input-field" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ padding: '10px' }} />
            </div>
          </div>

          <div style={{ borderTop: '2px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Checklist Personalizado</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Cargar Plantilla:</label>
              <select className="cotiz-input-field" value={selectedTemplateId} onChange={handleTemplateChange} style={{ padding: '10px', marginBottom: '10px' }}>
                <option value="">-- Nueva Plantilla en Blanco --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              {['herramientas', 'equipo', 'material'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px',
                    background: activeTab === tab ? '#ff8800' : '#e0e0e0',
                    color: activeTab === tab ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {tab === 'equipo' ? 'Equipo de Trabajo' : tab}
                </button>
              ))}
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '0 8px 8px 8px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  className="cotiz-input-field" 
                  placeholder={`Agregar nuevo ítem a ${activeTab}...`} 
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                  style={{ padding: '10px' }}
                />
                <button onClick={handleAddItem} style={{ background: '#333', color: 'white', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer' }}>
                  + Agregar
                </button>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {checklist[activeTab].map(item => (
                  <li key={item.id} style={{ background: 'white', padding: '12px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px', marginBottom: '5px' }}>
                    <span>{item.task}</span>
                    <button onClick={() => handleRemoveItem(activeTab, item.id)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px' }}>X</button>
                  </li>
                ))}
                {checklist[activeTab].length === 0 && (
                  <li style={{ color: '#888', fontStyle: 'italic' }}>No hay ítems en esta categoría.</li>
                )}
              </ul>
            </div>

            {/* Guardar Plantilla */}
            {selectedTemplateId === '' && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center', background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                <input 
                  type="text" 
                  className="cotiz-input-field" 
                  placeholder="Nombre para guardar esta plantilla..." 
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  style={{ padding: '8px' }}
                />
                <button onClick={handleSaveTemplate} disabled={savingTemplate} style={{ background: '#ff8800', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {savingTemplate ? 'Guardando...' : '💾 Guardar Plantilla'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer-btns" style={{ flexShrink: 0 }}>
          <button className="btn-modal-close" onClick={onClose}>CANCELAR</button>
          <button className="btn-modal-print" onClick={handleSubmit} disabled={loading} style={{ background: '#2e7d32' }}>
            {loading ? 'ASIGNANDO...' : '✓ ASIGNAR TRABAJO'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkModal;

import { mostrarAviso } from '../../utils/dialogos';