import { useEffect, useState } from 'react';
import axios from 'axios';
import { QrCode, Loader2 } from 'lucide-react';
import CodigoQrTecnico from '../Shared/CodigoQrTecnico';
import '../../../styles/AgenteMarket/Shared/TecnicoQr.css';

// "Mi código QR" del técnico de la red: lo imprime o comparte para que los clientes lo escaneen,
// vean su perfil y lo contraten. El código es permanente: el mismo QR sirve para siempre.
const MiQrTecnico = ({ nombre, subtitulo }) => {
  const [codigo, setCodigo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/mi-qr`)
      .then(r => setCodigo(r.data.codigo))
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  return (
    <section className="tqr-mi-qr">
      <h3><QrCode size={16} /> Mi código QR</h3>
      <p>Compártelo o imprímelo en tus tarjetas o en tu vehículo. Los clientes que lo escaneen verán tu perfil y podrán contratarte.</p>
      {codigo
        ? <CodigoQrTecnico codigo={codigo} nombre={nombre} subtitulo={subtitulo} leyenda="Tu QR es permanente: no cambia nunca" />
        : <div className="tqr-cargando"><Loader2 size={22} className="tqr-girar" /></div>}
    </section>
  );
};

export default MiQrTecnico;
