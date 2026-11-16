-- RESTOPOS: indices auxiliares para consultas de caja y ventas.
-- No elimina ni modifica las tablas existentes.
CREATE INDEX IF NOT EXISTS idx_ventas_caja_fecha ON public.ventas(caja_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON public.detalle_ventas(venta_id);
