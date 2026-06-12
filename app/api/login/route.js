import { una } from '../../../lib/db.js';
import {
  crearSesion, publica, demasiadosIntentos, registrarIntentoFallido, limpiarIntentos, ipDe
} from '../../../lib/auth.js';
import { verificarPin } from '../../../lib/pines.js';

export const POST = publica(async (request) => {
  // La app está en internet: tras varios PIN incorrectos se bloquea un rato
  const ip = ipDe(request);
  if (await demasiadosIntentos(ip)) {
    return Response.json({ error: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.' }, { status: 429 });
  }
  const { usuario_id, pin } = await request.json();
  const u = await una('SELECT * FROM usuarios WHERE id = ? AND activo = 1', Number(usuario_id));
  if (!u || !verificarPin(pin, u.pin)) {
    await registrarIntentoFallido(ip);
    return Response.json({ error: 'PIN incorrecto' }, { status: 401 });
  }
  await limpiarIntentos(ip);
  const cookie = await crearSesion(u.id);
  return Response.json({ ok: true, usuario: { id: u.id, nombre: u.nombre } }, { headers: { 'Set-Cookie': cookie } });
});
