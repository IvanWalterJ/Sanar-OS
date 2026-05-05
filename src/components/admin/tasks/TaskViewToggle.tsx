/**
 * TaskViewToggle — tabs para alternar entre Kanban / Lista / Por persona / Mis tareas.
 */
import { LayoutGrid, List, UserCircle, Users } from 'lucide-react';

export type TaskView = 'kanban' | 'list' | 'people' | 'mine';

interface TaskViewToggleProps {
  value: TaskView;
  onChange: (v: TaskView) => void;
  myCount?: number;
}

const TABS: { id: TaskView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'people', label: 'Por persona', icon: Users },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'mine', label: 'Mis tareas', icon: UserCircle },
];

export default function TaskViewToggle({ value, onChange, myCount }: TaskViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-[#0F0F0F] border border-[rgba(245,166,35,0.15)] rounded-xl p-1">
      {TABS.map(t => {
        const active = value === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all
              ${active
                ? 'bg-[#F5A623] text-black'
                : 'text-[#FFFFFF]/55 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{t.label}</span>
            {t.id === 'mine' && typeof myCount === 'number' && myCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-black/20 text-black' : 'bg-[#F5A623]/20 text-[#F5A623]'}`}>
                {myCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
