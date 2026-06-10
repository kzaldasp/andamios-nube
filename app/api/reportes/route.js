import { todas } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';

export const GET = conSesion(async () => {
  const porMes = await todas(`
    SELECT substr(fecha, 1, 7) AS mes, SUM(monto) AS total, COUNT(*) AS pagos
    FROM pagos GROUP BY mes ORDER BY mes DESC LIMIT 24`);
  const ultimosPagos = await todas(`
    SELECT p.*, c.nombre AS cliente_nombre, u.nombre AS usuario_nombre
    FROM pagos p
    JOIN alquileres a ON a.id = p.alquiler_id
    JOIN clientes c ON c.id = a.cliente_id
    LEFT JOIN usuarios u ON u.id = p.usuario_id
    ORDER BY p.fecha DESC, p.id DESC LIMIT 50`);
  return Response.json({ por_mes: porMes, ultimos_pagos: ultimosPagos });
});
