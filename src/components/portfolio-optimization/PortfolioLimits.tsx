import React, { useState, useEffect } from 'react';
import { PortfolioLimit, getPortfolioLimits, savePortfolioLimits, evaluatePortfolioLimits } from '@/lib/portfolio/limits';
import { PortfolioPosition, PortfolioGreeks, ConcentrationReport } from '@/lib/portfolio/types';
import { Alert } from '@/lib/alerts/types';

interface PortfolioLimitsProps {
  positions: PortfolioPosition[];
  greeks: PortfolioGreeks;
  concentration: ConcentrationReport;
}

export const PortfolioLimits: React.FC<PortfolioLimitsProps> = ({ positions, greeks, concentration }) => {
  const [limits, setLimits] = useState<PortfolioLimit[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loaded = getPortfolioLimits();
    // Default limit if none exist
    if (loaded.length === 0) {
      const defaultLimit: PortfolioLimit = {
        id: `limit-1`,
        metric: 'DELTA',
        operator: 'GREATER_THAN',
        threshold: 10000,
        severity: 'WARNING',
        enabled: true
      };
      const timer = setTimeout(() => {
        setLimits([defaultLimit]);
        savePortfolioLimits([defaultLimit]);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setLimits(loaded), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (limits.length > 0) {
      const newAlerts = evaluatePortfolioLimits(positions, greeks, concentration, limits);
      const timer = setTimeout(() => setAlerts(newAlerts), 0);
      return () => clearTimeout(timer);
    }
  }, [limits, positions, greeks, concentration]);

  const toggleLimit = (id: string) => {
    const updated = limits.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l);
    setLimits(updated);
    savePortfolioLimits(updated);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Portfolio Limits & Governance</h2>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
        >
          {isEditing ? 'Done' : 'Edit Limits'}
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border ${alert.priority === 'CRITICAL' ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-yellow-900/30 border-yellow-800 text-yellow-200'}`}>
              <div className="font-semibold flex items-center gap-2">
                <span className="text-lg">⚠</span>
                {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {limits.map(limit => (
          <div key={limit.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <div>
              <div className="text-gray-300 font-medium">
                {limit.metric.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-gray-500">
                {limit.operator.replace(/_/g, ' ')} {limit.threshold}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-1 rounded font-semibold ${limit.severity === 'CRITICAL' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                {limit.severity}
              </span>
              <button 
                onClick={() => toggleLimit(limit.id)}
                className={`w-12 h-6 rounded-full transition-colors relative ${limit.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${limit.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        ))}

        {isEditing && (
          <div className="p-4 bg-gray-900/80 rounded-lg border border-gray-700 text-center text-gray-400 italic">
            (Add Limit UI placeholder - fully deterministic limits based on real metrics)
          </div>
        )}
      </div>
    </div>
  );
};
