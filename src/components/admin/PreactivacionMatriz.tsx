import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, CheckCircle2, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadAllChecks,
  setCheck,
  applyToggle,
  progressPct,
  type ChecksByCliente,
} from '../../lib/preactivacionCheck';
import { TOTAL_STEPS } from '../../lib/preactivacionSteps';
import MatrizGrid, { type MatrizClienteRow } from './preactivacion/MatrizGrid';
import ElCaminoView from './preactivacion/ElCaminoView';

type View = 'matriz' | 'camino';

interface Cliente {
  id: string;
  nombre: string;
  especialidad?: string;
}

interface PreactivacionMatrizProps {
  clientes: Cliente[];
  adminId: string;
}

export default function PreactivacionMatriz({ clientes, adminId }: PreactivacionMatrizProps) {
  const [view, setView] = useState<View>('matriz');
  const [checks, setChecks] = useState<ChecksByCliente>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadAllChecks();
        if (alive) setChecks(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const data = await loadAllChecks();
      setChecks(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleToggle(clienteId: string, stepId: string, on: boolean) {
    // Optimistic update
    const prev = checks;
    setChecks(applyToggle(prev, clienteId, stepId, on));
    try {
      await setCheck(clienteId, stepId, on, adminId);
    } catch (err) {
      setChecks(prev);
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    }
  }

  const rows = useMemo<MatrizClienteRow[]>(() => {
    const q = search.trim().toLowerCase();
    return clientes
      .filter((c) => !q || c.nombre.toLowerCase().includes(q))
      .map<MatrizClienteRow>((c) => ({
        id: c.id,
        nombre: c.nombre,
        metodo: c.especialidad,
        initial: c.nombre.charAt(0).toUpperCase(),
      }));
  }, [clientes, search]);

  const stats = useMemo(() => {
    const total = clientes.length;
    let listos = 0;
    let totalDone = 0;
    for (const c of clientes) {
      const pct = progressPct(checks, c.id);
      if (pct === 100) listos += 1;
      totalDone += checks.get(c.id)?.size ?? 0;
    }
    const totalSteps = total * TOTAL_STEPS;
    const avgPct = totalSteps === 0 ? 0 : Math.round((totalDone / totalSteps) * 100);
    return { total, listos, avgPct };
  }, [clientes, checks]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.05)] shrink-0">
        {/* View toggle */}
        <div className="inline-flex p-1 rounded-xl bg-[#0F0F0F] border border-[rgba(245,166,35,0.15)]">
          <button
            type="button"
            onClick={() => setView('matriz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'matriz'
                ? 'bg-[#F5A623]/15 text-[#F5A623]'
                : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Matriz
          </button>
          <button
            type="button"
            onClick={() => setView('camino')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'camino'
                ? 'bg-[#F5A623]/15 text-[#F5A623]'
                : 'text-[#FFFFFF]/50 hover:text-[#FFFFFF]/80'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            El Camino
          </button>
        </div>

        {view === 'matriz' && (
          <>
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFFFFF]/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full bg-black/30 border border-[rgba(245,166,35,0.2)] rounded-lg py-2.5 pl-10 pr-3 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-all"
              />
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#FFFFFF]/40 uppercase tracking-wider font-semibold">Clientes</span>
                <span className="text-[#FFFFFF] font-bold text-base">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#FFFFFF]/40 uppercase tracking-wider font-semibold">Listos</span>
                <span className="text-[#22C55E] font-bold text-base">{stats.listos}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#FFFFFF]/40 uppercase tracking-wider font-semibold">Avance</span>
                <span className="text-[#F5A623] font-bold text-base">{stats.avgPct}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(245,166,35,0.2)] text-sm font-semibold text-[#F5A623] hover:bg-[#F5A623]/10 transition-all disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {view === 'camino' ? (
          <ElCaminoView />
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-6 h-6 text-[#F5A623] animate-spin" />
          </div>
        ) : (
          <div className="px-4 md:px-6 py-4">
            {stats.listos > 0 && (
              <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-[#22C55E]/8 border border-[#22C55E]/20 text-sm font-semibold text-[#22C55E] w-fit">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {stats.listos} {stats.listos === 1 ? 'cliente listo' : 'clientes listos'} para activar
                </span>
              </div>
            )}
            <MatrizGrid clientes={rows} checks={checks} onToggle={handleToggle} />
          </div>
        )}
      </div>
    </div>
  );
}
