// Reportes de ingresos e historial de alquileres cerrados
import { useEffect, useState } from 'react';
import { ChevronRight, Printer } from 'lucide-react';
import { api, dinero, fechaCorta, nombreMes } from '../api.js';
import { Tarjeta, TituloSeccion, Cargando, Vacio, Insignia, Saldo } from '../ui.jsx';

export function Reportes() {
  const [datos, setDatos] = useState(null);

  useEffect(() => { api('/reportes').then(setDatos); }, []);
  if (!datos) return <Cargando />;

  const maximo = Math.max(...datos.por_mes.map(m => m.total), 1);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Reportes</h1>

      <Tarjeta>
        <TituloSeccion>Ingresos por mes</TituloSeccion>
        {datos.por_mes.length === 0 ? (
          <Vacio>Aún no hay pagos registrados.</Vacio>
        ) : (
          <div className="space-y-2">
            {datos.por_mes.map(m => (
              <div key={m.mes} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-slate-600">{nombreMes(m.mes)}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.max((m.total / maximo) * 100, 4)}%` }} />
                </div>
                <span className="w-20 text-right font-semibold text-slate-800">{dinero(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Últimos pagos recibidos</TituloSeccion>
        {datos.ultimos_pagos.length === 0 ? (
          <Vacio>Sin pagos todavía.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {datos.ultimos_pagos.map(p => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <a href={`#/alquiler/${p.alquiler_id}`} className="font-medium text-slate-700 hover:text-blue-700">
                    {p.cliente_nombre}
                  </a>
                  <span className="text-xs text-slate-400">
                    {' '}— {fechaCorta(p.fecha)}{p.usuario_nombre && ` · ${p.usuario_nombre}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <strong className="text-emerald-700">{dinero(p.monto)}</strong>
                  <a href={`/imprimir/recibo/${p.id}`} target="_blank" rel="noreferrer"
                    className="text-blue-700 p-1 rounded hover:bg-blue-50" title="Recibo">
                    <Printer size={15} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

export function Historial() {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('cerrado');

  useEffect(() => {
    setLista(null);
    api('/alquileres' + (filtro ? `?estado=${filtro}` : '')).then(setLista);
  }, [filtro]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Historial</h1>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm">
          <option value="cerrado">Cerrados</option>
          <option value="activo">Activos</option>
          <option value="">Todos</option>
        </select>
      </div>

      {!lista ? <Cargando /> : lista.length === 0 ? (
        <Tarjeta><Vacio>No hay alquileres aquí.</Vacio></Tarjeta>
      ) : (
        <div className="space-y-2.5">
          {lista.map(a => (
            <a key={a.id} href={`#/alquiler/${a.id}`} className="block">
              <Tarjeta className="hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{a.cliente_nombre}</span>
                      {a.estado === 'cerrado' ? <Insignia>Cerrado</Insignia> : <Insignia color="azul">Activo</Insignia>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {a.resumen_items} — {fechaCorta(a.fecha_inicio)}
                      {a.fecha_cierre && ` → ${fechaCorta(a.fecha_cierre)}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Total {dinero(a.cargo_total)} · pagado {dinero(a.pagado)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Saldo valor={a.saldo} />
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
              </Tarjeta>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
