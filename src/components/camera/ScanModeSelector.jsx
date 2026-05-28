/**
 * ScanModeSelector.jsx
 * Dropdown to switch between scan modes.
 */
import { ScanLine, Layers, CreditCard, BookOpen, Receipt } from 'lucide-react';

export const SCAN_MODES = [
  { id: 'standard',   label: 'Standard',    icon: ScanLine,   desc: 'Single document capture' },
  { id: 'batch',      label: 'Batch Scan',  icon: Layers,     desc: 'Rapid-fire queue mode' },
  { id: 'idcard',     label: 'ID Card',     icon: CreditCard, desc: 'Front + Back auto-stitch' },
  { id: 'book',       label: 'Book Scan',   icon: BookOpen,   desc: 'Auto-split at centre' },
  { id: 'receipt',    label: 'Receipt',     icon: Receipt,    desc: 'Tall narrow format' },
];

export default function ScanModeSelector({ mode, onChange }) {
  const current = SCAN_MODES.find(m => m.id === mode) || SCAN_MODES[0];
  const Icon = current.icon;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 text-xs font-medium mb-2"
           style={{ color: 'var(--clr-text-secondary)' }}>
        <ScanLine size={13} />
        SCAN MODE
      </div>
      <select
        value={mode}
        onChange={e => onChange(e.target.value)}
        className="w-full pr-8 cursor-pointer"
        style={{ minWidth: 160 }}
      >
        {SCAN_MODES.map(m => (
          <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
        ))}
      </select>
      <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md"
           style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid var(--clr-border)' }}>
        <Icon size={13} style={{ color: 'var(--clr-brand-400)' }} />
        <span style={{ color: 'var(--clr-text-secondary)', fontSize: 11 }}>{current.desc}</span>
      </div>
    </div>
  );
}
