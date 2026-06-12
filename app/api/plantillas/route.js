import { leerConfig } from '../../../lib/db.js';
import { conSesion } from '../../../lib/auth.js';
import {
  PLANTILLA_PAGARE_DEFECTO, PLANTILLA_RECIBO_DEFECTO,
  MARCADORES_PAGARE, MARCADORES_RECIBO
} from '../../../lib/imprimir.js';

// Formatos de documentos: el que trae la app, el global vigente y la ayuda de marcadores
export const GET = conSesion(async () => {
  const cfg = await leerConfig();
  return Response.json({
    pagare_defecto: PLANTILLA_PAGARE_DEFECTO,
    recibo_defecto: PLANTILLA_RECIBO_DEFECTO,
    pagare_global: (cfg.plantilla_pagare || '').trim() ? cfg.plantilla_pagare : PLANTILLA_PAGARE_DEFECTO,
    recibo_global: (cfg.plantilla_recibo || '').trim() ? cfg.plantilla_recibo : PLANTILLA_RECIBO_DEFECTO,
    marcadores_pagare: MARCADORES_PAGARE,
    marcadores_recibo: MARCADORES_RECIBO
  });
});
