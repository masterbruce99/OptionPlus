'use client';
import { useState } from 'react';

interface OpportunityCardProps {
  opportunity: {
    ranking: number;
    strategy: string;
    underlying: string;
    expiration: string;
    netEdge: number;
    grossEdge: number;
    capitalRequirement: number;
    confidence: number;
    liquidityScore: number;
    executionScore: number;
    dataQualityScore: number;
    riskFlags: string[];
    explanation: {
      mainReason: string;
      mainConcern: string;
      whyRankedHere: string;
    };
  };
  onSelect: () => void;
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning, #f0ad4e)' : 'var(--danger)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      backgroundColor: `${color}22`, color, border: `1px solid ${color}44`
    }}>
      {label}: {score}
    </span>
  );
}

export default function OpportunityCard({ opportunity, onSelect }: OpportunityCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const opp = opportunity;

  const qualityColor = opp.confidence >= 80 ? 'var(--success)' : opp.confidence >= 50 ? 'var(--warning, #f0ad4e)' : 'var(--danger)';

  return (
    <div 
      className="card animate-fade-in" 
      style={{ marginBottom: '0.75rem', cursor: 'pointer', borderLeft: `3px solid ${qualityColor}` }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Rank + Strategy */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: qualityColor, color: '#fff', fontWeight: 700, fontSize: '0.85rem'
            }}>
              {opp.ranking}
            </span>
            <div>
              <strong style={{ fontSize: '1rem' }}>{opp.strategy}</strong>
              <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                {opp.underlying} · {opp.expiration}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--success)' }}>↑</strong> {opp.explanation.mainReason}
          </p>
          <p style={{ fontSize: '0.85rem', margin: '0.25rem 0', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--danger)' }}>↓</strong> {opp.explanation.mainConcern}
          </p>
        </div>

        {/* Right: Metrics */}
        <div style={{ textAlign: 'right', minWidth: '160px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: opp.netEdge > 0 ? 'var(--success)' : 'var(--danger)' }}>
            ${opp.netEdge.toFixed(2)}
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Net Edge</div>
          <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Capital: ${opp.capitalRequirement.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Score badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
        <ScoreBadge label="Quality" score={opp.confidence} />
        <ScoreBadge label="Liquidity" score={opp.liquidityScore} />
        <ScoreBadge label="Execution" score={opp.executionScore} />
        <ScoreBadge label="Data" score={opp.dataQualityScore} />
      </div>

      {/* Risk flags */}
      {opp.riskFlags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {opp.riskFlags.map((flag, i) => (
            <span key={i} style={{
              padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem',
              backgroundColor: 'var(--danger)', color: '#fff', fontWeight: 600
            }}>
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Expandable detail */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
        style={{
          marginTop: '0.5rem', padding: '2px 8px', fontSize: '0.75rem',
          background: 'none', border: '1px solid var(--border-color)',
          borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer'
        }}
      >
        {showDetails ? '▲ Less' : '▼ Why Ranked Here'}
      </button>
      {showDetails && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {opp.explanation.whyRankedHere}
        </p>
      )}
    </div>
  );
}
