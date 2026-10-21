import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom'; // IMPORTANTE
import axios from 'axios';
import { Plus, ArrowLeft, ImageIcon, Loader2, Edit3, Eye, X, Trash2 } from 'lucide-react';
import '../../../styles/AgenteSolutions/Admin/DetalleReporte.css';
import '../../../styles/AgenteSolutions/Tecnico/RegistroDetalleHabitacion.css';
import logo from "../../../assets/Logo3.png";
import casaImg from '../../../assets/propiedad_ejemplo.jpg';
import mpLogo from '../../../assets/Mercado-Pago.png';
import { mostrarAviso, confirmarAccion } from '../../../utils/dialogos';

const IVA_RATE = 0.16;

const DetalleReporte = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS DE LA VISTA PRINCIPAL (LEVANTAMIENTO) ---
    const [datosBD, setDatosBD] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [editandoZonaId, setEditandoZonaId] = useState(null);
    const [nuevoNombreZona, setNuevoNombreZona] = useState('');
    
    // --- ESTADOS PARA MODALES DE ZONAS Y ESPACIOS ---
    const [mostrarModalAddZona, setMostrarModalAddZona] = useState(false);
    const [mostrarModalAddEspacio, setMostrarModalAddEspacio] = useState(false);
    const [zonaParaNuevoEspacio, setZonaParaNuevoEspacio] = useState(null); // ID de la zona padre
    
    const [nuevaZonaOpcion, setNuevaZonaOpcion] = useState('');
    const [nuevaZonaTexto, setNuevaZonaTexto] = useState('');
    
    const [nuevoEspacioOpcion, setNuevoEspacioOpcion] = useState('');
    const [nuevoEspacioTexto, setNuevoEspacioTexto] = useState('');
    
    const [guardandoArea, setGuardandoArea] = useState(false);

    const OPCIONES_ZONAS = [
        "HABITACIONES", "BAÑOS", "ÁREAS SOCIALES", "COCINA", "ZONAS EXTERIORES", "OTRAS ÁREAS"
    ];

    const OPCIONES_ESPACIOS = [
        "BAÑO PRINCIPAL", "MEDIO BAÑO", 
        "HABITACIÓN PRINCIPAL", "HABITACIÓN DE HUÉSPEDES", 
        "SALA DE ESTAR", "COMEDOR", "SALA DE TV", "CUARTO DE JUEGOS", "BAR", 
        "COCINA PRINCIPAL", "ALACENA / DESPENSA", 
        "COCHERA / GARAJE", "PATIO", "JARDÍN", "TERRAZA", "PISCINA"
    ];
    
    // --- ESTADOS PARA ELEMENTOS ---
    const [modalElementoVisible, setModalElementoVisible] = useState(false);
    const [elementoActual, setElementoActual] = useState({ id: null, sub_category: '', brand: '', model_or_color: '', quantity: 1, category: '', serial_number: '', observations: '', status: 'Bueno' });
    const [previewImg, setPreviewImg] = useState(null);
    const [previewImgSecondary, setPreviewImgSecondary] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileSecondary, setSelectedFileSecondary] = useState(null);
    const [galeriaArchivos, setGaleriaArchivos] = useState([]);
    const [galeriaExistente, setGaleriaExistente] = useState([]);

    // --- ESTADOS PARA CATEGORÍAS ---
    const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [creandoNuevaCategoria, setCreandoNuevaCategoria] = useState(false);

    const [seccionesAbiertas, setSeccionesAbiertas] = useState({}); // Estado para el acordeón de zonas (DEPRECATED)
    const [selectedImage, setSelectedImage] = useState(null); // Estado para la imagen actual en el visor
    const [viewerImages, setViewerImages] = useState([]); // Lista de imágenes para el carrusel
    const [viewerIndex, setViewerIndex] = useState(0); // Índice actual
    const [selectedSubseccion, setSelectedSubseccion] = useState(null); // Estado para el modal de la cuadrícula

    const abrirVisor = (imgs, index = 0) => {
        const filtradas = imgs.filter(img => img); // Eliminar nulos o vacíos
        if (filtradas.length > 0) {
            setViewerImages(filtradas);
            setViewerIndex(index);
            setSelectedImage(filtradas[index]);
        }
    };

    const navegarVisor = (direccion) => {
        let nuevoIndex = viewerIndex + direccion;
        if (nuevoIndex < 0) nuevoIndex = viewerImages.length - 1;
        if (nuevoIndex >= viewerImages.length) nuevoIndex = 0;
        
        setViewerIndex(nuevoIndex);
        setSelectedImage(viewerImages[nuevoIndex]);
    };

    const toggleSeccion = (idx) => {
        setSeccionesAbiertas(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    // --- ESTADOS DEL COTIZADOR ---
    const [mostrarCotizacion, setMostrarCotizacion] = useState(false);
    const [metodoCotizacion, setMetodoCotizacion] = useState('manual');
    const [archivoPreview, setArchivoPreview] = useState(null);
    const [archivoFisico, setArchivoFisico] = useState(null);
    
    // --- REFERENCIAS Y ESTADOS PARA SUBIR ARCHIVOS ---
    const cameraRef = React.useRef(null);
    const galleryRef = React.useRef(null);
    const fileRef = React.useRef(null);
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [targetPhoto, setTargetPhoto] = useState(null); // 'principal', 'secondary', 'gallery', 'cotizador'

    const handlePhotoBoxClick = (target) => {
        setTargetPhoto(target);
        setIsFileMenuOpen(true);
    };

    const selectFileSource = (source) => {
        if (source === 'camera') {
            if (targetPhoto === 'principal') document.getElementById('cameraPrincipal').click();
            else if (targetPhoto === 'secondary') document.getElementById('cameraSecondary').click();
            else if (targetPhoto === 'gallery') document.getElementById('cameraGallery').click();
            else cameraRef.current.click();
        } else if (source === 'gallery') {
            if (targetPhoto === 'principal') document.getElementById('fotoProductoNuevo').click();
            else if (targetPhoto === 'secondary') document.getElementById('fotoProductoSecundario').click();
            else if (targetPhoto === 'gallery') document.getElementById('fotoGaleriaNueva').click();
            else galleryRef.current.click();
        } else {
            // Caso para 'file' (documentos del cotizador)
            fileRef.current.click();
        }
        setIsFileMenuOpen(false);
    };
    
    // Tablas dinámicas del cotizador
    const [filasConceptos, setFilasConceptos] = useState([{ descripcion: '', cantidad: 1, precio_u: '' }]);
    const [filasMateriales, setFilasMateriales] = useState([{ nombre: '', cantidad: 1, costo_u: '' }]);
    const [herramientasBasicas, setHerramientasBasicas] = useState([{ nombre: '', cantidad: 1 }]);
    const [herramientasEspeciales, setHerramientasEspeciales] = useState([{ nombre: '', cantidad: 1 }]);
    const [observaciones, setObservaciones] = useState('');

    const cargarReporte = async () => {
        try {
            const token = localStorage.getItem('agente_token');
            
            // ✅ DETECTAMOS SI EL ID ES DE PROPIEDAD O DE SERVICIO
            let url = `${import.meta.env.VITE_API_BASE_URL}/servicios/${id}`;
            if (id && id.toString().startsWith('prop_')) {
                const realPropId = id.replace('prop_', '');
                url = `${import.meta.env.VITE_API_BASE_URL}/properties/${realPropId}/inventory-report`;
            }

            const respuesta = await axios.get(url, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            setDatosBD(respuesta.data);
            
            // Sincronizamos el contexto para que el sidebar funcione correctamente
            localStorage.setItem('current_levantamiento_id', id);
            if (respuesta.data.property_id) {
                localStorage.setItem('current_property_id', respuesta.data.property_id);
            }
            window.dispatchEvent(new Event('sync-agente-ids'));

            // Actualizar la subsección seleccionada si el modal está abierto
            if (selectedSubseccion) {
                const nuevaSeccion = respuesta.data.secciones.find(s => s.id === selectedSubseccion.id);
                if (nuevaSeccion) {
                    setSelectedSubseccion({
                        ...nuevaSeccion,
                        nombre: nuevaSeccion.titulo,
                        categorias: nuevaSeccion.subSecciones
                    });
                }
            }

        } catch (error) {
            console.error("Error al cargar el reporte:", error);
        } finally {
            setCargando(false);
        }
    };

    const handleCrearZona = async () => {
        const nombreZona = nuevaZonaOpcion === 'OTRA...' ? nuevaZonaTexto : nuevaZonaOpcion;
        if (!nombreZona.trim()) return mostrarAviso("Por favor, selecciona o escribe un nombre para la zona.");
        
        setGuardandoArea(true);
        try {
            const token = localStorage.getItem('agente_token');
            const formData = new FormData();
            formData.append('property_id', datosBD.property_id);
            formData.append('name', nombreZona.toUpperCase());
            formData.append('description', '');
            
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setMostrarModalAddZona(false);
            setNuevaZonaOpcion('');
            setNuevaZonaTexto('');
            cargarReporte(); // Recargar datos
        } catch (error) {
            console.error("Error al crear zona:", error);
            mostrarAviso("Error al crear la zona.");
        } finally {
            setGuardandoArea(false);
        }
    };

    const handleCrearEspacio = async () => {
        const nombreEspacio = nuevoEspacioOpcion === 'OTRA...' ? nuevoEspacioTexto : nuevoEspacioOpcion;
        if (!nombreEspacio.trim() || !zonaParaNuevoEspacio) return mostrarAviso("Por favor, selecciona o escribe un nombre para el espacio.");
        
        setGuardandoArea(true);
        try {
            const token = localStorage.getItem('agente_token');
            const formData = new FormData();
            formData.append('property_id', datosBD.property_id);
            formData.append('parent_id', zonaParaNuevoEspacio);
            formData.append('name', nombreEspacio.toUpperCase());
            formData.append('description', '');
            
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-areas`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setMostrarModalAddEspacio(false);
            setNuevoEspacioOpcion('');
            setNuevoEspacioTexto('');
            setZonaParaNuevoEspacio(null);
            cargarReporte(); // Recargar datos
        } catch (error) {
            console.error("Error al crear espacio:", error);
            mostrarAviso("Error al crear el espacio.");
        } finally {
            setGuardandoArea(false);
        }
    };

    // Redirección automática si no hay ID válido
    useEffect(() => {
        if (!cargando && (!datosBD || !id || id === 'null' || id === 'undefined')) {
            const timer = setTimeout(() => {
                navigate('/propiedades');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [cargando, datosBD, id, navigate]);

    // --- CARGA DE DATOS DESDE API ---
    useEffect(() => {
        cargarReporte();
    }, [id]);

    useEffect(() => {
        // Mantener seleccionada la subsección si los datos se recargan
        if (selectedSubseccion && datosBD?.secciones) {
            let actualizado = null;
            for (const sec of datosBD.secciones) {
                // Si la sección misma es la seleccionada
                if (sec.id === selectedSubseccion.id) {
                    actualizado = sec;
                    break;
                }
                // Buscar si la seleccionada es un hijo/cuarto de esta sección
                if (sec.parent_id === null) {
                    const hijos = datosBD.secciones.filter(h => h.parent_id === sec.id);
                    actualizado = hijos.find(h => h.id === selectedSubseccion.id || h.nombre === selectedSubseccion.nombre);
                    if (actualizado) break;
                }
            }
            if (!actualizado) {
                // Intento fallback buscando directamente
                actualizado = datosBD.secciones.find(s => s.id === selectedSubseccion.id || s.nombre === selectedSubseccion.nombre);
            }
            if (actualizado) {
                const categoriasActualizadas = actualizado.subSecciones || actualizado.categorias || [];
                if (JSON.stringify(categoriasActualizadas) !== JSON.stringify(selectedSubseccion.categorias)) {
                    setSelectedSubseccion({
                        ...actualizado,
                        nombre: actualizado.titulo || actualizado.nombre,
                        categorias: categoriasActualizadas
                    });
                }
            }
        }
    }, [datosBD]);

    // --- FUNCIONES PARA EDITAR/ELIMINAR ZONAS ---
    const obtenerIdZona = async (nombreZona) => {
        try {
            const token = localStorage.getItem('agente_token');
            // Primero obtener el property_id usando el curp
            const propRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/by-curp/${datosBD.identificador_curp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const propertyId = propRes.data.id;
            
            // Obtener las áreas de la propiedad
            const areasRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/properties/${propertyId}/areas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const areas = areasRes.data;
            
            // Buscar coincidencia por nombre
            const area = areas.find(a => a.name.toUpperCase() === nombreZona.toUpperCase());
            return area ? area.id : null;
        } catch (error) {
            console.error("Error obteniendo ID de la zona:", error);
            return null;
        }
    };

    const handleEliminarZona = async (idZonaFallback, nombreZona) => {
        const idZona = idZonaFallback || await obtenerIdZona(nombreZona);
        if (!idZona) return mostrarAviso("Error: No se pudo localizar la zona en la base de datos.");
        
        if (await confirmarAccion(`¿Estás seguro de eliminar la zona "${nombreZona}" y todo su contenido? Esta acción no se puede deshacer.`)) {
            try {
                const token = localStorage.getItem('agente_token');
                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${idZona}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                mostrarAviso("Zona eliminada con éxito.");
                await cargarReporte(); 
            } catch (error) {
                console.error("Error al eliminar zona:", error);
                mostrarAviso("Hubo un error al eliminar la zona.");
            }
        }
    };

    const handleGuardarEdicionZona = async (idZonaFallback, nombreZonaActual) => {
        if (!nuevoNombreZona.trim()) return mostrarAviso("El nombre no puede estar vacío");
        
        const idZona = idZonaFallback || await obtenerIdZona(nombreZonaActual);
        if (!idZona) return mostrarAviso("Error: No se pudo localizar la zona en la base de datos.");

        try {
            const token = localStorage.getItem('agente_token');
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/property-areas/${idZona}`, 
                { name: nuevoNombreZona.toUpperCase() },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setEditandoZonaId(null);
            await cargarReporte();
        } catch (error) {
            console.error("Error al editar zona:", error);
            mostrarAviso("Error al editar el nombre de la zona.");
        }
    };

    // --- FUNCIONES PARA ELEMENTOS (INVENTARIO) ---
    const handleEliminarElemento = async (idElemento) => {
        if (!idElemento) return mostrarAviso("Error: ID del elemento no encontrado. No se puede eliminar.");
        if (await confirmarAccion("¿Seguro que deseas eliminar este elemento? Esta acción no se puede deshacer.")) {
            try {
                const token = localStorage.getItem('agente_token');
                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-components/${idElemento}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                mostrarAviso("Elemento eliminado.");
                await cargarReporte();
            } catch (error) {
                console.error(error);
                mostrarAviso("Hubo un error al eliminar el elemento.");
            }
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewImg(URL.createObjectURL(file));
        }
    };

    const handleFileSelectSecondary = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFileSecondary(file);
            setPreviewImgSecondary(URL.createObjectURL(file));
        }
    };

    const handleGallerySelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setGaleriaArchivos([...galeriaArchivos, ...files]);
        }
    };

    const abrirModalAgregarElemento = (categoriaNombre) => {
        setElementoActual({ id: null, sub_category: '', brand: '', model_or_color: '', quantity: 1, category: categoriaNombre, serial_number: '', observations: '', status: 'Bueno' });
        setPreviewImg(null);
        setPreviewImgSecondary(null);
        setSelectedFile(null);
        setSelectedFileSecondary(null);
        setGaleriaArchivos([]);
        setGaleriaExistente([]);
        setModalElementoVisible(true);
    };

    const abrirModalEditarElemento = (inv, categoriaNombre) => {
        setElementoActual({ 
            id: inv.id || inv.component_id, 
            sub_category: inv.nombre || inv.categoria || '', 
            brand: inv.marca || '', 
            model_or_color: inv.modelo || '', 
            quantity: inv.cantidad || 1, 
            category: categoriaNombre,
            serial_number: inv.serial_number || '',
            observations: inv.observations || '',
            status: inv.estado || 'Bueno'
        });

        setPreviewImg(inv.foto || inv.image_path || null);
        setPreviewImgSecondary(inv.foto_secundaria || inv.image_path_secondary || null);
        setSelectedFile(null);
        setSelectedFileSecondary(null);
        setGaleriaArchivos([]);
        setGaleriaExistente(inv.galleries || []);
        setModalElementoVisible(true);
    };

    const handleEliminarCategoria = async (idCategoria) => {
        if (!idCategoria) return mostrarAviso("Esta categoría no puede ser eliminada directamente.");
        if (!await confirmarAccion("¿Seguro que deseas eliminar esta categoría? Se eliminarán también todos los elementos dentro de ella.")) return;

        try {
            const token = localStorage.getItem('agente_token');
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/property-categories/${idCategoria}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            mostrarAviso("Categoría eliminada.");
            await cargarReporte();
        } catch (error) {
            console.error("Error al eliminar categoría:", error);
            mostrarAviso("Hubo un error al eliminar la categoría.");
        }
    };

    const guardarCategoria = async () => {
        if (!nuevaCategoria) return mostrarAviso("Ingresa el nombre de la categoría.");
        
        let idArea = selectedSubseccion.id;
        if (!idArea) {
            idArea = await obtenerIdZona(selectedSubseccion.nombre);
        }
        if (!idArea) return mostrarAviso("Error: No se encontró el ID de la habitación.");

        try {
            const token = localStorage.getItem('agente_token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-categories`, {
                property_area_id: idArea,
                name: nuevaCategoria
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setModalCategoriaVisible(false);
            setNuevaCategoria('');
            setCreandoNuevaCategoria(false);
            await cargarReporte(); 
        } catch (error) {
            console.error(error);
            mostrarAviso("Hubo un error al registrar la categoría.");
        }
    };

    const guardarElemento = async () => {
        if (!elementoActual.sub_category) return mostrarAviso("El nombre/tipo del elemento es obligatorio.");
        
        let idArea = selectedSubseccion.id;
        if (!idArea) {
            idArea = await obtenerIdZona(selectedSubseccion.nombre);
        }
        if (!idArea) return mostrarAviso("Error: No se encontró el ID de la habitación. (Intenta recargar la página)");

        try {
            const token = localStorage.getItem('agente_token');
            const formData = new FormData();
            formData.append('property_area_id', idArea);
            formData.append('category', elementoActual.category);
            formData.append('sub_category', elementoActual.sub_category);
            formData.append('brand', elementoActual.brand);
            formData.append('model_or_color', elementoActual.model_or_color);
            formData.append('quantity', elementoActual.quantity);
            formData.append('serial_number', elementoActual.serial_number);
            formData.append('observations', elementoActual.observations);
            formData.append('status', elementoActual.status || 'Bueno');
            formData.append('unit', 'PZA');

            if (selectedFile) formData.append('image', selectedFile);
            if (selectedFileSecondary) formData.append('image_secondary', selectedFileSecondary);
            galeriaArchivos.forEach((file) => formData.append('gallery[]', file));

            if (elementoActual.id) {
                formData.append('_method', 'PUT');
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-components/${elementoActual.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_BASE_URL}/property-components`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
                });
            }

            mostrarAviso(elementoActual.id ? "Elemento actualizado." : "Elemento agregado.");
            setModalElementoVisible(false);
            setElementoActual({ id: null, sub_category: '', brand: '', model_or_color: '', quantity: 1, category: '', serial_number: '', observations: '', status: 'Bueno' });
            setPreviewImg(null);
            setPreviewImgSecondary(null);
            setSelectedFile(null);
            setSelectedFileSecondary(null);
            setGaleriaArchivos([]);
            setGaleriaExistente([]);
            await cargarReporte();

        } catch (error) {
            console.error("Error al guardar elemento:", error);
            mostrarAviso("Hubo un error al guardar el elemento.");
        }
    };

    // --- FUNCIONES AUXILIARES DEL COTIZADOR ---
    const agregarFila = (tipo) => {
        if (tipo === 'concepto') setFilasConceptos([...filasConceptos, { descripcion: '', cantidad: 0, precio_u: 0 }]);
        if (tipo === 'material') setFilasMateriales([...filasMateriales, { nombre: '', cantidad: 0, costo_u: 0 }]);
        if (tipo === 'basica') setHerramientasBasicas([...herramientasBasicas, { nombre: '', cantidad: 1 }]);
        if (tipo === 'especial') setHerramientasEspeciales([...herramientasEspeciales, { nombre: '', cantidad: 1 }]);
    };

    const eliminarFila = (index, tipo) => {
        if (tipo === 'concepto') setFilasConceptos(filasConceptos.filter((_, i) => i !== index));
        if (tipo === 'material') setFilasMateriales(filasMateriales.filter((_, i) => i !== index));
        if (tipo === 'basica') setHerramientasBasicas(herramientasBasicas.filter((_, i) => i !== index));
        if (tipo === 'especial') setHerramientasEspeciales(herramientasEspeciales.filter((_, i) => i !== index));
    };

    const actualizarFila = (index, campo, valor, tipo) => {
        const actualizar = (prev) => prev.map((fila, i) => i === index ? { ...fila, [campo]: valor } : fila);
        if (tipo === 'concepto') setFilasConceptos(actualizar);
        if (tipo === 'material') setFilasMateriales(actualizar);
        if (tipo === 'basica') setHerramientasBasicas(actualizar);
        if (tipo === 'especial') setHerramientasEspeciales(actualizar);
    };

    const manejarArchivo = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivoFisico(file);
            setArchivoPreview(URL.createObjectURL(file));
        }
    };

    const subtotalGeneral = filasConceptos.reduce((acc, f) => acc + (Number(f.cantidad) * Number(f.precio_u)), 0) + 
                         filasMateriales.reduce((acc, f) => acc + (Number(f.cantidad) * Number(f.costo_u)), 0);
    const ivaGeneral = subtotalGeneral * IVA_RATE;
    const subtotalConIva = subtotalGeneral + ivaGeneral;
    const comisionMPGeneral = (subtotalConIva * 0.0349 + 4) * 1.16;
    const totalGeneral = subtotalConIva + comisionMPGeneral;

    const guardarCotizacion = async () => {
        try {
            const data = new FormData();
            data.append('service_id', id);
            data.append('type', metodoCotizacion);

            if (metodoCotizacion === 'manual') {
                data.append('concept', JSON.stringify({
                    conceptos: filasConceptos,
                    materiales: filasMateriales,
                    herramientas_basicas: herramientasBasicas,
                    herramientas_especiales: herramientasEspeciales
                }));
                data.append('estimated_amount', totalGeneral.toFixed(2));
                data.append('observations', observaciones);
            } else {
                if (!archivoFisico) return mostrarAviso("Selecciona un archivo");
                data.append('file', archivoFisico);
            }

            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/cotizaciones`, data);
            mostrarAviso("¡Cotización guardada exitosamente!");
            setMostrarCotizacion(false);
        } catch (error) {
            console.error(error);
            mostrarAviso("Error al guardar la cotización.");
        }
    };

    // --- RENDERIZADO DE CARGA ---
    if (cargando) return <div className="loading-screen">Cargando datos del reporte...</div>;
    if (!datosBD || !id || id === 'null' || id === 'undefined') {
        return (
            <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem' }}>📋</div>
                <h2 style={{ color: '#f26624' }}>No se encontró el levantamiento</h2>
                <p style={{ fontSize: '1.2rem', color: '#666', maxWidth: '400px' }}>
                    Solicita un levantamiento de esta propiedad para poder ver su reporte técnico.
                </p>
                <small style={{ color: '#999' }}>Redirigiendo a mis propiedades en 5 segundos...</small>
                <button 
                    onClick={() => navigate('/propiedades')}
                    style={{
                        padding: '12px 30px',
                        backgroundColor: '#f26624',
                        color: 'white',
                        border: 'none',
                        borderRadius: '25px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(242, 102, 36, 0.3)'
                    }}
                >
                    IR A MIS PROPIEDADES
                </button>
            </div>
        );
    }

    const userData = JSON.parse(localStorage.getItem('agente_session'))?.userData;
    const isClient = Number(userData?.role_id) === 3;

    return (
        <div 
            className={`rep-container ${isClient ? 'is-client-view' : ''}`}
            style={isClient ? { height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}}
        >
            {/* --- SIDEBAR (Oculto para clientes) --- */}
            {!isClient && (
                <aside className="rep-sidebar">
                    <img src={logo} alt="Logo" className="side-logo" onClick={() => navigate('/')} />
                    <div className="side-info">
                        <span className="id-badge">{datosBD.identificador_curp}</span>
                        <h2>{datosBD.propietario}</h2>
                        <div className="rep-direccion-box">
                            <p><strong>Dirección:</strong><br/>{datosBD.direccion}</p>
                        </div>
                        {/* Solo el Admin puede generar cotizaciones */}
                        {userData?.role_id !== 3 && (
                            <button className="btn-cotizacion" onClick={() => setMostrarCotizacion(true)}>
                                + GENERAR COTIZACIÓN
                            </button>
                        )}
                        <hr className="side-hr" />
                        <p><strong>Técnico:</strong><br/>{datosBD.tecnico}</p>
                        <p><strong>Visita:</strong><br/>{datosBD.fecha_programada}</p>
                    </div>
                    <button className="btn-regresar" onClick={() => navigate(-1)}>← VOLVER</button>
                </aside>
            )}


            {/* --- CONTENIDO PRINCIPAL (LEVANTAMIENTO) --- */}
            <main 
                className="rep-main-content"
                style={isClient ? { flex: 1, overflowY: 'auto', display: 'block', padding: '10px 0', maxWidth: '100%', width: '100%', margin: 0 } : {}}
            >
                <header className="main-banner" style={isClient ? { maxWidth: '1000px', margin: '0 auto 20px auto', width: '100%' } : {}}>
                    <img src={datosBD.foto_fachada || casaImg} alt="Propiedad" />
                    <div className="banner-text">
                        <h1 style={{ margin: 0 }}>{datosBD.propiedad_nombre || datosBD.titulo}</h1>
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '1.1rem', fontWeight: '500' }}>
                            {datosBD.titulo}
                        </p>
                    </div>
                </header>

                <section className="reporte-flujo" style={isClient ? { maxWidth: '1000px', margin: '0 auto', width: '100%' } : {}}>
                    {/* VALIDACIÓN DE SEGURIDAD PARA EVITAR EL ERROR .MAP */}
                    {Array.isArray(datosBD.secciones) && datosBD.secciones.length > 0 ? (() => {
                        // Agrupar los cuartos por Zona usando la relación padre-hijo de la BD
                        const zonasMap = {};
                        
                        // 1. Identificar Zonas principales (sin parent)
                        datosBD.secciones.filter(s => !s.parent).forEach(sec => {
                            zonasMap[sec.id] = {
                                ...sec,
                                titulo: sec.titulo || "OTRAS ÁREAS",
                                cuartos: []
                            };
                        });

                        // 2. Asignar sub-áreas (cuartos) a su Zona padre correspondiente
                        datosBD.secciones.filter(s => s.parent).forEach(sec => {
                            const parentId = sec.parent.id;
                            if (zonasMap[parentId]) {
                                zonasMap[parentId].cuartos.push({
                                    ...sec,
                                    nombre: sec.titulo,
                                    categorias: sec.subSecciones
                                });
                            } else {
                                // Fallback: si el padre no está registrado como sección principal
                                zonasMap[parentId] = {
                                    id: parentId,
                                    titulo: sec.parent.name || "OTRAS ÁREAS",
                                    cuartos: [{
                                        ...sec,
                                        nombre: sec.titulo,
                                        categorias: sec.subSecciones
                                    }]
                                };
                            }
                        });

                        // 3. Fallback de compatibilidad: si una zona principal tiene inventario directo 
                        // pero no tiene sub-áreas, la mostramos como su propia tarjeta 'General'
                        Object.values(zonasMap).forEach(z => {
                            const tieneInventarioDirecto = z.subSecciones && z.subSecciones.some(cat => cat.inventario && cat.inventario.length > 0);
                            if (z.cuartos.length === 0 && tieneInventarioDirecto) {
                                z.cuartos.push({
                                    ...z,
                                    nombre: 'GENERAL',
                                    categorias: z.subSecciones
                                });
                            }
                        });

                        // Ordenar las categorías para mantener la jerarquía visual
                        const ordenDeseado = ["HABITACIONES", "BAÑOS", "COCINA", "ÁREAS SOCIALES", "ZONAS EXTERIORES", "EXTERIORES / PATIOS", "COCHERA / ACCESOS", "CONECTIVIDAD / PASILLOS", "OTRAS ÁREAS"];
                        const zonas = Object.values(zonasMap).sort((a, b) => {
                            const idxA = ordenDeseado.indexOf((a.titulo || "").toUpperCase());
                            const idxB = ordenDeseado.indexOf((b.titulo || "").toUpperCase());
                            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                        });

                        const renderZonas = zonas.map((zona, idx) => (
                            <div key={`zona-${idx}`} className="zona-section-wrapper" style={{ marginBottom: '40px' }}>
                                {/* BARRA DE SECCIÓN PREMIUM */}
                                <div className="section-divider-bar" style={{ 
                                    background: 'linear-gradient(90deg, #f26624 0%, #ff8c52 100%)', 
                                    padding: '12px 25px', 
                                    borderRadius: '12px 12px 0 0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 4px 12px rgba(242, 102, 36, 0.2)'
                                }}>
                                    <h3 style={{ margin: 0, color: 'white', textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px', fontWeight: '800' }}>
                                        {editandoZonaId === zona.titulo ? (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    type="text" 
                                                    value={nuevoNombreZona} 
                                                    onChange={(e) => setNuevoNombreZona(e.target.value.toUpperCase())}
                                                    style={{ padding: '4px 10px', fontSize: '1rem', borderRadius: '4px', border: 'none', outline: 'none', color: '#333' }}
                                                    autoFocus
                                                />
                                                <button onClick={() => handleGuardarEdicionZona(zona.id, zona.titulo)} style={{ padding: '4px 10px', background: 'white', color: '#f26624', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                                                <button onClick={() => setEditandoZonaId(null)} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.3)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span>{zona.titulo === 'ZONAS DE LA PROPIEDAD' ? 'ÁREAS REGISTRADAS' : zona.titulo}</span>
                                                {!isClient && (
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button 
                                                            onClick={() => { setEditandoZonaId(zona.titulo); setNuevoNombreZona(zona.titulo); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'white', opacity: 0.8 }}
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleEliminarZona(zona.id, zona.titulo)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'white', opacity: 0.8 }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </h3>
                                    <span style={{ color: 'white', opacity: 0.8, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {zona.cuartos.length} {zona.cuartos.length === 1 ? 'ÁREA' : 'ÁREAS'}
                                    </span>
                                </div>

                                {/* CONTENEDOR DE TARJETAS */}
                                <div className="seccion-bloque" style={{ 
                                    padding: '30px', 
                                    backgroundColor: '#fff', 
                                    borderRadius: '0 0 12px 12px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                    border: '1px solid #eee',
                                    borderTop: 'none'
                                }}>
                                    <div className="properties-grid" style={{ 
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                        gap: '25px',
                                        justifyContent: 'start'
                                    }}>
                                        {zona.cuartos && zona.cuartos.length > 0 && zona.cuartos.map((cuarto, cIdx) => {
                                                const areaFoto = cuarto.foto || cuarto.image_path || cuarto.image || cuarto.foto_url || logo;
                                                
                                                // Calcular cantidad total de items en el cuarto
                                                let totalItems = 0;
                                                if (Array.isArray(cuarto.categorias)) {
                                                    cuarto.categorias.forEach(cat => {
                                                        totalItems += cat.inventario?.length || 0;
                                                    });
                                                }

                                                return (
                                                    <div key={`cuarto-${idx}-${cIdx}`} className="property-card" onClick={() => setSelectedSubseccion(cuarto)} style={{ width: '100%', margin: 0 }}>
                                                        <img 
                                                            src={areaFoto} 
                                                            alt={cuarto.nombre} 
                                                            className="property-image" 
                                                            style={{ 
                                                                objectFit: areaFoto === logo ? 'contain' : 'cover', 
                                                                padding: areaFoto === logo ? '20px' : '0',
                                                                backgroundColor: areaFoto === logo ? '#f9f9f9' : 'transparent'
                                                            }} 
                                                        />
                                                        <div className="property-overlay">
                                                            <h3 className="property-title-overlay" style={{ fontSize: '1rem' }}>{cuarto.nombre}</h3>
                                                            <button className="btn-overlay" style={{ fontSize: '0.8rem', padding: '8px 15px' }}>
                                                                VER INVENTARIO ({totalItems})
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                        })}
                                        
                                        {/* TARJETA PARA AGREGAR NUEVO ESPACIO DENTRO DE LA ZONA */}
                                        <div 
                                            className="property-card add-space-card" 
                                            onClick={() => {
                                                setZonaParaNuevoEspacio(zona.id);
                                                setMostrarModalAddEspacio(true);
                                            }}
                                            style={{ 
                                                width: '100%', 
                                                margin: 0, 
                                                border: '2px dashed #ccc', 
                                                backgroundColor: '#fafafa', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                minHeight: '180px', 
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                borderRadius: '8px'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f26624'; e.currentTarget.style.backgroundColor = '#fff5f0'; e.currentTarget.style.color = '#f26624'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.backgroundColor = '#fafafa'; e.currentTarget.style.color = 'inherit'; }}
                                        >
                                            <div style={{ fontSize: '2rem', color: 'inherit', marginBottom: '10px' }}>+</div>
                                            <h3 style={{ fontSize: '1rem', color: 'inherit', margin: 0, fontWeight: 'bold' }}>AÑADIR ESPACIO</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ));

                        return (
                            <>
                                {renderZonas}
                                <div 
                                    className="seccion-bloque add-zone-block" 
                                    onClick={() => setMostrarModalAddZona(true)}
                                    style={{ 
                                        padding: '30px', 
                                        backgroundColor: '#f9f9f9', 
                                        border: '2px dashed #ccc', 
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        marginTop: '20px',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f26624'; e.currentTarget.style.backgroundColor = '#fff5f0'; e.currentTarget.style.color = '#f26624'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.backgroundColor = '#f9f9f9'; e.currentTarget.style.color = 'inherit'; }}
                                >
                                    <div style={{ fontSize: '2rem', marginBottom: '10px', color: 'inherit' }}>+</div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'inherit' }}>AGREGAR NUEVA ZONA</h3>
                                    <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>Añadir áreas, cuartos o espacios por remodelación</p>
                                </div>
                            </>
                        );
                    })() : (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '50px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏢</div>
                            <h3 style={{ color: '#444' }}>No hay áreas registradas</h3>
                            <p style={{ color: '#888', marginBottom: '25px' }}>Esta propiedad no tiene zonas ni inventario registrado aún.</p>
                            <button 
                                onClick={() => setMostrarModalAddZona(true)}
                                style={{ padding: '12px 25px', backgroundColor: '#f26624', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + AGREGAR NUEVA ZONA
                            </button>
                        </div>
                    )}
                </section>
                
               
                {Array.isArray(datosBD.secciones) && datosBD.secciones.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#ccc', textAlign: 'center', marginTop: '20px' }}>
                        DEBUG KEYS: {Object.keys(datosBD.secciones[0]).join(', ')}
                        {datosBD.secciones[0].parent ? ` | PARENT: ${Object.keys(datosBD.secciones[0].parent).join(', ')}` : ''}
                    </div>
                )}

            </main>

            
            {mostrarModalAddZona && createPortal(
                <div className="lev-modal-overlay" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="cot-modal-card" style={{ maxWidth: '500px', width: '90%', borderRadius: '16px', overflow: 'hidden' }}>
                        <div className="cot-modal-header" style={{ backgroundColor: '#333', padding: '20px', textAlign: 'center', color: 'white' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🏠</div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>NUEVA ZONA</h3>
                            <button className="cot-close-btn" onClick={() => setMostrarModalAddZona(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="cot-modal-body dinamico" style={{ padding: '30px', backgroundColor: '#f5f5f5' }}>
                            <h4 style={{ textAlign: 'center', fontSize: '0.9rem', color: '#555', marginBottom: '20px', textTransform: 'uppercase' }}>Selecciona el área a agregar</h4>
                            
                            <div className="options-grid" style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', 
                                maxHeight: '300px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px'
                            }}>
                                {OPCIONES_ZONAS.map(opc => (
                                    <button 
                                        key={opc}
                                        onClick={() => setNuevaZonaOpcion(opc)}
                                        style={{
                                            padding: '12px 10px', borderRadius: '8px', border: '1px solid #ddd',
                                            backgroundColor: nuevaZonaOpcion === opc ? '#fff1e6' : 'white',
                                            color: nuevaZonaOpcion === opc ? '#f26624' : '#555',
                                            fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                                            borderColor: nuevaZonaOpcion === opc ? '#f26624' : '#ddd',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        {opc}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setNuevaZonaOpcion('OTRA...')}
                                    style={{
                                        padding: '12px 10px', borderRadius: '8px', border: '1px solid #ddd',
                                        backgroundColor: nuevaZonaOpcion === 'OTRA...' ? '#fff1e6' : 'white',
                                        color: nuevaZonaOpcion === 'OTRA...' ? '#f26624' : '#555',
                                        fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                                        borderColor: nuevaZonaOpcion === 'OTRA...' ? '#f26624' : '#ddd',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    OTRA...
                                </button>
                            </div>
                            
                            {nuevaZonaOpcion === 'OTRA...' && (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <input 
                                        type="text" 
                                        className="custom-input" 
                                        value={nuevaZonaTexto} 
                                        onChange={(e) => setNuevaZonaTexto(e.target.value.toUpperCase())}
                                        placeholder="Escribe el nombre de la zona..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', color: '#333', backgroundColor: '#fff', textAlign: 'center', fontWeight: 'bold' }}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button 
                                    onClick={() => setMostrarModalAddZona(false)}
                                    style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#555', border: '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    onClick={handleCrearZona} 
                                    disabled={guardandoArea || !nuevaZonaOpcion}
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#f26624', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', opacity: (guardandoArea || !nuevaZonaOpcion) ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    {guardandoArea ? <Loader2 className="spinner" size={20} /> : null}
                                    {guardandoArea ? 'GUARDANDO...' : 'AGREGAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {mostrarModalAddEspacio && createPortal(
                <div className="lev-modal-overlay" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="cot-modal-card" style={{ maxWidth: '500px', width: '90%', borderRadius: '16px', overflow: 'hidden' }}>
                        <div className="cot-modal-header" style={{ backgroundColor: '#333', padding: '20px', textAlign: 'center', color: 'white' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🏠</div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>NUEVA HABITACIÓN</h3>
                            <button className="cot-close-btn" onClick={() => { setMostrarModalAddEspacio(false); setZonaParaNuevoEspacio(null); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="cot-modal-body dinamico" style={{ padding: '30px', backgroundColor: '#f5f5f5' }}>
                            <h4 style={{ textAlign: 'center', fontSize: '0.9rem', color: '#555', marginBottom: '20px', textTransform: 'uppercase' }}>Selecciona las áreas a agregar</h4>
                            
                            <div className="options-grid" style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', 
                                maxHeight: '300px', overflowY: 'auto', paddingRight: '5px', marginBottom: '20px'
                            }}>
                                {OPCIONES_ESPACIOS.map(opc => (
                                    <button 
                                        key={opc}
                                        onClick={() => setNuevoEspacioOpcion(opc)}
                                        style={{
                                            padding: '12px 10px', borderRadius: '8px', border: '1px solid #ddd',
                                            backgroundColor: nuevoEspacioOpcion === opc ? '#fff1e6' : 'white',
                                            color: nuevoEspacioOpcion === opc ? '#f26624' : '#555',
                                            fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                                            borderColor: nuevoEspacioOpcion === opc ? '#f26624' : '#ddd',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        {opc}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setNuevoEspacioOpcion('OTRA...')}
                                    style={{
                                        padding: '12px 10px', borderRadius: '8px', border: '1px solid #ddd',
                                        backgroundColor: nuevoEspacioOpcion === 'OTRA...' ? '#fff1e6' : 'white',
                                        color: nuevoEspacioOpcion === 'OTRA...' ? '#f26624' : '#555',
                                        fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                                        borderColor: nuevoEspacioOpcion === 'OTRA...' ? '#f26624' : '#ddd',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    OTRA...
                                </button>
                            </div>
                            
                            {nuevoEspacioOpcion === 'OTRA...' && (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <input 
                                        type="text" 
                                        className="custom-input" 
                                        value={nuevoEspacioTexto} 
                                        onChange={(e) => setNuevoEspacioTexto(e.target.value.toUpperCase())}
                                        placeholder="Escribe el nombre de la habitación..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', color: '#333', backgroundColor: '#fff', textAlign: 'center', fontWeight: 'bold' }}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button 
                                    onClick={() => { setMostrarModalAddEspacio(false); setZonaParaNuevoEspacio(null); }}
                                    style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#555', border: '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    onClick={handleCrearEspacio} 
                                    disabled={guardandoArea || !nuevoEspacioOpcion}
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#f26624', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', opacity: (guardandoArea || !nuevoEspacioOpcion) ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    {guardandoArea ? <Loader2 className="spinner" size={20} /> : null}
                                    {guardandoArea ? 'GUARDANDO...' : 'AGREGAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- MODAL DEL COTIZADOR --- */}
            {mostrarCotizacion && createPortal(
                <div className="lev-modal-overlay" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="cot-modal-card wide">
                        <div className="cot-modal-header">
                            <h3>NUEVA COTIZACIÓN - {datosBD.identificador_curp}</h3>
                            <button className="cot-close-btn" onClick={() => setMostrarCotizacion(false)}>×</button>
                        </div>

                        <div className="cot-tabs-selector">
                            <button className={metodoCotizacion === 'manual' ? 'active' : ''} onClick={() => setMetodoCotizacion('manual')}>📝 Registro Manual</button>
                            <button className={metodoCotizacion === 'archivo' ? 'active' : ''} onClick={() => setMetodoCotizacion('archivo')}>📎 Cargar Archivo</button>
                        </div>

                        <div className="cot-modal-body dinamico">
                            {metodoCotizacion === 'manual' ? (
                                <>
                                    <div className="cot-section">
                                        <h4 className="coti-section-title">1. CONCEPTOS DE SERVICIO</h4>
                                        <table className="coti-table">
                                            <thead>
                                                <tr><th>DESCRIPCIÓN</th><th>CANT.</th><th>PRECIO U.</th><th>SUBTOTAL</th><th></th></tr>
                                            </thead>
                                            <tbody>
                                                {filasConceptos.map((f, i) => (
                                                    <tr key={i}>
                                                        <td><input type="text" value={f.descripcion} onChange={(e) => actualizarFila(i, 'descripcion', e.target.value, 'concepto')} /></td>
                                                        <td><input type="number" value={f.cantidad} onChange={(e) => actualizarFila(i, 'cantidad', e.target.value, 'concepto')} /></td>
                                                        <td><input type="number" value={f.precio_u} onChange={(e) => actualizarFila(i, 'precio_u', e.target.value, 'concepto')} /></td>
                                                        <td className="subtotal-cell">${(f.cantidad * f.precio_u).toLocaleString()}</td>
                                                        <td><button className="btn-delete" onClick={() => eliminarFila(i, 'concepto')}>🗑️</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button className="btn-add-row" onClick={() => agregarFila('concepto')}>+ Agregar Concepto</button>
                                    </div>

                                    <div className="cot-section">
                                        <h4 className="coti-section-title">2. MATERIALES</h4>
                                        <table className="coti-table">
                                            <thead>
                                                <tr><th>MATERIAL</th><th>CANT.</th><th>COSTO U.</th><th>SUBTOTAL</th><th></th></tr>
                                            </thead>
                                            <tbody>
                                                {filasMateriales.map((f, i) => (
                                                    <tr key={i}>
                                                        <td><input type="text" value={f.nombre} onChange={(e) => actualizarFila(i, 'nombre', e.target.value, 'material')} /></td>
                                                        <td><input type="number" value={f.cantidad} onChange={(e) => actualizarFila(i, 'cantidad', e.target.value, 'material')} /></td>
                                                        <td><input type="number" value={f.costo_u} onChange={(e) => actualizarFila(i, 'costo_u', e.target.value, 'material')} /></td>
                                                        <td className="subtotal-cell">${(f.cantidad * f.costo_u).toLocaleString()}</td>
                                                        <td><button className="btn-delete" onClick={() => eliminarFila(i, 'material')}>🗑️</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button className="btn-add-row" onClick={() => agregarFila('material')}>+ Agregar Material</button>
                                    </div>

                                    <div className="cot-grid-tools">
                                        <div className="cot-section half">
                                            <h4 className="coti-section-title">3.1 HERRAMIENTAS BÁSICAS</h4>
                                            {herramientasBasicas.map((h, i) => (
                                                <div key={i} className="tool-row">
                                                    <input type="text" value={h.nombre} onChange={(e) => actualizarFila(i, 'nombre', e.target.value, 'basica')} />
                                                    <button className="btn-delete-small" onClick={() => eliminarFila(i, 'basica')}>×</button>
                                                </div>
                                            ))}
                                            <button className="btn-add-tool" onClick={() => agregarFila('basica')}>+</button>
                                        </div>
                                        <div className="cot-section half">
                                            <h4 className="coti-section-title">3.2 ESPECIALES</h4>
                                            {herramientasEspeciales.map((h, i) => (
                                                <div key={i} className="tool-row">
                                                    <input type="text" value={h.nombre} onChange={(e) => actualizarFila(i, 'nombre', e.target.value, 'especial')} />
                                                    <button className="btn-delete-small" onClick={() => eliminarFila(i, 'especial')}>×</button>
                                                </div>
                                            ))}
                                            <button className="btn-add-tool" onClick={() => agregarFila('especial')}>+</button>
                                        </div>
                                    </div>

                                    <div className="cot-section">
                                        <label>Observaciones Adicionales</label>
                                        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows="3" placeholder="Notas internas..." />
                                    </div>
                                </>
                            ) : (
                                <div className="cot-upload-container">
                                    <div 
                                        onClick={() => handlePhotoBoxClick('cotizador')}
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            gap: '15px',
                                            border: '3px dashed #f26624',
                                            borderRadius: '15px',
                                            padding: '40px 20px',
                                            backgroundColor: '#fff5f0',
                                            cursor: 'pointer',
                                            minHeight: '250px',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffe5d9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff5f0'}
                                    >
                                        {!archivoPreview ? (
                                            <>
                                                <div style={{ backgroundColor: '#f26624', color: 'white', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
                                                    📁
                                                </div>
                                                <h3 style={{ color: '#f26624', margin: '10px 0 0 0' }}>Toca aquí para subir un archivo</h3>
                                                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Soporta PDF, DOC, JPG, PNG o usa tu cámara</p>
                                            </>
                                        ) : (
                                            <div className="preview-box" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                {archivoFisico?.type === 'application/pdf' ? (
                                                    <>
                                                        <div style={{ fontSize: '60px' }}>📄</div>
                                                        <div className="pdf-placeholder" style={{ fontSize: '1.2rem', color: '#f26624', fontWeight: 'bold', marginTop: '10px' }}>{archivoFisico.name}</div>
                                                    </>
                                                ) : (
                                                    <img src={archivoPreview} className="img-preview" alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '2px solid #f26624' }} />
                                                )}
                                                <p style={{ color: '#666', marginTop: '15px', fontSize: '0.9rem', textDecoration: 'underline' }}>Haz clic para cambiar de archivo</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <input type="file" ref={cameraRef} hidden accept="image/*" onChange={manejarArchivo} />
                                    <input type="file" ref={galleryRef} hidden accept="image/*" onChange={manejarArchivo} />
                                    <input type="file" ref={fileRef} hidden accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={manejarArchivo} />
                                </div>
                            )}
                        </div>

                        <div className="cot-modal-footer dinamico">
                            <div className="total-box" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                              {(() => {
                                const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                return (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa' }}>
                                      <span>Subtotal</span><span>{fmt(subtotalGeneral)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa' }}>
                                      <span>IVA (16%)</span><span>{fmt(ivaGeneral)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#009ee3', alignItems: 'center' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <img src={mpLogo} alt="MP" style={{ height: '12px', objectFit: 'contain' }} /> Comisión (Tarifa Oficial)
                                      </span>
                                      <span>{fmt(comisionMPGeneral)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #444', paddingTop: '4px', marginTop: '2px' }}>
                                      <span style={{ fontWeight: 'bold', color: '#fff' }}>TOTAL:</span>
                                      <strong style={{ color: '#f26624', fontSize: '1.1rem' }}>{fmt(totalGeneral)}</strong>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="actions">
                                <button className="btn-secundario" onClick={() => setMostrarCotizacion(false)}>CANCELAR</button>
                                <button className="btn-primario" onClick={guardarCotizacion}>GUARDAR COTIZACIÓN</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- MODAL SELECCIONAR ORIGEN DE IMAGEN --- */}
            {isFileMenuOpen && createPortal(
                <div className="lev-modal-overlay" onClick={() => setIsFileMenuOpen(false)} style={{ zIndex: 9999999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.8)' }}>
                    <div className="cot-modal-card" style={{ maxWidth: '400px', width: '90%', padding: '0', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '20px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: '#F26522', borderBottom: '1px solid #333', margin: 0, padding: '20px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900' }}>SELECCIONAR ORIGEN</h3>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <button 
                                onClick={() => selectFileSource('camera')}
                                style={{ background: 'transparent', border: 'none', padding: '20px', color: 'white', borderBottom: '1px solid #333', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                📷 TOMAR FOTO (CÁMARA)
                            </button>
                            <button 
                                onClick={() => selectFileSource('gallery')}
                                style={{ background: 'transparent', border: 'none', padding: '20px', color: 'white', borderBottom: '1px solid #333', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                🖼️ ELEGIR DE GALERÍA
                            </button>
                            {targetPhoto === 'cotizador' && (
                                <button 
                                    onClick={() => selectFileSource('file')}
                                    style={{ background: 'transparent', border: 'none', padding: '20px', color: 'white', borderBottom: '1px solid #333', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                >
                                    📄 SUBIR DOCUMENTO (PDF)
                                </button>
                            )}
                            <button 
                                onClick={() => setIsFileMenuOpen(false)}
                                style={{ background: '#333', border: 'none', padding: '15px', color: '#ff4d4d', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- MODAL PARA VER INVENTARIO DE SUBSECCIÓN --- */}
            {selectedSubseccion && createPortal(
                <div className="lev-modal-overlay" onClick={() => setSelectedSubseccion(null)} style={{ zIndex: 999998, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="cot-modal-card wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="cot-modal-header">
                            <div className="header-content">
                                <span className="header-icon" style={{ padding: '5px 10px', fontSize: '1.2rem', background: '#333' }}>📋</span>
                                <div>
                                    <h3 style={{ textTransform: 'uppercase' }}>{selectedSubseccion.nombre}</h3>
                                    {selectedSubseccion.nota && <p>Nota: {selectedSubseccion.nota}</p>}
                                </div>
                            </div>
                            <button className="close-x" onClick={() => setSelectedSubseccion(null)}>×</button>
                        </div>
                        
                        <div className="cot-modal-body dinamico" style={{ padding: '20px', overflowY: 'auto' }}>
                            {selectedSubseccion.foto && (
                                <div style={{ width: '100%', height: '200px', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <img src={selectedSubseccion.foto || selectedSubseccion.image_path || selectedSubseccion.image || selectedSubseccion.foto_url} alt="Referencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                                <button onClick={() => setModalCategoriaVisible(true)} style={{ padding: '10px 20px', background: '#f26624', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={18} /> NUEVA CATEGORÍA
                                </button>
                            </div>

                            {Array.isArray(selectedSubseccion.categorias) && selectedSubseccion.categorias.length > 0 ? (
                                selectedSubseccion.categorias.map((cat, catIdx) => (
                                    <div key={`cat-${catIdx}`} style={{ marginBottom: '30px' }}>
                                        <h4 className="coti-section-title" style={{ width: '100%', borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#f26624', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ background: '#f26624', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem' }}>{cat.nombre}</span>
                                            {cat.id && (
                                                <button 
                                                    onClick={() => handleEliminarCategoria(cat.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', padding: '0', display: 'flex', alignItems: 'center' }}
                                                    title="Eliminar Categoría"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </h4>
                                        <div className="table-responsive">
                                            <table className="tabla-inventario">
                                                <thead>
                                                    <tr>
                                                        <th>Elemento</th>
                                                        <th>Marca / Modelo</th>
                                                        <th>Estado</th>
                                                        <th className="txt-center">Cant.</th>
                                                        <th className="txt-center">Foto</th>
                                                        <th className="txt-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.isArray(cat.inventario) && cat.inventario.length > 0 ? (
                                                        cat.inventario.map((inv, iIdx) => (
                                                            <tr key={`mod-inv-${catIdx}-${iIdx}`}>
                                                                <td className="bold">{inv.nombre || inv.categoria}</td>
                                                                <td>
                                                                    {inv.marca || '-'} {inv.modelo && inv.modelo !== 'N/A' ? `/ ${inv.modelo}` : ''}
                                                                    {inv.observaciones && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Nota: {inv.observaciones}</div>}
                                                                </td>
                                                                <td>
                                                                    {inv.estado ? (
                                                                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', background: '#e9ecef', color: '#495057' }}>{inv.estado}</span>
                                                                    ) : '-'}
                                                                </td>
                                                                <td className="col-cant">{inv.cantidad}</td>
                                                                 <td className="txt-center">
                                                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                                        {inv.foto && (
                                                                            <img 
                                                                                src={inv.foto} 
                                                                                alt={inv.nombre} 
                                                                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid #ddd' }} 
                                                                                onClick={() => abrirVisor([inv.foto, inv.foto_secundaria, ...(inv.galleries?.map(g => g.image_path) || [])], 0)}
                                                                            />
                                                                        )}
                                                                        {inv.foto_secundaria && (
                                                                            <img 
                                                                                src={inv.foto_secundaria} 
                                                                                alt="Secundaria" 
                                                                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid #ddd', borderStyle: 'dashed', borderColor: '#f26624' }} 
                                                                                onClick={() => abrirVisor([inv.foto, inv.foto_secundaria, ...(inv.galleries?.map(g => g.image_path) || [])], 1)}
                                                                            />
                                                                        )}
                                                                        {!inv.foto && !inv.foto_secundaria && (
                                                                            <span style={{ color: '#ccc', fontSize: '0.8rem' }}>S/F</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="txt-center">
                                                                    <button onClick={() => abrirModalEditarElemento(inv, cat.nombre)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }} title="Editar">✏️</button>
                                                                    <button onClick={() => handleEliminarElemento(inv.id || inv.component_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#e63946', padding: '0 5px' }} title="Eliminar">🗑️</button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="6" className="txt-center" style={{ padding: '15px', color: '#888', fontStyle: 'italic' }}>
                                                                Sin ítems en esta categoría
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button 
                                            onClick={() => abrirModalAgregarElemento(cat.nombre)}
                                            style={{ marginTop: '10px', padding: '10px 15px', background: '#fff5f0', border: '2px dashed #f26624', color: '#f26624', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', transition: 'all 0.2s ease' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f26624'; e.currentTarget.style.color = 'white'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff5f0'; e.currentTarget.style.color = '#f26624'; }}
                                        >
                                            + AGREGAR ELEMENTO A {cat.nombre}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#666', fontStyle: 'italic', border: '1px dashed #ccc', borderRadius: '8px' }}>
                                    No hay categorías ni inventario registrado en este cuarto.
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {selectedImage && createPortal(
                <div 
                    className="lev-modal-overlay" 
                    onClick={() => setSelectedImage(null)} 
                    style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', cursor: 'zoom-out', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.9)' }}
                >
                    <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Botón Anterior */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => navegarVisor(-1)}
                                style={{ position: 'absolute', left: '-60px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', fontSize: '2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            >
                                ‹
                            </button>
                        )}

                        <img 
                            src={selectedImage} 
                            alt="Vista ampliada" 
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '90vh', 
                                objectFit: 'contain', 
                                borderRadius: '8px', 
                                boxShadow: '0 5px 25px rgba(0,0,0,0.5)' 
                            }} 
                        />

                        {/* Botón Siguiente */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => navegarVisor(1)}
                                style={{ position: 'absolute', right: '-60px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', fontSize: '2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            >
                                ›
                            </button>
                        )}

                        {/* Contador */}
                        {viewerImages.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '-40px', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {viewerIndex + 1} / {viewerImages.length}
                            </div>
                        )}

                        <button 
                            onClick={() => setSelectedImage(null)}
                            style={{ 
                                position: 'absolute', 
                                top: '-20px', 
                                right: '-20px', 
                                background: '#f26624', 
                                color: 'white', 
                                border: '2px solid white', 
                                borderRadius: '50%', 
                                width: '40px', 
                                height: '40px', 
                                fontSize: '1.5rem', 
                                cursor: 'pointer', 
                                fontWeight: 'bold', 
                                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* --- MODAL PARA AGREGAR NUEVA CATEGORÍA --- */}
            {modalCategoriaVisible && createPortal(
                <div className="rdh-modal-overlay" style={{ zIndex: 9999999 }}>
                    <div className="rdh-modal-content" style={{ width: '450px' }}>
                        <div className="rdh-modal-title">
                            <h2>NUEVA CATEGORÍA</h2>
                        </div>
                        
                        <div className="rdh-modal-form">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{fontWeight: 900, fontSize: 14, marginBottom: 5, color: '#333'}}>
                                    SELECCIONA O AGREGA UNA CATEGORÍA
                                </label>
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {creandoNuevaCategoria ? (
                                        <input 
                                            className="rdh-modal-input" 
                                            style={{ flex: 1 }}
                                            type="text" 
                                            value={nuevaCategoria} 
                                            onChange={(e) => setNuevaCategoria(e.target.value.toUpperCase())} 
                                            placeholder="Escribe la nueva categoría..." 
                                            autoFocus 
                                        />
                                    ) : (
                                        <select 
                                            className="rdh-modal-input" 
                                            style={{ flex: 1, cursor: 'pointer' }}
                                            value={nuevaCategoria}
                                            onChange={(e) => setNuevaCategoria(e.target.value)}
                                        >
                                            <option value="">Selecciona una opción...</option>
                                            <option value="ELÉCTRICO">ELÉCTRICO</option>
                                            <option value="ELECTRODOMÉSTICOS">ELECTRODOMÉSTICOS</option>
                                            <option value="MUEBLES">MUEBLES</option>
                                            <option value="PLOMERÍA">PLOMERÍA</option>
                                            <option value="CARPINTERÍA">CARPINTERÍA</option>
                                        </select>
                                    )}

                                    <button 
                                        onClick={() => {
                                            setCreandoNuevaCategoria(!creandoNuevaCategoria);
                                            setNuevaCategoria('');
                                        }}
                                        style={{ backgroundColor: creandoNuevaCategoria ? '#666' : '#f26624', border: 'none', borderRadius: '15px', width: '45px', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        {creandoNuevaCategoria ? <ArrowLeft size={20} /> : <Plus size={20} strokeWidth={3} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="rdh-modal-btn-container" style={{ gap: '15px', marginTop: '30px' }}>
                            <button className="dh-btn-save-3d" style={{ background: '#777', boxShadow: '0 6px 0px #444', height: '45px', padding: '0 30px', fontSize: '16px' }} onClick={() => {
                                setModalCategoriaVisible(false);
                                setCreandoNuevaCategoria(false);
                            }}>CANCELAR</button>
                            <button className="dh-btn-save-3d" style={{ height: '45px', padding: '0 30px', fontSize: '16px' }} onClick={guardarCategoria}>
                                AGREGAR
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

           {/* --- MODAL PARA AGREGAR/EDITAR ELEMENTO (INVENTARIO) --- */}
{modalElementoVisible && createPortal(
    <div className="rdh-modal-overlay" style={{ zIndex: 9999999 }}>
        <div className="rdh-modal-content" style={{ width: '500px' }}>
            <button className="rdh-modal-close" onClick={() => setModalElementoVisible(false)}>
                <X size={24} strokeWidth={3} />
            </button>
            
            <h2 className="rdh-modal-title">{elementoActual.id ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</h2>
            
            <div className="rdh-modal-form" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
                
                {/* FOTOS */}
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    
                  {/* FOTO PRINCIPAL */}
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        
                        {/* NUEVO CONTENEDOR RELATIVO */}
                        <div style={{ position: 'relative', width: '100px', height: '100px', overflow: 'visible' }}>
                            <div 
                                className="rdh-foto-box"
                                onClick={() => handlePhotoBoxClick('principal')}
                                style={{ width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden', borderRadius: '8px' }}
                            >
                                {previewImg ? (
                                    <img src={previewImg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#f0f0f0' }}>
                                        <ImageIcon size={30} color="#ccc" />
                                        <span style={{ fontSize: '9px', color: '#ccc', marginTop: '5px', fontWeight: 'bold' }}>PRINCIPAL</span>
                                    </div>
                                )}
                            </div>

                            {previewImg && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (selectedFile) { setSelectedFile(null); } else { setRemoveMainImage(true); } setPreviewImg(null); }}
                                    title="Eliminar principal"
                                    style={{
                                        position: 'absolute', top: '-8px', right: '-8px', background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 10
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <input type="file" id="fotoProductoNuevo" hidden accept="image/*" onChange={handleFileSelect} />
                        <input type="file" id="cameraPrincipal" hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
                    </div>

                    {/* FOTOS DE GALERÍA EXISTENTES (BASE DE DATOS) */}
                    {galeriaExistente.map((foto, i) => (
                        <div 
                            key={`ex-${i}`} 
                            style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', border: '1px solid #ccc', overflow: 'visible' }}
                        >
                            <img src={foto.image_path} alt={`galeria-bd-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            <button
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setGaleriaExistente(prev => prev.filter((_, idx) => idx !== i)); 
                                    setRemovedGalleryIds(prev => [...prev, foto.id || foto.gallery_id || foto.image_id || foto.image_path]); 
                                }}
                                title="Eliminar foto"
                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#000000', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', zIndex: 99999, boxShadow: '0px 2px 4px rgba(0,0,0,0.3)' }}
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {/* FOTOS DE GALERÍA NUEVAS (LOCALES) */}
                    {galeriaArchivos.map((file, i) => (
                        <div 
                            key={`new-${i}`} 
                            style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', border: '1px dashed #f26624', overflow: 'visible' }}
                        >
                            <img src={URL.createObjectURL(file)} alt={`galeria-new-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            <button
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setGaleriaArchivos(prev => prev.filter((_, idx) => idx !== i)); 
                                }}
                                title="Eliminar foto nueva"
                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#f26624', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', zIndex: 99999, boxShadow: '0px 2px 4px rgba(0,0,0,0.3)' }}
                            >
                                ×
                            </button>
                            
                        </div>
                    ))}

                    {/* FOTO SECUNDARIA */}
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        
                        {/* NUEVO CONTENEDOR RELATIVO */}
                        <div style={{ position: 'relative', width: '100px', height: '100px', overflow: 'visible' }}>
                            <div 
                                className="rdh-foto-box"
                                onClick={() => handlePhotoBoxClick('secondary')}
                                style={{ width: '100%', height: '100%', border: '2px dashed #f26624', cursor: 'pointer', overflow: 'hidden', borderRadius: '8px', boxSizing: 'border-box' }}
                            >
                                {previewImgSecondary ? (
                                    <img src={previewImgSecondary} alt="Preview Sec" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <Plus size={30} color="#f26624" />
                                        <span style={{ fontSize: '9px', color: '#f26624', marginTop: '5px', fontWeight: 'bold' }}>SECUNDARIA</span>
                                    </div>
                                )}
                            </div>

                            {previewImgSecondary && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if (selectedFileSecondary) { setSelectedFileSecondary(null); } else { setRemoveSecondaryImage(true); } setPreviewImgSecondary(null); }}
                                    title="Eliminar secundaria"
                                    style={{
                                        position: 'absolute', top: '-8px', right: '-8px', background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 10
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <input type="file" id="fotoProductoSecundario" hidden accept="image/*" onChange={handleFileSelectSecondary} />
                        <input type="file" id="cameraSecondary" hidden accept="image/*" capture="environment" onChange={handleFileSelectSecondary} />
                    </div>

                    {/* BOTÓN DISPARADOR PARA AGREGAR MÁS FOTOS GALERÍA */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div 
                            className="rdh-gallery-box"
                            title="Agregar fotos extra"
                            onClick={() => handlePhotoBoxClick('gallery')}
                            style={{ width: '100px', height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <ImageIcon size={30} color="#ccc" className="gallery-icon" />
                            <span className="gallery-text" style={{ fontSize: '9px', color: '#ccc', marginTop: '5px', fontWeight: 'bold' }}>EXTRAS</span>
                        </div>
                        <input type="file" id="fotoGaleriaNueva" hidden accept="image/*" multiple onChange={(e) => { handleGallerySelect(e); e.target.value = null; }} />
                        <input type="file" id="cameraGallery" hidden accept="image/*" capture="environment" multiple onChange={(e) => { handleGallerySelect(e); e.target.value = null; }} />
                        
                        {galeriaArchivos.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '6px', color: '#f26624', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                <span>{galeriaArchivos.length} extras</span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGaleriaArchivos([]); }}
                                    style={{ background: 'transparent', border: 'none', color: '#f26624', cursor: 'pointer', textDecoration: 'underline', fontWeight: '800' }}
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rdh-modal-field">
                    <label>TIPO *</label>
                    <input type="text" className="rdh-modal-input" placeholder="Ej. ENCHUFE, FOCO" value={elementoActual.sub_category} onChange={(e) => setElementoActual({...elementoActual, sub_category: e.target.value.toUpperCase()})}/>
                </div>
                <div className="rdh-modal-field">
                    <label>MARCA</label>
                    <input type="text" className="rdh-modal-input" value={elementoActual.brand} onChange={(e) => setElementoActual({...elementoActual, brand: e.target.value.toUpperCase()})}/>
                </div>
                <div className="rdh-modal-field">
                    <label>MODELO</label>
                    <input type="text" className="rdh-modal-input" value={elementoActual.model_or_color} onChange={(e) => setElementoActual({...elementoActual, model_or_color: e.target.value.toUpperCase()})}/>
                </div>
                
                <div className="rdh-modal-field">
                    <label>NO. SERIE</label>
                    <input type="text" className="rdh-modal-input" placeholder="S/N" value={elementoActual.serial_number} onChange={(e) => setElementoActual({...elementoActual, serial_number: e.target.value.toUpperCase()})}/>
                </div>

                <div className="rdh-modal-field">
                    <label>CANTIDAD *</label>
                    <input type="number" min="0.1" step="0.1" className="rdh-modal-input" value={elementoActual.quantity} onChange={(e) => setElementoActual({...elementoActual, quantity: e.target.value})}/>
                </div>

                <div className="rdh-modal-field">
                    <label>ESTADO *</label>
                    <select 
                        className="rdh-modal-input" 
                        value={elementoActual.status} 
                        onChange={(e) => setElementoActual({...elementoActual, status: e.target.value})}
                    >
                        <option value="Bueno">Bueno</option>
                        <option value="Regular">Regular</option>
                        <option value="Malo">Malo</option>
                        <option value="Requiere Cambio">Requiere Cambio</option>
                    </select>
                </div>

                <div className="rdh-modal-field" style={{ alignItems: 'flex-start' }}>
                    <label style={{ marginTop: '15px' }}>COMENTARIOS</label>
                    <textarea 
                        className="rdh-modal-input" 
                        style={{ height: 'auto', paddingTop: '10px', resize: 'vertical', minHeight: '60px' }}
                        rows="3" 
                        placeholder="Detalla daños o notas especiales..."
                        value={elementoActual.observations} 
                        onChange={(e) => setElementoActual({...elementoActual, observations: e.target.value})}
                    />
                </div>

                <div className="rdh-modal-btn-container" style={{ marginTop: '20px' }}>
                    <button className="rdh-btn-save-3d modal-btn" onClick={guardarElemento}>
                        {elementoActual.id ? 'ACTUALIZAR' : 'GUARDAR'}
                    </button>
                </div>
            </div>
        </div>
    </div>,
    document.body
)}
        </div>
    );
};

export default DetalleReporte;
