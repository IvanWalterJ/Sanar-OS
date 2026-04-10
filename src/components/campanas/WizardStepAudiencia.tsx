import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CampanaFormState } from '../../lib/campanasTypes';

interface Props {
  form: CampanaFormState;
  onChange: (form: CampanaFormState) => void;
}

export default function WizardStepAudiencia({ form, onChange }: Props) {
  const [interesInput, setInteresInput] = useState('');

  const update = (fields: Partial<CampanaFormState>) => {
    onChange({ ...form, ...fields });
  };

  const addInteres = () => {
    const trimmed = interesInput.trim();
    if (trimmed && !form.intereses.includes(trimmed)) {
      update({ intereses: [...form.intereses, trimmed] });
      setInteresInput('');
    }
  };

  const removeInteres = (idx: number) => {
    update({ intereses: form.intereses.filter((_, i) => i !== idx) });
  };

  const isLeadGen = form.objetivo === 'clientes_potenciales';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#FFFFFF] mb-1">Segmentacion y Audiencia</h3>
        <p className="text-sm text-[#FFFFFF]/50">Configura a quien va dirigida tu campana</p>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Nombre de la Campana</label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => update({ nombre: e.target.value })}
          placeholder="ej: Trafico Nutricion Enero"
          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
        />
      </div>

      {/* Nicho */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Nicho Objetivo</label>
        <input
          type="text"
          value={form.nicho}
          onChange={(e) => update({ nicho: e.target.value })}
          placeholder="ej: Mujeres 30-45 con ansiedad cronica"
          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
        />
      </div>

      {/* Ubicacion */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Ubicacion (paises/ciudades)</label>
        <input
          type="text"
          value={form.ubicacion}
          onChange={(e) => update({ ubicacion: e.target.value })}
          placeholder="ej: Argentina, Colombia, Mexico"
          className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
        />
      </div>

      {/* Edad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Edad Minima</label>
          <input
            type="number"
            min={18}
            max={65}
            value={form.edad_min}
            onChange={(e) => update({ edad_min: Number(e.target.value) })}
            className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Edad Maxima</label>
          <input
            type="number"
            min={18}
            max={65}
            value={form.edad_max}
            onChange={(e) => update({ edad_max: Number(e.target.value) })}
            className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50"
          />
        </div>
      </div>

      {/* Genero */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Genero</label>
        <div className="flex gap-2">
          {(['todos', 'mujeres', 'hombres'] as const).map((g) => (
            <button
              key={g}
              onClick={() => update({ genero: g })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                form.genero === g
                  ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/40'
                  : 'bg-[#141414] text-[#FFFFFF]/50 border border-[rgba(245,166,35,0.15)] hover:border-[rgba(245,166,35,0.3)]'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Intereses */}
      <div>
        <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Intereses</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={interesInput}
            onChange={(e) => setInteresInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInteres())}
            placeholder="Agregar interes y presionar Enter"
            className="flex-1 bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
          />
          <button
            onClick={addInteres}
            className="px-3 py-2.5 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-lg text-[#F5A623] hover:bg-[#F5A623]/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {form.intereses.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.intereses.map((interes, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5A623]/10 text-[#F5A623] text-xs font-medium border border-[#F5A623]/20"
              >
                {interes}
                <button onClick={() => removeInteres(idx)} className="hover:text-[#FFFFFF] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Presupuesto */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Presupuesto Diario (USD)</label>
          <input
            type="text"
            value={form.presupuesto_diario}
            onChange={(e) => update({ presupuesto_diario: e.target.value })}
            placeholder="ej: 10"
            className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">Duracion (dias)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={form.duracion_dias}
            onChange={(e) => update({ duracion_dias: Number(e.target.value) })}
            className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50"
          />
        </div>
      </div>

      {/* Campos condicionales Lead Gen */}
      {isLeadGen && (
        <div className="space-y-4 p-4 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/5">
          <p className="text-sm font-medium text-[#3B82F6]">Configuracion Lead Gen</p>
          <div>
            <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">URL Landing Page</label>
            <input
              type="url"
              value={form.url_landing}
              onChange={(e) => update({ url_landing: e.target.value })}
              placeholder="https://tu-landing.com"
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">URL del VSL</label>
            <input
              type="url"
              value={form.url_vsl}
              onChange={(e) => update({ url_vsl: e.target.value })}
              placeholder="https://tu-vsl.com/video"
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[#FFFFFF]/60 mb-1.5 font-medium">
              Monto Minimo de Inversion para Filtro (USD)
            </label>
            <input
              type="text"
              value={form.monto_inversion_filtro}
              onChange={(e) => update({ monto_inversion_filtro: e.target.value })}
              placeholder="500"
              className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-4 py-2.5 text-[#FFFFFF] placeholder:text-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
            <p className="text-xs text-[#FFFFFF]/30 mt-1">
              Si el lead responde menos de este monto, NO se envia el evento de conversion a Meta.
              Asi la API aprende a buscar leads cada vez mejores.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
