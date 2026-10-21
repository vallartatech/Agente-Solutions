import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Plus, Trash2, CheckCircle, Wrench, Package, Settings, Calendar } from 'lucide-react';
import { mostrarAviso } from '../../utils/dialogos';

const ModalAsignarChecklist = ({ workOrder, onClose, onAssign }) => {
  const [tecnicos, setTecnicos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom Checklist State (The 3 Tabs)
  const [activeTab, setActiveTab] = useState('herramientas');
  const [checklist, setChecklist] = useState({
    herramientas: [],
    equipo: [],
    material: []
  });
  const [newItem, setNewItem] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetchTecnicos();
    fetchTemplates();
    
    // Si la orden ya tiene un checklist, cargarlo
    if (workOrder.custom_checklist) {
      setChecklist(workOrder.custom_checklist);
    }
  }, [workOrder]);

  const fetchTecnicos = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/usuarios/tecnicos`);
      setTecnicos(response.data);
    } catch (error) {
      console.error("Error cargando técnicos:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/checklist-templates`);
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setTemplates([]);
    }
  };

  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    if (tId === '') {
      setChecklist({ herramientas: [], equipo: [], material: [] });
    } else {
      const t = templates.find(temp => temp.id == tId);
      if (t && t.content) {
        const content = typeof t.content === 'string' ? JSON.parse(t.content) : t.content;
        setChecklist(content);
      }
    }
  };

  const toggleTecnico = (id) => {
    setTecnicosIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
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
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/checklist-templates`, {
        name: newTemplateName,
        content: checklist
      });
      mostrarAviso("Plantilla guardada con éxito");
      setTemplates([...templates, res.data.template]);
      setSelectedTemplateId(res.data.template.id);
      setNewTemplateName('');
    } catch (e) {
      console.error(e);
      mostrarAviso("Error al guardar plantilla");
    }
    setSavingTemplate(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/work-orders/${workOrder.dbId}/assign`, {
        custom_checklist: checklist
      });
      mostrarAviso("Checklist asignado correctamente");
      onAssign();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.response?.data?.message || "Error al asignar el checklist";
      mostrarAviso(msg);
    }
    setLoading(false);
  };

  return (
    <div className="checklist-modal-overlay" onClick={onClose}>
      <div className="checklist-modal-card" onClick={e => e.stopPropagation()}>
        <div className="checklist-modal-header">
          <div className="header-title-main">
            <CheckCircle size={24} color="#F26522" />
            <div>
              <h3>Checklist Personalizado</h3>
              <p>ORDEN: WKF-ORD-{workOrder.dbId}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="checklist-modal-body">
          {/* Selección de Plantilla */}
          <div className="assignment-section-top">
            <div className="form-group-cl full-width template-selector-box">
              <label><Package size={14}/> CARGAR PLANTILLA</label>
              <select value={selectedTemplateId} onChange={handleTemplateChange}>
                <option value="">-- Nueva Plantilla en Blanco --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs del Checklist */}
          <div className="cl-tabs-header">
            <button 
              className={`cl-tab-btn ${activeTab === 'herramientas' ? 'active' : ''}`}
              onClick={() => setActiveTab('herramientas')}
            >
              <Settings size={16} /> <span className="tab-text">HERRAMIENTAS</span>
            </button>
            <button 
              className={`cl-tab-btn ${activeTab === 'equipo' ? 'active' : ''}`}
              onClick={() => setActiveTab('equipo')}
            >
              <Wrench size={16} /> <span className="tab-text">EQUIPO</span>
            </button>
            <button 
              className={`cl-tab-btn ${activeTab === 'material' ? 'active' : ''}`}
              onClick={() => setActiveTab('material')}
            >
              <Package size={16} /> <span className="tab-text">MATERIAL</span>
            </button>
          </div>

          <div className="cl-tab-content">
            <div className="add-item-row">
              <input 
                type="text" 
                placeholder={`Agregar a ${activeTab}...`} 
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              <button onClick={handleAddItem} className="btn-add-item">
                <Plus size={18} /> AGREGAR
              </button>
            </div>

            <div className="items-list-container">
              {checklist[activeTab].map(item => (
                <div key={item.id} className="cl-item-editable">
                  <span>{item.task}</span>
                  <button onClick={() => handleRemoveItem(activeTab, item.id)} className="btn-remove-item">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {checklist[activeTab].length === 0 && (
                <div className="empty-checklist-msg">No hay ítems en esta categoría.</div>
              )}
            </div>
          </div>

          {/* Guardar Plantilla */}
          <div className="save-template-footer">
            <input 
              type="text" 
              placeholder="Nombre de plantilla..." 
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
            />
            <button onClick={handleSaveTemplate} disabled={savingTemplate || checklist[activeTab].length === 0} className="btn-save-template">
              <Save size={18} /> <span className="btn-text">{savingTemplate ? 'Guardando...' : 'GUARDAR PLANTILLA'}</span>
            </button>
          </div>
        </div>

        <div className="checklist-modal-footer">
          <button className="btn-secondary" onClick={onClose}>CANCELAR</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'GUARDANDO...' : (workOrder.custom_checklist ? '✓ ACTUALIZAR' : '✓ ASIGNAR')}
          </button>
        </div>
      </div>

      <style>{`
        .checklist-modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 20000;
          display: flex; align-items: center; justify-content: center;
          padding: 10px;
        }
        .checklist-modal-card {
          width: 95%; max-width: 650px;
          max-height: 90vh;
          background: white; border-radius: 16px;
          display: flex; flex-direction: column;
          overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          animation: modalAppear 0.3s ease-out;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .checklist-modal-header {
          padding: 12px 20px; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center;
          background: #fff;
        }
        .header-title-main { display: flex; align-items: center; gap: 12px; }
        .header-title-main h3 { margin: 0; font-weight: 800; color: #333; text-transform: uppercase; font-size: 1rem; }
        .header-title-main p { margin: 0; color: #999; font-size: 0.7rem; }
        
        .close-btn { background: #f8f8f8; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; }

        .checklist-modal-body { padding: 15px 20px; flex: 1; overflow-y: auto; background: white; }
        
        .assignment-section-top { display: flex; flex-direction: column; gap: 12px; margin-bottom: 15px; }
        .form-group-cl label { font-size: 0.65rem; font-weight: 800; color: #888; display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
        .form-group-cl select { 
          padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 10px; 
          outline: none; font-weight: 600; color: #444; background: #fff; width: 100%; font-size: 0.85rem;
        }

        .tecnicos-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); 
          gap: 8px; 
          max-height: 140px; 
          overflow-y: auto; 
          padding: 8px;
          background: #fcfcfc;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
        }
        .tecnico-card-select {
          background: white; border: 1px solid #eee; border-radius: 10px; padding: 6px; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; transition: all 0.2s;
        }
        .tecnico-card-select.selected { border-color: #F26522; background: #fff9f5; }
        
        .tecnico-card-select img, .tech-avatar-fallback { 
          width: 38px; height: 38px; border-radius: 50%; object-fit: cover; 
          border: 1px solid #eee;
        }
        .tech-avatar-fallback {
          background: #f5f5f5; color: #999; font-size: 0.8rem;
        }
        .tech-name { font-size: 0.65rem; font-weight: 700; color: #666; }
        
        .template-selector-box { background: #f9f9f9; padding: 10px; border-radius: 10px; border: 1px solid #eee; }

        .cl-tabs-header { display: flex; gap: 5px; margin-bottom: 0; border-bottom: 1px solid #eee; }
        .cl-tab-btn {
          padding: 8px 12px; border: none; background: transparent;
          font-weight: 700; font-size: 0.7rem; color: #aaa;
          display: flex; align-items: center; gap: 5px; cursor: pointer;
          position: relative;
        }
        .cl-tab-btn.active { color: #333; }
        .cl-tab-btn.active::after {
          content: ""; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #333;
        }

        .cl-tab-content { background: #fff; padding: 12px; border-radius: 0 0 12px 12px; margin-bottom: 12px; border: 1px solid #eee; border-top: none; }
        .add-item-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .add-item-row input { 
          flex: 1; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 8px; 
          outline: none; font-size: 0.85rem; color: #333; background: #fcfcfc;
        }
        .add-item-row input::placeholder { color: #666; opacity: 1; }
        .btn-add-item { background: #dcdcdc; color: #000; border: 1px solid #ccc; padding: 0 12px; border-radius: 8px; font-weight: bold; font-size: 0.75rem; cursor: pointer; }

        .items-list-container { display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; }
        .cl-item-editable {
          background: #fdfdfd; padding: 6px 10px; border-radius: 6px;
          display: flex; justify-content: space-between; align-items: center;
          border: 1px solid #f0f0f0;
        }
        .cl-item-editable span { font-weight: 600; color: #555; font-size: 0.8rem; }
        .btn-remove-item { background: #fff1f1; color: #ff5c5c; border: none; width: 24px; height: 24px; border-radius: 6px; cursor: pointer; }
        
        .save-template-footer {
          display: flex; gap: 8px; align-items: center;
          padding: 10px; background: #f9f9f9; border-radius: 10px; border: 1px dashed #ddd;
        }
        .save-template-footer input { 
          flex: 1; padding: 6px 10px; border: 1px solid #eee; border-radius: 6px; 
          font-size: 0.8rem; outline: none; background: white; color: #333;
        }
        .save-template-footer input::placeholder { color: #666; opacity: 1; }
        .btn-save-template { background: #dcdcdc; color: #000; border: 1px solid #ccc; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 0.75rem; cursor: pointer; }

        .checklist-modal-footer {
          padding: 12px 20px; background: #f5f5f5; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee;
        }
        .btn-secondary { 
          padding: 8px 18px; border-radius: 6px; border: none; 
          background: #F26522; color: #000; font-weight: 800; cursor: pointer; font-size: 0.8rem; 
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: #ff7a3d; transform: translateY(-1px); }
        
        .btn-primary { 
          padding: 8px 20px; border-radius: 6px; border: none; 
          background: #333; color: #000; font-weight: 800; cursor: pointer; font-size: 0.8rem; 
        }
        /* Si el fondo del botón es muy oscuro, el texto negro puede no verse bien, 
           pero lo pondré como pidió el usuario. Si prefiere otro fondo para el texto negro lo ajustaremos. */
        .btn-primary { background: #dcdcdc; } /* Ajustando fondo a gris claro para que el texto negro se vea */

        @media (max-width: 600px) {
          .checklist-modal-card { width: 100%; height: 100vh; max-height: 100vh; border-radius: 0; }
          .cl-tab-btn .tab-text { display: none; }
          .add-item-row { flex-direction: column; }
          .save-template-footer { flex-direction: column; align-items: stretch; }
          .tecnicos-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
        }
      `}</style>
    </div>
  );
};

export default ModalAsignarChecklist;
