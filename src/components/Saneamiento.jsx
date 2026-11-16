
import React, { useState, useEffect } from "react";
import NumInput from "./NumInput";
import { guardarLote, consultarMes } from "../lib/database";

// ─── DATOS INICIALES ─────────────────────────────────────────────────────────

const CARGOS_INICIALES = [
  "Cocinera",
  "Aux de cocina",
  "Mesero 1",
  "Mesero 2",
  "Jefe 1",
  "Jefe 2",
];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const OPCIONES_CALIDAD = ["Bueno", "Malo"];

const hoy = new Date();
const DIA_HOY = hoy.getDate();
const MES_HOY = hoy.getMonth();
const ANIO_HOY = hoy.getFullYear();
const DIAS_MES = new Date(ANIO_HOY, MES_HOY + 1, 0).getDate();


// ─── COMPONENTE ──────────────────────────────────────────────────────────────
function Saneamiento({ onSanFirmado }) {
  const [tabActivo, setTabActivo] = useState("salud");

  const [guardadoSalud, setGuardadoSalud] = useState(false);
  const [guardadoMateria, setGuardadoMateria] = useState(false);
  const [guardadoNevera, setGuardadoNevera] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorBD, setErrorBD] = useState("");

  const [cargos, setCargos] = useState(CARGOS_INICIALES);
  const [editandoCargos, setEditandoCargos] = useState(false);
  const [cargosTemp, setCargosTemp] = useState([...CARGOS_INICIALES]);
  const [mesSalud, setMesSalud] = useState(MES_HOY);
  const [saludData, setSaludData] = useState({});

  const [mesMateria, setMesMateria] = useState(MES_HOY);
  const [alimentos, setAlimentos] = useState(["Pollo", "Res", "Pescado"]);
  const [nuevoAlimento, setNuevoAlimento] = useState("");
  const [materiaData, setMateriaData] = useState({});

  const [mesTempNev, setMesTempNev] = useState(MES_HOY);
  const [productos, setProductos] = useState([
    "Pollo",
    "Res",
    "Pescado",
    "Lácteos",
  ]);
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [tempNeveraData, setTempNeveraData] = useState({});

  const fechaMes = (mes, dia) => `${ANIO_HOY}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const limitesMes = (mes) => ({
    desde: `${ANIO_HOY}-${String(mes + 1).padStart(2, "0")}-01`,
    hasta: `${ANIO_HOY}-${String(mes + 1).padStart(2, "0")}-${String(new Date(ANIO_HOY, mes + 1, 0).getDate()).padStart(2, "0")}`,
  });

  // Recupera los registros del mes seleccionado desde Supabase.
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        setErrorBD("");
        const saludRango = limitesMes(mesSalud);
        const materiaRango = limitesMes(mesMateria);
        const neveraRango = limitesMes(mesTempNev);
        const [salud, materia, nevera] = await Promise.all([
          consultarMes("control_salud", saludRango.desde, saludRango.hasta),
          consultarMes("control_materia_prima", materiaRango.desde, materiaRango.hasta),
          consultarMes("control_temperaturas", neveraRango.desde, neveraRango.hasta),
        ]);
        if (!activo) return;
        const saludMap = {};
        salud.forEach((r) => {
          const dia = Number(r.fecha.slice(8, 10));
          const cargo = r.cargo || r.empleado;
          saludMap[`${dia}-${cargo}-si`] = r.sintomas_si ? "true" : "";
          saludMap[`${dia}-${cargo}-no`] = r.sintomas_no ? "true" : "";
          saludMap[`${dia}-${cargo}-sintomas`] = r.sintomas_observados || "";
          saludMap[`${dia}-${cargo}-acciones`] = r.acciones_tomadas || "";
          saludMap[`${dia}-${cargo}-firma`] = r.firma_empleado || "";
        });
        const materiaMap = {};
        materia.forEach((r) => {
          const dia = Number(r.fecha.slice(8, 10));
          ["alimento", "temperatura", "proveedor", "cantidad", "textura", "olor", "sabor", "observaciones"].forEach((campo) => {
            const columna = campo === "alimento" ? r.alimento : r[campo];
            if (columna !== null && columna !== undefined) materiaMap[`${dia}-${campo}`] = String(columna);
          });
        });
        const neveraMap = {};
        nevera.forEach((r) => {
          const dia = Number(r.fecha.slice(8, 10));
          neveraMap[`${r.producto}-${dia}`] = r.temperatura == null ? "" : String(r.temperatura);
        });
        setSaludData(saludMap);
        setMateriaData(materiaMap);
        setTempNeveraData(neveraMap);
      } catch (error) {
        console.error("Error consultando saneamiento:", error);
        if (activo) setErrorBD(error.message || "No fue posible consultar los registros de saneamiento.");
      }
    };
    cargar();
    return () => { activo = false; };
  }, [mesSalud, mesMateria, mesTempNev]);

  const guardarSalud = async () => {
    try {
      setGuardando(true); setErrorBD("");
      const registros = [];
      for (let dia = 1; dia <= new Date(ANIO_HOY, mesSalud + 1, 0).getDate(); dia += 1) {
        cargos.forEach((cargo) => {
          const si = getSaludField(dia, cargo, "si") === "true";
          const no = getSaludField(dia, cargo, "no") === "true";
          const sintomas = getSaludField(dia, cargo, "sintomas");
          const acciones = getSaludField(dia, cargo, "acciones");
          const firma = getSaludField(dia, cargo, "firma");
          if (si || no || sintomas || acciones || firma) registros.push({
            fecha: fechaMes(mesSalud, dia), empleado: cargo, cargo,
            sintomas_si: si, sintomas_no: no,
            sintomas_observados: sintomas || null,
            acciones_tomadas: acciones || null,
            firma_empleado: firma || null,
          });
        });
      }
      await guardarLote("control_salud", registros, "fecha,empleado");
      setGuardadoSalud(true); setTimeout(() => setGuardadoSalud(false), 3000);
    } catch (error) { console.error(error); setErrorBD(error.message || "Error guardando control de salud."); }
    finally { setGuardando(false); }
  };

  const guardarMateria = async () => {
    try {
      setGuardando(true); setErrorBD("");
      const registros = [];
      for (let dia = 1; dia <= new Date(ANIO_HOY, mesMateria + 1, 0).getDate(); dia += 1) {
        const alimento = getMateriaField(dia, "alimento");
        if (!alimento) continue;
        const temperatura = getMateriaField(dia, "temperatura");
        const cantidad = getMateriaField(dia, "cantidad");
        registros.push({ fecha: fechaMes(mesMateria, dia), alimento,
          temperatura: temperatura === "" ? null : Number(temperatura),
          proveedor: getMateriaField(dia, "proveedor") || null,
          cantidad: cantidad === "" ? null : Number(cantidad),
          textura: getMateriaField(dia, "textura") || null,
          olor: getMateriaField(dia, "olor") || null,
          sabor: getMateriaField(dia, "sabor") || null,
          observaciones: getMateriaField(dia, "observaciones") || null });
      }
      await guardarLote("control_materia_prima", registros, "fecha,alimento");
      setGuardadoMateria(true); setTimeout(() => setGuardadoMateria(false), 3000);
    } catch (error) { console.error(error); setErrorBD(error.message || "Error guardando control de materia prima."); }
    finally { setGuardando(false); }
  };

  const guardarNevera = async () => {
    try {
      setGuardando(true); setErrorBD("");
      const registros = [];
      for (let dia = 1; dia <= new Date(ANIO_HOY, mesTempNev + 1, 0).getDate(); dia += 1) {
        productos.forEach((producto) => {
          const valor = getTempNeveraField(producto, dia);
          if (valor !== "") registros.push({ fecha: fechaMes(mesTempNev, dia), producto, temperatura: Number(valor) });
        });
      }
      await guardarLote("control_temperaturas", registros, "fecha,producto");
      setGuardadoNevera(true); setTimeout(() => setGuardadoNevera(false), 3000);
    } catch (error) { console.error(error); setErrorBD(error.message || "Error guardando temperaturas."); }
    finally { setGuardando(false); }
  };
  // ─── CONTROL DE SALUD ────────────────────────────────────────────────────
  const setSaludField = (dia, cargo, campo, valor) => {
    setSaludData((prev) => ({
      ...prev,
      [`${dia}-${cargo}-${campo}`]: valor,
    }));
  };

  const getSaludField = (dia, cargo, campo) =>
    saludData[`${dia}-${cargo}-${campo}`] || "";

  const guardarCargos = () => {
    setCargos(cargosTemp.filter((c) => c.trim()));
    setEditandoCargos(false);
  };

  // ─── CONTROL MATERIA PRIMA ───────────────────────────────────────────────
  const setMateriaField = (dia, campo, valor) => {
    setMateriaData((prev) => ({ ...prev, [`${dia}-${campo}`]: valor }));
  };
  const getMateriaField = (dia, campo) => materiaData[`${dia}-${campo}`] || "";

  const agregarAlimento = () => {
    if (nuevoAlimento.trim() && !alimentos.includes(nuevoAlimento.trim())) {
      setAlimentos((prev) => [...prev, nuevoAlimento.trim()]);
      setNuevoAlimento("");
    }
  };

  // ─── CONTROL TEMPERATURA NEVERA ──────────────────────────────────────────
  const setTempNeveraField = (producto, dia, valor) => {
    setTempNeveraData((prev) => ({ ...prev, [`${producto}-${dia}`]: valor }));
  };
  const getTempNeveraField = (producto, dia) =>
    tempNeveraData[`${producto}-${dia}`] || "";

  const colorTemp = (val) => {
    const v = parseFloat(val);
    if (!val) return "var(--text3)";
    if (v >= -18 && v <= 4) return "var(--green)";
    return "var(--red)";
  };

  const agregarProducto = () => {
    if (nuevoProducto.trim() && !productos.includes(nuevoProducto.trim())) {
      setProductos((prev) => [...prev, nuevoProducto.trim()]);
      setNuevoProducto("");
    }
  };

  // ─── ESTILOS COMUNES ─────────────────────────────────────────────────────
  const thStyle = {
    background: "var(--blue)",
    color: "white",
    padding: "8px 10px",
    fontSize: "11px",
    fontWeight: 600,
    textAlign: "center",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "6px 8px",
    fontSize: "12px",
    border: "1px solid var(--border)",
    textAlign: "center",
    background: "var(--surface)",
  };

  const tdAltStyle = {
    ...tdStyle,
    background: "var(--blue-bg)",
    fontWeight: 500,
    textAlign: "left",
  };

const inputTabla = (valor, onChange, tipo = "text", extra = {}) => {
  const Comp = tipo === "number" ? NumInput : "input";
  const numProps =
    tipo === "number" ? { allowDecimal: true, allowNegative: true } : {};
  return (
    <Comp
      type={tipo}
      {...numProps}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "3px 5px",
        border: "none",
        background: "transparent",
        fontSize: "12px",
        color: "var(--text)",
        textAlign: "center",
        outline: "none",
        ...extra,
      }}
    />
  );
};
  const selectTabla = (valor, onChange, opciones) => (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "3px 2px",
        border: "none",
        background: "transparent",
        fontSize: "11px",
        color: "var(--text)",
        outline: "none",
        cursor: "pointer",
      }}
    >
      <option value="">—</option>
      {opciones.map((op) => (
        <option style={{ fontSize: "12px", color: "#0e0d0b", cursor: "pointer" }} key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  );

  // ─── RENDER CONTROL DE SALUD ─────────────────────────────────────────────
  const renderSalud = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Control de Salud Diario
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)" }}>
            Res. 2674/2013 Art. 10 · Res. 765/2010 — Higiene del personal
            manipulador
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            className="input-field"
            style={{ width: "auto" }}
            value={mesSalud}
            onChange={(e) => setMesSalud(parseInt(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m} {ANIO_HOY}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm"
            onClick={() => {
              setCargosTemp([...cargos]);
              setEditandoCargos(true);
            }}
          >
            ✎ Editar cargos
          </button>

          {guardadoSalud ? (
            <span className="badge badge-green">✓ Guardado</span>
          ) : (
            <button className="btn btn-accent btn-sm" onClick={guardarSalud} disabled={guardando}>
              💾 Guardar cambios
            </button>
          )}
        </div>
      </div>

      {editandoCargos && (
        <div className="modal-overlay open">
          <div className="modal-box">
            <div className="modal-title">Editar cargos del personal</div>
            <div className="modal-sub">
              Agrega, edita o elimina los cargos del equipo
            </div>
            {cargosTemp.map((c, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
              >
                <input
                  type="text"
                  className="input-field"
                  value={c}
                  onChange={(e) =>
                    setCargosTemp((prev) =>
                      prev.map((p, j) => (j === i ? e.target.value : p)),
                    )
                  }
                />
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() =>
                    setCargosTemp((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="btn btn-sm"
              style={{ marginBottom: "12px" }}
              onClick={() => setCargosTemp((prev) => [...prev, ""])}
            >
              + Agregar cargo
            </button>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditandoCargos(false)}>
                Cancelar
              </button>
              <button className="btn btn-accent" onClick={guardarCargos}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "40px" }}>Día</th>
              <th style={thStyle}>Nombre del empleado</th>
              <th style={{ ...thStyle, width: "50px" }}>Síntomas SI</th>
              <th style={{ ...thStyle, width: "50px" }}>Síntomas NO</th>
              <th style={thStyle}>Síntomas observados</th>
              <th style={thStyle}>Acciones tomadas</th>
              <th style={thStyle}>Firma del empleado</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DIAS_MES }, (_, dIdx) => {
              const dia = dIdx + 1;
              const esDiaHoy = dia === DIA_HOY && mesSalud === MES_HOY;
              return cargos.map((cargo, cIdx) => (
                <tr
                  key={`${dia}-${cargo}`}
                  style={{
                    background: esDiaHoy
                      ? "var(--accent2)"
                      : dIdx % 2 === 0
                        ? "var(--surface)"
                        : "var(--surface2)",
                  }}
                >
                  {cIdx === 0 && (
                    <td
                      rowSpan={cargos.length}
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: esDiaHoy ? "var(--accent)" : "var(--text)",
                        verticalAlign: "middle",
                        background: esDiaHoy
                          ? "var(--accent2)"
                          : "var(--blue-bg)",
                        fontSize: "13px",
                      }}
                    >
                      {dia}
                      {esDiaHoy && (
                        <div
                          style={{ fontSize: "9px", color: "var(--accent)" }}
                        >
                          HOY
                        </div>
                      )}
                    </td>
                  )}
                  <td style={tdAltStyle}>{cargo}</td>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={getSaludField(dia, cargo, "si") === "true"}
                      onChange={(e) => {
                        setSaludField(
                          dia,
                          cargo,
                          "si",
                          e.target.checked ? "true" : "",
                        );
                        if (e.target.checked)
                          setSaludField(dia, cargo, "no", "");
                      }}
                      style={{
                        accentColor: "var(--red)",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={getSaludField(dia, cargo, "no") === "true"}
                      onChange={(e) => {
                        setSaludField(
                          dia,
                          cargo,
                          "no",
                          e.target.checked ? "true" : "",
                        );
                        if (e.target.checked)
                          setSaludField(dia, cargo, "si", "");
                      }}
                      style={{
                        accentColor: "var(--green)",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(getSaludField(dia, cargo, "sintomas"), (v) =>
                      setSaludField(dia, cargo, "sintomas", v),
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(getSaludField(dia, cargo, "acciones"), (v) =>
                      setSaludField(dia, cargo, "acciones", v),
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(getSaludField(dia, cargo, "firma"), (v) =>
                      setSaludField(dia, cargo, "firma", v),
                    )}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── RENDER CONTROL MATERIA PRIMA ────────────────────────────────────────
  const renderMateriaPrima = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Control de Materia Prima
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)" }}>
            Res. 2674/2013 — Control de calidad en recepción de alimentos
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            className="input-field"
            style={{ width: "auto" }}
            value={mesMateria}
            onChange={(e) => setMesMateria(parseInt(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m} {ANIO_HOY}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Nuevo alimento"
              value={nuevoAlimento}
              onChange={(e) => setNuevoAlimento(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarAlimento()}
              style={{ width: "140px" }}
            />
            <button className="btn btn-accent btn-sm" onClick={agregarAlimento}>
              + Agregar
            </button>
          </div>

          {guardadoMateria ? (
            <span className="badge badge-green">✓ Guardado</span>
          ) : (
            <button className="btn btn-accent btn-sm" onClick={guardarMateria} disabled={guardando}>
              💾 Guardar cambios
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "40px" }}>Día</th>
              <th style={{ ...thStyle, width: "120px" }}>Alimento</th>
              <th style={{ ...thStyle, width: "90px" }}>Temperatura</th>
              <th style={thStyle}>Proveedor</th>
              <th style={{ ...thStyle, width: "80px" }}>Cantidad</th>
              <th style={{ ...thStyle, width: "80px" }}>Textura</th>
              <th style={{ ...thStyle, width: "70px" }}>Olor</th>
              <th style={{ ...thStyle, width: "70px" }}>Sabor</th>
              <th style={thStyle}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DIAS_MES }, (_, dIdx) => {
              const dia = dIdx + 1;
              const esDiaHoy = dia === DIA_HOY && mesMateria === MES_HOY;
              return (
                <tr
                  key={dia}
                  style={{
                    background: esDiaHoy
                      ? "var(--accent2)"
                      : dIdx % 2 === 0
                        ? "var(--surface)"
                        : "var(--surface2)",
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      color: esDiaHoy ? "var(--accent)" : "var(--text)",
                      background: esDiaHoy
                        ? "var(--accent2)"
                        : "var(--blue-bg)",
                    }}
                  >
                    {dia}
                    {esDiaHoy && (
                      <div style={{ fontSize: "9px", color: "var(--accent)" }}>
                        HOY
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={getMateriaField(dia, "alimento")}
                      onChange={(e) =>
                        setMateriaField(dia, "alimento", e.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        fontSize: "12px",
                        color: "var(--text)",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option style={{ fontSize: "9px", color: "#0e0d0b" }} value="">—</option>
                      {alimentos.map((a) => (
                        <option style={{ fontSize: "12px", color: "#0e0d0b", cursor: "pointer" }} key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: colorTemp(getMateriaField(dia, "temperatura")),
                    }}
                  >
                    {inputTabla(
                      getMateriaField(dia, "temperatura"),
                      (v) => setMateriaField(dia, "temperatura", v),
                      "number",
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(getMateriaField(dia, "proveedor"), (v) =>
                      setMateriaField(dia, "proveedor", v),
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(
                      getMateriaField(dia, "cantidad"),
                      (v) => setMateriaField(dia, "cantidad", v),
                      "number",
                    )}
                  </td>
                  <td style={tdStyle}>
                    {selectTabla(
                      getMateriaField(dia, "textura"),
                      (v) => setMateriaField(dia, "textura", v),
                      OPCIONES_CALIDAD,
                    )}
                  </td>
                  <td style={tdStyle}>
                    {selectTabla(
                      getMateriaField(dia, "olor"),
                      (v) => setMateriaField(dia, "olor", v),
                      OPCIONES_CALIDAD,
                    )}
                  </td>
                  <td style={tdStyle}>
                    {selectTabla(
                      getMateriaField(dia, "sabor"),
                      (v) => setMateriaField(dia, "sabor", v),
                      OPCIONES_CALIDAD,
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inputTabla(getMateriaField(dia, "observaciones"), (v) =>
                      setMateriaField(dia, "observaciones", v),
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── RENDER CONTROL TEMPERATURA NEVERA ───────────────────────────────────
  const renderTempNevera = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Control de Temperatura de la Nevera
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)" }}>
            Decreto 60/2002 HACCP — Rango permitido: -18°C a 4°C · Valores fuera
            de rango se marcan en rojo
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            className="input-field"
            style={{ width: "auto" }}
            value={mesTempNev}
            onChange={(e) => setMesTempNev(parseInt(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m} {ANIO_HOY}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Nuevo producto"
              value={nuevoProducto}
              onChange={(e) => setNuevoProducto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarProducto()}
              style={{ width: "140px" }}
            />
            <button className="btn btn-accent btn-sm" onClick={agregarProducto}>
              + Agregar
            </button>
          </div>
          {/* Botón guardar */}
          {guardadoNevera ? (
            <span className="badge badge-green">✓ Guardado</span>
          ) : (
            <button className="btn btn-accent btn-sm" onClick={guardarNevera} disabled={guardando}>
              💾 Guardar cambios
            </button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "var(--green)",
              borderRadius: "2px",
            }}
          />
          <span>En rango ( 0°C a -18°C)</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "var(--red)",
              borderRadius: "2px",
            }}
          />
          <span>Fuera de rango</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "var(--accent2)",
              borderRadius: "2px",
              border: "1px solid var(--accent)",
            }}
          />
          <span>Día actual</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "120px", textAlign: "left" }}>
                Producto
              </th>
              {Array.from({ length: DIAS_MES }, (_, i) => (
                <th
                  key={i + 1}
                  style={{
                    ...thStyle,
                    width: "32px",
                    background:
                      i + 1 === DIA_HOY && mesTempNev === MES_HOY
                        ? "var(--accent)"
                        : "var(--blue)",
                    padding: "8px 4px",
                  }}
                >
                  {i + 1}
                </th>
              ))}
              <th style={{ ...thStyle, width: "32px" }}>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ fontSize: "9px", padding: "1px 4px" }}
                >
                  ✕
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto, pIdx) => (
              <tr
                key={producto}
                style={{
                  background:
                    pIdx % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                }}
              >
                <td style={{ ...tdAltStyle, fontSize: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{producto}</span>
                    <button
                      onClick={() =>
                        setProductos((prev) =>
                          prev.filter((p) => p !== producto),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0e0d0b",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                    </button>
                  </div>
                </td>
                {Array.from({ length: DIAS_MES }, (_, dIdx) => {
                  const dia = dIdx + 1;
                  const val = getTempNeveraField(producto, dia);
                  const vNum = parseFloat(val);
                  const esDiaHoy = dia === DIA_HOY && mesTempNev === MES_HOY;
                  const fueraRango = val && (vNum < -18 || vNum > 0);
                  return (
                    <td
                      key={dia}
                      style={{
                        ...tdStyle,
                        background: esDiaHoy
                          ? "var(--accent2)"
                          : fueraRango
                            ? "var(--red-bg)"
                            : "inherit",
                        padding: "2px",
                      }}
                    >
                      <input
                        type="number"
                        value={val}
                        onChange={(e) =>
                          setTempNeveraField(producto, dia, e.target.value)
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          fontSize: "11px",
                          textAlign: "center",
                          outline: "none",
                          color: fueraRango
                            ? "var(--red)"
                            : val
                              ? "var(--green)"
                              : "var(--text3)",
                          fontWeight: fueraRango ? 700 : 400,
                        }}
                        placeholder="—"
                      />
                    </td>
                  );
                })}
                <td style={tdStyle} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── RETURN PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="main active fade-in" id="tab-saneamiento">
      {errorBD && <div className="alert-row alert-red" style={{ marginBottom: "12px" }}>{errorBD}</div>}
      {guardando && <div style={{ fontSize: "12px", marginBottom: "8px" }}>Guardando en Supabase...</div>}
      <div
        style={{
          display: "flex",
          gap: "2px",
          background: "var(--surface2)",
          borderRadius: "var(--r-md)",
          padding: "3px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        {[
          { id: "salud", label: "🩺 Control de salud diario" },
          { id: "materia", label: "🥩 Control de materia prima" },
          { id: "nevera", label: "🌡 Control temperatura nevera" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${tabActivo === tab.id ? "active" : ""}`}
            onClick={() => setTabActivo(tab.id)}
            style={{ flex: 1, minWidth: "180px" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabActivo === "salud" && renderSalud()}
      {tabActivo === "materia" && renderMateriaPrima()}
      {tabActivo === "nevera" && renderTempNevera()}
    </div>
  );
}

export default Saneamiento;
