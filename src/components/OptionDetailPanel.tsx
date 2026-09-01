'use client';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import EducationalTooltip from './EducationalTooltip';
import {
  calculateSpread,
  calculateSpreadPercentage,
  calculateIntrinsicValue,
  calculateExtrinsicValue,
  calculateBreakEven,
  calculateDaysToExpiration,
  categorizeDTE,
  assessLiquidity,
  getTradeDirection
} from '@/lib/calculations';

interface OptionDetailPanelProps {
  option: OptionContract;
  underlyingPrice: number;
  onClose: () => void;
}

export default function OptionDetailPanel({ option, underlyingPrice, onClose }: OptionDetailPanelProps) {
  const isCall = option.type === 'call';
  
  const spread = calculateSpread(option.bid, option.ask);
  const spreadPct = calculateSpreadPercentage(option.bid, option.ask);
  const intrinsic = calculateIntrinsicValue(option.type, option.strike, underlyingPrice);
  const premium = option.last || option.ask || option.bid || 0; // estimate premium
  const extrinsic = calculateExtrinsicValue(premium, intrinsic);
  const breakEven = calculateBreakEven(option.type, option.strike, premium);
  const dte = calculateDaysToExpiration(option.expiration);
  const dteCategory = categorizeDTE(dte);
  const liquidity = assessLiquidity(option.volume, option.openInterest, spreadPct);
  const direction = getTradeDirection(option.type);

  return (
    <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '1.2rem'
        }}
      >
        ✕
      </button>

      <h2 style={{ marginBottom: '0.5rem' }}>
        {option.symbol} - {option.type.toUpperCase()}
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="text-muted">Strike</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${option.strike}</p>
        </div>
        <div>
          <p className="text-muted">Current Underlying</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${underlyingPrice.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          Explain this Option
        </h3>
        
        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>YOU ARE LOOKING AT:</strong> A {option.type} option on {option.underlying} expiring on {option.expiration}.
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>WHAT THIS MEANS:</strong> You are taking a {direction.toLowerCase()} position that benefits from the underlying moving {isCall ? 'upward' : 'downward'}.
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>MAXIMUM LOSS:</strong> ${(premium * 100).toFixed(2)} premium, assuming a long {option.type}. (100 share multiplier)
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>BREAK-EVEN AT EXPIRATION:</strong> ${breakEven?.toFixed(2)}
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>TIME REMAINING:</strong> {dte} days ({dteCategory})
          </p>
          <p>
            <strong>MAIN RISKS:</strong> Time decay, Volatility changes, Underlying price movement, Liquidity (currently {liquidity}).
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div>
          <h4 style={{ marginBottom: '0.5rem' }}>Pricing & Liquidity</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <EducationalTooltip term="Bid">Bid:</EducationalTooltip> <span>${option.bid}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <EducationalTooltip term="Ask">Ask:</EducationalTooltip> <span>${option.ask}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <EducationalTooltip term="Bid/Ask Spread">Spread:</EducationalTooltip> <span>${spread?.toFixed(2)} ({spreadPct ? (spreadPct * 100).toFixed(2) : 0}%)</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <EducationalTooltip term="Volume">Volume:</EducationalTooltip> <span>{option.volume}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <EducationalTooltip term="Open Interest">OI:</EducationalTooltip> <span>{option.openInterest}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{ marginBottom: '0.5rem' }}>Value Breakdown</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Option Price (Last):</span> <span>${option.last}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--success)' }}>
              <EducationalTooltip term="Intrinsic Value">Intrinsic Value:</EducationalTooltip> <span>${intrinsic?.toFixed(2)}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--accent-secondary)' }}>
              <EducationalTooltip term="Extrinsic Value">Extrinsic Value:</EducationalTooltip> <span>${extrinsic?.toFixed(2)}</span>
            </li>
          </ul>
        </div>

        {option.greeks && (
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Greeks (Sensitivities)</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <EducationalTooltip term="Delta">Delta:</EducationalTooltip> <span>{option.greeks.delta?.toFixed(3) || '-'}</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <EducationalTooltip term="Gamma">Gamma:</EducationalTooltip> <span>{option.greeks.gamma?.toFixed(4) || '-'}</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <EducationalTooltip term="Theta">Theta:</EducationalTooltip> <span>{option.greeks.theta?.toFixed(3) || '-'}</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <EducationalTooltip term="Vega">Vega:</EducationalTooltip> <span>{option.greeks.vega?.toFixed(3) || '-'}</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <EducationalTooltip term="Implied Volatility">IV:</EducationalTooltip> <span>{(option.impliedVolatility * 100).toFixed(2)}%</span>
              </li>
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
