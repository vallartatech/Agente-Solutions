import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, ClipboardList, ShieldCheck, ChevronLeft } from 'lucide-react';
import ProductoDetalleView from './ProductoDetalleView';
import '../../../styles/AgenteSolutions/Admin/ProductosView.css';
import logo from "../../../assets/Logo4.png";

const ProductosView = () => {
  const [activeTab, setActiveTab] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('LISTA'); 
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // ESTADOS PARA LA BASE DE DATOS 
  const [productosData, setProductosData] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const respuesta = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/catalog/summary`);
        setProductosData(respuesta.data);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchProductos();
  }, []);

  const categorias = [
    { name: 'TODOS', icon: '👥' }, 
    { name: 'CÁMARAS', icon: '📹' },
    { name: 'ALARMAS', icon: '🚨' }, 
    { name: 'REPARADOS', icon: '🛠️' }, 
    { name: 'STOCK', icon: '📦' },
  ];

  const manejarVerDetalle = (prod) => {
    setProductoSeleccionado(prod);
    setViewMode('DETALLE');
  };

  const productosFiltrados = productosData.filter(prod => {
    const matchesTab = activeTab === 'TODOS' || 
                       (prod.category && prod.category.toUpperCase() === activeTab);

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (prod.product_model && prod.product_model.toLowerCase().includes(searchLower)) ||
      (prod.brand && prod.brand.toLowerCase().includes(searchLower)) ||
      (prod.id && prod.id.toLowerCase().includes(searchLower));

    return matchesTab && matchesSearch;
  });

  if (viewMode === 'DETALLE') {
    return (
      <ProductoDetalleView 
        producto={productoSeleccionado} 
        onBack={() => setViewMode('LISTA')} 
      />
    );
  }

  return (
    <div className="productos-page-container">
      <div className="top-strip-orange"></div>
      <div className="top-strip-black"></div>

      <header className="header-products">
        <img src={logo} alt="Logo" className="main-logo" />
        <button className="btn-regresar-header" onClick={() => window.history.back()}>
          <ChevronLeft size={18} /> Regresar
        </button>
      </header>

      <section className="content-area">
        <div className="categorias-scroll-wrapper">
          <div className="categorias-nav-tabs">
            {categorias.map((cat) => (
              <button 
                key={cat.name} 
                onClick={() => setActiveTab(cat.name)}
                className={`tab-item ${activeTab === cat.name ? 'active' : ''}`}
              >
                <span>{cat.icon}</span>
                <span className="tab-label">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="search-container-styled">
           <div className="search-input-group">
              <Search className="search-icon-inside" size={22} />
              <input 
                type="text" 
                placeholder="BUSCAR POR MODELO, MARCA O ID..." 
                className="search-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
           </div>
        </div>

        <div className="table-listing-card">
          <table className="table-products">
            <thead className="table-header-dark">
              <tr>
                <th style={{ paddingLeft: '30px' }}>ID</th>
                <th>PRODUCTO / MODELO</th>
                <th className="text-center">TOTAL INSTALADOS</th>
                <th>GARANTÍA PROM.</th>
                <th className="text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Cargando catálogo...
                  </td>
                </tr>
              ) : productosFiltrados.length > 0 ? (
                productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="product-row">
                    <td className="cell-padding font-bold" style={{ paddingLeft: '30px', color: '#94a3b8' }}>{prod.id}</td>
                    <td className="cell-padding">
                       <div className="product-title">{prod.product_model}</div>
                       <div className="product-subtitle">MARCA: {prod.brand}</div>
                    </td>
                    <td className="cell-padding text-center">
                      <span className="badge-stock">{prod.total_installed} UNIDADES</span>
                    </td>
                    <td className="cell-padding">
                       <div className="flex-center-gap">
                         <ShieldCheck size={18} className="text-green" /> {prod.average_warranty}
                       </div>
                    </td>
                    <td className="cell-padding">
                      <div className="actions-group">
                        <button className="btn-action-icon btn-location" onClick={() => manejarVerDetalle(prod)}>
                          <MapPin size={22} />
                        </button>
                        <button className="btn-action-icon btn-reports">
                          <ClipboardList size={22} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No se encontraron productos en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ProductosView;
