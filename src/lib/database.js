import { requireSupabase } from './supabaseClient';

export function fechaLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function listarProteinas() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('proteinas')
    .select('*')
    .eq('activa', true)
    .order('categoria')
    .order('nombre');
  if (error) throw error;
  return data || [];
}

export async function guardarProteina(proteina) {
  const client = requireSupabase();
  const payload = {
    nombre: String(proteina.nombre ?? proteina.name ?? '').trim(),
    categoria: proteina.categoria ?? proteina.cat,
    precio: Number(proteina.precio ?? 0),
    preparacion: proteina.preparacion || null,
    activa: proteina.activa !== false,
  };
  if (!payload.nombre || !payload.categoria) throw new Error('La proteína debe tener nombre y categoría.');

  if (proteina.id && /^[0-9a-f-]{36}$/i.test(proteina.id)) {
    const { data, error } = await client.from('proteinas').update(payload).eq('id', proteina.id).select().single();
    if (error) throw error;
    return data;
  }

  // Evita crear duplicados al volver a registrar una proteína ya existente.
  const { data: existente, error: consultaError } = await client
    .from('proteinas').select('*').eq('nombre', payload.nombre).eq('categoria', payload.categoria).limit(1).maybeSingle();
  if (consultaError) throw consultaError;
  if (existente) {
    const { data, error } = await client.from('proteinas').update(payload).eq('id', existente.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('proteinas').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function listarInventario(fecha = fechaLocalISO()) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('inventario_diario')
    .select('*, proteinas(id,nombre,categoria,precio,preparacion)')
    .eq('fecha', fecha);
  if (error) throw error;
  return data || [];
}

export async function guardarInventario({ proteina_id, fecha, porciones_iniciales, porciones_disponibles, stock_minimo }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('inventario_diario')
    .upsert({ proteina_id, fecha, porciones_iniciales, porciones_disponibles, stock_minimo }, { onConflict: 'proteina_id,fecha' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function descontarInventario(proteinaId, fecha = fechaLocalISO(), cantidad = 1) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('descontar_inventario_diario', {
    p_proteina_id: proteinaId,
    p_fecha: fecha,
    p_cantidad: cantidad,
  });
  if (error) throw error;
  return data;
}

export async function guardarLote(tabla, registros, conflicto) {
  if (!registros.length) return [];
  const client = requireSupabase();
  const { data, error } = await client.from(tabla).upsert(registros, { onConflict: conflicto }).select();
  if (error) throw error;
  return data || [];
}

export async function consultarMes(tabla, desde, hasta) {
  const client = requireSupabase();
  const { data, error } = await client.from(tabla).select('*').gte('fecha', desde).lte('fecha', hasta);
  if (error) throw error;
  return data || [];
}

// Caja diaria y ventas
export async function abrirCaja({ base_inicial }) {
  const client = requireSupabase();
  const { data: existente, error: consultaError } = await client
    .from('caja_diaria').select('*').eq('estado', 'abierto').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (consultaError) throw consultaError;
  if (existente) throw new Error('Ya existe una caja abierta. Cierra la caja anterior antes de iniciar otra.');
  const { data, error } = await client.from('caja_diaria').insert({ base_inicial: Number(base_inicial), estado: 'abierto' }).select().single();
  if (error) throw error;
  return data;
}

export async function obtenerCajaAbierta() {
  const client = requireSupabase();
  const { data, error } = await client.from('caja_diaria').select('*').eq('estado', 'abierto').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarVentasCaja(cajaId) {
  const client = requireSupabase();
  const { data, error } = await client.from('ventas').select('*, detalle_ventas(*)').eq('caja_id', cajaId).order('fecha_hora', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function registrarVenta({ cajaId, numeroPedido, total, metodoPago, dineroRecibido, cambioEntregado, items, catalogoProteinas }) {
  const client = requireSupabase();
  if (!cajaId) throw new Error('No hay una caja abierta para registrar la venta.');
  const { data: caja, error: cajaError } = await client.from('caja_diaria').select('estado').eq('id', cajaId).single();
  if (cajaError) throw cajaError;
  if (caja.estado !== 'abierto') throw new Error('La caja ya está cerrada. No se pueden registrar ventas.');

  const { data: venta, error: ventaError } = await client.from('ventas').insert({
    caja_id: cajaId,
    numero_pedido: String(numeroPedido),
    total: Number(total),
    metodo_pago: metodoPago,
    dinero_recibido: Number(dineroRecibido),
    cambio_entregado: Number(cambioEntregado || 0),
  }).select().single();
  if (ventaError) throw ventaError;

  try {
    const detalles = (items || []).map((item) => {
      const nombre = String(item.proteina?.name || item.desc || 'Producto').trim();
      const proteina = item.proteina?.name
        ? (catalogoProteinas || []).find((p) => p.nombre.trim().toLowerCase() === item.proteina.name.trim().toLowerCase())
        : null;
      const cantidad = Number(item.cantidad || 1);
      const precio = Number(item.precio || 0);
      return { venta_id: venta.id, proteina_id: proteina?.id || null, nombre_producto: nombre, cantidad, precio_unitario: precio, subtotal: cantidad * precio };
    });
    if (detalles.length) {
      const { error: detalleError } = await client.from('detalle_ventas').insert(detalles);
      if (detalleError) throw detalleError;
    }

    // Descuenta una porción por cada línea que contiene proteína.
    for (const item of (items || [])) {
      if (!item.proteina?.name) continue;
      const proteina = (catalogoProteinas || []).find((p) => p.nombre.trim().toLowerCase() === item.proteina.name.trim().toLowerCase());
      if (proteina) await descontarInventario(proteina.id);
    }
    return venta;
  } catch (error) {
    // Si falla el detalle o el inventario, elimina la venta incompleta.
    await client.from('ventas').delete().eq('id', venta.id);
    throw error;
  }
}

export async function cerrarCaja(cajaId) {
  const client = requireSupabase();
  const { data, error } = await client.from('caja_diaria').update({ estado: 'cerrado', fecha_hora_cierre: new Date().toISOString() }).eq('id', cajaId).eq('estado', 'abierto').select().single();
  if (error) throw error;
  return data;
}