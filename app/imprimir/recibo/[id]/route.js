import { usuarioActual } from '../../../../lib/auth.js';
import { paginaRecibo } from '../../../../lib/imprimir.js';

export async function GET(request, contexto) {
  if (!(await usuarioActual(request))) return Response.redirect(new URL('/', request.url));
  const { id } = await contexto.params;
  const html = await paginaRecibo(Number(id));
  if (!html) return new Response('Pago no encontrado', { status: 404 });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
