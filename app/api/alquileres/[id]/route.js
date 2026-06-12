import { una, todas, ejecutar } from '../../../../lib/db.js';
import { conSesion } from '../../../../lib/auth.js';
import { hoyLocal, calcularAlquiler } from '../../../../lib/calculos.js';

export const GET = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una(`
    SELECT a.*, c.nombre AS cliente_nombre, c.cedula AS cliente_cedula,
           c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
           uc.nombre AS creado_por_nombre, ux.nombre AS cerrado_por_nombre
    FROM alquileres a
    JOIN clientes c ON c.id = a.cliente_id
    LEFT JOIN usuarios uc ON uc.id = a.creado_por
    LEFT JOIN usuarios ux ON ux.id = a.cerrado_por
    WHERE a.id = ?`, Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const calc = await calcularAlquiler(alq, hoyLocal());
  return Response.json({ ...alq, ...calc, hoy: hoyLocal() });
});

// Actualiza solo los campos que vengan en el cuerpo; el resto queda igual
export const PUT = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const c = await request.json();

  if (c.fecha_inicio !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha_inicio)) {
    return Response.json({ error: 'La fecha de inicio no es válida' }, { status: 400 });
  }

  // Corrección de cantidades o precios de las piezas (sin perder devoluciones)
  if (Array.isArray(c.items)) {
    for (const it of c.items) {
      const item = await una('SELECT * FROM alquiler_items WHERE id = ? AND alquiler_id = ?', Number(it.id), alq.id);
      if (!item) return Response.json({ error: 'Ítem no válido' }, { status: 400 });
      const cant = Math.floor(Number(it.cantidad) || 0);
      const precio = Math.round(Number(it.precio_dia)); // llega en centavos
      if (cant < 1) return Response.json({ error: 'La cantidad debe ser al menos 1' }, { status: 400 });
      if (!Number.isFinite(precio) || precio < 0) return Response.json({ error: 'Precio inválido' }, { status: 400 });
      const devueltas = (await una('SELECT COALESCE(SUM(cantidad), 0) AS s FROM devoluciones WHERE item_id = ?', item.id)).s;
      if (cant < devueltas) {
        return Response.json({ error: `Ya se devolvieron ${devueltas}: la cantidad no puede ser menor` }, { status: 400 });
      }
      await ejecutar('UPDATE alquiler_items SET cantidad = ?, precio_dia = ? WHERE id = ?', cant, precio, item.id);
    }
  }

  await ejecutar(
    `UPDATE alquileres SET cobrar_primer_dia = ?, cobra_sabado = ?, fecha_inicio = ?, garantia = ?,
       garantia_devuelta = ?, direccion_obra = ?, notas = ?, plantilla_pagare = ?, plantilla_recibo = ? WHERE id = ?`,
    c.cobrar_primer_dia === undefined ? alq.cobrar_primer_dia : (c.cobrar_primer_dia ? 1 : 0),
    c.cobra_sabado === undefined ? alq.cobra_sabado : (c.cobra_sabado ? 1 : 0),
    c.fecha_inicio === undefined ? alq.fecha_inicio : c.fecha_inicio,
    c.garantia === undefined ? alq.garantia : String(c.garantia),
    c.garantia_devuelta === undefined ? alq.garantia_devuelta : (c.garantia_devuelta ? 1 : 0),
    c.direccion_obra === undefined ? alq.direccion_obra : String(c.direccion_obra),
    c.notas === undefined ? alq.notas : String(c.notas),
    c.plantilla_pagare === undefined ? (alq.plantilla_pagare ?? '') : String(c.plantilla_pagare),
    c.plantilla_recibo === undefined ? (alq.plantilla_recibo ?? '') : String(c.plantilla_recibo),
    Number(id)
  );
  return Response.json({ ok: true });
});

// Borra el alquiler con todo lo suyo (devoluciones, piezas y pagos).
// Solo para alquileres creados por error: no hay deshacer.
export const DELETE = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  const items = await todas('SELECT id FROM alquiler_items WHERE alquiler_id = ?', alq.id);
  if (items.length) {
    await ejecutar(`DELETE FROM devoluciones WHERE item_id IN (${items.map(() => '?').join(',')})`, ...items.map(i => i.id));
  }
  await ejecutar('DELETE FROM alquiler_items WHERE alquiler_id = ?', alq.id);
  await ejecutar('DELETE FROM pagos WHERE alquiler_id = ?', alq.id);
  await ejecutar('DELETE FROM alquileres WHERE id = ?', alq.id);
  return Response.json({ ok: true });
});
