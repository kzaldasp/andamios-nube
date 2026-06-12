// Reportes de ingresos (con filtro de fechas) e historial de alquileres
import { useEffect, useState } from 'react';
import { ChevronRight, Printer, AlertCircle, Trophy, MessageCircle, Download } from 'lucide-react';
import { api, dinero, fechaCorta, nombreMes, hoyISO, enlaceWhatsApp, descargarCSV } from '../api.js';
import { Tarjeta, TituloSeccion, Cargando, Vacio, Insignia, Saldo } from '../ui.jsx';

// ---- Filtro de fechas reutilizable (presets + fechas manuales) ----

function rangoPreset(preset) {
  const hoy = hoyISO();
  const [y, m] = hoy.split('-').map(Number);
  if (preset === 'mes') return { desde: `${y}-${String(m).padStart(2, '0')}-01`, hasta: hoy };
  if (preset === 'mes_pasado') {
    const ya = m === 1 ? y - 1 : y, ma = m === 1 ? 12 : m - 1;
    const fin = new Date(ya, ma, 0).getDate(); // último día del mes anterior
    return { desde: `${ya}-${String(ma).padStart(2, '0')}-01`, hasta: `${ya}-${String(ma).padStart(2, '0')}-${String(fin).padStart(2, '0')}` };
  }
  if (preset === 'anio') return { desde: `${y}-01-01`, hasta: hoy };
  return { desde: '', hasta: '' }; // todo
}

const CLASE_FECHA = 'px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-sm w-full';

export function FiltroFechas({ rango, onCambio }) {
  const [preset, setPreset] = useState('todo');
  const elegir = (p) => { setPreset(p); onCambio(rangoPreset(p)); };
  return (
    <Tarjeta className="!p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={preset} onChange={e => elegir(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-sm">
          <option value="todo">Todo el tiempo</option>
          <option value="mes">Este mes</option>
          <option value="mes_pasado">Mes pasado</option>
          <option value="anio">Este año</option>
        </select>
        <div className="flex items-center gap-1.5 flex-1 min-w-[230px]">
          <input type="date" className={CLASE_FECHA} value={rango.desde}
            onChange={e => { setPreset('otro'); onCambio({ ...rango, desde: e.target.value }); }} />
          <span className="text-slate-400 text-sm">a</span>
          <input type="date" className={CLASE_FECHA} value={rango.hasta}
            onChange={e => { setPreset('otro'); onCambio({ ...rango, hasta: e.target.value }); }} />
        </div>
      </div>
    </Tarjeta>
  );
}

function consultaRango(rango, extra = {}) {
  const p = new URLSearchParams(extra);
  if (rango.desde) p.set('desde', rango.desde);
  if (rango.hasta) p.set('hasta', rango.hasta);
  const s = p.toString();
  return s ? '?' + s : '';
}

function Cifra({ valor, nombre }) {
  return (
    <Tarjeta className="text-center !p-3">
      <div className="text-lg sm:text-xl font-bold text-blue-800">{valor}</div>
      <div className="text-xs text-slate-500 font-medium">{nombre}</div>
    </Tarjeta>
  );
}

// ---- Reportes ----

