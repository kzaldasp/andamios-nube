// Detalle de un alquiler: cuenta, devoluciones parciales, pagos, descuento, cierre y pagaré
import { useCallback, useEffect, useState } from 'react';
import { FileText, Undo2, BadgeDollarSign, Percent, Lock, Unlock, Printer } from 'lucide-react';
import { api, dinero, fechaCorta, nombreTipo, hoyISO } from '../api.js';
import {
  Tarjeta, TituloSeccion, Boton, Campo, Entrada, Interruptor, Modal,
  Cargando, Vacio, Insignia, Saldo, useAviso
} from '../ui.jsx';

export default function Alquiler({ id }) {
  const aviso = useAviso();
  const [alq, setAlq] = useState(null);
  const [modal, setModal] = useState(null); // {tipo:'devolucion', item} | {tipo:'pago'} | {tipo:'descuento'} | {tipo:'cerrar'}
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    api(`/alquileres/${id}`).then(setAlq).catch(err => aviso(err.message, 'error'));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!alq) return <Cargando />;

  const abrir = (tipo, extra = {}) => {
    setForm({ fecha: hoyISO(), cobrar_ultimo_dia: true, ...extra });
    setModal(tipo);
  };

  const ejecutar = async (ruta, cuerpo, mensaje, despues) => {
    setGuardando(true);
    try {
      const r = await api(`/alquileres/${id}/${ruta}`, { method: 'POST', body: cuerpo });
      aviso(mensaje);
      setModal(null);
      cargar();
      despues?.(r);
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const cerrado = alq.estado === 'cerrado';
  const hayPendientes = alq.items.some(i => i.pendientes > 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Encabezado */}
      <Tarjeta>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{alq.cliente_nombre}</h1>
            <p className="text-sm text-slate-500">
              {alq.cliente_cedula && <>C.I. {alq.cliente_cedula} · </>}
              {alq.cliente_telefono && <>{alq.cliente_telefono} · </>}
              Alquiler N.º {alq.id}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Desde el <strong>{fechaCorta(alq.fecha_inicio)}</strong>
              {cerrado && <> hasta el <strong>{fechaCorta(alq.fecha_cierre)}</strong></>}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {cerrado ? <Insignia>Cerrado</Insignia> : <Insignia color="azul">Activo</Insignia>}
              {!alq.cobra_sabado && <Insignia color="ambar">No se cobran sábados</Insignia>}
              {alq.garantia && (
                <Insignia color={alq.garantia_devuelta ? 'slate' : 'ambar'}>
                  Garantía: {alq.garantia}{alq.garantia_devuelta ? ' (devuelta)' : ' (guardada)'}
                </Insignia>
              )}
            </div>
          </div>
          <a href={`/imprimir/pagare/${alq.id}`} target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-1 text-blue-700 text-xs font-medium shrink-0 p-2 rounded-xl hover:bg-blue-50">
            <FileText size={22} /> Pagaré
          </a>
        </div>
        {alq.notas && <p className="text-sm text-slate-500 mt-3 border-t border-slate-100 pt-3">📝 {alq.notas}</p>}
        {alq.creado_por_nombre && (
          <p className="text-[11px] text-slate-400 mt-2">
            Registrado por {alq.creado_por_nombre}{alq.cerrado_por_nombre && ` · cerrado por ${alq.cerrado_por_nombre}`}
          </p>
        )}
      </Tarjeta>

      {/* Cuenta */}
      <Tarjeta>
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-600 space-y-1">
            <div>Cargo acumulado: <strong>{dinero(alq.cargo_total)}</strong></div>
            {alq.descuento > 0 && <div className="text-amber-600">Descuento: −{dinero(alq.descuento)}</div>}
            <div>Pagado: <strong>{dinero(alq.pagado)}</strong></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium mb-0.5">
              {alq.saldo > 0 ? 'DEBE' : alq.saldo < 0 ? 'SALDO A FAVOR' : 'SALDADO'}
            </div>
            <Saldo valor={alq.saldo} grande />
          </div>
        </div>
      </Tarjeta>

      {/* Ítems */}
      <Tarjeta>
        <TituloSeccion>Lo alquilado</TituloSeccion>
        <div className="space-y-3">
          {alq.items.map(it => (
            <div key={it.id} className="border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800 capitalize">
                    {it.cantidad} {nombreTipo(it.tipo, it.cantidad)}
                  </span>
                  {it.precio_dia === 0
                    ? <Insignia color="verde">Préstamo</Insignia>
                    : <span className="text-xs text-slate-400"> · {dinero(it.precio_dia)}/día c/u</span>}
                  <div className="text-xs text-slate-500 mt-1">
                    {it.pendientes > 0
                      ? <>Afuera: <strong>{it.pendientes}</strong> ({it.dias_pendientes} día{it.dias_pendientes !== 1 && 's'} hasta hoy)</>
                      : 'Todo devuelto ✔'}
                    {' · '}Cargo: <strong>{dinero(it.cargo)}</strong>
                  </div>
                </div>
                {!cerrado && it.pendientes > 0 && (
                  <Boton variante="secundario" className="shrink-0 !px-3"
                    onClick={() => abrir('devolucion', { item: it, cantidad: String(it.pendientes) })}>
                    <Undo2 size={15} /> Devolver
                  </Boton>
                )}
              </div>
              {it.devoluciones.length > 0 && (
                <ul className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  {it.devoluciones.map(d => (
                    <li key={d.id}>
                      ↩ {d.cantidad} {nombreTipo(it.tipo, d.cantidad)} el {fechaCorta(d.fecha)} — {d.dias} día{d.dias !== 1 && 's'}
                      {!d.cobrar_ultimo_dia && ' (sin cobrar el último día)'}
                      {it.precio_dia > 0 && <> = {dinero(d.subtotal)}</>}
                      {d.usuario_nombre && <span className="text-slate-300"> · {d.usuario_nombre}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Tarjeta>

      {/* Pagos */}
      <Tarjeta>
        <TituloSeccion
          extra={!cerrado || alq.saldo > 0 ? (
            <Boton variante="exito" className="!py-1.5 !px-3" onClick={() => abrir('pago', { monto: alq.saldo > 0 ? (alq.saldo / 100).toFixed(2) : '' })}>
              <BadgeDollarSign size={15} /> Registrar pago
            </Boton>
          ) : null}>
          Pagos
        </TituloSeccion>
        {alq.pagos.length === 0 ? (
          <Vacio>Todavía no hay pagos registrados.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alq.pagos.map(p => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <strong className="text-emerald-700">{dinero(p.monto)}</strong>
                  <span className="text-slate-500"> — {fechaCorta(p.fecha)}</span>
                  {p.nota && <span className="text-slate-400"> · {p.nota}</span>}
                  {p.usuario_nombre && <span className="text-slate-300 text-xs"> · {p.usuario_nombre}</span>}
                </div>
                <a href={`/imprimir/recibo/${p.id}`} target="_blank" rel="noreferrer"
                  className="text-blue-700 p-1.5 rounded-lg hover:bg-blue-50" title="Imprimir recibo">
                  <Printer size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {!cerrado && (
          <>
            <Boton variante="secundario" className="flex-1" onClick={() => abrir('descuento', { monto: alq.descuento ? (alq.descuento / 100).toFixed(2) : '' })}>
              <Percent size={15} /> Descuento
            </Boton>
            <Boton variante="primario" className="flex-1" onClick={() => abrir('cerrar')}>
              <Lock size={15} /> Cerrar alquiler
            </Boton>
          </>
        )}
        {cerrado && (
          <Boton variante="secundario" className="flex-1" onClick={() => {
            if (window.confirm('¿Reabrir este alquiler? Volverá a aparecer como activo.')) {
              ejecutar('reabrir', {}, 'Alquiler reabierto');
            }
          }}>
            <Unlock size={15} /> Reabrir
          </Boton>
        )}
      </div>

      {/* ----- Modales ----- */}
      <Modal titulo={`Devolver ${form.item ? nombreTipo(form.item.tipo) : ''}`}
        abierto={modal === 'devolucion'} onCerrar={() => setModal(null)}>
        {form.item && (
          <>
            <Campo etiqueta={`¿Cuántos devuelve? (afuera: ${form.item.pendientes})`}>
              <Entrada type="number" min="1" max={form.item.pendientes} inputMode="numeric"
                value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Fecha de devolución">
              <Entrada type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </Campo>
            <Interruptor marcado={form.cobrar_ultimo_dia}
              onChange={v => setForm({ ...form, cobrar_ultimo_dia: v })}
              etiqueta="Cobrar el día de la devolución"
              descripcion="Apágalo si por la hora u otro motivo no se cobra este día." />
            <Boton className="w-full mt-3" cargando={guardando}
              onClick={() => ejecutar('devolucion', {
                item_id: form.item.id, cantidad: Number(form.cantidad),
                fecha: form.fecha, cobrar_ultimo_dia: form.cobrar_ultimo_dia
              }, 'Devolución registrada ✔')}>
              Registrar devolución
            </Boton>
          </>
        )}
      </Modal>

      <Modal titulo="Registrar pago" abierto={modal === 'pago'} onCerrar={() => setModal(null)}>
        <Campo etiqueta="Monto en dólares" ayuda={alq.saldo > 0 ? `Saldo actual: ${dinero(alq.saldo)}` : ''}>
          <Entrada type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00"
            value={form.monto ?? ''} onChange={e => setForm({ ...form, monto: e.target.value })} autoFocus />
        </Campo>
        <Campo etiqueta="Fecha del pago">
          <Entrada type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </Campo>
        <Campo etiqueta="Nota (opcional)">
          <Entrada placeholder="Ej: abono, pago final…" value={form.nota ?? ''}
            onChange={e => setForm({ ...form, nota: e.target.value })} />
        </Campo>
        <Boton variante="exito" className="w-full mt-3" cargando={guardando}
          onClick={() => ejecutar('pago', { monto: Number(form.monto), fecha: form.fecha, nota: form.nota || '' },
            'Pago registrado ✔',
            r => { if (window.confirm('¿Imprimir el recibo?')) window.open(`/imprimir/recibo/${r.pago_id}`, '_blank'); })}>
          Guardar pago
        </Boton>
      </Modal>

      <Modal titulo="Aplicar descuento" abierto={modal === 'descuento'} onCerrar={() => setModal(null)}>
        <p className="text-sm text-slate-500 mb-3">
          Rebaja sobre el total a criterio tuyo (ej: redondear, no cobrar unos días, etc.).
          Se resta del cargo acumulado.
        </p>
        <Campo etiqueta="Descuento en dólares" ayuda="Pon 0 para quitar el descuento.">
          <Entrada type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00"
            value={form.monto ?? ''} onChange={e => setForm({ ...form, monto: e.target.value })} autoFocus />
        </Campo>
        <Boton className="w-full mt-3" cargando={guardando}
          onClick={() => ejecutar('descuento', { monto: Number(form.monto) || 0 }, 'Descuento aplicado ✔')}>
          Guardar descuento
        </Boton>
      </Modal>

      <Modal titulo="Cerrar alquiler" abierto={modal === 'cerrar'} onCerrar={() => setModal(null)}>
        {hayPendientes && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            Aún hay piezas sin devolver: se registrarán como devueltas con la fecha de cierre.
          </p>
        )}
        {alq.saldo > 0 && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
            Ojo: queda un saldo de <strong>{dinero(alq.saldo)}</strong> sin pagar.
            Puedes cerrar igual y registrar el pago después, o aplicar un descuento antes.
          </p>
        )}
        <Campo etiqueta="Fecha de cierre">
          <Entrada type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </Campo>
        {hayPendientes && (
          <Interruptor marcado={form.cobrar_ultimo_dia}
            onChange={v => setForm({ ...form, cobrar_ultimo_dia: v })}
            etiqueta="Cobrar el último día"
            descripcion="Aplica a las piezas que se devuelven hoy con el cierre." />
        )}
        <p className="text-xs text-slate-400 mt-2">Al cerrar se marca la garantía como devuelta al cliente.</p>
        <Boton className="w-full mt-3" cargando={guardando}
          onClick={() => ejecutar('cerrar', { fecha: form.fecha, cobrar_ultimo_dia: form.cobrar_ultimo_dia }, 'Alquiler cerrado ✔')}>
          Cerrar alquiler
        </Boton>
      </Modal>
    </div>
  );
}
