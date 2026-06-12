// Ajustes: datos del negocio, precios, formato de documentos y usuarios
import { useEffect, useState, useRef } from 'react';
import { UserPlus, KeyRound, CloudDownload, CloudUpload, Eye, RotateCcw } from 'lucide-react';
import { api, abrirPreviaPlantilla } from '../api.js';
import {
  Tarjeta, TituloSeccion, Boton, Campo, Entrada, AreaTexto, Modal,
  Cargando, Insignia, useAviso
} from '../ui.jsx';

// Ayuda plegable con los marcadores {{asi}} que acepta una plantilla
export function AyudaMarcadores({ marcadores }) {
  return (
    <details className="text-xs text-slate-500 mb-3">
      <summary className="cursor-pointer font-medium text-blue-700">Ver las palabras que puedes usar</summary>
      <p className="mt-2 mb-1">
        Escribe estas palabras entre llaves dobles y se reemplazan con los datos reales.
        Si una línea queda sin datos (ej: no hay garantía), esa línea no se imprime.
        Usa <code>**texto**</code> para negrita, <code># </code> para título y <code>&gt; </code> para letra pequeña.
      </p>
      <ul className="space-y-0.5 mt-1">
        {marcadores.map(([clave, descripcion]) => (
          <li key={clave}><code className="bg-slate-100 px-1 rounded">{'{{' + clave + '}}'}</code> — {descripcion}</li>
        ))}
      </ul>
    </details>
  );
}

// La config guarda dinero en centavos; aquí se edita en dólares
const CAMPOS_DINERO = ['precio_andamio', 'precio_tablon', 'reposicion_andamio', 'reposicion_tablon'];

