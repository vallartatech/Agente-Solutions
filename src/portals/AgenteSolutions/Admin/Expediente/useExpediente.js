import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API, authHeaders } from './flujoTrabajo';

// Carga el expediente de la propiedad: datos, encargado y todos sus trabajos
const useExpediente = (propiedadId) => {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async (silencioso = false) => {
    if (!propiedadId) return;
    if (!silencioso) setCargando(true);
    try {
      const res = await axios.get(`${API}/propiedades/${propiedadId}/expediente`, { headers: authHeaders() });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo cargar la información de la propiedad.');
    } finally {
      setCargando(false);
    }
  }, [propiedadId]);

  useEffect(() => { recargar(); }, [recargar]);

  return { data, cargando, error, recargar };
};

export default useExpediente;
