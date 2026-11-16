
import React, { useEffect, useState } from "react";

function AlertaToast({ alertas, onCerrar }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "440px",
        width: "calc(100vw - 40px)",
      }}
    >
      {alertas.map((alerta) => (
        <ToastItem key={alerta.id} alerta={alerta} onCerrar={onCerrar} />
      ))}
    </div>
  );
}

function ToastItem({ alerta, onCerrar }) {
  const [visible, setVisible] = useState(true);
  const [saliendo, setSaliendo] = useState(false);

  const colores = {
    verde: { bg: "#2A7A50", border: "#1D5E3A", text: "#FFFFFF" },
    naranja: { bg: "#C4742A", border: "#A85E1E", text: "#FFFFFF" },
    rojo: { bg: "#B83030", border: "#8A2020", text: "#FFFFFF" },
  };

  const iconos = {
    verde: "✓",
    naranja: "⚠",
    rojo: "✕",
  };

  const color = colores[alerta.nivel] || colores.verde;
  const claseNivel =
    alerta.nivel === "rojo"
      ? "toast-item toast-item--rojo"
      : alerta.nivel === "naranja"
        ? "toast-item toast-item--naranja"
        : "toast-item";

  useEffect(() => {
    const timer = setTimeout(() => {
      setSaliendo(true);
      setTimeout(() => {
        setVisible(false);
        onCerrar(alerta.id);
      }, 300);
    }, 10000);
    return () => clearTimeout(timer);
  }, [alerta.id, onCerrar]);

  const cerrar = () => {
    setSaliendo(true);
    setTimeout(() => {
      setVisible(false);
      onCerrar(alerta.id);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={claseNivel}
      style={{
        position: "relative",
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: "12px",
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        opacity: saliendo ? 0 : 1,
        transform: saliendo ? "translateX(-20px)" : "translateX(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          color: color.text,
          flexShrink: 0,
        }}
      >
        {iconos[alerta.nivel]}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: color.text,
            marginBottom: "4px",
          }}
        >
          {alerta.titulo}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.4,
          }}
        >
          {alerta.mensaje}
        </div>
      </div>

      <button
        onClick={cerrar}
        style={{
          background: "rgba(255,255,255,0.22)",
          border: "none",
          color: color.text,
          cursor: "pointer",
          borderRadius: "6px",
          padding: "4px 9px",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "4px",
          background: "rgba(255,255,255,0.45)",
          borderRadius: "0 0 10px 10px",
          animation: "progressBar 10s linear forwards",
          width: "100%",
        }}
      />
    </div>
  );
}

export default AlertaToast;
