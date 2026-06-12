import { una, ejecutar, leerConfig } from '../../../../../lib/db.js';
import { conSesion } from '../../../../../lib/auth.js';
import { hoyLocal, inventarioTotal, unidadesFuera } from '../../../../../lib/calculos.js';

// Agrega piezas a un alquiler activo (el cliente pide más a mitad de obra).
// Cobran desde su propia fecha, no desde el inicio del alquiler.
export const POST = conSesion(async (request, contexto) => {
  const { id } = await contexto.params;
  const alq = await una('SELECT * FROM alquileres WHERE id = ?', Number(id));
  if (!alq) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
  if (alq.estado === 'cerrado') return Response.json({ error: 'El alquiler está cerrado' }, { status: 400 });

  const c = await request.json();
  const tipo = c.tipo === 'andamio' ? 'andamio' : (c.tipo === 'tablon' ? 'tablon' : null);
  if (!tipo) return Response.json({ error: 'Tipo de pieza no válido' }, { status: 400 });
  const cant = Math.floor(Number(c.cantidad) || 0);
  if (cant < 1) return Response.json({ error: 'Cantidad inválida' }, { status: 400 });

  const fecha = c.fecha_inicio || hoyLocal();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Response.json({ error: 'Fecha no válida' }, { status: 400 });
  if (fecha < alq.fecha_inicio) {
    return Response.json({ error: 'La fecha no puede ser antes del inicio del alquiler' }, { status: 400 });
  }

  // Aviso de inventario (solo si el inventario está registrado)
  if (!c.forzar) {
    const total = (await inventarioTotal())[tipo];
    const disponibles = total - (await unidadesFuera())[tipo];
    if (total > 0 && cant > disponibles) {
      const nombre = tipo === 'andamio' ? 'andamio(s)' : 'tablón(es)';
      return Response.json({
        error: `Según el inventario solo hay ${Math.max(disponibles, 0)} ${nombre} disponibles`,
        puede_forzar: true
      }, { status: 409 });
    }
  }

  const cfg = await leerConfig();
  const precios = { andamio: Number(cfg.precio_andamio), tablon: Number(cfg.precio_tablon) };
  await ejecutar('INSERT INTO alquiler_items (alquiler_id, tipo, cantidad, precio_dia, fecha_inicio) VALUES (?, ?, ?, ?, ?)',
    alq.id, tipo, cant, c.prestamo ? 0 : precios[tipo], fecha === alq.fecha_inicio ? null : fecha);
  return Response.json({ ok: true });
});
