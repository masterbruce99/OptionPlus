import React from 'react';
import { TradePlan } from '@/lib/execution/types';

interface OrderTicketProps {
  plan: TradePlan;
}

export function OrderTicket({ plan }: OrderTicketProps) {
  const isDebit = plan.limitPrice.debitOrCredit === 'DEBIT';
  const debitOrCreditLabel = plan.limitPrice.debitOrCredit !== 'UNKNOWN' ? plan.limitPrice.debitOrCredit : '';
  const priceDisplay = plan.limitPrice.suggestedLimit !== null ? Math.abs(plan.limitPrice.suggestedLimit).toFixed(2) : 'Unavailable';
  const totalCostDisplay = plan.limitPrice.suggestedLimit !== null ? (Math.abs(plan.limitPrice.suggestedLimit) * plan.quantity * 100).toFixed(2) : 'Unavailable';

  return (
    <div className="bg-slate-900 border border-slate-700 rounded p-6 shadow-xl w-full max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-100">Order Ticket (Manual Entry)</h2>
        <span className={`px-2 py-1 rounded text-xs font-bold ${plan.executionQuality === 'READY' ? 'bg-emerald-600 text-white' : plan.executionQuality === 'CAUTION' ? 'bg-amber-600 text-white' : plan.executionQuality === 'ACCEPTABLE' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
          {plan.executionQuality}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between border-b border-slate-700 pb-2">
          <span className="text-slate-400">Underlying</span>
          <span className="text-slate-100 font-bold">{plan.underlying}</span>
        </div>

        <div className="flex justify-between border-b border-slate-700 pb-2">
          <span className="text-slate-400">Strategy</span>
          <span className="text-slate-100 font-bold">{plan.strategyName}</span>
        </div>

        <div className="space-y-2 border-b border-slate-700 pb-2">
          <span className="text-slate-400 block">Legs:</span>
          {plan.legs.map((leg, i) => (
            <div key={i} className="flex justify-between text-sm pl-4">
              <span className="text-slate-300">
                {leg.side.toUpperCase()} {leg.quantity * plan.quantity} {leg.type.toUpperCase()}
              </span>
              <span className="text-slate-300">
                Strike {leg.strike}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between border-b border-slate-700 pb-2">
          <span className="text-slate-400">Limit Price ({debitOrCreditLabel})</span>
          <span className="text-slate-100 font-bold text-lg">${priceDisplay}</span>
        </div>

        <div className="flex justify-between border-b border-slate-700 pb-2">
          <span className="text-slate-400">Total {isDebit ? 'Cost' : 'Credit'}</span>
          <span className="text-slate-100 font-bold">${totalCostDisplay}</span>
        </div>
        
        <div className="bg-slate-800 p-3 rounded text-sm text-slate-300">
          <p className="font-bold text-amber-500 mb-1">Execution Notes:</p>
          <ul className="list-disc pl-5 space-y-1">
            {plan.executionReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="pt-4">
          <button 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition-colors shadow"
            onClick={() => {
              alert('Review completed. Switch to your brokerage platform to place this exact order.');
            }}
          >
            Copy / Review Order
          </button>
          <p className="text-xs text-center text-slate-500 mt-2">
            This system does not route orders to a broker. Execute manually.
          </p>
        </div>
      </div>
    </div>
  );
}
