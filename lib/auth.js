// Sesiones por cookie y protección del API.
// Al estar la aplicación en internet, el login además limita los intentos
// fallidos de PIN (ver registrarIntentoFallido / demasiadosIntentos).
import { una, ejecutar } from './db.js';
import { hoyLocal } from './calculos.js';

export function leerCookie(request, nombre) {
  const crudo = request.headers.get('cookie') || '';
  for (const par of crudo.split(';')) {
    const [k, ...v] = par.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}

export async function usuarioActual(request) {
  const token = leerCookie(request, 'sesion');
  if (!token) return null;
  return await una(`
    SELECT u.id, u.nombre FROM sesiones s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token = ? AND u.activo = 1`, token);
}

export async function hayUsuarios() {
  return (await una('SELECT COUNT(*) AS n FROM usuarios WHERE activo = 1')).n > 0;
}

// Crea la sesión y devuelve el header Set-Cookie (dura 1 año: es una app
// familiar, no conviene pedir PIN a cada rato)
export async function crearSesion(usuarioId) {
  const token = crypto.randomUUID();
  await ejecutar('INSERT INTO sesiones (token, usuario_id, creada) VALUES (?, ?, ?)', token, usuarioId, hoyLocal());
  const segura = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `sesion=${token}; Path=/; HttpOnly; Max-Age=31536000; SameSite=Lax${segura}`;
}

// --- Límite de intentos de PIN: máx. 8 fallos cada 15 minutos ---
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 8;

export async function demasiadosIntentos() {
  const desde = Date.now() - VENTANA_MS;
  await ejecutar('DELETE FROM intentos_login WHERE momento < ?', desde);
  return (await una('SELECT COUNT(*) AS n FROM intentos_login')).n >= MAX_INTENTOS;
}

export async function registrarIntentoFallido() {
  await ejecutar('INSERT INTO intentos_login (momento) VALUES (?)', Date.now());
}

export async function limpiarIntentos() {
  await ejecutar('DELETE FROM intentos_login');
}

// Envoltura para las rutas del API que requieren sesión
export function conSesion(handler) {
  return async (request, contexto) => {
    try {
      const usuario = await usuarioActual(request);
      if (!usuario) return Response.json({ error: 'Sesión expirada, vuelve a entrar' }, { status: 401 });
      return await handler(request, contexto, usuario);
    } catch (err) {
      console.error(err);
      return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
    }
  };
}

// Igual pero para rutas públicas (login, etc.): solo captura errores
export function publica(handler) {
  return async (request, contexto) => {
    try {
      return await handler(request, contexto);
    } catch (err) {
      console.error(err);
      return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
    }
  };
}
