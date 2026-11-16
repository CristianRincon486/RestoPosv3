
export const MENU_BASE = {
  desayuno: {
    caldos: [
      { id: "c1", name: "Caldo de costilla", precio: 7500, tipo: "normal" },
      { id: "c2", name: "Caldo de pollo", precio: 7500, tipo: "normal" },
      { id: "c3", name: "Caldo de pata", precio: 7500, tipo: "normal" },
      { id: "c4", name: "Caldo de pescado", precio: 8500, tipo: "especial" },
      { id: "c5", name: "Caldo de pajarilla", precio: 8500, tipo: "especial" },
    ],

    bandeja: [
      { id: "b1", name: "Huevos al gusto", precio: 13000 },
      { id: "b3", name: "Carne sudada", precio: 14000 },
      { id: "b4", name: "Moñona", precio: 14000 },  
    ],
    bebidas: [
      { id: "be1", name: "Limonada" },
      { id: "be2", name: "Chocolate" },
      { id: "be3", name: "Tinto" },
      { id: "be4", name: "Perico" },
    ],
  },
  almuerzo: {
    sopa: { id: "sopa", name: "Sopa de arroz", precioSolo: 5500 },
    principios: [
      { id: "p1", name: "Frijol" },
      { id: "p2", name: "Arveja" },
      { id: "p3", name: "Brócoli" },
    ],
    ejecutivo: [
      { id: "e1", name: "Minichurrasco", precio: 18000, tipo: "carne" },
      { id: "e2", name: "Chuleta", precio: 18000, tipo: "carne" },
      { id: "e3", name: "Cachama", precio: 19000, tipo: "pescado" },
      { id: "e4", name: "Cazuela de mariscos", precio: 20000, tipo: "cazuela" },
    ],
    intermedio: [
      {
        id: "i1",
        name: "Chuleta ejecutiva",
        conSopa: 16000,
        sinSopa: 15000,
        tipo: "carne",
      },
      {
        id: "i2",
        name: "Filete de robalo",
        conSopa: 16000,
        sinSopa: 15000,
        tipo: "pescado",
      },
    ],
    corriente: [
      {
        id: "co1",
        name: "Pechuga",
        conSopa: 13000,
        sinSopa: 12000,
        tipo: "carne",
      },
      {
        id: "co2",
        name: "Lomo",
        conSopa: 13000,
        sinSopa: 12000,
        tipo: "carne",
      },
      {
        id: "co3",
        name: "Hígado",
        conSopa: 13000,
        sinSopa: 12000,
        tipo: "carne",
      },
      {
        id: "co4",
        name: "Mojarra",
        conSopa: 14000,
        sinSopa: 13000,
        tipo: "pescado",
      },
    ],
    bebidas: [
      { id: "ab1", name: "Limonada" },
      { id: "ab2", name: "Jugo de mango" },
    ],
  },
};

// ─── HUEVOS Y PRECIOS DEL DESAYUNO ───────────────────────────────────────────
export const HUEVOS_ID = "b1";

export const HUEVOS_PREP = [
  "Pericos",
  "Tortilla",
  "Rancheros",
  "Fritos",
  "Revueltos",
  "Duros",
];

const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const esHuevosAlGusto = (nombre = "") => /al gusto/i.test(nombre);
export const esMonona = (nombre = "") => /monona/.test(norm(nombre));
export const tieneHuevos = (nombre = "") =>
  esHuevosAlGusto(nombre) || esMonona(nombre);
export const esCarneBandeja = (nombre = "") => !esHuevosAlGusto(nombre);

export const PRECIO_HUEVOS_SOLOS = 13000;
export const PRECIO_COMBO = 14000;
export const RECARGO = 1000;
export const CALDO_ESPECIAL_DESDE = 8500;

export const precioDesayuno = ({ caldo, bandeja, prep }) => {
  if (!bandeja) return caldo ? caldo.precio : 0; 
  let total = caldo ? PRECIO_COMBO : PRECIO_HUEVOS_SOLOS; 
  if (prep === "Rancheros") total += RECARGO;
  if (caldo && caldo.precio >= CALDO_ESPECIAL_DESDE) total += RECARGO; 
  if (esCarneBandeja(bandeja.name)) total += RECARGO; 
  return total;
};
