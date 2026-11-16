
import React from "react";
import { MAX_DEFAULT } from "../limits";

function limpiar(raw, allowDecimal, allowNegative) {
  let s = String(raw);
  const negativo = allowNegative && s.trim().startsWith("-");

  if (allowDecimal) {
    s = s.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const i = s.indexOf(".");
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
  } else {
    s = s.replace(/\D/g, "");
  }

  s = s.replace(/^0+(?=\d)/, "");

  return (negativo ? "-" : "") + s;
}

function NumInput({
  value,
  onChange,
  max = MAX_DEFAULT,
  allowDecimal = false,
  allowNegative = false,
  ...rest
}) {
  const anterior = value === undefined || value === null ? "" : String(value);

  const handleChange = (e) => {
    let v = limpiar(e.target.value, allowDecimal, allowNegative);

    const n = parseFloat(v);
    if (!isNaN(n) && Math.abs(n) > max) v = anterior;

    e.target.value = v;
    if (onChange) onChange(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={anterior}
      onChange={handleChange}
    />
  );
}

export default NumInput;