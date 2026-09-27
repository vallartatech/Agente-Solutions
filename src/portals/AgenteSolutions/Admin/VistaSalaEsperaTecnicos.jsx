import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../../components/Shared/Header';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Clock, Phone, Mail, RefreshCw, CheckCircle, AlertCircle, Eye, X, MessageSquare, Building2, Calendar, User } from 'lucide-react';

const VistaSalaEsperaTecnicos = () => {
  const [pendingTechs, setPendingTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedTechDetails, setSelectedTechDetails] = useState(null);
  const navigate = useNavigate();

  const fetchPendingTechs = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenants/pending-technicians`);
      if (res.data.success) {
        setPendingTechs(res.data.pending_technicians);
      }
    } catch (error) {
      console.error('Error al cargar técnicos en espera:', error);
      setMessage('Error al cargar la información. Revisa tu conexión o permisos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTechs();
  }, []);

  const handleApproveTech = async (userId) => {
    if (!window.confirm('¿Estás seguro de autorizar y dar de alta a este Técnico? Podrá iniciar sesión e ingresar a tu empresa inmediatamente.')) {
      return;
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/tenants/approve-technician/${userId}`);
      if (res.data.success) {
        alert('✅ ' + res.data.message);
        setSelectedTechDetails(null);
        fetchPendingTechs();
      }
    } catch (error) {
      console.error('Error al aprobar técnico:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const getRolLabel = (roleId) => {
    const r = parseInt(roleId, 10);
    switch (r) {
      case 8:
        return '🌐 Técnico de la Red';
      case 2:
        return '🧑‍🔧 Técnico Especialista';
      case 7:
        return '🏢 Administrador de Propiedades';
      case 6:
        return '🏗️ Contratista';
      case 4:
        return '🏬 Autónomo Empresarial';
      case 5:
        return '🏢 Autónomo Personal';
      case 3:
        return '👤 Cliente';
      default:
        return '🛠️ Especialista Técnico';
    }
  };

  const isTechnicianRole = (roleId) => {
    const r = parseInt(roleId, 10);
    return r === 2 || r === 8;
  };

  return (
    <div className="main-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="SALA DE ESPERA DE TÉCNICOS" />

      <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
          <button
            onClick={() => navigate('/VistaRoot')}
            style={{ padding: '10px 18px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ← Volver al Panel Principal
          </button>
          <button
            onClick={fetchPendingTechs}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#FF6600', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <RefreshCw size={18} /> Actualizar Lista
          </button>
        </div>

        <div style={{ backgroundColor: '#FFF3E0', borderRadius: '12px', padding: '20px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '5px solid #FF9800' }}>
          <Clock size={35} color="#FF6600" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>SALA DE ESPERA Y APROBACIÓN DE EQUIPO</h4>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.95rem' }}>
              Aquí aparecen los usuarios que se han registrado seleccionando tu empresa (código AUT_XX). Por seguridad, su acceso está restringido hasta que tú los autorices haciendo clic en "Aceptar y Dar de Alta" o revises sus detalles.
            </p>
          </div>
        </div>

        {message && (
          <div style={{ padding: '15px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} /> {message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#666' }}>
            Consultando sala de espera...
          </div>
        ) : pendingTechs.length === 0 ? (
          <div style={{ backgroundColor: '#fff', padding: '50px', borderRadius: '16px', textAlign: 'center', color: '#888', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <UserCheck size={50} color="#4CAF50" style={{ margin: '0 auto 15px auto', display: 'block' }} />
            <h3 style={{ margin: 0, color: '#333', fontSize: '1.3rem' }}>¡Todo al día!</h3>
            <h4 style={{ color: '#444' }}>No hay usuarios pendientes de autorización en tu empresa en este momento.</h4>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {pendingTechs.map((tech) => (
              <div key={tech.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: '5px solid #FF6600', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>SOLICITANTE #ID-{tech.id}</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.3rem', color: '#333', overflowWrap: 'anywhere' }}>
                        {tech.first_name} {tech.last_name}
                      </h4>
                    </div>
                    <span style={{ backgroundColor: '#FFF5EC', color: '#FF6600', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 }}>
                      ⏳ En Espera
                    </span>
                  </div>

                  <div style={{ margin: '15px 0', padding: '12px', backgroundColor: '#F9F9F9', borderRadius: '8px' }}>
                    <p style={{ margin: '6px 0', color: '#555', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', overflowWrap: 'anywhere' }}>
                      <Phone size={16} color="#FF6600" style={{ flexShrink: 0 }} /> <span>{tech.phone_number || 'Sin teléfono'}</span>
                    </p>
                    <p style={{ margin: '6px 0', color: '#555', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', overflowWrap: 'anywhere' }}>
                      <Mail size={16} color="#FF6600" style={{ flexShrink: 0 }} /> <span style={{ wordBreak: 'break-all' }}>{tech.email}</span>
                    </p>
                    <p style={{ margin: '6px 0', color: '#888', fontSize: '0.85rem' }}>
                      <strong>Fecha registro:</strong> {new Date(tech.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #ddd' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#FF6600', display: 'block', marginBottom: '4px' }}>📋 ROL SOLICITADO:</strong>
                      <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 'bold' }}>
                        {getRolLabel(tech.role_id)}
                      </span>
                    </div>
                    {isTechnicianRole(tech.role_id) && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #ddd' }}>
                        <strong style={{ fontSize: '0.78rem', color: '#FF6600', display: 'block', marginBottom: '4px' }}>🛠️ ESPECIALIDADES:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tech.specialties && tech.specialties.length > 0 ? (
                            tech.specialties.map((s, idx) => (
                              <span key={idx} style={{ padding: '2px 8px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: '12px', fontSize: '0.72rem', color: '#e65100', fontWeight: 'bold' }}>
                                {typeof s === 'string' ? s : `${s.icon || '⚡'} ${s.name}`}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>General / Sin especificar</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedTechDetails(tech)}
                    style={{
                      flex: '1 1 140px',
                      padding: '12px 10px',
                      backgroundColor: '#E3F2FD',
                      color: '#1565C0',
                      border: '1px solid #90CAF9',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Eye size={18} /> Ver Detalles
                  </button>

                  <button
                    onClick={() => handleApproveTech(tech.id)}
                    style={{
                      flex: '1.5 1 170px',
                      padding: '12px 10px',
                      backgroundColor: '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <CheckCircle size={18} /> Aceptar y Dar de Alta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE DEL TÉCNICO REGISTRADO */}
      {selectedTechDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTechDetails(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedTechDetails(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#555'
              }}
            >
              <X size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#FFF5EC', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FF6600', flexShrink: 0 }}>
                <User size={30} color="#FF6600" />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  SOLICITUD DE REGISTRO #ID-{selectedTechDetails.id}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#333', overflowWrap: 'anywhere' }}>
                  {selectedTechDetails.first_name} {selectedTechDetails.last_name}
                </h3>
              </div>
            </div>

            {/* SECCIÓN 1: DATOS REGISTRADOS */}
            <div style={{ backgroundColor: '#F8F9FA', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #E9ECEF' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '1.05rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Datos del Solicitante
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>NOMBRE COMPLETO</label>
                  <p style={{ margin: 0, color: '#222', fontWeight: 'bold', fontSize: '1rem', overflowWrap: 'anywhere' }}>
                    {selectedTechDetails.first_name} {selectedTechDetails.last_name}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>ROL SOLICITADO</label>
                  <p style={{ margin: 0, color: '#E65100', fontWeight: 'bold', fontSize: '1rem' }}>
                    {getRolLabel(selectedTechDetails.role_id)}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>CORREO ELECTRÓNICO</label>
                  <p style={{ margin: 0, color: '#222', fontSize: '0.95rem', wordBreak: 'break-all' }}>
                    {selectedTechDetails.email}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>TELÉFONO DE CONTACTO</label>
                  <p style={{ margin: 0, color: '#222', fontWeight: 'bold', fontSize: '1rem' }}>
                    {selectedTechDetails.phone_number || 'No registrado'}
                  </p>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>SE UNIRÁ AL EQUIPO DE</label>
                  <p style={{ margin: 0, color: '#333', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={18} color="#FF6600" />
                    {selectedTechDetails.tenant
                      ? `${selectedTechDetails.tenant.name} (${selectedTechDetails.tenant.code})`
                      : (parseInt(selectedTechDetails.role_id, 10) === 8 ? 'Técnico Independiente (Red Abierta)' : 'Agente Solutions (Empresa Oficial)')}
                  </p>
                </div>

                {isTechnicianRole(selectedTechDetails.role_id) && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', color: '#FF6600', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>🛠️ ESPECIALIDADES SELECCIONADAS POR EL TÉCNICO</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedTechDetails.specialties && selectedTechDetails.specialties.length > 0 ? (
                      selectedTechDetails.specialties.map((s, idx) => (
                        <span key={idx} style={{ padding: '6px 14px', background: '#FFF5EC', border: '1px solid #FF6600', borderRadius: '16px', fontSize: '0.85rem', color: '#E65100', fontWeight: 'bold' }}>
                          {typeof s === 'string' ? s : `${s.icon || '⚡'} ${s.name}`}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>General / Sin especificar</span>
                    )}
                  </div>
                </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '3px', fontWeight: 'bold' }}>FECHA Y HORA DE SOLICITUD</label>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} />
                    {new Date(selectedTechDetails.created_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ACCIONES DE CONTACTO RÁPIDO */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>
                💬 Contactar con el Solicitante (Antes de Aprobar)
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedTechDetails.phone_number && (
                  <>
                    <a
                      href={`https://wa.me/521${cleanPhone(selectedTechDetails.phone_number)}?text=${encodeURIComponent(
                        `¡Hola ${selectedTechDetails.first_name}! Te contactamos de Agente Solutions respecto a tu solicitud de registro como Técnico.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: '1 1 160px',
                        padding: '12px 14px',
                        backgroundColor: '#E8F5E9',
                        color: '#2E7D32',
                        border: '1px solid #A5D6A7',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '0.95rem'
                      }}
                    >
                      <MessageSquare size={18} /> WhatsApp
                    </a>

                    <a
                      href={`tel:${selectedTechDetails.phone_number}`}
                      style={{
                        flex: '1 1 140px',
                        padding: '12px 14px',
                        backgroundColor: '#FFF3E0',
                        color: '#E65100',
                        border: '1px solid #FFCC80',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '0.95rem'
                      }}
                    >
                      <Phone size={18} /> Llamar
                    </a>
                  </>
                )}

                <a
                  href={`mailto:${selectedTechDetails.email}?subject=Solicitud de Registro Técnico - Agente Solutions&body=${encodeURIComponent(
                    `Hola ${selectedTechDetails.first_name},\n\nHemos recibido tu solicitud de registro en la sala de espera.`
                  )}`}
                  style={{
                    flex: '1 1 160px',
                    padding: '12px 14px',
                    backgroundColor: '#E3F2FD',
                    color: '#1565C0',
                    border: '1px solid #90CAF9',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.95rem'
                  }}
                >
                  <Mail size={18} /> Enviar Correo
                </a>
              </div>
            </div>

            {/* SECCIÓN 3: BOTÓN DE DAR DE ALTA */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedTechDetails(null)}
                style={{
                  flex: '1',
                  padding: '14px',
                  backgroundColor: '#eee',
                  color: '#444',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>

              <button
                onClick={() => handleApproveTech(selectedTechDetails.id)}
                style={{
                  flex: '2',
                  padding: '14px',
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 15px rgba(76,175,80,0.35)'
                }}
              >
                <CheckCircle size={20} /> Aceptar y Dar de Alta Ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaSalaEsperaTecnicos;
