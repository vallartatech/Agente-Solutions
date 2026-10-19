// Opciones únicas del cargador de Google Maps.
// useJsApiLoader falla si se llama con el mismo id y opciones distintas,
// así que TODAS las vistas deben usar este objeto (incluye 'places' para el buscador).
const libraries = ['places'];

export const GOOGLE_MAPS_LOADER = {
  id: 'google-map-script',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw',
  libraries
};
