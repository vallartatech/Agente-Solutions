// Llamadas del perfil profesional de los técnicos de la red (roles 6 y 8).
// El backend responde siempre { success, data } con el perfil completo actualizado.
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL;

const datos = (res) => res.data?.data;

export const obtenerPerfil = () => axios.get(`${API}/tecnico/perfil-profesional`).then(datos);

export const guardarPerfil = (cambios) => axios.post(`${API}/tecnico/perfil-profesional`, cambios).then(datos);

export const subirIne = ({ frente, reverso }) => {
  const fd = new FormData();
  if (frente) fd.append('frente', frente);
  if (reverso) fd.append('reverso', reverso);
  return axios.post(`${API}/tecnico/perfil-profesional/ine`, fd).then(datos);
};

export const agregarCurso = ({ nombre, institucion, anio, archivo }) => {
  const fd = new FormData();
  fd.append('nombre', nombre);
  if (institucion) fd.append('institucion', institucion);
  if (anio) fd.append('anio', anio);
  if (archivo) fd.append('archivo', archivo);
  return axios.post(`${API}/tecnico/perfil-profesional/cursos`, fd).then(datos);
};

export const borrarCurso = (id) => axios.delete(`${API}/tecnico/perfil-profesional/cursos/${id}`).then(datos);

export const enviarARevision = () => axios.post(`${API}/tecnico/perfil-profesional/enviar`).then((res) => res.data);

export const catalogoEspecialidades = () =>
  axios.get(`${API}/specialties`).then((res) => (Array.isArray(res.data) ? res.data : []));

/**
 * INE o diploma (privados): se piden con la sesión y se muestran como blob.
 * Devuelve una URL local (blob:) que hay que liberar con URL.revokeObjectURL.
 */
export const urlArchivoPrivado = async (userId, tipo, cursoId = null) => {
  const ruta = `${API}/perfil-profesional/${userId}/archivo/${tipo}${cursoId ? `/${cursoId}` : ''}`;
  const res = await axios.get(ruta, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

/** Mensaje legible de un error del backend (validación 422 o mensaje general). */
export const mensajeError = (err, porDefecto = 'No se pudo guardar. Intenta de nuevo.') => {
  const d = err?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0] || porDefecto;
  return d?.message || d?.error || porDefecto;
};

/** Foto de perfil (obligatoria para validar). Responde { url, data }. */
export const subirFotoPerfil = (foto) => {
  const fd = new FormData();
  fd.append('foto', foto);
  return axios.post(`${API}/tecnico/perfil-profesional/foto`, fd).then((res) => res.data);
};

/** Comprobante de domicilio o antecedentes no penales (privados). tipo: 'comprobante_domicilio' | 'antecedentes_penales' */
export const subirDocumento = (tipo, archivo) => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return axios.post(`${API}/tecnico/perfil-profesional/documento/${tipo}`, fd).then(datos);
};
