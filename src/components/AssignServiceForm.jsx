import { useState, useEffect } from 'react';
import axios from 'axios';
import { mostrarAviso } from '../utils/dialogos';

const AssignServiceForm = () => {
  const [propertyId] = useState(22); 
  
  const [availableComponents, setAvailableComponents] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  
  const [serviceData, setServiceData] = useState({
    title: '',
    type: 'Maintenance', 
    technician_id: '',
    date: ''
  });

  useEffect(() => {
    if (propertyId) {
      const fetchComponents = async () => {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${propertyId}/components`);
          setAvailableComponents(response.data);
        } catch (error) {
          console.error("Error loading components:", error);
        }
      };
      fetchComponents();
    }
  }, [propertyId]);

  const handleCheckbox = (componentId) => {
    setSelectedComponents(prev => {

      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...serviceData,
      property_id: propertyId,
      selected_components: selectedComponents 
    };

    console.log("Data ready to send to Laravel:", payload);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/services/assign`, payload);
      mostrarAviso('¡Servicio asignado correctamente!');
      console.log("Respuesta de Laravel:", response.data);
      
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarAviso('Hubo un error al guardar el servicio.');
    }
    
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 w-full">
      <div 
        className="w-full max-w-lg bg-white rounded-xl shadow-xl p-8" 
        style={{ color: '#1f2937' }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4 border-gray-200">
          Assign New Service
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title:</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-800"
              placeholder="e.g. AC Maintenance"
              onChange={e => setServiceData({...serviceData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select equipment to service:</label>
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-inner">
              
              {availableComponents.length > 0 ? (
                availableComponents.map(comp => (
                  <div key={comp.id} className="mb-3 last:mb-0 hover:bg-gray-200 p-2 rounded-md transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                        checked={selectedComponents.includes(comp.id)}
                        onChange={() => handleCheckbox(comp.id)}
                      />
                      <span className="text-gray-800 font-medium">{comp.display_name}</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic text-center py-4">
                  Loading equipment or the property has no installed equipment...
                </p>
              )}
              
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 mt-4"
          >
            Save Assignment
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssignServiceForm;