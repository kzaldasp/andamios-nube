// Componentes visuales compartidos
import { useEffect, useState, createContext, useContext } from 'react';
import { X, Loader2 } from 'lucide-react';

// ---- Avisos (toast) ----
const ContextoAviso = createContext(() => {});
export const useAviso = () => useContext(ContextoAviso);

export function ProveedorAvisos({ children }) {
  const [aviso, setAviso] = useState(null);
  const mostrar = (texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    setTimeout(() => setAviso(null), 3500);
  };
  return (
    <ContextoAviso.Provider value={mostrar}>
      {children}
      {aviso && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-[90vw] text-center
          ${aviso.tipo === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          {aviso.texto}
        </div>
      )}
    </ContextoAviso.Provider>
  );
}

// ---- Tarjeta ----
export function Tarjeta({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function TituloSeccion({ children, extra }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {extra}
    </div>
  );
}

// ---- Botones ----
const ESTILOS_BOTON = {
  primario: 'bg-blue-700 hover:bg-blue-800 text-white',
  secundario: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300',
  exito: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  peligro: 'bg-red-600 hover:bg-red-700 text-white',
  fantasma: 'text-blue-700 hover:bg-blue-50'
};

export function Boton({ children, variante = 'primario', cargando = false, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
        transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer
        ${ESTILOS_BOTON[variante]} ${className}`}
      disabled={cargando || props.disabled}
      {...props}
    >
      {cargando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

// ---- Campos de formulario ----
export function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-slate-600 mb-1">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-xs text-slate-400 mt-1">{ayuda}</span>}
    </label>
  );
}

export const CLASE_INPUT = `w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400`;

export function Entrada({ className = '', ...props }) {
  return <input className={`${CLASE_INPUT} ${className}`} {...props} />;
}

export function AreaTexto({ className = '', ...props }) {
  return <textarea className={`${CLASE_INPUT} min-h-[70px] resize-y ${className}`} {...props} />;
}

export function Interruptor({ marcado, onChange, etiqueta, descripcion }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!marcado)}
      className="flex items-center gap-3 w-full text-left py-2 cursor-pointer"
    >
      <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${marcado ? 'bg-blue-700' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${marcado ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{etiqueta}</span>
        {descripcion && <span className="block text-xs text-slate-400">{descripcion}</span>}
      </span>
    </button>
  );
}

// ---- Modal ----
export function Modal({ titulo, abierto, onCerrar, children }) {
  useEffect(() => {
    if (!abierto) return;
    const f = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ---- Varios ----
export function Insignia({ children, color = 'slate' }) {
  const colores = {
    slate: 'bg-slate-100 text-slate-600',
    verde: 'bg-emerald-100 text-emerald-700',
    rojo: 'bg-red-100 text-red-700',
    ambar: 'bg-amber-100 text-amber-700',
    azul: 'bg-blue-100 text-blue-700'
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colores[color]}`}>{children}</span>;
}

export function Vacio({ children }) {
  return <p className="text-center text-slate-400 text-sm py-8">{children}</p>;
}

export function Cargando() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={28} className="animate-spin text-blue-700" />
    </div>
  );
}

export function Saldo({ valor, grande = false }) {
  const clase = valor > 0 ? 'text-red-600' : valor < 0 ? 'text-emerald-600' : 'text-slate-500';
  const dinero = (Math.abs(valor) / 100).toFixed(2);
  return (
    <span className={`font-bold ${clase} ${grande ? 'text-2xl' : ''}`}>
      {valor < 0 ? `$${dinero} a favor` : `$${dinero}`}
    </span>
  );
}
