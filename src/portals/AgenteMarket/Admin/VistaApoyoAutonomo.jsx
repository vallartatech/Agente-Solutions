import React, { useState } from 'react';
import Header from '../../../components/Shared/Header';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, PhoneCall, MessageCircle, Users, Send, CheckCircle, ShieldAlert } from 'lucide-react';

const VistaApoyoAutonomo = () => {
  const navigate = useNavigate();
  const [requestSent, setRequestSent] = useState(false);
  const [reason, setReason] = useState('');
  const [techCount, setTechCount] = useState(1);

  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Por favor describe el motivo del apoyo requerido.');
      return;
    }
    // Simulamos el envío o abrimos WhatsApp con el mensaje estructurado
    const rootPhone = '5219999999999'; // Teléfono de soporte Root o configurable
    const msg = encodeURIComponent(`🚨 *SOLICITUD DE APOYO AUTÓNOMO*\n\nHola Root, solicito apoyo en mi empresa autónoma:\n*Motivo:* ${reason}\n*Técnicos de apoyo requeridos:* ${techCount}\n\nPor favor comunícense conmigo para coordinar el préstamo de personal o soporte.`);
    
    window.open(`https://wa.me/${rootPhone}?text=${msg}`, '_blank');
    setRequestSent(true);
    setReason('');
  };

  return (
    <div className="main-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="CENTRO DE APOYO Y PRÉSTAMO DE PERSONAL" />

      <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <button
            onClick={() => navigate('/VistaRoot')}
            style={{ padding: '10px 18px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ← Volver al Panel Principal
          </button>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '35px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <HelpCircle size={45} color="#FF6600" />
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#333', margin: '0 0 10px 0', fontWeight: 'bold' }}>
              ¿Necesitas Apoyo o Técnicos Adicionales?
            </h2>
            <p style={{ color: '#666', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>
              Como Autónomo en <strong>Agente Solutions</strong>, no estás solo. Si tienes sobrecarga de trabajo o servicios especializados que tu equipo no cubre, puedes solicitar soporte al Root o el préstamo temporal de especialistas.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '35px' }}>
            {/* OPCIÓN 1: SOPORTE DIRECTO */}
            <div style={{ backgroundColor: '#F9F9F9', borderRadius: '16px', padding: '25px', borderTop: '5px solid #333' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhoneCall color="#333" /> Soporte Root / Técnico
              </h4>
              <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
                ¿Dudas con tu membresía, cobros, configuración de portal o incidencias en el sistema? Comunícate con la central de Agente Solutions.
              </p>
              <a
                href="https://wa.me/5219999999999?text=Hola%20Soporte%20Root,%20tengo%20una%20duda%20en%20mi%20empresa%20autónoma."
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px',
                  backgroundColor: '#25D366',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(37,211,102,0.3)'
                }}
              >
                <MessageCircle size={20} /> Contactar por WhatsApp
              </a>
            </div>

            {/* OPCIÓN 2: PRÉSTAMO DE PERSONAL */}
            <div style={{ backgroundColor: '#FFF5EC', borderRadius: '16px', padding: '25px', borderTop: '5px solid #FF6600' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users color="#FF6600" /> Red de Apoyo de Técnicos
              </h4>
              <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
                El Root puede autorizar el acceso temporal (compartir) de técnicos verificados a tu cartera para cubrir órdenes urgentes o levantamientos.
              </p>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '8px', fontSize: '0.85rem', color: '#666', borderLeft: '3px solid #FF6600' }}>
                💡 Los técnicos compartidos verán únicamente las órdenes que tú les asignes.
              </div>
            </div>
          </div>

          {/* FORMULARIO DE SOLICITUD DE PERSONAL */}
          <div style={{ borderTop: '2px solid #eee', paddingTop: '30px' }}>
            <h3 style={{ fontSize: '1.4rem', color: '#333', marginBottom: '15px' }}>
              📝 Solicitar Préstamo de Técnicos / Apoyo Operativo
            </h3>
            {requestSent ? (
              <div style={{ padding: '25px', backgroundColor: '#E8F5E9', borderRadius: '12px', color: '#2E7D32', textAlign: 'center', border: '1px solid #A5D6A7' }}>
                <CheckCircle size={40} color="#4CAF50" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>¡Solicitud enviada al Root!</h4>
                <p style={{ margin: 0 }}>En breve se pondrán en contacto contigo para asignarte personal de apoyo en tu empresa.</p>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                    ¿Cuántos técnicos adicionales requieres?
                  </label>
                  <select
                    value={techCount}
                    onChange={(e) => setTechCount(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
                  >
                    <option value="1">1 Técnico</option>
                    <option value="2">2 Técnicos</option>
                    <option value="3">3 o más Técnicos (Cuadrilla)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                    Describe el tipo de trabajo, especialidad (ej. Aires Acondicionados, Plomería) o zona:
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Tengo 5 mantenimientos de chillers urgentes en Mérida para este viernes y mi técnico está ocupado..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '16px',
                    backgroundColor: '#FF6600',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 15px rgba(255,102,0,0.3)'
                  }}
                >
                  <Send size={20} /> Enviar Solicitud de Apoyo Ahora
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaApoyoAutonomo;
