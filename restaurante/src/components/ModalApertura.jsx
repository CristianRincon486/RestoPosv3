
import React, { useState } from "react";
import { MENU_BASE, HUEVOS_PREP } from "../menuBase";
import { MAX_GAVETA, MAX_PORCIONES, MAX_PRECIO } from "../limits";
import NumInput from "./NumInput";

const CATEGORIAS = ["Desayuno", "Ejecutivo", "Intermedio", "Corriente"];
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CO");
const num = (v) => parseFloat(v) || 0;
const esUnico = (cat) => cat === "Desayuno" || cat === "Ejecutivo";

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const CATALOGO = [
  ...MENU_BASE.desayuno.bandeja.map((p) => ({
    id: p.id,
    name: p.name,
    categoria: "Desayuno",
    precio: p.precio,
    conSopa: 0,
    sinSopa: 0,
  })),
  ...MENU_BASE.almuerzo.ejecutivo.map((p) => ({
    id: p.id,
    name: p.name,
    categoria: "Ejecutivo",
    precio: p.precio,
    conSopa: 0,
    sinSopa: 0,
  })),
  ...MENU_BASE.almuerzo.intermedio.map((p) => ({
    id: p.id,
    name: p.name,
    categoria: "Intermedio",
    precio: 0,
    conSopa: p.conSopa,
    sinSopa: p.sinSopa,
  })),
  ...MENU_BASE.almuerzo.corriente.map((p) => ({
    id: p.id,
    name: p.name,
    categoria: "Corriente",
    precio: 0,
    conSopa: p.conSopa,
    sinSopa: p.sinSopa,
  })),
];

const PREP_SUGERIDAS = {
  Ejecutivo: ["A la plancha", "Apanado", "A la parrilla", "En salsa criolla"],
  Intermedio: ["A la plancha", "Apanado", "En salsa de champiñones"],
  Corriente: ["A la plancha", "Apanada", "Guisada", "Frita", "Sudada"],
  Desayuno: ["Sudada", "Guisada", "A la plancha", "Frita"],
};
const PRINCIPIOS_SUGERIDOS = [
  ...MENU_BASE.almuerzo.principios.map((p) => p.name),
  "Lentejas",
  "Garbanzo",
];

// ─── ESTILOS ────────────────────────────────────────────────────────────────
const box = {
  background: "var(--surface2)",
  borderRadius: "var(--r-md)",
  padding: "14px",
  marginBottom: "14px",
  border: "1px dashed var(--border2)",
};
const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  background: "var(--surface2)",
  borderRadius: "var(--r-sm)",
  marginBottom: "6px",
};
const lbl = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color: "var(--text3)",
  margin: "14px 0 6px",
};

// ─── SUBCOMPONENTES ─────────────────────────────────────────────────────────
function Titulo({ t, s }) {
  return (
    <>
      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
        {t}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text3)",
          marginBottom: "14px",
        }}
      >
        {s}
      </div>
    </>
  );
}

function Nav({ onAtras, onSiguiente, ok = true, label = "Siguiente →" }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
      {onAtras && (
        <button className="btn btn-full" onClick={onAtras}>
          ← Atrás
        </button>
      )}
      <button
        className="btn btn-full btn-lg"
        style={{
          background: ok ? "var(--green)" : "var(--surface3)",
          color: ok ? "white" : "var(--text3)",
          border: "none",
        }}
        onClick={onSiguiente}
        disabled={!ok}
      >
        {label}
      </button>
    </div>
  );
}

function ChipsEditor({ sugeridos, valores, setValores, placeholder }) {
  const [nuevo, setNuevo] = useState("");
  const toggle = (v) =>
    setValores(
      valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v],
    );
  const agregar = () => {
    const v = nuevo.trim();
    if (v && !valores.includes(v)) setValores([...valores, v]);
    setNuevo("");
  };
  const todos = [...new Set([...sugeridos, ...valores])];
  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        {todos.map((v) => (
          <button
            key={v}
            type="button"
            className={`btn btn-sm ${valores.includes(v) ? "btn-accent" : ""}`}
            onClick={() => toggle(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          className="input-field"
          placeholder={placeholder}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), agregar())
          }
        />
        <button type="button" className="btn" onClick={agregar}>
          + Agregar
        </button>
      </div>
    </div>
  );
}

