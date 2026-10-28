import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { ChevronLeft, Users, Home, Box, AlertTriangle, ClipboardCheck, DollarSign } from 'lucide-react';
import '../../../styles/AgenteSolutions/Admin/VistaDashboard.css';
import Header from '../../../components/Shared/Header';


const VistaDashboard = () => {
  const navigate = useNavigate();

  // 1. Datos de Mantenimientos (Barras)
  const dataMantenimientos = [
    { name: 'Ene', cantidad: 40 }, { name: 'Feb', cantidad: 30 },
    { name: 'Mar', cantidad: 65 }, { name: 'Abr', cantidad: 45 },
  ];

  // 2. Datos de Garantías (Dona)
  const dataEstatus = [
    { name: 'Al día', value: 400, color: '#10b981' },
    { name: 'Por vencer', value: 300, color: '#f59e0b' },
    { name: 'Vencidos', value: 100, color: '#ef4444' },
  ];

  // 3. Datos de Cotizaciones (Línea - Dinero)
  const dataCotizaciones = [
    { name: 'Sem 1', total: 12000 }, { name: 'Sem 2', total: 19000 },
    { name: 'Sem 3', total: 15000 }, { name: 'Sem 4', total: 22000 },
  ];

  // 4. Datos de Levantamientos (Área)
  const dataLevantamientos = [
    { name: 'Lunes', qty: 4 }, { name: 'Martes', qty: 7 },
    { name: 'Miércoles', qty: 5 }, { name: 'Jueves', qty: 9 },
    { name: 'Viernes', qty: 12 },
  ];

  return (
    <div className="dashboard-container">
      <Header titulo="INICIO" />

      <div style={{ padding: '20px 40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-back-dash" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ChevronLeft size={20} /> VOLVER AL MENÚ
        </button>
        <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Panel de Control Administrativo</h2>
      </div>

      {/* KPIs - Representando las categorías del Menú */}
      <div className="stats-grid">
        <div className="stat-card orange">
          <Users size={32} />
          <div className="stat-info">
            <span className="stat-value">12</span>
            <span className="stat-label">Usuarios</span>
          </div>
        </div>
        <div className="stat-card blue">
          <Home size={32} />
          <div className="stat-info">
            <span className="stat-value">84</span>
            <span className="stat-label">Propiedades</span>
          </div>
        </div>
        <div className="stat-card green">
          <Box size={32} />
          <div className="stat-info">
            <span className="stat-value">256</span>
            <span className="stat-label">Productos</span>
          </div>
        </div>
        <div className="stat-card red">
          <AlertTriangle size={32} />
          <div className="stat-info">
            <span className="stat-value">15</span>
            <span className="stat-label">Notificaciones</span>
          </div>
        </div>
      </div>

      {/* PRIMERA FILA DE GRÁFICAS */}
      <div className="charts-grid">
        <div className="chart-item">
          <h3><Box size={18} /> Mantenimientos Mensuales de Productos</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={dataMantenimientos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#ff8800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-item">
          <h3><AlertTriangle size={18} /> Garantías de Propiedades</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dataEstatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dataEstatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pie-labels">
             {dataEstatus.map(item => (
               <div key={item.name}><span style={{backgroundColor: item.color}}></span> {item.name}</div>
             ))}
          </div>
        </div>
      </div>

      {/* SEGUNDA FILA DE GRÁFICAS (Nuevos Datos) */}
      <div className="charts-grid mt-6" style={{ marginTop: '25px' }}>
        <div className="chart-item">
          <h3><DollarSign size={18} /> Valor de Cotizaciones Enviadas ($)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={dataCotizaciones}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-item">
          <h3><ClipboardCheck size={18} /> Levantamientos por Día</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={dataLevantamientos}>
                <defs>
                  <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area type="monotone" dataKey="qty" stroke="#10b981" fillOpacity={1} fill="url(#colorQty)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaDashboard;
