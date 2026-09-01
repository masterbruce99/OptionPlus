'use client';
import { useState } from 'react';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import {
  ArbitrageCandidate,
  ArbitrageClassification,
  ArbitrageType,
  scanArbitragePair,
  analyzeBoxSpread,
  analyzeVerticalBounds,
} from '@/lib/arbitrage';
import { buildDividendData, buildZeroDividend, fetchRiskFreeRate } from '@/lib/arbitrage/rateProvider';
import { DEFAULT_COST_CONFIG } from '@/lib/arbitrage/costEngine';
import ArbitrageDetail from './ArbitrageDetail';

interface ArbitrageScannerProps {
  chain: OptionContract[];
  underlyingPrice: number;
}

const CLASSIFICATION_COLORS: Record<ArbitrageClassification, string> = {
  NO_DISLOCATION: 'var(--text-muted)',
  THEORETICAL_DISLOCATION: 'var(--warning, #f0ad4e)',
  POTENTIAL_ARBITRAGE: 'var(--accent-primary)',
  POSITIVE_AFTER_CONFIGURED_COSTS: 'var(--success)',
  EXECUTION_UNCERTAIN: 'var(--warning, #f0ad4e)',
  INSUFFICIENT_DATA: 'var(--text-muted)',
};

const CLASSIFICATION_LABELS: Record<ArbitrageClassification, string> = {
  NO_DISLOCATION: 'No Dislocation',
  THEORETICAL_DISLOCATION: 'Theoretical Dislocation',
  POTENTIAL_ARBITRAGE: 'Potential Arbitrage',
  POSITIVE_AFTER_CONFIGURED_COSTS: 'Positive Net Edge',
  EXECUTION_UNCERTAIN: 'Execution Uncertain',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

function fmtEdge(val: number | null): string {
  if (val === null) return 'UNDETERMINED';
  return val >= 0 ? `+$${val.toFixed(2)}` : `-$${Math.abs(val).toFixed(2)}`;
}

export default function ArbitrageScanner({ chain, underlyingPrice }: ArbitrageScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [candidates, setCandidates] = useState<ArbitrageCandidate[]>([]);
  const [selected, setSelected] = useState<ArbitrageCandidate | null>(null);
  const [error, setError] = useState('');
  const [filterExp, setFilterExp] = useState('');
  const [filterStrategy, setFilterStrategy] = useState<ArbitrageType | ''>('');
  const [filterMinEdge, setFilterMinEdge] = useState('');
  const [rateStatus, setRateStatus] = useState('');
  const [dividendAnnual, setDividendAnnual] = useState('');
  const [dividendSource, setDividendSource] = useState<'user' | 'none'>('none');
  const [scanStats, setScanStats] = useState<{ count: number; duration: number } | null>(null);

  const expirations = Array.from(new Set(chain.map(c => c.expiration))).sort();

  const runScan = async () => {
    if (chain.length === 0) {
      setError('Load an option chain first before scanning.');
      return;
    }

    setScanning(true);
    setError('');
    setCandidates([]);
    setSelected(null);
    const startMs = Date.now();

    try {
      // Fetch risk-free rate once
      setRateStatus('Fetching risk-free rate...');
      const rateData = await fetchRiskFreeRate();
      setRateStatus(
        rateData.status === 'REAL_DATA'
          ? `Rate: ${(rateData.rate * 100).toFixed(3)}% (${rateData.source})`
          : `Rate: UNAVAILABLE — ${rateData.source}`
      );

      // Build dividend data
      const divInput =
        dividendSource === 'user' && dividendAnnual
          ? { annualDividend: parseFloat(dividendAnnual), source: 'user' as const }
          : undefined;
      const dividendData = divInput
        ? buildDividendData(underlyingPrice, divInput)
        : buildZeroDividend('User did not provide dividend data — assumed zero (verify!)');

      // Determine expiration to scan
      const targetExp = filterExp || (expirations.length > 0 ? expirations[0] : '');
      if (!targetExp) {
        setError('No expiration available in chain.');
        return;
      }

      // Get contracts for this expiration
      const expChain = chain.filter(c => c.expiration === targetExp);
      const calls = expChain.filter(c => c.type === 'call').sort((a, b) => a.strike - b.strike);
      const puts = expChain.filter(c => c.type === 'put').sort((a, b) => a.strike - b.strike);

      // Match by strike
      const strikeSet = new Set<number>();
      calls.forEach(c => strikeSet.add(c.strike));

      const results: ArbitrageCandidate[] = [];

      for (const strike of strikeSet) {
        const call = calls.find(c => c.strike === strike);
        const put = puts.find(p => p.strike === strike);
        if (!call || !put) continue;

        const pairResults = scanArbitragePair({
          call,
          put,
          underlyingPrice,
          rateData,
          dividendData,
          costConfig: DEFAULT_COST_CONFIG,
        });
        results.push(...pairResults);
      }

      // Box spread: scan adjacent strike pairs
      for (let i = 0; i < calls.length - 1; i++) {
        const callLow = calls[i];
        const callHigh = calls[i + 1];
        const putLow = puts.find(p => p.strike === callLow.strike);
        const putHigh = puts.find(p => p.strike === callHigh.strike);
        if (!putLow || !putHigh) continue;

        try {
          const box = analyzeBoxSpread(callLow, callHigh, putLow, putHigh, underlyingPrice, rateData, dividendData);
          results.push(box);
        } catch {
          // skip invalid pairs
        }
      }

      // Vertical bounds: check each adjacent strike pair
      for (let i = 0; i < calls.length - 1; i++) {
        try {
          results.push(analyzeVerticalBounds(calls[i], calls[i + 1], underlyingPrice));
        } catch { /* skip */ }
      }
      for (let i = 0; i < puts.length - 1; i++) {
        try {
          results.push(analyzeVerticalBounds(puts[i + 1], puts[i], underlyingPrice));
        } catch { /* skip */ }
      }

      // Filter
      let filtered = results;
      if (filterStrategy) {
        filtered = filtered.filter(c => c.type === filterStrategy);
      }
      const minEdge = parseFloat(filterMinEdge);
      if (!isNaN(minEdge)) {
        filtered = filtered.filter(c => c.grossEdge >= minEdge);
      }

      // Sort: positive net edge first, then by gross edge descending
      filtered.sort((a, b) => {
        const scoreA =
          a.classification === 'POSITIVE_AFTER_CONFIGURED_COSTS' ? 3 :
          a.classification === 'POTENTIAL_ARBITRAGE' ? 2 :
          a.classification === 'THEORETICAL_DISLOCATION' ? 1 : 0;
        const scoreB =
          b.classification === 'POSITIVE_AFTER_CONFIGURED_COSTS' ? 3 :
          b.classification === 'POTENTIAL_ARBITRAGE' ? 2 :
          b.classification === 'THEORETICAL_DISLOCATION' ? 1 : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.grossEdge - a.grossEdge;
      });

      setCandidates(filtered);
      setScanStats({ count: filtered.length, duration: Date.now() - startMs });
    } catch (err: unknown) {
      setError((err as Error).message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const visibleTypes: { value: ArbitrageType | ''; label: string }[] = [
    { value: '', label: 'All Strategies' },
    { value: 'PUT_CALL_PARITY', label: 'Put-Call Parity' },
    { value: 'SYNTHETIC_STOCK', label: 'Synthetic Stock' },
    { value: 'CONVERSION', label: 'Conversion' },
    { value: 'REVERSAL', label: 'Reversal' },
    { value: 'BOX_SPREAD', label: 'Box Spread' },
    { value: 'VERTICAL_BOUND', label: 'Vertical Bounds' },
  ];

  if (selected) {
    return <ArbitrageDetail candidate={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>🔍 Arbitrage Scanner</h3>

        {/* Disclaimer */}
        <div style={{
          padding: '0.75rem',
          background: 'rgba(240, 173, 78, 0.1)',
          border: '1px solid var(--warning, #f0ad4e)',
          borderRadius: '6px',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          marginBottom: '1rem',
        }}>
          ⚠️ <strong>ANALYTICAL TOOL ONLY.</strong> This scanner identifies pricing relationships and potential dislocations. It does NOT execute trades. Every apparent opportunity may disappear after bid/ask spreads, commissions, financing, dividends, and execution constraints are applied.
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Expiration</label>
            <select
              value={filterExp}
              onChange={e => setFilterExp(e.target.value)}
              style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="">First available</option>
              {expirations.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Strategy</label>
            <select
              value={filterStrategy}
              onChange={e => setFilterStrategy(e.target.value as ArbitrageType | '')}
              style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              {visibleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Min Gross Edge ($)</label>
            <input
              type="number"
              placeholder="e.g. 0.50"
              value={filterMinEdge}
              onChange={e => setFilterMinEdge(e.target.value)}
              style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Annual Dividend</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                placeholder="e.g. 1.00"
                value={dividendAnnual}
                onChange={e => { setDividendAnnual(e.target.value); setDividendSource('user'); }}
                style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem', width: '90px' }}
              />
              <select
                value={dividendSource}
                onChange={e => setDividendSource(e.target.value as 'user' | 'none')}
                style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                <option value="none">None/Unknown</option>
                <option value="user">User Input</option>
              </select>
            </div>
          </div>

          <button
            onClick={runScan}
            disabled={scanning || chain.length === 0}
            style={{
              padding: '8px 20px',
              background: scanning ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: scanning ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {scanning ? '⏳ Scanning...' : '🔍 Scan'}
          </button>
        </div>

        {rateStatus && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            📊 {rateStatus}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(220,53,69,0.1)', borderRadius: '4px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {candidates.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              Opportunities — {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            </h4>
            {scanStats && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Scan took {scanStats.duration}ms
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>#</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Strategy</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Strike</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Expiration</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Gross Edge</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Net Edge</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Data</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: c.classification === 'NO_DISLOCATION' ? 0.5 : 1 }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '6px 8px', fontWeight: '500' }}>
                      {c.type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      ${c.strike}{c.strikeHigh ? ` / $${c.strikeHigh}` : ''}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{c.expiration}</td>
                    <td style={{ padding: '6px 8px', color: c.grossEdge > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {fmtEdge(c.grossEdge)}
                    </td>
                    <td style={{ padding: '6px 8px', color: c.netEdge === null ? 'var(--warning, #f0ad4e)' : c.netEdge > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {fmtEdge(c.netEdge)}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ color: CLASSIFICATION_COLORS[c.classification], fontWeight: '500', fontSize: '0.75rem' }}>
                        {CLASSIFICATION_LABELS[c.classification]}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', fontSize: '0.75rem', color: c.dataQuality.status === 'VALID' ? 'var(--success)' : 'var(--warning, #f0ad4e)' }}>
                      {c.dataQuality.status}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button
                        onClick={() => setSelected(c)}
                        style={{
                          padding: '3px 10px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>⚠️ Important:</strong> Gross Edge uses executable prices (BUY at ASK / SELL at BID). Net Edge subtracts configured costs. &quot;UNDETERMINED&quot; means a required cost (e.g., borrow cost) is not configured. No opportunity shown here constitutes a guaranteed profit.
          </div>
        </div>
      )}

      {candidates.length === 0 && !scanning && scanStats && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
          No candidates found matching current filters. Try removing filters or scanning a different expiration.
        </div>
      )}
    </div>
  );
}
