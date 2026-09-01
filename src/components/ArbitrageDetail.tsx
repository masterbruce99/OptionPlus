'use client';
import { ArbitrageCandidate, ArbitrageClassification } from '@/lib/arbitrage';

interface ArbitrageDetailProps {
  candidate: ArbitrageCandidate;
  onBack: () => void;
}

const CLASSIFICATION_LABELS: Record<ArbitrageClassification, string> = {
  NO_DISLOCATION: 'No Dislocation',
  THEORETICAL_DISLOCATION: 'Theoretical Dislocation (midpoint only)',
  POTENTIAL_ARBITRAGE: 'Potential Arbitrage (costs unconfigured)',
  POSITIVE_AFTER_CONFIGURED_COSTS: 'Positive After Configured Costs',
  EXECUTION_UNCERTAIN: 'Execution Uncertain',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

const CLASSIFICATION_COLORS: Record<ArbitrageClassification, string> = {
  NO_DISLOCATION: 'var(--text-muted)',
  THEORETICAL_DISLOCATION: 'var(--warning, #f0ad4e)',
  POTENTIAL_ARBITRAGE: 'var(--accent-primary)',
  POSITIVE_AFTER_CONFIGURED_COSTS: 'var(--success)',
  EXECUTION_UNCERTAIN: 'var(--warning, #f0ad4e)',
  INSUFFICIENT_DATA: 'var(--danger)',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
      <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h5>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: '500', color: valueColor || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function ArbitrageDetail({ candidate: c, onBack }: ArbitrageDetailProps) {
  const fmtMoney = (v: number | null, perContract = true) => {
    if (v === null) return 'UNDETERMINED';
    const suffix = perContract ? ' / contract' : '';
    return v >= 0 ? `+$${v.toFixed(2)}${suffix}` : `-$${Math.abs(v).toFixed(2)}${suffix}`;
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ padding: '6px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.85rem' }}
      >
        ← Back to Scanner
      </button>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>
              {c.underlying} — {c.type.replace(/_/g, ' ')}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Strike: ${c.strike}{c.strikeHigh ? ` / $${c.strikeHigh}` : ''} · Exp: {c.expiration}
            </div>
          </div>
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${CLASSIFICATION_COLORS[c.classification]}`,
          }}>
            <span style={{ color: CLASSIFICATION_COLORS[c.classification], fontWeight: '600', fontSize: '0.85rem' }}>
              {CLASSIFICATION_LABELS[c.classification]}
            </span>
          </div>
        </div>
      </div>

      {/* WHY THIS IS NOT GUARANTEED */}
      <div style={{
        padding: '1rem',
        background: 'rgba(220, 53, 69, 0.08)',
        border: '1px solid var(--danger)',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.83rem',
        color: 'var(--text-secondary)',
      }}>
        <strong>⚠️ WHY THIS IS NOT GUARANTEED</strong><br /><br />
        A textbook pricing relationship can appear violated while a real trade is not profitable after bid/ask spreads, commissions, slippage, financing costs, stock borrowing costs, dividends, liquidity constraints, and execution risk. Every item in &quot;What Could Eliminate the Edge&quot; below can independently erase any apparent profit.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* WHY DETECTED */}
        <Section title="Why Detected">
          <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {c.explanation}
          </div>
        </Section>

        {/* THEORETICAL RELATIONSHIP */}
        <Section title="Theoretical Relationship">
          <Row label="Theoretical Value" value={`$${c.pricingRelationship.theoreticalValue.toFixed(4)}`} />
          <Row label="Market Midpoint Value" value={`$${c.pricingRelationship.marketValue.toFixed(4)}`} />
          <Row label="Midpoint Difference" value={`$${c.pricingRelationship.difference.toFixed(4)}`}
            valueColor={c.pricingRelationship.difference > 0 ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Midpoint Status" value={c.pricingRelationship.dislocationType} />
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning, #f0ad4e)' }}>
            ⚠️ Midpoint values are THEORETICAL ONLY — not executable prices
          </div>
        </Section>

        {/* EXECUTABLE PRICES */}
        <Section title="Executable Prices">
          <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            BUY executes at ASK · SELL executes at BID
          </div>
          {c.legs.map((leg, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.83rem' }}>
              <span style={{ color: leg.action === 'BUY' ? 'var(--success)' : 'var(--danger)', fontWeight: '600', marginRight: '0.5rem' }}>
                {leg.action}
              </span>
              <span style={{ marginRight: '0.5rem' }}>{leg.instrument}</span>
              {leg.strike && <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>K=${leg.strike}</span>}
              <span style={{ float: 'right' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>
                  Bid: ${leg.bid.toFixed(2)} / Ask: ${leg.ask.toFixed(2)}
                </span>
                <strong style={{ color: 'var(--accent-primary)' }}>
                  Exec: ${leg.executablePrice.toFixed(2)}
                </strong>
              </span>
            </div>
          ))}
        </Section>

        {/* EDGE SUMMARY */}
        <Section title="Edge Summary">
          <Row
            label="Gross Edge (executable bid/ask)"
            value={fmtMoney(c.grossEdge)}
            valueColor={c.grossEdge > 0 ? 'var(--success)' : 'var(--text-muted)'}
          />
          <Row
            label="Theoretical Midpoint Edge"
            value={fmtMoney(c.theoreticalMidpointEdge)}
            valueColor="var(--text-muted)"
          />
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
          <Row label="Estimated Commission" value={`-$${c.estimatedCosts.commission.toFixed(2)}`} valueColor="var(--danger)" />
          <Row label="Exchange Fees" value={`-$${c.estimatedCosts.exchangeFees.toFixed(2)}`} valueColor="var(--danger)" />
          <Row label="Regulatory Fees" value={`-$${c.estimatedCosts.regulatoryFees.toFixed(2)}`} valueColor="var(--danger)" />
          <Row label="Slippage (estimated)" value={`-$${c.estimatedCosts.slippage.toFixed(2)}`} valueColor="var(--danger)" />
          <Row label="Financing" value={`-$${c.estimatedCosts.financing.toFixed(2)}`} valueColor="var(--danger)" />
          <Row
            label="Borrow Cost"
            value={c.estimatedCosts.status === 'UNCONFIGURED' ? 'UNCONFIGURED' : `-$${c.estimatedCosts.borrowCost.toFixed(2)}`}
            valueColor={c.estimatedCosts.status === 'UNCONFIGURED' ? 'var(--warning, #f0ad4e)' : 'var(--danger)'}
          />
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
          <Row
            label="Net Edge"
            value={c.netEdge === null ? 'UNDETERMINED' : fmtMoney(c.netEdge)}
            valueColor={c.netEdge === null ? 'var(--warning, #f0ad4e)' : c.netEdge > 0 ? 'var(--success)' : 'var(--danger)'}
          />
          <Row label="Capital Requirement" value={`$${c.capitalRequirement.toFixed(2)}`} />
          {c.impliedFinancingRate !== undefined && (
            <Row
              label="Implied Financing Rate"
              value={`${(c.impliedFinancingRate * 100).toFixed(3)}% / year`}
            />
          )}
        </Section>

        {/* DATA QUALITY */}
        <Section title="Data Quality">
          <Row label="Overall Status" value={c.dataQuality.status}
            valueColor={c.dataQuality.status === 'VALID' ? 'var(--success)' : c.dataQuality.status === 'INSUFFICIENT' ? 'var(--danger)' : 'var(--warning, #f0ad4e)'}
          />
          <Row label="Underlying Price" value={c.dataQuality.underlyingValid ? '✓ Valid' : '✗ Invalid'} valueColor={c.dataQuality.underlyingValid ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Call Quotes" value={c.dataQuality.callQuoteValid ? '✓ Valid' : '✗ Invalid'} valueColor={c.dataQuality.callQuoteValid ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Put Quotes" value={c.dataQuality.putQuoteValid ? '✓ Valid' : '✗ Invalid'} valueColor={c.dataQuality.putQuoteValid ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Interest Rate" value={c.dataQuality.interestRateValid ? '✓ Available' : '⚠ Unavailable'} valueColor={c.dataQuality.interestRateValid ? 'var(--success)' : 'var(--warning, #f0ad4e)'} />
          <Row label="Dividend Data" value={c.dataQuality.dividendValid ? '✓ Available' : '⚠ Unavailable'} valueColor={c.dataQuality.dividendValid ? 'var(--success)' : 'var(--warning, #f0ad4e)'} />
          {c.dataQuality.issues.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {c.dataQuality.issues.map((issue, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: 'var(--warning, #f0ad4e)', padding: '2px 0' }}>⚠ {issue}</div>
              ))}
            </div>
          )}
        </Section>

        {/* EXECUTION CHECKS */}
        <Section title="Execution Checks">
          <Row
            label="Execution Status"
            value={c.executionAssessment.status}
            valueColor={
              c.executionAssessment.status === 'EXECUTABLE' ? 'var(--success)' :
              c.executionAssessment.status === 'NOT_EXECUTABLE' ? 'var(--danger)' :
              'var(--warning, #f0ad4e)'
            }
          />
          <Row label="Spreads Acceptable" value={c.executionAssessment.spreadsAcceptable ? '✓ Yes' : '✗ No (wide spreads)'} valueColor={c.executionAssessment.spreadsAcceptable ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Liquidity" value={c.executionAssessment.liquidityAcceptable ? '✓ Acceptable' : '⚠ Low'} valueColor={c.executionAssessment.liquidityAcceptable ? 'var(--success)' : 'var(--warning, #f0ad4e)'} />
          <Row label="Quotes Fresh" value={c.executionAssessment.quotesFresh ? '✓ Yes' : '⚠ Stale/Unknown'} valueColor={c.executionAssessment.quotesFresh ? 'var(--success)' : 'var(--warning, #f0ad4e)'} />
          {c.executionAssessment.reasons.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {c.executionAssessment.reasons.map((r, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '2px 0' }}>• {r}</div>
              ))}
            </div>
          )}
        </Section>

        {/* ASSUMPTIONS */}
        <Section title="Assumptions">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {c.assumptions.map((a, i) => (
              <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid var(--border-color)' }}>• {a}</div>
            ))}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Data origin: REAL MARKET DATA (quotes) | CALCULATED (theoretical values) | USER INPUT (dividends if entered)
          </div>
        </Section>

        {/* WHAT COULD ELIMINATE THE EDGE */}
        <Section title="What Could Eliminate the Edge">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {c.edgeKillers.map((k, i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--danger)' }}>✗</span>
                <span>{k}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
        Scan timestamp: {new Date(c.timestamp).toLocaleTimeString()} · ID: {c.id}
      </div>
    </div>
  );
}
