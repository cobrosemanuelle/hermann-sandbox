// TopRazonesDeMora.jsx
import React from 'react';
import './TopRazonesDeMora.css';

export default function TopRazonesDeMora() {
  return (
    <div className="card-mora">
      <div className="card-mora-title">
        <span role="img" aria-label="pin">📌</span> Top razones de mora
      </div>
      <div className="card-mora-item">
        Datos de contacto erróneos
        <span className="card-mora-action">Corregir cliente</span>
      </div>
      <div className="card-mora-item">
        Cliente no responde WhatsApp/email
        <span className="card-mora-action">Llamar o programar visita</span>
      </div>
      <div className="card-mora-item">
        Saldo/monto incorrecto
        <span className="card-mora-action">Actualizar cartera</span>
      </div>
    </div>
  );
}
