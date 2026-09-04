import React from 'react';
import { AdjustmentRecommendation } from '../../lib/positions/types';

interface AdjustmentPanelProps {
  recommendation: AdjustmentRecommendation;
  onActionTaken: () => void;
}

export default function AdjustmentPanel({ recommendation, onActionTaken }: AdjustmentPanelProps) {
  
  const getAlertStyle = () => {
    switch (recommendation.urgency) {
      case 'HIGH': return { bg: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger, #e74c3c)' };
      case 'MEDIUM': return { bg: 'rgba(243, 156, 18, 0.1)', color: 'var(--color-warning, #f39c12)' };
      default: return { bg: 'rgba(46, 204, 113, 0.1)', color: 'var(--color-success, #2ecc71)' };
    }
  };

  const style = getAlertStyle();

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.color}`,
      padding: '1rem',
      borderRadius: '4px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: style.color, fontWeight: 'bold' }}>
          {recommendation.type.replace('_', ' ')}
        </span>
        <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: style.color, color: 'white', borderRadius: '12px' }}>
          {recommendation.urgency} URGENCY
        </span>
      </div>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
        <strong>Trigger:</strong> {recommendation.reason}
      </p>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
        <strong>Action:</strong> {recommendation.suggestedAction}
      </p>
      <div>
        <button 
          onClick={onActionTaken}
          style={{ 
            padding: '6px 12px', 
            background: style.color, 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          Acknowledge & Evaluate
        </button>
      </div>
    </div>
  );
}
