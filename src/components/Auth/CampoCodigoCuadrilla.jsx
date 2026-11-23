import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { KeyRound, ScanLine, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import EscanerQr from '../../portals/AgenteMarket/Shared/EscanerQr';
import { codigoCuadrillaDeTexto } from '../../portals/AgenteMarket/Shared/qrCuadrilla';
import '../../styles/Auth/CampoCodigoCuadrilla.css';

const API = import.meta.env.VITE_API_BASE_URL;
const ESPERA_AL_ESCRIBIR = 500;

/**
 * Código del contratista en el registro del técnico de cuadrilla (rol 8):
 * se escribe o se escanea el QR de "Mi cuadrilla", y se verifica con el servidor.
 *  valor, onCambio(codigo)
 *  onEstado(tipo): 'vacio' | 'verificando' | 'valido' | 'invalido' | 'sin_conexion'
 *  clases: { campo, input, icono } para que el campo se vea como los demás del formulario
 */
const CampoCodigoCuadrilla = ({ valor, onCambio, onEstado, clases = {}, placeholder = 'Código de tu contratista' }) => {
  const [estado, setEstado] = useState({ tipo: 'vacio' });
  const [escaneando, setEscaneando] = useState(false);
  const inmediatoRef = useRef(false);
  const onEstadoRef = useRef(onEstado);
  onEstadoRef.current = onEstado;

  useEffect(() => { onEstadoRef.current?.(estado.tipo); }, [estado.tipo]);

  useEffect(() => {
    const codigo = String(valor || '').trim();
    if (codigo.length < 3) {
      setEstado({ tipo: 'vacio' });
      return undefined;
    }

    // Recién escaneado se verifica al momento; al escribir se espera a que termine
    const espera = inmediatoRef.current ? 0 : ESPERA_AL_ESCRIBIR;
    inmediatoRef.current = false;
    const control = new AbortController();
    setEstado({ tipo: 'verificando' });

    const temporizador = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API}/cuadrilla/verificar-codigo`, {
          params: { codigo },
          signal: control.signal,
        });
        setEstado({ tipo: 'valido', ...data });
      } catch (e) {
        if (axios.isCancel(e)) return;
        if (e.response?.status === 404) {
          setEstado({ tipo: 'invalido', error: e.response.data?.error || 'Ese código no es de ninguna cuadrilla.' });
        } else {
          setEstado({ tipo: 'sin_conexion' });
        }
      }
    }, espera);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [valor]);

  const alEscanear = (codigo) => {
    setEscaneando(false);
    inmediatoRef.current = true;
    onCambio(codigo);
  };

  const claseCampo = `${clases.campo || ''} ccc-campo ccc-${estado.tipo}`.trim();

  return (
    <div className="ccc">
      <p className="ccc-guia">Escribe el código de tu contratista o escanea el QR de su cuadrilla.</p>

      <div className="ccc-fila">
        <div className={claseCampo}>
          <KeyRound size={15} className={clases.icono || ''} />
          <input
            type="text"
            placeholder={placeholder}
            className={clases.input || ''}
            value={valor}
            onChange={(e) => onCambio(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="ccc-estado"
            aria-invalid={estado.tipo === 'invalido'}
            required
          />
        </div>
        <button type="button" className="ccc-btn-qr" onClick={() => setEscaneando(true)} title="Escanear el QR de tu contratista">
          <ScanLine size={18} />
          <span>Escanear QR</span>
        </button>
      </div>

      <div id="ccc-estado" className="ccc-estado" aria-live="polite">
        {estado.tipo === 'verificando' && (
          <span className="ccc-msg ccc-msg-neutro"><Loader2 size={14} className="ccc-girar" /> Verificando código...</span>
        )}
        {estado.tipo === 'valido' && (
          <>
            <span className="ccc-msg ccc-msg-ok">
              <CheckCircle2 size={14} />
              <span>
                Cuadrilla de <strong>{estado.contratista}</strong>
                {estado.cuadrilla && estado.cuadrilla !== estado.contratista && <> · {estado.cuadrilla}</>}
              </span>
            </span>
            {estado.llena && (
              <span className="ccc-msg ccc-msg-aviso">
                <AlertTriangle size={14} /> Su cuadrilla está llena por ahora: podrá aceptarte cuando tenga lugar.
              </span>
            )}
          </>
        )}
        {estado.tipo === 'invalido' && (
          <span className="ccc-msg ccc-msg-error"><XCircle size={14} /> {estado.error}</span>
        )}
        {estado.tipo === 'sin_conexion' && (
          <span className="ccc-msg ccc-msg-aviso">
            <AlertTriangle size={14} /> No pudimos verificar el código ahora. Lo revisaremos al crear tu cuenta.
          </span>
        )}
      </div>

      {escaneando && (
        <EscanerQr
          onCodigo={alEscanear}
          onCerrar={() => setEscaneando(false)}
          interpretar={codigoCuadrillaDeTexto}
          subtitulo="Apunta la cámara al QR de la cuadrilla de tu contratista"
          mensajeInvalido="Ese QR no es de una cuadrilla de Agente Market."
        />
      )}
    </div>
  );
};

export default CampoCodigoCuadrilla;
