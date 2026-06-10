import { una } from '../../../lib/db.js';
import {
  crearSesion, publica, demasiadosIntentos, registrarIntentoFallido, limpiarIntentos
} from '../../../lib/auth.js';

export const POST = publica(async (request) => {
  // La app está en internet: tras varios PIN incorrectos se bloquea un rato
  if (await demasiadosIntentos()) {
    return Response.json({ error: 'Demasiados intentos. Espera 15 minutos y vuelve a probar.' }, { status: 429 });
  }
  const { usuario_id, pin } = await request.json();
  const u = await una('SELECT * FROM usuarios WHERE id = ? AND activo = 1', Number(usuario_id));
  if (!u || u.pin !== String(pin)) {
    await registrarIntentoFallido();
    return Response.json({ error: 'PIN incorrecto' }, { status: 401 });
  }
  await limpiarIntentos();
  const cookie = await crearSesion(u.id);
  return Response.json({ ok: true, usuario: { id: u.id, nombre: u.nombre } }, { headers: { 'Set-Cookie': cookie } });
});
