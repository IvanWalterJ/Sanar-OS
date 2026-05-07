import React from 'react';
import { Check } from 'lucide-react';
import { SECTIONS, STEPS, TOTAL_STEPS } from '../../../lib/preactivacionSteps';
import {
  type ChecksByCliente,
  isChecked,
  progressPct,
  completedCount,
} from '../../../lib/preactivacionCheck';

export interface MatrizClienteRow {
  id: string;
  nombre: string;
  metodo?: string;
  initial: string;
}

interface MatrizGridProps {
  clientes: MatrizClienteRow[];
  checks: ChecksByCliente;
  onToggle: (clienteId: string, stepId: string, on: boolean) => void;
}

export default function MatrizGrid({ clientes, checks, onToggle }: MatrizGridProps) {
  if (clientes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-[#FFFFFF]/40 text-sm">
        Sin clientes que coincidan
      </div>
    );
  }

  return (
    <div className="overflow-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <table
        className="border-separate"
        style={{ borderSpacing: 0, fontSize: 12 }}
      >
        <thead>
          {/* Group row */}
          <tr>
            <th
              className="sticky left-0 top-0 z-50 bg-[#0E0E0E]"
              style={{ minWidth: 200 }}
            />
            {SECTIONS.map((sec, idx) => (
              <th
                key={sec.id}
                colSpan={sec.items.length}
                className="sticky top-0 z-30 bg-[#141414] text-[#F5A623] uppercase tracking-widest"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: 1,
                  padding: '7px 0',
                  textAlign: 'center',
                  borderBottom: '1px solid rgba(245,166,35,0.15)',
                  borderLeft: idx === 0 ? 'none' : '2px solid #252830',
                }}
              >
                {sec.short}
              </th>
            ))}
            <th
              className="sticky right-0 top-0 z-40 bg-[#141414] text-[#F5A623]"
              style={{
                fontFamily: 'monospace',
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: 1,
                padding: '7px 8px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(245,166,35,0.15)',
                borderLeft: '2px solid #252830',
                textTransform: 'uppercase',
              }}
            >
              %
            </th>
          </tr>

          {/* Column labels */}
          <tr>
            <th
              className="sticky left-0 z-40 bg-[#0E0E0E]"
              style={{
                top: 30,
                minWidth: 200,
                borderBottom: '2px solid rgba(245,166,35,0.15)',
              }}
            />
            {STEPS.map((step, idx) => {
              const isFirstOfSection =
                idx === 0 || STEPS[idx - 1].sectionId !== step.sectionId;
              const lines = step.lbl
                .replace(/­/g, '·')
                .split('\n');
              return (
                <th
                  key={step.id}
                  className="sticky bg-[#0F0F0F]"
                  style={{
                    top: 30,
                    padding: '5px 2px 6px',
                    fontWeight: 400,
                    verticalAlign: 'bottom',
                    borderBottom: '2px solid rgba(245,166,35,0.15)',
                    borderLeft: isFirstOfSection ? '2px solid #252830' : 'none',
                  }}
                  title={step.title}
                >
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 8,
                      color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.3,
                      textAlign: 'center',
                      minWidth: 52,
                      maxWidth: 60,
                      wordBreak: 'break-word',
                      hyphens: 'manual',
                    }}
                  >
                    {lines.map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < lines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </th>
              );
            })}
            <th
              className="sticky right-0 z-30 bg-[#0F0F0F]"
              style={{
                top: 30,
                padding: '5px 8px 6px',
                borderBottom: '2px solid rgba(245,166,35,0.15)',
                borderLeft: '2px solid #252830',
              }}
            >
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.4)',
                  textAlign: 'center',
                }}
              >
                Total
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {clientes.map((cl) => {
            const pct = progressPct(checks, cl.id);
            const done = completedCount(checks, cl.id);
            const isComplete = pct === 100;
            return (
              <tr key={cl.id} className="group">
                {/* Sticky client cell */}
                <td
                  className="sticky left-0 z-20 bg-[#0A0A0A] group-hover:bg-[#141414] transition-colors"
                  style={{
                    padding: '0 10px',
                    height: 44,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: 'rgba(245,166,35,0.12)',
                        color: '#F5A623',
                        fontFamily: 'monospace',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {cl.initial}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[12px] truncate font-medium"
                        style={{ maxWidth: 145 }}
                        title={cl.nombre}
                      >
                        {cl.nombre}
                      </div>
                      {cl.metodo && (
                        <div
                          className="text-[8px] truncate"
                          style={{
                            color: 'rgba(255,255,255,0.35)',
                            fontFamily: 'monospace',
                            maxWidth: 145,
                          }}
                        >
                          {cl.metodo}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {STEPS.map((step, idx) => {
                  const isFirstOfSection =
                    idx === 0 || STEPS[idx - 1].sectionId !== step.sectionId;
                  const on = isChecked(checks, cl.id, step.id);
                  return (
                    <td
                      key={step.id}
                      className="group-hover:bg-[#141414] transition-colors"
                      style={{
                        padding: 0,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        height: 44,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: isFirstOfSection
                          ? '2px solid #252830'
                          : '1px solid rgba(26,28,34,0.35)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onToggle(cl.id, step.id, !on)}
                        title={`${step.title} — ${on ? 'destildar' : 'tildar'}`}
                        className="inline-flex items-center justify-center transition-all"
                        style={{
                          width: 22,
                          height: 22,
                          border: `1.5px solid ${on ? '#22C55E' : '#252830'}`,
                          borderRadius: 5,
                          cursor: 'pointer',
                          background: on ? '#22C55E' : 'transparent',
                        }}
                      >
                        {on && <Check className="w-3 h-3" style={{ color: '#0A0A0A', strokeWidth: 3 }} />}
                      </button>
                    </td>
                  );
                })}

                {/* Sticky total */}
                <td
                  className="sticky right-0 z-10 bg-[#0A0A0A] group-hover:bg-[#141414] transition-colors"
                  style={{
                    padding: '0 8px',
                    height: 44,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: '2px solid #252830',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    minWidth: 70,
                    color: isComplete ? '#22C55E' : 'rgba(255,255,255,0.6)',
                    fontWeight: isComplete ? 600 : 400,
                  }}
                  title={`${done}/${TOTAL_STEPS} pasos`}
                >
                  {pct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
