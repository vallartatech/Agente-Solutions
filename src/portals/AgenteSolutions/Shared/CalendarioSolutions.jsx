import React, { useState } from 'react';
import Header from '../../../components/Shared/Header';
import ModalCalendarioSolutions from './ModalCalendarioSolutions';

const CalendarioSolutions = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>
      <Header activeModule="calendario" titulo="CALENDARIO DE VISITAS Y SERVICIOS" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ModalCalendarioSolutions isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
};

export default CalendarioSolutions;
