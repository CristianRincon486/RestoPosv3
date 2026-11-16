-- RESTOPOS - RESTAURANTE LA BAHIA
-- Ejecutar en Supabase > SQL Editor.
-- Este script conserva las cinco tablas indicadas en el proyecto y hace
-- idempotente la configuración de seguridad.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.proteinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('Desayuno','Ejecutivo','Intermedio','Corriente')),
  precio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  preparacion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventario_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proteina_id UUID NOT NULL REFERENCES public.proteinas(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  porciones_iniciales INTEGER NOT NULL DEFAULT 0 CHECK (porciones_iniciales >= 0),
  porciones_disponibles INTEGER NOT NULL DEFAULT 0 CHECK (porciones_disponibles >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 3 CHECK (stock_minimo >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proteina_id, fecha)
);

CREATE TABLE IF NOT EXISTS public.control_salud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  empleado VARCHAR(120) NOT NULL,
  cargo VARCHAR(100),
  sintomas_si BOOLEAN NOT NULL DEFAULT FALSE,
  sintomas_no BOOLEAN NOT NULL DEFAULT FALSE,
  sintomas_observados TEXT,
  acciones_tomadas TEXT,
  firma_empleado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (sintomas_si AND sintomas_no)),
  UNIQUE (fecha, empleado)
);

CREATE TABLE IF NOT EXISTS public.control_materia_prima (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  alimento VARCHAR(120) NOT NULL,
  temperatura NUMERIC(8,2),
  proveedor VARCHAR(150),
  cantidad NUMERIC(12,2),
  textura VARCHAR(30),
  olor VARCHAR(30),
  sabor VARCHAR(30),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha, alimento)
);

CREATE TABLE IF NOT EXISTS public.control_temperaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  producto VARCHAR(120) NOT NULL,
  temperatura NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha, producto)
);

-- Índices para consultas por fecha.
CREATE INDEX IF NOT EXISTS idx_inventario_fecha ON public.inventario_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_salud_fecha ON public.control_salud(fecha);
CREATE INDEX IF NOT EXISTS idx_materia_fecha ON public.control_materia_prima(fecha);
CREATE INDEX IF NOT EXISTS idx_temperaturas_fecha ON public.control_temperaturas(fecha);

-- RLS: solo sesiones autenticadas pueden leer o modificar estos datos.
ALTER TABLE public.proteinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_salud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_materia_prima ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_temperaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados gestionan proteinas" ON public.proteinas;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan inventario" ON public.inventario_diario;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan salud" ON public.control_salud;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan materia prima" ON public.control_materia_prima;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan temperaturas" ON public.control_temperaturas;

CREATE POLICY "Usuarios autenticados gestionan proteinas" ON public.proteinas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados gestionan inventario" ON public.inventario_diario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados gestionan salud" ON public.control_salud
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados gestionan materia prima" ON public.control_materia_prima
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados gestionan temperaturas" ON public.control_temperaturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Catálogo inicial que corresponde a las proteínas usadas por el menú actual.
INSERT INTO public.proteinas (nombre, categoria, precio, activa)
SELECT v.nombre, v.categoria, v.precio, TRUE
FROM (VALUES
 ('Huevos al gusto','Desayuno',13000),
 ('Carne sudada','Desayuno',14000),
 ('Moñona','Desayuno',14000),
 ('Minichurrasco','Ejecutivo',18000),
 ('Chuleta','Ejecutivo',18000),
 ('Cachama','Ejecutivo',19000),
 ('Cazuela de mariscos','Ejecutivo',20000),
 ('Chuleta ejecutiva','Intermedio',16000),
 ('Filete de robalo','Intermedio',16000),
 ('Pechuga','Corriente',13000),
 ('Lomo','Corriente',13000),
 ('Hígado','Corriente',13000),
 ('Mojarra','Corriente',14000)
) AS v(nombre, categoria, precio)
WHERE NOT EXISTS (
  SELECT 1 FROM public.proteinas p
  WHERE lower(p.nombre) = lower(v.nombre) AND p.categoria = v.categoria
);


-- Descuento atómico de porciones: evita que dos cobros simultáneos
-- sobrescriban el inventario entre una lectura y una actualización.
CREATE OR REPLACE FUNCTION public.descontar_inventario_diario(
  p_proteina_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_cantidad INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_disponibles INTEGER;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad < 1 THEN
    RAISE EXCEPTION 'La cantidad a descontar debe ser mayor que cero';
  END IF;

  UPDATE public.inventario_diario
  SET porciones_disponibles = GREATEST(0, porciones_disponibles - p_cantidad),
      updated_at = NOW()
  WHERE proteina_id = p_proteina_id AND fecha = p_fecha
  RETURNING porciones_disponibles INTO v_disponibles;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe inventario para la proteína y fecha indicadas';
  END IF;

  RETURN v_disponibles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.descontar_inventario_diario(UUID, DATE, INTEGER) TO authenticated;
