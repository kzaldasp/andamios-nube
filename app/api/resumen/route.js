import { todas } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import { hoyLocal, calcularVarios, unidadesFuera, inventarioTotal } from '../../../lib/calculos.js';

// Resumen para la pantalla de inicio
export const GET = conSesion(async () => {
  const hoy = hoyLocal();
  const activos = await todas(`
    SELECT a.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
    FROM alquileres a JOIN clientes c ON c.id = a.cliente_id
    WHERE a.estado = 'activo' ORDER BY a.fecha_inicio`);
  const calculos = await calcularVarios(activos, hoy);
  let saldoTotal = 0;
  const lista = activos.map(a => {
    const calc = calculos.get(a.id);
    saldoTotal += calc.saldo;
    return {
      id: a.id, cliente_nombre: a.cliente_nombre, cliente_telefono: a.cliente_telefono,
      fecha_inicio: a.fecha_inicio, garantia: a.garantia, garantia_devuelta: a.garantia_devuelta,
      cobra_sabado: a.cobra_sabado, cobrar_primer_dia: a.cobrar_primer_dia, direccion_obra: a.direccion_obra,
      cargo_total: calc.cargo_total, pagado: calc.pagado, saldo: calc.saldo,
      es_prestamo: calc.items.every(i => i.precio_dia === 0),
      items: calc.items.map(i => ({ tipo: i.tipo, cantidad: i.cantidad, pendientes: i.pendientes, precio_dia: i.precio_dia }))
    };
  });
  const fuera = await unidadesFuera();
  const total = await inventarioTotal();
  const garantias = activos
    .filter(a => a.garantia && !a.garantia_devuelta)
    .map(a => ({ alquiler_id: a.id, cliente_nombre: a.cliente_nombre, garantia: a.garantia }));
  return Response.json({
    hoy, activos: lista, saldo_total: saldoTotal, garantias,
    inventario: {
      andamio: { total: total.andamio, fuera: fuera.andamio, disponibles: total.andamio - fuera.andamio },
      tablon: { total: total.tablon, fuera: fuera.tablon, disponibles: total.tablon - fuera.tablon }
    }
  });
});