export function Reportes() {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    setDatos(null);
    api('/reportes' + consultaRango(rango)).then(setDatos);
  }, [rango]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Reportes</h1>
      <FiltroFechas rango={rango} onCambio={setRango} />

      {!datos ? <Cargando /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Cifra valor={dinero(datos.totales.cobrado)} nombre="Cobrado" />
            <Cifra valor={datos.totales.pagos} nombre="Pagos recibidos" />
            <Cifra valor={datos.totales.alquileres_nuevos} nombre="Alquileres nuevos" />
            <Cifra valor={datos.totales.alquileres_cerrados} nombre="Cerrados" />
          </div>
          {datos.totales.descuentos > 0 && (
            <p className="text-xs text-slate-400 -mt-2 px-1">
              Descuentos otorgados en alquileres cerrados del período: {dinero(datos.totales.descuentos)}
            </p>
          )}

          {datos.deudores.length > 0 && (
            <Tarjeta>
              <TituloSeccion>Por cobrar ahora ({datos.deudores.length})</TituloSeccion>
              <ul className="divide-y divide-slate-100 text-sm">
                {datos.deudores.map(d => (
                  <li key={d.alquiler_id} className="flex items-center justify-between gap-2 py-2.5">
                    <a href={`#/alquiler/${d.alquiler_id}`} className="flex items-center gap-2 min-w-0 flex-1 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                      <AlertCircle size={16} className="text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-700 truncate">{d.cliente_nombre}</div>
                        <div className="text-xs text-slate-400">desde el {fechaCorta(d.fecha_inicio)}{d.cliente_telefono && ` · ${d.cliente_telefono}`}</div>
                      </div>
                    </a>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Saldo valor={d.saldo} />
                      {d.cliente_telefono && (
                        <a target="_blank" rel="noreferrer" title="Recordar la deuda por WhatsApp"
                          href={enlaceWhatsApp(d.cliente_telefono,
                            `Hola ${d.cliente_nombre}, le saluda ${datos.negocio}. Le recordamos que su alquiler iniciado el ${fechaCorta(d.fecha_inicio)} tiene un saldo pendiente de ${dinero(d.saldo)}. ¡Gracias!`)}
                          className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg">
                          <MessageCircle size={17} />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <Tarjeta>
            <TituloSeccion
              extra={datos.por_mes.length > 0 ? (
                <button title="Descargar para Excel"
                  onClick={() => descargarCSV('ingresos-por-mes.csv',
                    ['Mes', 'Total cobrado', 'Pagos'],
                    datos.por_mes.map(m => [m.mes, (m.total / 100).toFixed(2), m.pagos]))}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-lg">
                  <Download size={14} /> Excel
                </button>
              ) : null}>
              Ingresos por mes
            </TituloSeccion>
            {datos.por_mes.length === 0 ? (
              <Vacio>No hay pagos en este período.</Vacio>
            ) : (
              <BarrasPorMes meses={datos.por_mes} />
            )}
          </Tarjeta>

          {datos.top_clientes.length > 0 && (
            <Tarjeta>
              <TituloSeccion>Mejores clientes del período</TituloSeccion>
              <ul className="divide-y divide-slate-100 text-sm">
                {datos.top_clientes.map((c, i) => (
                  <li key={c.id}>
                    <a href={`#/cliente/${c.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 text-center font-bold ${i === 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                          {i === 0 ? <Trophy size={16} className="inline" /> : i + 1}
                        </span>
                        <div>
                          <div className="font-medium text-slate-700">{c.nombre}</div>
                          <div className="text-xs text-slate-400">{c.pagos} pago{c.pagos !== 1 && 's'}</div>
                        </div>
                      </div>
                      <strong className="text-emerald-700">{dinero(c.total)}</strong>
                    </a>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <Tarjeta>
            <TituloSeccion
              extra={datos.ultimos_pagos.length > 0 ? (
                <button title="Descargar para Excel"
                  onClick={() => descargarCSV(
                    `pagos-${rango.desde || 'inicio'}-a-${rango.hasta || hoyISO()}.csv`,
                    ['Fecha', 'Cliente', 'Monto', 'Nota', 'Registrado por', 'Alquiler'],
                    datos.ultimos_pagos.map(p => [p.fecha, p.cliente_nombre, (p.monto / 100).toFixed(2), p.nota || '', p.usuario_nombre || '', p.alquiler_id])
                  )}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-lg">
                  <Download size={14} /> Excel
                </button>
              ) : null}>
              Pagos del período
            </TituloSeccion>
            {datos.ultimos_pagos.length === 0 ? (
              <Vacio>Sin pagos en este período.</Vacio>
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
        </>
      )}
    </div>
  );
}

function BarrasPorMes({ meses }) {
  const maximo = Math.max(...meses.map(m => m.total), 1);
  return (
    <div className="space-y-2">
      {meses.map(m => (
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
  );
}

// ---- Historial ----

export function Historial() {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('cerrado');
  const [rango, setRango] = useState({ desde: '', hasta: '' });

  useEffect(() => {
    setLista(null);
    api('/alquileres' + consultaRango(rango, filtro ? { estado: filtro } : {})).then(setLista);
  }, [filtro, rango]);

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
      <FiltroFechas rango={rango} onCambio={setRango} />
      <p className="text-xs text-slate-400 -mt-2 px-1">El filtro de fechas es por la fecha de inicio del alquiler.</p>

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
