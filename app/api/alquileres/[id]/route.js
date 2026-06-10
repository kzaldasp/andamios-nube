import { una } from '../../../../lib/db.js';
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
