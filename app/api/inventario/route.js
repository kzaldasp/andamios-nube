import { todas } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { unidadesFuera, inventarioTotal } from '../../../lib/calculos.js';

export const GET = conSesion(async () => {
  const total = await inventarioTotal();
  const fuera = await unidadesFuera();
  const movimientos = await todas(`
    SELECT m.*, u.nombre AS usuario_nombre FROM inventario_movimientos m
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.fecha DESC, m.id DESC LIMIT 100`);
  return Response.json({
    andamio: { total: total.andamio, fuera: fuera.andamio, disponibles: total.andamio - fuera.andamio },
    tablon: { total: total.tablon, fuera: fuera.tablon, disponibles: total.tablon - fuera.tablon },
    movimientos
  });
});
