import { leerConfig, guardarConfig } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';

export const GET = conSesion(async () => Response.json(await leerConfig()));

export const POST = conSesion(async (request) => {
  await guardarConfig(await request.json());
  return Response.json(await leerConfig());
});