function PrepRow({ p, onChange }) {
  const listId = "prep-" + p.id;
  return (
    <div style={rowStyle}>
      <span style={{ fontSize: "12px", fontWeight: 500, minWidth: "130px" }}>
        {p.name}{" "}
        <span style={{ color: "var(--text3)" }}>({p.porciones} porc.)</span>
      </span>
      <input
        className="input-field"
        list={listId}
        placeholder="¿Cómo se prepara?"
        value={p.preparacion}
        onChange={(e) => onChange(p.id, e.target.value)}
      />
      <datalist id={listId}>
        {(PREP_SUGERIDAS[p.categoria] || []).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

// ─── COMPONENTE ─────────────────────────────────────────────────────────────
function ModalApertura({ onCerrar, onConfirmar }) {
  const [paso, setPaso] = useState(1);

  const [baseCaja, setBaseCaja] = useState("");

  const [proteinas, setProteinas] = useState([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCat, setNuevoCat] = useState(""); // se elige siempre a mano
  const [nuevoPorciones, setNuevoPorciones] = useState("");
  const [nPrecio, setNPrecio] = useState("");
  const [nConSopa, setNConSopa] = useState("");
  const [nSinSopa, setNSinSopa] = useState("");

  const [caldosSel, setCaldosSel] = useState([]); // ids del catálogo
  const [caldosCustom, setCaldosCustom] = useState([]);
  const [cNombre, setCNombre] = useState("");
  const [cPrecio, setCPrecio] = useState("");

  const [sopa, setSopa] = useState("");
  const [principios, setPrincipios] = useState([]); // nombres

  // ─── PASO 2: funciones ────────────────────────────────────────────────────
  const conocida =
    nuevoNombre.trim() && nuevoCat
      ? CATALOGO.find(
          (c) => norm(c.name) === norm(nuevoNombre) && c.categoria === nuevoCat,
        )
      : null;
  const duplicada = proteinas.some(
    (p) => norm(p.name) === norm(nuevoNombre) && p.categoria === nuevoCat,
  );

  const esHuevo = norm(nuevoNombre).includes("huevo");

  const puedeAgregar =
    nuevoNombre.trim() &&
    nuevoCat &&
    !esHuevo &&
    !duplicada &&
    parseInt(nuevoPorciones) > 0 &&
    (conocida ||
      (esUnico(nuevoCat)
        ? num(nPrecio) > 0
        : num(nConSopa) > 0 && num(nSinSopa) > 0));

  const agregarProteina = () => {
    if (!puedeAgregar) return;
    const base = conocida || {
      id: "p-" + Date.now(),
      name: nuevoNombre.trim(),
      categoria: nuevoCat,
      precio: esUnico(nuevoCat) ? num(nPrecio) : 0,
      conSopa: esUnico(nuevoCat) ? 0 : num(nConSopa),
      sinSopa: esUnico(nuevoCat) ? 0 : num(nSinSopa),
    };
    setProteinas((prev) => [
      ...prev,
      {
        ...base,
        tipo: "carne",
        porciones: parseInt(nuevoPorciones),
        porcionesInicio: parseInt(nuevoPorciones),
        preparacion: "",
      },
    ]);
    setNuevoNombre("");
    setNuevoCat("");
    setNuevoPorciones("");
    setNPrecio("");
    setNConSopa("");
    setNSinSopa("");
  };

  const eliminarProteina = (id) =>
    setProteinas((prev) => prev.filter((p) => p.id !== id));

  const setPrep = (id, v) =>
    setProteinas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, preparacion: v } : p)),
    );

  // ─── PASO 3: funciones ────────────────────────────────────────────────────
  const toggleCaldo = (id) =>
    setCaldosSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const agregarCaldo = () => {
    if (!cNombre.trim() || num(cPrecio) <= 0) return false;
    setCaldosCustom((prev) => [
      ...prev,
      {
        id: "cal-" + Date.now(),
        name: cNombre.trim(),
        precio: num(cPrecio),
        tipo: "normal",
      },
    ]);
    setCNombre("");
    setCPrecio("");
    return true;
  };

  // ─── VALIDACIONES ─────────────────────────────────────────────────────────
  const desayunoProt = proteinas.filter((p) => p.categoria === "Desayuno");
  const almuerzoProt = proteinas.filter((p) => p.categoria !== "Desayuno");
  const totalPorciones = proteinas.reduce((sum, p) => sum + p.porciones, 0);

  const paso2OK = proteinas.length > 0;
  const paso3OK = desayunoProt.every((p) => p.preparacion.trim());
  const paso4OK =
    almuerzoProt.length === 0 ||
    (sopa.trim() &&
      principios.length > 0 &&
      almuerzoProt.every((p) => p.preparacion.trim()));

  // ─── CONFIRMAR ────────────────────────────────────────────────────────────
  const confirmar = () => {
    const pendiente =
      cNombre.trim() && num(cPrecio) > 0
        ? [
            {
              id: "cal-" + Date.now(),
              name: cNombre.trim(),
              precio: num(cPrecio),
              tipo: "normal",
            },
          ]
        : [];
    const caldos = [
      ...MENU_BASE.desayuno.caldos.filter((c) => caldosSel.includes(c.id)),
      ...caldosCustom,
      ...pendiente,
    ].map((c) => ({
      id: c.id,
      name: c.name,
      precio: c.precio,
      tipo: c.tipo || "normal",
    }));

    onConfirmar({
      baseCaja: num(baseCaja),
      proteinas,
      caldos,
      huevosPrep: HUEVOS_PREP,
      sopa: sopa.trim(),
      principios: principios.map((n, i) => ({ id: "pri-" + i, nombre: n })),
    });
  };

  // ─── INDICADOR DE PASOS ───────────────────────────────────────────────────
  const stepStyle = (n) => ({
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    background:
      paso > n
        ? "var(--green)"
        : paso === n
          ? "var(--accent)"
          : "var(--surface3)",
    color: paso >= n ? "white" : "var(--text3)",
    flexShrink: 0,
  });

  const PASOS = [
    { n: 1, label: "Gaveta" },
    { n: 2, label: "Porciones" },
    { n: 3, label: "Desayuno" },
    { n: 4, label: "Almuerzo" },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: "580px",
          marginTop: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "var(--green)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "var(--r-xl) var(--r-xl) 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "17px", fontWeight: 600 }}>
              🌅 Inicio de día
            </div>
            <div style={{ fontSize: "12px", opacity: 0.85 }}>
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              borderRadius: "var(--r-sm)",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 24px",
            gap: "8px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {PASOS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div style={stepStyle(s.n)}>{paso > s.n ? "✓" : s.n}</div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: paso === s.n ? 600 : 400,
                    color: paso === s.n ? "var(--text)" : "var(--text3)",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    background: paso > s.n ? "var(--green)" : "var(--border)",
                    borderRadius: "2px",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ padding: "24px" }}>
          {paso === 1 && (
            <div>
              <Titulo
                t="¿Cuánto hay en la gaveta hoy?"
                s={`Ingresa el dinero disponible para dar cambio al iniciar el día (máximo ${fmt(MAX_GAVETA)})`}
              />
              <NumInput
                className="input-field"
                placeholder="Ej: 50000"
                value={baseCaja}
                max={MAX_GAVETA}
                onChange={(e) => setBaseCaja(e.target.value)}
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  fontFamily: "var(--fm)",
                  textAlign: "center",
                  padding: "14px",
                }}
                autoFocus
              />
              {baseCaja && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "8px",
                    fontSize: "14px",
                    color: "var(--green)",
                    fontWeight: 600,
                  }}
                >
                  {fmt(num(baseCaja))} en gaveta
                </div>
              )}
              {num(baseCaja) >= MAX_GAVETA && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "4px",
                    fontSize: "11px",
                    color: "var(--amber)",
                  }}
                >
                  Llegaste al máximo permitido ({fmt(MAX_GAVETA)})
                </div>
              )}
              <Nav ok={num(baseCaja) > 0} onSiguiente={() => setPaso(2)} />
            </div>
          )}

          {paso === 2 && (
            <div>
              <Titulo
                t="¿Qué proteínas hay hoy?"
                s="Escribe cada proteína, elige su categoría y escribe las porciones."
              />

              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginBottom: "10px",
                }}
              >
                🥚 Los huevos al gusto no se ingresan aquí: están siempre
                disponibles y no cuentan porciones.
              </div>

              <div style={box}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nombre de la proteína (ej: Pechuga, Mojarra...)"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className="input-field"
                      value={nuevoCat}
                      onChange={(e) => setNuevoCat(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="" disabled>
                        Elige la categoría...
                      </option>
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <NumInput
                      className="input-field"
                      placeholder="Porciones"
                      value={nuevoPorciones}
                      max={MAX_PORCIONES}
                      onChange={(e) => setNuevoPorciones(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && agregarProteina()}
                      style={{
                        width: "120px",
                        textAlign: "center",
                        fontFamily: "var(--fm)",
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  {conocida && (
                    <div style={{ fontSize: "11px", color: "var(--green)" }}>
                      ✓ Precios ya registrados para esta proteína.
                    </div>
                  )}
                  {duplicada && (
                    <div style={{ fontSize: "11px", color: "var(--red)" }}>
                      Esta proteína ya está en la lista.
                    </div>
                  )}
                  {esHuevo && (
                    <div style={{ fontSize: "11px", color: "var(--red)" }}>
                      Los huevos al gusto no se ingresan: no cuentan porciones.
                    </div>
                  )}

                  {!conocida && nuevoNombre.trim() && nuevoCat && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      {esUnico(nuevoCat) ? (
                        <NumInput
                          className="input-field"
                          placeholder="Precio"
                          value={nPrecio}
                          max={MAX_PRECIO}
                          onChange={(e) => setNPrecio(e.target.value)}
                        />
                      ) : (
                        <>
                          <NumInput
                            className="input-field"
                            placeholder="Precio con sopa"
                            value={nConSopa}
                            max={MAX_PRECIO}
                            onChange={(e) => setNConSopa(e.target.value)}
                          />
                          <NumInput
                            className="input-field"
                            placeholder="Precio sin sopa"
                            value={nSinSopa}
                            max={MAX_PRECIO}
                            onChange={(e) => setNSinSopa(e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  )}

                  <button
                    className="btn btn-accent btn-full"
                    onClick={agregarProteina}
                    disabled={!puedeAgregar}
                  >
                    + Agregar proteína
                  </button>
                </div>
              </div>

              {proteinas.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--text3)",
                    fontSize: "12px",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  Sin proteínas agregadas aún
                </div>
              ) : (
                <div>
                  {CATEGORIAS.map((cat) => {
                    const items = proteinas.filter((p) => p.categoria === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat}>
                        <div style={lbl}>{cat}</div>
                        {items.map((p) => (
                          <div key={p.id} style={rowStyle}>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                flex: 1,
                              }}
                            >
                              {p.name}
                            </span>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "var(--accent)",
                                fontFamily: "var(--fm)",
                              }}
                            >
                              {p.porciones} porc.
                            </span>
                            <button
                              onClick={() => eliminarProteina(p.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--red)",
                                cursor: "pointer",
                                fontSize: "14px",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div
                    style={{
                      background: "var(--green-bg)",
                      borderRadius: "var(--r-sm)",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "10px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "var(--green)" }}>
                      Total porciones del día
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--green)",
                        fontFamily: "var(--fm)",
                      }}
                    >
                      {totalPorciones} porciones
                    </span>
                  </div>
                </div>
              )}

              <Nav
                ok={paso2OK}
                onAtras={() => setPaso(1)}
                onSiguiente={() => setPaso(3)}
              />
            </div>
          )}

          {paso === 3 && (
            <div>
              <Titulo
                t="🍳 Menú del desayuno"
                s="Los caldos de hoy y la preparación de las carnes del desayuno"
              />

              <div style={{ ...lbl, marginTop: 0 }}>Caldos del día</div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                {MENU_BASE.desayuno.caldos.map((c) => (
                  <button
                    key={c.id}
                    className={`btn btn-sm ${caldosSel.includes(c.id) ? "btn-accent" : ""}`}
                    onClick={() => toggleCaldo(c.id)}
                  >
                    {c.name} — {fmt(c.precio)}
                  </button>
                ))}
              </div>

              {caldosCustom.map((c) => (
                <div key={c.id} style={rowStyle}>
                  <span style={{ fontSize: "13px", flex: 1 }}>🍲 {c.name}</span>
                  <span style={{ fontFamily: "var(--fm)", fontSize: "12px" }}>
                    {fmt(c.precio)}
                  </span>
                  <button
                    onClick={() =>
                      setCaldosCustom((prev) =>
                        prev.filter((x) => x.id !== c.id),
                      )
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  className="input-field"
                  placeholder="Otro caldo..."
                  value={cNombre}
                  onChange={(e) => setCNombre(e.target.value)}
                  style={{ flex: 2 }}
                />
                
                <NumInput
                  className="input-field"
                  placeholder="Precio"
                  value={cPrecio}
                  max={MAX_PRECIO}
                  onChange={(e) => setCPrecio(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarCaldo()}
                  style={{ flex: 1 }}
                />
                <button className="btn" onClick={agregarCaldo}>
                  + Agregar
                </button>
              </div>
              {cNombre.trim() && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      marginTop: "4px",
                    }}
                  >
                    Pulsa "+ Agregar" (o Enter en el precio) para guardar este
                    caldo.
                  </div>
                )}

              <div style={lbl}>Huevos</div>
              <div style={rowStyle}>
                <span style={{ fontSize: "12px", fontWeight: 500 }}>
                  🥚 Huevos al gusto{" "}
                  <span style={{ color: "var(--text3)" }}>
                    (sin contar porciones)
                  </span>
                </span>
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {HUEVOS_PREP.join(" · ")}
                </span>
              </div>

              {desayunoProt.length > 0 && (
                <>
                  <div style={lbl}>Preparación de las carnes del desayuno</div>
                  {desayunoProt.map((p) => (
                    <PrepRow key={p.id} p={p} onChange={setPrep} />
                  ))}
                </>
              )}

              <Nav
                ok={paso3OK}
                onAtras={() => setPaso(2)}
                onSiguiente={() => setPaso(4)}
              />
            </div>
          )}

          {paso === 4 && (
            <div>
              <Titulo
                t="🍽 Menú del almuerzo"
                s="Sopa, principios y cómo se prepara cada proteína"
              />

              <div style={{ ...lbl, marginTop: 0 }}>Sopa del día</div>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Sopa de mondongo, Sancocho de costilla..."
                value={sopa}
                onChange={(e) => setSopa(e.target.value)}
                autoFocus
              />

              <div style={lbl}>Principios del día</div>
              <ChipsEditor
                sugeridos={PRINCIPIOS_SUGERIDOS}
                valores={principios}
                setValores={setPrincipios}
                placeholder="Otro principio..."
              />

              {almuerzoProt.length > 0 && (
                <>
                  <div style={lbl}>Preparación de las proteínas</div>
                  {almuerzoProt.map((p) => (
                    <PrepRow key={p.id} p={p} onChange={setPrep} />
                  ))}
                </>
              )}

              <div
                style={{
                  background: "var(--surface2)",
                  borderRadius: "var(--r-md)",
                  padding: "12px 14px",
                  marginTop: "16px",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--text3)",
                    marginBottom: "6px",
                  }}
                >
                  Resumen de inicio de día
                </div>
                <div>
                  Gaveta: <b>{fmt(num(baseCaja))}</b>
                </div>
                <div>
                  Proteínas: <b>{proteinas.length}</b> tipos —{" "}
                  <b>{totalPorciones}</b> porciones
                </div>
                <div>
                  Caldos: <b>{caldosSel.length + caldosCustom.length}</b>
                </div>
              </div>

              <Nav
                ok={!!paso4OK}
                onAtras={() => setPaso(3)}
                onSiguiente={confirmar}
                label="✓ Confirmar inicio de día"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalApertura;
