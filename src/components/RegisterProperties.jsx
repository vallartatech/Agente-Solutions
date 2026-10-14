import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import Swal from "sweetalert2";
import ModalCompraEspacios from "./Shared/ModalCompraEspacios";
import {
  Home,
  MapPin,
  Map,
  Hash,
  Crosshair,
  MapPinned,
  X,
  Check,
  Building,
  Radar,
  Image as ImageIcon,
  Type,
  Camera,
  ChevronLeft
} from "lucide-react";
import axios from "axios";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  Autocomplete,
} from "@react-google-maps/api";
import "../styles/Shared/RegisterProperties.css";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: 20.9673,
  lng: -89.6236,
};

// Librerias Google Maps
const libraries = ["places"];

const RegisterProperties = () => {
  const navigate = useNavigate(); 
  const [mostrarModalCompraEspacios, setMostrarModalCompraEspacios] = useState(false);
  const [subInfo, setSubInfo] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData;
    if (user?.role_id === 4 || user?.role_id === 5) {
      const token = localStorage.getItem('agente_token');
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenant/subscription-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => {
        if (r.data.success) {
          const sub = r.data;
          setSubInfo(sub);
          const maxAllowed = (sub.max_properties ?? 3) + (sub.extra_properties_count ?? 0);
          if (sub.properties_count >= maxAllowed) {
            Swal.fire({
              title: '🔒 LÍMITE ALCANZADO',
              text: `Has registrado ${sub.properties_count} de ${maxAllowed} propiedades permitidas en tu plan. Para agregar una nueva propiedad, adquiere un espacio extra por $79.99 MXN c/u.`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#FF6600',
              cancelButtonColor: '#64748b',
              confirmButtonText: '➕ COMPRAR ESPACIOS ($79.99)',
              cancelButtonText: 'Regresar a Propiedades'
            }).then((result) => {
              if (result.isConfirmed) {
                setMostrarModalCompraEspacios(true);
              } else {
                navigate('/propiedades');
              }
            });
          }
        }
      }).catch(() => {});
    }
  }, [navigate]); 

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDgyTj0X6kgGoMV8NxQGDp4-Nx0bxJd0Hw",
    libraries: libraries,
  });

  const [formData, setFormData] = useState({
    client_id: 1,
    property_name: "", 
    type: "Casa",
    calle: "",
    numero: "",
    cruzamientos: "",
    colonia: "",
    municipio: "",
    estado: "",
    coordinates: "",
  });

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);

  const openPhotoMenu = () => {
    setIsPhotoMenuOpen(true);
  };

  const selectPhotoSource = (source) => {
    if (source === 'camera') {
      cameraRef.current.click();
    } else {
      galleryRef.current.click();
    }
    setIsPhotoMenuOpen(false);
  };

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [contador, setContador] = useState(4);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const abrirMapaYDetectar = () => {
    setIsDetecting(true);
    let tiempo = 4;
    setContador(tiempo);

    const intervalo = setInterval(() => {
      tiempo -= 1;
      setContador(tiempo);
    }, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const miUbicacion = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(miUbicacion);
          setMarkerPosition(miUbicacion);
        },
        (error) => {
          console.warn("Error o permiso denegado para la ubicación: ", error);
        },
        { enableHighAccuracy: true },
      );
    }

    setTimeout(() => {
      clearInterval(intervalo);
      setIsDetecting(false);
      setIsMapOpen(true);
    }, 4000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onMapClick = (e) => {
    setMarkerPosition({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const nuevaUbicacion = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setMapCenter(nuevaUbicacion);
        setMarkerPosition(nuevaUbicacion);
      }
    }
  };

  const confirmarUbicacion = () => {
    setFormData({
      ...formData,
      coordinates: `${markerPosition.lat.toFixed(6)}, ${markerPosition.lng.toFixed(6)}`,
    });
    setIsMapOpen(false);
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setMensaje("Generando Súper CURP y guardando...");
    setTipoMensaje("");

    const dataToSend = new FormData();
    Object.keys(formData).forEach(key => {
        dataToSend.append(key, formData[key]);
    });
    
    if (fotoFile) {
        dataToSend.append('facade_photo', fotoFile);
    }

    try {
      // ✅ LEYENDO EL TOKEN CORRECTO
      const token = localStorage.getItem('agente_token'); 
      
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/registro-propiedad`, 
        dataToSend,
        {
          // ✅ AQUÍ ESTÁ LA MAGIA PARA SAFARI: Quitamos el Content-Type explícito
          headers: {
            'Authorization': `Bearer ${token}` 
          }
        }
      );
      
      setMensaje(`¡Éxito! CURP Generado: ${res.data.property.custom_curp}`);
      setTipoMensaje("success");

      // Limpiar formulario
      setFormData({
        ...formData,
        property_name: "",
        calle: "",
        numero: "",
        cruzamientos: "",
        colonia: "",
        estado: "",
        municipio: "",
        coordinates: "",
      });
      setFotoFile(null);
      setFotoPreview(null);

    }  catch (error) {
      setTipoMensaje("error");
      
      // Obligamos a sacar el error real
      const errorDeRed = error.message || "Error desconocido";
      const errorDelServidor = error.response?.data?.message || error.response?.data?.error || "";
      
      const detalleFinal = errorDelServidor ? errorDelServidor : errorDeRed;
      
      setMensaje("Fallo en iOS: " + detalleFinal);
      alert("ATENCIÓN: " + detalleFinal); // Un alert para que no pase desapercibido en el celular
    }
    
  };

  return (
    <div className="register-viewport">
      {/* BOTÓN REGRESAR */}
      <div style={{ width: '95%', maxWidth: '1100px', display: 'flex', justifyContent: 'flex-start', marginBottom: '18px' }}>
        <button 
          type="button"
          onClick={() => navigate(-1)} 
          className="btn-regresar-glass"
        >
          <ChevronLeft size={18} />
          <span>REGRESAR</span>
        </button>
      </div>

      <div className="form-card">
        <div className="form-top-accent-bar" />
        <form onSubmit={handleRegistro} className="form-inner">
          <h2 className="register-form-title">REGISTRO DE INMUEBLE</h2>

          <div className="form-grid">
            
            <div className="input-wrapper" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">
                <Type size={18} /> Nombre de la Propiedad:
              </label>
              <input
                type="text"
                name="property_name"
                className="custom-input"
                placeholder="Ej. Casa de Verano, Oficina Central, Bodega Norte"
                value={formData.property_name}
                onChange={handleChange}
              />
            </div>

            <div className="input-wrapper" style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <label className="input-label">
                <ImageIcon size={18} /> Foto de la Fachada:
              </label>
              <div className="photo-selection-row">
                <button 
                    type="button"
                    onClick={openPhotoMenu}
                    className="btn-photo-glass"
                >
                    <Camera size={16} /> Seleccionar Archivo
                </button>
                {/* ✅ AQUÍ QUITAMOS EL CAPTURE="ENVIRONMENT" PARA QUE IOS NO SE BLOQUEE */}
                <input 
                    type="file" 
                    ref={cameraRef}
                    accept="image/jpeg,image/png,image/jpg" 
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }} 
                />
                <input 
                    type="file" 
                    ref={galleryRef}
                    accept="image/jpeg,image/png,image/jpg" 
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }} 
                />
                
                {fotoPreview ? (
                    <img 
                        src={fotoPreview} 
                        alt="Vista previa" 
                        className="photo-preview-thumb"
                    />
                ) : (
                    <span className="photo-preview-placeholder">Ninguna imagen seleccionada</span>
                )}
              </div>
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Home size={18} /> Tipo:
              </label>
              <select
                name="type"
                className="custom-input"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="Casa">CASA</option>
                <option value="Departamento">DEPARTAMENTO</option>
                <option value="Mansión">MANSIÓN</option>
                <option value="Oficina">OFICINA</option>
                <option value="Bodega">BODEGA</option>
                <option value="Terreno">TERRENO</option>
                <option value="Local Comercial">LOCAL COMERCIAL</option>
              </select>
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Map size={18} /> Estado:
              </label>
              <input
                type="text"
                name="estado"
                className="custom-input"
                placeholder="Ej. Yucatán"
                value={formData.estado}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Building size={18} /> Ciudad / Municipio:
              </label>
              <input
                type="text"
                name="municipio"
                className="custom-input"
                placeholder="Ingresa tu Ciudad"
                value={formData.municipio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Map size={18} /> Colonia:
              </label>
              <input
                type="text"
                name="colonia"
                className="custom-input"
                placeholder="Ej. San Francisco"
                value={formData.colonia}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <MapPin size={18} /> Calle:
              </label>
              <input
                type="text"
                name="calle"
                className="custom-input"
                placeholder="Ej. 11 o Calle 11"
                value={formData.calle}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Hash size={18} /> Número:
              </label>
              <input
                type="text"
                name="numero"
                className="custom-input"
                placeholder="Ej. 108F"
                value={formData.numero}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label">
                <Crosshair size={18} /> Cruzamientos:
              </label>
              <input
                type="text"
                name="cruzamientos"
                className="custom-input"
                placeholder="Ej. x 24 y 26"
                value={formData.cruzamientos}
                onChange={handleChange}
              />
            </div>

            <div className="input-wrapper full-width">
              <div className="location-widget">
                <div className="widget-left">
                  <div className="widget-icon">
                    <MapPinned size={26} />
                  </div>
                  <div className="widget-info">
                    <span className="widget-label">COORDENADAS GPS</span>
                    <span
                      className={`widget-value ${!formData.coordinates ? "empty" : ""}`}
                    >
                      {formData.coordinates
                        ? formData.coordinates
                        : "Sin ubicación asignada"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="widget-btn"
                  onClick={abrirMapaYDetectar}
                >
                  <MapPin size={18} />
                  {formData.coordinates ? "MODIFICAR MAPA" : "FIJAR EN MAPA"}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-submit">
            GUARDAR PROPIEDAD
          </button>

          {mensaje && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className={`msg-box ${tipoMensaje === "success" ? "msg-success" : "msg-error"}`}>
                {mensaje}
              </div>
              
              {tipoMensaje === "success" && (
                <button 
                  type="button" 
                  className="btn-submit" 
                  style={{ backgroundColor: '#333', border: '1px solid #555' }}
                  onClick={() => navigate('/propiedades')}
                >
                  VER MIS PROPIEDADES
                </button>
              )}
            </div>
          )}

        </form>
      </div>

      {isDetecting && (
         <div className="map-modal-overlay">
         <div className="gps-detecting-card">
           <svg //////Animación del Reloj
             aria-label="loader being flipped clockwise and circled by three white curves fading in and out"
             role="img"
             height="56px"
             width="56px"
             viewBox="0 0 56 56"
             className="loader"
           >
             <clipPath id="sand-mound-top">
               <path
                 d="M 14.613 13.087 C 15.814 12.059 19.3 8.039 20.3 6.539 C 21.5 4.789 21.5 2.039 21.5 2.039 L 3 2.039 C 3 2.039 3 4.789 4.2 6.539 C 5.2 8.039 8.686 12.059 9.887 13.087 C 11 14.039 12.25 14.039 12.25 14.039 C 12.25 14.039 13.5 14.039 14.613 13.087 Z"
                 className="loader__sand-mound-top"
               ></path>
             </clipPath>
             <clipPath id="sand-mound-bottom">
               <path
                 d="M 14.613 20.452 C 15.814 21.48 19.3 25.5 20.3 27 C 21.5 28.75 21.5 31.5 21.5 31.5 L 3 31.5 C 3 31.5 3 28.75 4.2 27 C 5.2 25.5 8.686 21.48 9.887 20.452 C 11 19.5 12.25 19.5 12.25 19.5 C 12.25 19.5 13.5 19.5 14.613 20.452 Z"
                 className="loader__sand-mound-bottom"
               ></path>
             </clipPath>
             <g transform="translate(2,2)">
               <g
                 transform="rotate(-90,26,26)"
                 strokeLinecap="round"
                 strokeDashoffset="153.94"
                 strokeDasharray="153.94 153.94"
                 stroke="hsl(0,0%,100%)"
                 fill="none"
               >
                 <circle
                   transform="rotate(0,26,26)"
                   r="24.5"
                   cy="26"
                   cx="26"
                   strokeWidth="2.5"
                   className="loader__motion-thick"
                 ></circle>
                 <circle
                   transform="rotate(90,26,26)"
                   r="24.5"
                   cy="26"
                   cx="26"
                   strokeWidth="1.75"
                   className="loader__motion-medium"
                 ></circle>
                 <circle
                   transform="rotate(180,26,26)"
                   r="24.5"
                   cy="26"
                   cx="26"
                   strokeWidth="1"
                   className="loader__motion-thin"
                 ></circle>
               </g>
               <g transform="translate(13.75,9.25)" className="loader__model">
                 <path
                   d="M 1.5 2 L 23 2 C 23 2 22.5 8.5 19 12 C 16 15.5 13.5 13.5 13.5 16.75 C 13.5 20 16 18 19 21.5 C 22.5 25 23 31.5 23 31.5 L 1.5 31.5 C 1.5 31.5 2 25 5.5 21.5 C 8.5 18 11 20 11 16.75 C 11 13.5 8.5 15.5 5.5 12 C 2 8.5 1.5 2 1.5 2 Z"
                   fill="hsl(var(--hue),90%,85%)"
                 ></path>

                 <g strokeLinecap="round" stroke="hsl(35,90%,90%)">
                   <line
                     y2="20.75"
                     x2="12"
                     y1="15.75"
                     x1="12"
                     strokeDasharray="0.25 33.75"
                     strokeWidth="1"
                     className="loader__sand-grain-left"
                   ></line>
                   <line
                     y2="21.75"
                     x2="12.5"
                     y1="16.75"
                     x1="12.5"
                     strokeDasharray="0.25 33.75"
                     strokeWidth="1"
                     className="loader__sand-grain-right"
                   ></line>
                   <line
                     y2="31.5"
                     x2="12.25"
                     y1="18"
                     x1="12.25"
                     strokeDasharray="0.5 107.5"
                     strokeWidth="1"
                     className="loader__sand-drop"
                   ></line>
                   <line
                     y2="31.5"
                     x2="12.25"
                     y1="14.75"
                     x1="12.25"
                     strokeDasharray="54 54"
                     strokeWidth="1.5"
                     className="loader__sand-fill"
                   ></line>
                   <line
                     y2="31.5"
                     x2="12"
                     y1="16"
                     x1="12"
                     strokeDasharray="1 107"
                     strokeWidth="1"
                     stroke="hsl(35,90%,83%)"
                     className="loader__sand-line-left"
                   ></line>
                   <line
                     y2="31.5"
                     x2="12.5"
                     y1="16"
                     x1="12.5"
                     strokeDasharray="12 96"
                     strokeWidth="1"
                     stroke="hsl(35,90%,83%)"
                     className="loader__sand-line-right"
                   ></line>

                   <g strokeWidth="0" fill="hsl(35,90%,90%)">
                     <path
                       d="M 12.25 15 L 15.392 13.486 C 21.737 11.168 22.5 2 22.5 2 L 2 2.013 C 2 2.013 2.753 11.046 9.009 13.438 L 12.25 15 Z"
                       clipPath="url(#sand-mound-top)"
                     ></path>
                     <path
                       d="M 12.25 18.5 L 15.392 20.014 C 21.737 22.332 22.5 31.5 22.5 31.5 L 2 31.487 C 2 31.487 2.753 22.454 9.009 20.062 Z"
                       clipPath="url(#sand-mound-bottom)"
                     ></path>
                   </g>
                 </g>

                 <g
                   strokeWidth="2"
                   strokeLinecap="round"
                   opacity="0.7"
                   fill="none"
                 >
                   <path
                     d="M 19.437 3.421 C 19.437 3.421 19.671 6.454 17.914 8.846 C 16.157 11.238 14.5 11.5 14.5 11.5"
                     stroke="hsl(0,0%,100%)"
                     className="loader__glare-top"
                   ></path>
                   <path
                     transform="rotate(180,12.25,16.75)"
                     d="M 19.437 3.421 C 19.437 3.421 19.671 6.454 17.914 8.846 C 16.157 11.238 14.5 11.5 14.5 11.5"
                     stroke="hsla(0,0%,100%,0)"
                     className="loader__glare-bottom"
                   ></path>
                 </g>

                 <rect
                   height="2"
                   width="24.5"
                   fill="hsl(var(--hue),90%,50%)"
                 ></rect>
                 <rect
                   height="1"
                   width="19.5"
                   y="0.5"
                   x="2.5"
                   ry="0.5"
                   rx="0.5"
                   fill="hsl(var(--hue),90%,57.5%)"
                 ></rect>
                 <rect
                   height="2"
                   width="24.5"
                   y="31.5"
                   fill="hsl(var(--hue),90%,50%)"
                 ></rect>
                 <rect
                   height="1"
                   width="19.5"
                   y="32"
                   x="2.5"
                   ry="0.5"
                   rx="0.5"
                   fill="hsl(var(--hue),90%,57.5%)"
                 ></rect>
               </g>
             </g>
           </svg>

           <h2
             style={{
               color: "white",
               fontSize: "1.4rem",
               fontFamily: "'Outfit', sans-serif",
               fontWeight: 900,
               marginBottom: "12px",
             }}
           >
             ESPERA UN MOMENTO
           </h2>

           <p
             style={{
               color: "#e2e8f0",
               fontSize: "1rem",
               lineHeight: "1.5",
               fontFamily: "'Outfit', sans-serif",
             }}
           >
             Espera{" "}
             <span
               style={{
                 color: "#F26522",
                 fontWeight: "900",
                 fontSize: "1.6rem",
                 margin: "0 6px",
               }}
             >
               {contador}
             </span>{" "}
             segundos mientras detectamos tu ubicación exacta...
           </p>
         </div>
       </div>
      )}

      {isMapOpen && (
        <div className="map-modal-overlay">
          <div className="map-modal-content">
            <div className="map-modal-header">
              <h3 className="map-modal-title">
                <MapPin size={24} /> Selecciona la ubicación
              </h3>
              <button
                onClick={() => setIsMapOpen(false)}
                className="btn-close-modal"
              >
                <X size={28} />
              </button>
            </div>

            {isLoaded ? (
              <>
                <Autocomplete
                  onLoad={(autoC) => setAutocomplete(autoC)}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    type="text"
                    placeholder="Buscar ciudad, colonia, calle o lugar..."
                    style={{
                      width: "100%",
                      padding: "12px 15px",
                      borderRadius: "8px",
                      border: "1px solid #555",
                      marginBottom: "15px",
                      fontSize: "1rem",
                      outline: "none",
                      backgroundColor: "#fff",
                      color: "#000",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                  />
                </Autocomplete>
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={mapCenter}
                  zoom={15}
                  onClick={onMapClick}
                >
                  <MarkerF position={markerPosition} />
                </GoogleMap>
              </>
            ) : (
              <p
                style={{
                  textAlign: "center",
                  padding: "50px 0",
                  color: "#a0a0a0",
                }}
              >
                Cargando mapa interactivo...
              </p>
            )}

            <div className="map-modal-footer">
              <button
                onClick={() => setIsMapOpen(false)}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button onClick={confirmarUbicacion} className="btn-confirm">
                <Check size={18} /> Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {isPhotoMenuOpen && (
        <div className="map-modal-overlay" onClick={() => setIsPhotoMenuOpen(false)}>
          <div className="map-modal-content" style={{ maxWidth: '380px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#F26522', borderBottom: '1px solid rgba(255,255,255,0.15)', margin: 0, padding: '18px', textAlign: 'center', fontSize: '1.15rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>Actualizar Foto</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                onClick={() => selectPhotoSource('camera')}
                style={{ background: 'transparent', border: 'none', padding: '16px', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📷 Tomar Foto
              </button>
              <button 
                onClick={() => selectPhotoSource('gallery')}
                style={{ background: 'transparent', border: 'none', padding: '16px', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                🖼️ Elegir de la Galería
              </button>
              <button 
                onClick={() => setIsPhotoMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', padding: '14px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalCompraEspacios
        isOpen={mostrarModalCompraEspacios}
        onClose={() => setMostrarModalCompraEspacios(false)}
        tenantId={subInfo?.tenant?.id || 1}
        userId={JSON.parse(localStorage.getItem('agente_session') || '{}')?.userData?.id}
      />
    </div>
  );
};

export default RegisterProperties;