import { todas } from '../../../lib/db.js';
import { usuarioActual, hayUsuarios, publica } from '../../../lib/auth.js';

// Estado de sesión (público: lo usa la pantalla de login)
export const GET = publica(async (request) => {
  const usuario = await usuarioActual(request);
  const usuarios = await todas('SELECT id, nombre FROM usuarios WHERE activo = 1 ORDER BY nombre');
  return Response.json({ usuario, usuarios, requiere_configuracion: !(await hayUsuarios()) });
});
