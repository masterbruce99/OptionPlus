'use client';
import { RankedOpportunity } from '@/lib/opportunityEngine';

interface OpportunityDetailProps {
  opportunity: RankedOpportunity;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
      <span className="text-muted">{label}</span>
      <strong>{typeof value === 'number' ? value.toFixed(2) : value}{unit || ''}</strong>
    </div>
  );
}

export default function OpportunityDetail({ opportunity, onClose }: OpportunityDetailProps) {
  const opp = opportunity;
  const edge = opp.edgeAnalysis;
  const liq = opp.liquidityAnalysis;
  const dq = opp.dataQualityAnalysis;
  const exec = opp.executionAnalysis;
  const qs = opp.qualityScore;

  return (
    <div className="card animate-fade-in" style={{ position: 'relative' }}>
      <button 
        onClick={onClose}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
        }}
      >×</button>

      <h3 style={{ marginBottom: '1rem' }}>
        #{opp.ranking} — {opp.strategy}
        <span className="text-muted" style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>
          {opp.underlying} · {opp.expiration}
        </span>
      </h3>

      {/* Explanation */}
      <Section title="Why This Opportunity">
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'var(--success)' }}>Main Reason:</strong> {opp.explanation.mainReason}
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: '0.25rem 0 0' }}>
          <strong style={{ color: 'var(--danger)' }}>Main Concern:</strong> {opp.explanation.mainConcern}
        </p>
      </Section>

      {/* Edge Analysis */}
      <Section title="Edge Analysis (CALCULATED)">
        <MetricRow label="Gross Edge" value={edge.grossEdge} unit="" />
        <MetricRow label="Estimated Costs" value={`-$${edge.estimatedCosts.toFixed(2)}`} />
        <MetricRow label="Net Edge" value={`$${edge.netEdge.toFixed(2)}`} />
        <MetricRow label="Capital Required" value={`$${edge.capitalRequired.toFixed(2)}`} />
        <MetricRow label="Return on Capital" value={`${(edge.returnOnCapital * 100).toFixed(2)}%`} />
        {edge.annualizedReturn !== null && (
          <MetricRow label="Annualized Return" value={`${(edge.annualizedReturn * 100).toFixed(1)}%`} />
        )}
        {edge.annualizationDisclaimer && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0.25rem 0 0' }}>
            {edge.annualizationDisclaimer}
          </p>
        )}
      </Section>

      {/* Quality Score Breakdown */}
      <Section title="Quality Score Breakdown (CALCULATED)">
        <MetricRow label={`Edge (${(qs.weights.edge * 100).toFixed(0)}% weight)`} value={`${qs.components.edge.rawScore.toFixed(0)} → ${qs.components.edge.weightedScore.toFixed(1)}`} />
        <MetricRow label={`Execution (${(qs.weights.execution * 100).toFixed(0)}%)`} value={`${qs.components.execution.rawScore.toFixed(0)} → ${qs.components.execution.weightedScore.toFixed(1)}`} />
        <MetricRow label={`Liquidity (${(qs.weights.liquidity * 100).toFixed(0)}%)`} value={`${qs.components.liquidity.rawScore.toFixed(0)} → ${qs.components.liquidity.weightedScore.toFixed(1)}`} />
        <MetricRow label={`Data Quality (${(qs.weights.dataQuality * 100).toFixed(0)}%)`} value={`${qs.components.dataQuality.rawScore.toFixed(0)} → ${qs.components.dataQuality.weightedScore.toFixed(1)}`} />
        <MetricRow label={`Cost Certainty (${(qs.weights.costCertainty * 100).toFixed(0)}%)`} value={`${qs.components.costCertainty.rawScore.toFixed(0)} → ${qs.components.costCertainty.weightedScore.toFixed(1)}`} />
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
          <MetricRow label="Total Quality Score" value={`${qs.total}/100`} />
        </div>
      </Section>

      {/* Liquidity Detail */}
      <Section title={`Liquidity (${liq.classification} — ${liq.dataSource})`}>
        <MetricRow label="Avg Bid/Ask Spread" value={`${(liq.spreadPercent * 100).toFixed(2)}%`} />
        <MetricRow label="Avg Volume" value={Math.round(liq.avgVolume)} />
        <MetricRow label="Avg Open Interest" value={Math.round(liq.avgOpenInterest)} />
        {liq.breakdown.map((b, i) => (
          <MetricRow key={i} label={`  ${b.metric} (${(b.weight * 100).toFixed(0)}% wt)`} value={`${b.normalizedScore} → ${b.contribution.toFixed(1)}`} />
        ))}
      </Section>

      {/* Execution Detail */}
      <Section title={`Execution (${exec.classification} — ${exec.dataSource})`}>
        <MetricRow label="All Legs Quoted" value={exec.allLegsQuoted ? 'Yes' : 'No'} />
        <MetricRow label="Narrow Spreads" value={exec.narrowSpreads ? 'Yes' : 'No'} />
        <MetricRow label="Sufficient Volume" value={exec.sufficientVolume ? 'Yes' : 'No'} />
        <MetricRow label="Sufficient Open Interest" value={exec.sufficientOpenInterest ? 'Yes' : 'No'} />
        {exec.concerns.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            {exec.concerns.map((c, i) => (
              <p key={i} style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: '2px 0' }}>⚠ {c}</p>
            ))}
          </div>
        )}
      </Section>

      {/* Data Quality Detail */}
      <Section title={`Data Quality (${dq.dataSource})`}>
        <MetricRow label="Fields Present" value={`${dq.requiredFieldsPresent}/${dq.totalRequiredFields}`} />
        <MetricRow label="Has Pricing" value={dq.hasPricing ? 'Yes' : 'No'} />
        <MetricRow label="Has Greeks" value={dq.hasGreeks ? 'Yes' : 'No'} />
        <MetricRow label="Has IV" value={dq.hasIV ? 'Yes' : 'No'} />
        {dq.missingFields.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Missing: {dq.missingFields.join(', ')}
          </p>
        )}
        {dq.consistencyIssues.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: '0.25rem 0 0' }}>
            Issues: {dq.consistencyIssues.join(', ')}
          </p>
        )}
      </Section>

      {/* What Could Go Wrong — Invalidation Conditions */}
      <Section title="What Could Go Wrong">
        {opp.invalidationConditions.map((c, i) => (
          <div key={i} style={{ marginBottom: '0.5rem', paddingLeft: '0.5rem', borderLeft: `2px solid ${c.severity === 'high' ? 'var(--danger)' : c.severity === 'medium' ? 'var(--warning, #f0ad4e)' : 'var(--text-muted)'}` }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
              {c.severity === 'high' ? '🔴' : c.severity === 'medium' ? '🟡' : '⚪'} {c.condition}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {c.currentStatus}
            </p>
          </div>
        ))}
      </Section>

      {/* Strategy Analysis */}
      <Section title="Strategy Details">
        <MetricRow label="Max Profit" value={opp.strategyAnalysis.maxProfit !== null ? `$${opp.strategyAnalysis.maxProfit.toFixed(2)}` : 'Unlimited'} />
        <MetricRow label="Max Loss" value={opp.strategyAnalysis.maxLoss !== null ? `$${opp.strategyAnalysis.maxLoss.toFixed(2)}` : 'Unlimited'} />
        <MetricRow label="Break-Even(s)" value={opp.strategyAnalysis.breakEvens.map(b => `$${b.toFixed(2)}`).join(', ')} />
        <MetricRow label="Net Debit/Credit" value={`$${opp.strategyAnalysis.netDebitCredit.toFixed(2)}`} />
      </Section>
    </div>
  );
}