export default function Ajustes({ alRecargarSesion }) {
  const aviso = useAviso();
  const [config, setConfig] = useState(null);
  const [plantillas, setPlantillas] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(null); // { id?, nombre, pin }
  const archivoRespaldo = useRef(null);

  const cargar = async () => {
    const [cfg, p] = await Promise.all([api('/config'), api('/plantillas')]);
    for (const k of CAMPOS_DINERO) cfg[k] = (Number(cfg[k]) / 100).toFixed(2);
    // Si no hay formato propio guardado, se edita partiendo del que trae la app
    if (!cfg.plantilla_pagare?.trim()) cfg.plantilla_pagare = p.pagare_defecto;
    if (!cfg.plantilla_recibo?.trim()) cfg.plantilla_recibo = p.recibo_defecto;
    setPlantillas(p);
    setConfig(cfg);
    setUsuarios(await api('/usuarios'));
  };
  useEffect(() => { cargar(); }, []);

  if (!config) return <Cargando />;

  const campo = (k) => ({ value: config[k] ?? '', onChange: e => setConfig({ ...config, [k]: e.target.value }) });

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      const cuerpo = { ...config };
      for (const k of CAMPOS_DINERO) cuerpo[k] = Math.round(Number(config[k]) * 100) || 0;
      // Si dejaron el formato igual al original, se guarda vacío para que
      // futuras mejoras del formato de la app se apliquen solas
      if (cuerpo.plantilla_pagare?.trim() === plantillas.pagare_defecto.trim()) cuerpo.plantilla_pagare = '';
      if (cuerpo.plantilla_recibo?.trim() === plantillas.recibo_defecto.trim()) cuerpo.plantilla_recibo = '';
      await api('/config', { method: 'POST', body: cuerpo });
      aviso('Ajustes guardados ✔');
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const guardarUsuario = async () => {
    const u = modalUsuario;
    setGuardando(true);
    try {
      if (u.id) {
        await api(`/usuarios/${u.id}`, { method: 'PUT', body: { nombre: u.nombre, pin: u.pin } });
      } else {
        await api('/usuarios', { method: 'POST', body: { nombre: u.nombre, pin: u.pin } });
      }
      aviso('Usuario guardado ✔');
      setModalUsuario(null);
      cargar();
      alRecargarSesion?.();
    } catch (err) {
      aviso(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (u) => {
    try {
      await api(`/usuarios/${u.id}`, { method: 'PUT', body: { activo: u.activo ? 0 : 1 } });
      cargar();
      alRecargarSesion?.();
    } catch (err) {
      aviso(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800">Ajustes</h1>

      <Tarjeta>
        <TituloSeccion>Datos del negocio</TituloSeccion>
        <p className="text-xs text-slate-400 -mt-2 mb-3">Aparecen en el pagaré y los recibos.</p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Nombre del negocio"><Entrada {...campo('negocio_nombre')} /></Campo>
          <Campo etiqueta="Teléfono"><Entrada {...campo('telefono')} /></Campo>
          <Campo etiqueta="Nombre de la propietaria"><Entrada {...campo('propietaria')} /></Campo>
          <Campo etiqueta="Cédula de la propietaria"><Entrada {...campo('propietaria_cedula')} /></Campo>
          <Campo etiqueta="Ciudad"><Entrada {...campo('ciudad')} /></Campo>
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Precios por día (dólares)</TituloSeccion>
        <div className="grid grid-cols-2 gap-x-4">
          <Campo etiqueta="Andamio"><Entrada type="number" step="0.01" min="0" {...campo('precio_andamio')} /></Campo>
          <Campo etiqueta="Tablón"><Entrada type="number" step="0.01" min="0" {...campo('precio_tablon')} /></Campo>
        </div>
        <TituloSeccion>Valor de reposición (para el pagaré)</TituloSeccion>
        <p className="text-xs text-slate-400 -mt-2 mb-3">Lo que debe pagar el cliente si no devuelve o daña la pieza.</p>
        <div className="grid grid-cols-2 gap-x-4">
          <Campo etiqueta="Andamio"><Entrada type="number" step="0.01" min="0" {...campo('reposicion_andamio')} /></Campo>
          <Campo etiqueta="Tablón"><Entrada type="number" step="0.01" min="0" {...campo('reposicion_tablon')} /></Campo>
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Formato de los documentos</TituloSeccion>
        <p className="text-xs text-slate-400 -mt-2 mb-3">
          Aquí puedes cambiar el texto del pagaré y del recibo que se imprimen.
          Este formato se usa para todos los alquileres (cada alquiler puede tener
          el suyo propio desde su pantalla, con el botón "Formato").
        </p>

        <Campo etiqueta="Pagaré">
          <AreaTexto rows={10} className="font-mono !text-xs" value={config.plantilla_pagare}
            onChange={e => setConfig({ ...config, plantilla_pagare: e.target.value })} />
        </Campo>
        <AyudaMarcadores marcadores={plantillas.marcadores_pagare} />
        <div className="flex gap-2 mb-5">
          <Boton variante="secundario" className="!py-1.5 !px-3 text-xs"
            onClick={() => abrirPreviaPlantilla('pagare', config.plantilla_pagare).catch(err => aviso(err.message, 'error'))}>
            <Eye size={14} /> Vista previa
          </Boton>
          <Boton variante="fantasma" className="!py-1.5 !px-3 text-xs"
            onClick={() => {
              if (window.confirm('¿Volver al formato original del pagaré? Se perderán tus cambios de este formato.')) {
                setConfig({ ...config, plantilla_pagare: plantillas.pagare_defecto });
              }
            }}>
            <RotateCcw size={14} /> Restaurar original
          </Boton>
        </div>

        <Campo etiqueta="Recibo de pago">
          <AreaTexto rows={10} className="font-mono !text-xs" value={config.plantilla_recibo}
            onChange={e => setConfig({ ...config, plantilla_recibo: e.target.value })} />
        </Campo>
        <AyudaMarcadores marcadores={plantillas.marcadores_recibo} />
        <div className="flex gap-2">
          <Boton variante="secundario" className="!py-1.5 !px-3 text-xs"
            onClick={() => abrirPreviaPlantilla('recibo', config.plantilla_recibo).catch(err => aviso(err.message, 'error'))}>
            <Eye size={14} /> Vista previa
          </Boton>
          <Boton variante="fantasma" className="!py-1.5 !px-3 text-xs"
            onClick={() => {
              if (window.confirm('¿Volver al formato original del recibo? Se perderán tus cambios de este formato.')) {
                setConfig({ ...config, plantilla_recibo: plantillas.recibo_defecto });
              }
            }}>
            <RotateCcw size={14} /> Restaurar original
          </Boton>
        </div>
        <p className="text-xs text-slate-400 mt-3">Recuerda tocar "Guardar ajustes" para que los cambios queden guardados.</p>
      </Tarjeta>

      <Boton onClick={guardarConfig} cargando={guardando} className="w-full">Guardar ajustes</Boton>

      <Tarjeta>
        <TituloSeccion
          extra={
            <Boton variante="secundario" className="!py-1.5 !px-3"
              onClick={() => setModalUsuario({ nombre: '', pin: '' })}>
              <UserPlus size={15} /> Agregar
            </Boton>
          }>
          Usuarios
        </TituloSeccion>
        <ul className="divide-y divide-slate-100">
          {usuarios.map(u => (
            <li key={u.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">{u.nombre}</span>
                {!u.activo && <Insignia color="rojo">Inactivo</Insignia>}
              </div>
              <div className="flex gap-2">
                <Boton variante="fantasma" className="!py-1 !px-2 text-xs"
                  onClick={() => setModalUsuario({ id: u.id, nombre: u.nombre, pin: '' })}>
                  <KeyRound size={13} /> Editar
                </Boton>
                <Boton variante="fantasma" className="!py-1 !px-2 text-xs"
                  onClick={() => alternarActivo(u)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Acerca de los datos</TituloSeccion>
        <p className="text-sm text-slate-500 mb-3">
          Toda la información se guarda en internet (base de datos Turso), por eso pueden
          usar la aplicación desde cualquier celular o computadora. De vez en cuando
          descarga una copia de seguridad y guárdala en tu equipo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={() => { window.location.href = '/api/respaldo'; }}>
            <CloudDownload size={16} /> Descargar copia de seguridad
          </Boton>
          <Boton variante="secundario" cargando={guardando} onClick={() => archivoRespaldo.current?.click()}>
            <CloudUpload size={16} /> Restaurar una copia
          </Boton>
        </div>
        <input ref={archivoRespaldo} type="file" accept=".json,application/json" className="hidden"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            e.target.value = '';
            if (!archivo) return;
            let copia;
            try {
              copia = JSON.parse(await archivo.text());
            } catch {
              return aviso('El archivo no se pudo leer como respaldo', 'error');
            }
            if (!window.confirm(`⚠️ Restaurar "${archivo.name}" BORRA todos los datos actuales y los reemplaza por los del archivo${copia.generado ? ` (creado el ${copia.generado.slice(0, 10)})` : ''}. ¿Continuar?`)) return;
            if (!window.confirm('Esta acción NO se puede deshacer y cierra la sesión de todos. ¿Restaurar definitivamente?')) return;
            setGuardando(true);
            try {
              await api('/respaldo', { method: 'POST', body: copia });
              window.alert('Respaldo restaurado ✔. Vuelve a entrar con el PIN que tenías cuando se creó esa copia.');
              window.location.reload();
            } catch (err) {
              aviso(err.message, 'error');
              setGuardando(false);
            }
          }} />
        <p className="text-xs text-slate-400 mt-2">
          Restaurar reemplaza TODO con lo del archivo (se usa si se dañó algo o se borraron datos por error).
        </p>
      </Tarjeta>

      <Modal titulo={modalUsuario?.id ? 'Editar usuario' : 'Nuevo usuario'}
        abierto={!!modalUsuario} onCerrar={() => setModalUsuario(null)}>
        {modalUsuario && (
          <>
            <Campo etiqueta="Nombre">
              <Entrada value={modalUsuario.nombre}
                onChange={e => setModalUsuario({ ...modalUsuario, nombre: e.target.value })} autoFocus />
            </Campo>
            <Campo etiqueta={modalUsuario.id ? 'Nuevo PIN (deja vacío para no cambiarlo)' : 'PIN (4 a 6 números)'}>
              <Entrada inputMode="numeric" maxLength={6} value={modalUsuario.pin}
                onChange={e => setModalUsuario({ ...modalUsuario, pin: e.target.value.replace(/\D/g, '') })} />
            </Campo>
            <Boton className="w-full mt-3" cargando={guardando} onClick={guardarUsuario}
              disabled={!modalUsuario.nombre.trim() || (!modalUsuario.id && modalUsuario.pin.length < 4)}>
              Guardar
            </Boton>
          </>
        )}
      </Modal>
    </div>
  );
}
