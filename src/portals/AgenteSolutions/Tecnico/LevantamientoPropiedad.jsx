import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import "../../../styles/AgenteSolutions/Tecnico/LevantamientoPropiedad.css";

const LevantamientoPropiedad = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const visitas = [
    { folio: "1234A", id: "JDJF123", fecha: "06-02-2026" },
    { folio: "1234B", id: "JDJF124", fecha: "07-02-2026" },
    { folio: "1234C", id: "JDJF125", fecha: "08-02-2026" },
  ];

  // Filtrado optimizado
  const visitasFiltradas = useMemo(() => {
    return visitas.filter(item =>
      item.folio.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <>
      <div style={{ padding: '15px 20px 0', maxWidth: '1400px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F26522', color: 'white', padding: '8px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          <ChevronLeft size={18} />
          <span>REGRESAR</span>
        </button>
      </div>
      {/* BUSCADOR */}
      <div className="tt-search-row">
        <div className="tt-search-container">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tt-search-input"
            placeholder="Buscar..."
          />
          <Search className="search-icon-inside" size={22} />
        </div>
      </div>

      {/* HEADER SECCIÓN */}
      <div className="tt-section-header">
        <h3 className="section-title-visitas">VISITAS PENDIENTES</h3>
        <button type="button" className="filter-button">
          <SlidersHorizontal size={24} />
        </button>
      </div>

      {/* TABLA */}
      <div className="tt-table-container-gray">
        <div className="tt-grid-header-levantamiento">
          <div className="tt-header-pill">FOLIO</div>
          <div className="tt-header-pill">ID PROPIEDAD</div>
          <div className="tt-header-pill">FECHA DE REGISTRO</div>
        </div>

        <div className="tt-scrollable-area">
          {visitasFiltradas.map((item, index) => (
            <motion.div
              key={item.folio}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <button
                type="button"
                className="tt-row-card-white"
                onClick={() => navigate(`/registro-zonas`)}
              >
                <div className="tt-grid-content-levantamiento">
                  <span className="col-data-black">{item.folio}</span>
                  <span className="col-data-black">{item.id}</span>
                  <span className="col-data-black">{item.fecha}</span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LevantamientoPropiedad;
