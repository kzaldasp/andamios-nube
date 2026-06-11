// Pantalla principal: cifras del día, alquileres activos y garantías guardadas
import { useEffect, useState } from 'react';
import { ChevronRight, ShieldCheck, PlusCircle } from 'lucide-react';
import { api, dinero, fechaCorta, nombreTipo } from '../api.js';
import { Tarjeta, TituloSeccion, Cargando, Vacio, Insignia, Saldo } from '../ui.jsx';

function Cifra({ valor, nombre, detalle }) {
  return (
    <Tarjeta className="text-center !p-3">
      <div className="text-xl sm:text-2xl font-bold text-blue-800">{valor}</div>
      <div className="text-xs text-slate-500 font-medium">{nombre}</div>
      {detalle && <div className="text-[11px] text-slate-400">{detalle}</div>}
    </Tarjeta>
  );
}

export default function Inicio() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    api('/resumen').then(setDatos).catch(() => setDatos({ error: true }));
  }, []);

  if (!datos) return <Cargando />;
  if (datos.error) return <Vacio>No se pudo cargar. Revisa que el servidor esté encendido.</Vacio>;

  const inv = datos.inventario;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Cifra valor={dinero(datos.saldo_total)} nombre="Por cobrar" />
        <Cifra valor={`${inv.andamio.fuera} / ${inv.andamio.total}`} nombre="Andamios fuera"
          detalle={`${inv.andamio.disponibles} disponibles`} />
        <Cifra valor={`${inv.tablon.fuera} / ${inv.tablon.total}`} nombre="Tablones fuera"
          detalle={`${inv.tablon.disponibles} disponibles`} />
      </div>

      <section>
        <TituloSeccion
          extra={
            <a href="#/nuevo" className="flex items-center gap-1 text-sm font-medium text-blue-700">
              <PlusCircle size={16} /> Nuevo alquiler
            </a>
          }>
          Alquileres activos ({datos.activos.length})
        </TituloSeccion>

        {datos.activos.length === 0 ? (
          <Tarjeta><Vacio>No hay alquileres activos. ¡Todo está en casa! 🎉</Vacio></Tarjeta>
        ) : (
          <div className="space-y-2.5">
            {datos.activos.map(a => (
              <a key={a.id} href={`#/alquiler/${a.id}`} className="block">
                <Tarjeta className="hover:border-blue-400 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{a.cliente_nombre}</span>
                        {a.es_prestamo && <Insignia color="verde">Préstamo</Insignia>}
                        {!a.cobra_sabado && <Insignia color="ambar">Sin sábados</Insignia>}
                        {!a.cobrar_primer_dia && <Insignia color="ambar">Sin 1er día</Insignia>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {a.items.map(i => `${i.pendientes}${i.pendientes !== i.cantidad ? ` de ${i.cantidad}` : ''} ${nombreTipo(i.tipo, i.cantidad)}`).join(' · ')}
                        {' — desde el '}{fechaCorta(a.fecha_inicio)}
                      </div>
                      {a.direccion_obra && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">📍 {a.direccion_obra}</div>
                      )}
                      {a.pagado > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Cargo {dinero(a.cargo_total)} · pagado {dinero(a.pagado)}
                        </div>
                      )}
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
      </section>

      {datos.garantias.length > 0 && (
        <section>
          <TituloSeccion>Garantías guardadas</TituloSeccion>
          <Tarjeta>
            <ul className="divide-y divide-slate-100">
              {datos.garantias.map(g => (
                <li key={g.alquiler_id}>
                  <a href={`#/alquiler/${g.alquiler_id}`} className="flex items-center gap-3 py-2.5">
                    <ShieldCheck size={18} className="text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>{g.cliente_nombre}</strong> dejó: {g.garantia}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>
      )}
    </div>
  );
}
