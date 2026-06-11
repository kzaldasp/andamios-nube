import { una, todas, ejecutar } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';
import { hoyLocal, calcularAlquiler } from '../../../../../lib/calculos.js';

export const POST = conSesion(async (request, contexto, usuario) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  if (alq.estado === 'cerrado') return Response.json({ error: 'Ya está cerrado' }, { status: 400 });
  const c = await request.json();
  const fecha = c.fecha || hoyLocal();
  // Lo que quede pendiente se devuelve automáticamente con la fecha de cierre
  const items = await todas('SELECT * FROM alquiler_items WHERE alquiler_id = ?', alq.id);
  for (const it of items) {
    const dev = (await una('SELECT COALESCE(SUM(cantidad), 0) AS s FROM devoluciones WHERE item_id = ?', it.id)).s;
    if (it.cantidad - dev > 0) {
      await ejecutar('INSERT INTO devoluciones (item_id, cantidad, fecha, cobrar_ultimo_dia, usuario_id) VALUES (?, ?, ?, ?, ?)',
        it.id, it.cantidad - dev, fecha, c.cobrar_ultimo_dia === false ? 0 : 1, usuario.id);
    }
  }
  await ejecutar(`UPDATE alquileres SET estado = 'cerrado', fecha_cierre = ?, garantia_devuelta = 1, cerrado_por = ? WHERE id = ?`,
    fecha, usuario.id, alq.id);
  // Cuenta final: si el cliente pagó de más (ej: dejó un abono grande),
  // se informa cuánto toca darle de vuelto
  const calc = await calcularAlquiler({ ...alq, estado: 'cerrado', fecha_cierre: fecha }, fecha);
  return Response.json({ ok: true, saldo: calc.saldo, vuelto: calc.saldo < 0 ? -calc.saldo : 0 });
});
