import { ejecutar } from '../../../lib/db.js';
import { leerCookie, publica } from '../../../lib/auth.js';

export const POST = publica(async (request) => {
  const token = leerCookie(request, 'sesion');
  if (token) await ejecutar('DELETE FROM sesiones WHERE token = ?', token);
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'sesion=; Path=/; Max-Age=0' } });
});
