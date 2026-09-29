import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../../components/Shared/Header';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { QrCode, Copy, Check, Share2, Building2, Users, Briefcase, ExternalLink, ShieldCheck } from 'lucide-react';

const VistaCodigoAutonomo = () => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        if (user?.role_id !== 0) {
          try {
            const resMy = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenants/my-membership-status`);
            if (resMy.data.success && resMy.data.tenant) {
              setTenant(resMy.data.tenant);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error al obtener my-membership-status:', err);
          }
        }

        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/tenants/public-list`);
        if (res.data.success && res.data.tenants) {
          const myTenant = res.data.tenants.find(
            (t) => Number(t.id) === Number(user?.tenant_id) || Number(t.owner_user_id) === Number(user?.id)
          );
          if (myTenant) {
            setTenant(myTenant);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del tenant:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [user]);

  const isRoot = user?.role_id === 0;
  const companyCode = tenant?.code || (isRoot ? 'ROOT_GENERAL' : `AUT_${user?.tenant_id ? String(user.tenant_id).padStart(2, '0') : '01'}`);
  const companyName = tenant?.name || (isRoot ? 'Agente Solutions Root' : 'Mi Empresa Autónoma');
  const registerUrl = `${window.location.origin}/registro?code=${companyCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(companyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="main-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="top-bar-orange"></div>
      <div className="top-bar-black"></div>

      <Header rolTexto="MI IDENTIFICADOR Y QR AUTÓNOMO" />

      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={() => navigate('/VistaRoot')}
            style={{ padding: '10px 18px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            ← Volver al Panel Principal
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#666' }}>
            Cargando identificador empresarial...
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '25px 15px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <Building2 size={38} color="#FF6600" />
            </div>

            <h2 style={{ fontSize: '1.6rem', color: '#333', margin: '0 0 10px 0', fontWeight: 'bold', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {companyName}
            </h2>
            <p style={{ color: '#666', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 25px auto', lineHeight: '1.5' }}>
              Este es tu centro de identificación en la plataforma Agente Solutions. Comparte tu código o enlace con tus clientes y especialistas para que se registren en tu empresa.
            </p>

            {/* TARJETA DEL CÓDIGO */}
            <div style={{ backgroundColor: '#F9F9F9', border: '2px dashed #FF6600', borderRadius: '16px', padding: '20px 10px', maxWidth: '500px', margin: '0 auto 25px auto', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <span style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                TU CÓDIGO DE EMPRESA / AUTÓNOMO
              </span>
              <div style={{ fontSize: '2.3rem', fontWeight: '900', color: '#FF6600', margin: '12px 0', letterSpacing: '1px', wordBreak: 'break-all' }}>
                {companyCode}
              </div>
              <button
                onClick={handleCopyCode}
                style={{
                  padding: '10px 20px',
                  backgroundColor: copiedCode ? '#4CAF50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '30px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                {copiedCode ? '¡Código Copiado!' : 'Copiar Código'}
              </button>
            </div>

            {/* CÓMO FUNCIONA */}
            <div style={{ textAlign: 'left', backgroundColor: '#FFF5EC', borderRadius: '16px', padding: '20px 15px', marginBottom: '25px', borderLeft: '5px solid #FF6600' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck color="#FF6600" /> ¿Cómo registrar a tu equipo y clientes?
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginTop: '15px' }}>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6600', fontWeight: 'bold', marginBottom: '8px' }}>
                    <Users size={18} /> 1. Para tus Clientes
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#555', lineHeight: '1.5' }}>
                    Indícales que al crear su cuenta seleccionen <strong>"{companyName}"</strong> en la lista de empresas. Toda su información y cotizaciones quedarán aisladas en tu cartera.
                  </p>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6600', fontWeight: 'bold', marginBottom: '8px' }}>
                    <Briefcase size={18} /> 2. Para tus Técnicos
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#555', lineHeight: '1.5' }}>
                    Al registrarse como Técnico, seleccionarán tu empresa. Entrarán a tu <strong>Sala de Espera</strong> donde tú podrás verificarlos y darles el alta definitiva.
                  </p>
                </div>
              </div>
            </div>

            {/* ENLACE DIRECTO */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#555', fontWeight: 'bold', fontSize: '0.95rem', textAlign: 'center' }}>
                🔗 Enlace rápido para invitación en redes y WhatsApp:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', maxWidth: '600px', justifyContent: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={registerUrl}
                  style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: '#555', fontSize: '0.85rem' }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: copiedLink ? '#4CAF50' : '#FF6600',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.9rem'
                  }}
                >
                  {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
                  {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaCodigoAutonomo;
