import { una } from '../../../../lib/db.js';
import { conSesion } from '../../../../lib/auth.js';
import { paginaPagare, paginaRecibo } from '../../../../lib/imprimir.js';

// Vista previa de un formato sin guardarlo: lo aplica sobre datos reales
// (el alquiler indicado o el más reciente) y devuelve el documento listo.
export const POST = conSesion(async (request) => {
  const { tipo, texto, alquiler_id } = await request.json();
  const plantilla = (texto || '').trim() ? String(texto) : undefined;

  if (tipo === 'pagare') {
    const id = Number(alquiler_id)
      || (await una('SELECT id FROM alquileres ORDER BY id DESC LIMIT 1'))?.id;
    if (!id) return Response.json({ error: 'Crea al menos un alquiler para ver el ejemplo' }, { status: 400 });
    const html = await paginaPagare(id, plantilla);
    if (!html) return Response.json({ error: 'Alquiler no encontrado' }, { status: 404 });
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (tipo === 'recibo') {
    let pago = null;
    if (Number(alquiler_id)) {
      pago = await una('SELECT id FROM pagos WHERE alquiler_id = ? ORDER BY id DESC LIMIT 1', Number(alquiler_id));
    }
    if (!pago) pago = await una('SELECT id FROM pagos ORDER BY id DESC LIMIT 1');
    if (!pago) return Response.json({ error: 'Registra al menos un pago para ver el ejemplo' }, { status: 400 });
    const html = await paginaRecibo(pago.id, plantilla);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return Response.json({ error: 'Tipo de documento no válido' }, { status: 400 });
});
