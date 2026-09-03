import React from 'react';
import { ExecutionChecklistItem } from '@/lib/execution/types';

interface ExecutionChecklistProps {
  checklist: ExecutionChecklistItem[];
}

export function ExecutionChecklist({ checklist }: ExecutionChecklistProps) {
  const categories = ['MARKET', 'RISK', 'EVENTS', 'STRATEGY', 'EXECUTION'];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded p-6 shadow-xl w-full">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Execution Checklist</h2>
      <div className="space-y-6">
        {categories.map(cat => {
          const items = checklist.filter(c => c.category === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat}>
              <h3 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-1 mb-2">{cat}</h3>
              <ul className="space-y-2">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {item.status === 'PASS' && <span className="text-emerald-500">✓</span>}
                      {item.status === 'WARN' && <span className="text-amber-500">⚠</span>}
                      {item.status === 'FAIL' && <span className="text-red-500">✕</span>}
                      {item.status === 'UNKNOWN' && <span className="text-slate-500">?</span>}
                    </span>
                    <div>
                      <span className={`text-sm ${
                        item.status === 'PASS' ? 'text-slate-200' :
                        item.status === 'WARN' ? 'text-amber-200' :
                        item.status === 'FAIL' ? 'text-red-200' : 'text-slate-400'
                      }`}>
                        {item.label}
                      </span>
                      {item.reason && (
                        <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
