// Inventario: cuántos hay, cuántos están fuera, altas y bajas
import { useEffect, useState } from 'react';
import { PackagePlus, PackageMinus } from 'lucide-react';
import { api, fechaCorta, nombreTipo } from '../api.js';
import {
  Tarjeta, TituloSeccion, Boton, Campo, Entrada, Modal,
  Cargando, Vacio, useAviso, CLASE_INPUT
} from '../ui.jsx';

function TarjetaTipo({ titulo, datos, onMovimiento }) {
  return (
    <Tarjeta>
      <h3 className="font-semibold text-slate-800 mb-2">{titulo}</h3>
      <div className="grid grid-cols-3 text-center mb-3">
        <div><div className="text-2xl font-bold text-slate-800">{datos.total}</div><div className="text-xs text-slate-400">En total</div></div>
        <div><div className="text-2xl font-bold text-amber-600">{datos.fuera}</div><div className="text-xs text-slate-400">Alquilados</div></div>
        <div><div className="text-2xl font-bold text-emerald-600">{datos.disponibles}</div><div className="text-xs text-slate-400">Disponibles</div></div>
      </div>
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1 !py-2" onClick={() => onMovimiento(1)}>
          <PackagePlus size={15} /> Agregar
        </Boton>
        <Boton variante="secundario" className="flex-1 !py-2" onClick={() => onMovimiento(-1)}>
          <PackageMinus size={15} /> Dar de baja
        </Boton>
      </div>
    </Tarjeta>
  );
}

export default function Inventario() {
  const aviso = useAviso();
  const [datos, setDatos] = useState(null);
  const [modal, setModal] = useState(null); // { tipo, signo }
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api('/inventario').then(setDatos).catch(err => aviso(err.message, 'error'));
  useEffect(() => { cargar(); }, []);

  if (!datos) return <Cargando />;

  const abrir = (tipo, signo) => {
    setForm({ cantidad: '', motivo: signo > 0 ? 'Compra' : '' });
    setModal({ tipo, signo });
  };

  const guardar = async () => {
    const cant = Math.floor(Number(form.cantidad) || 0);
    if (cant < 1) return aviso('Indica la cantidad', 'error');
    setGuardando(true);
    try {
      await api('/inventario/movimiento', {
        method: 'POST',
        body: { tipo: modal.tipo, cantidad: cant * modal.signo, motivo: form.motivo || '' }
      });
      aviso('Inventario actualizado ✔');
      setModal(null);
      cargar();
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Inventario</h1>

      {datos.andamio.total === 0 && datos.tablon.total === 0 && (
        <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          Para empezar, registra cuántos andamios y tablones tienes con el botón <strong>Agregar</strong>
          (motivo: "inventario inicial").
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <TarjetaTipo titulo="🏗️ Andamios" datos={datos.andamio} onMovimiento={s => abrir('andamio', s)} />
        <TarjetaTipo titulo="🪵 Tablones" datos={datos.tablon} onMovimiento={s => abrir('tablon', s)} />
      </div>

      <Tarjeta>
        <TituloSeccion>Últimos movimientos</TituloSeccion>
        {datos.movimientos.length === 0 ? (
          <Vacio>Sin movimientos todavía.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {datos.movimientos.map(m => (
              <li key={m.id} className="py-2.5 flex justify-between gap-3">
                <span className="text-slate-700">
                  <strong className={m.cantidad > 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                  </strong>{' '}
                  {nombreTipo(m.tipo, Math.abs(m.cantidad))}
                  {m.motivo && <span className="text-slate-400"> — {m.motivo}</span>}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {fechaCorta(m.fecha)}{m.usuario_nombre && ` · ${m.usuario_nombre}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Modal
        titulo={modal ? `${modal.signo > 0 ? 'Agregar' : 'Dar de baja'} ${nombreTipo(modal.tipo)}` : ''}
        abierto={!!modal} onCerrar={() => setModal(null)}>
        {modal && (
          <>
            <Campo etiqueta="Cantidad">
              <Entrada type="number" min="1" inputMode="numeric" value={form.cantidad}
                onChange={e => setForm({ ...form, cantidad: e.target.value })} autoFocus />
            </Campo>
            <Campo etiqueta="Motivo" ayuda={modal.signo > 0 ? 'Ej: inventario inicial, compra…' : 'Ej: dañado, perdido, vendido…'}>
              <Entrada value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} />
            </Campo>
            <Boton className="w-full mt-3" cargando={guardando} onClick={guardar}>
              Guardar
            </Boton>
          </>
        )}
      </Modal>
    </div>
  );
}
