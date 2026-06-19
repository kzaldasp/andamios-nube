import { usuarioActual } from '../../../../lib/auth.js';
import { paginaCalendario } from '../../../../lib/imprimir.js';

export async function GET(request, contexto) {
  if (!(await usuarioActual(request))) return Response.redirect(new URL('/', request.url));
  const { id } = await contexto.params;
  const html = await paginaCalendario(Number(id));
  if (!html) return new Response('Alquiler no encontrado', { status: 404 });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
