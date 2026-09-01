'use client';
import { OptionContract } from '@/lib/providers/MarketDataProvider';
import EducationalTooltip from './EducationalTooltip';

interface OptionChainTableProps {
  chain: OptionContract[];
  underlyingPrice: number;
  isBeginnerMode: boolean;
  onSelectOption: (option: OptionContract) => void;
}

export default function OptionChainTable({ chain, underlyingPrice, isBeginnerMode, onSelectOption }: OptionChainTableProps) {
  if (!chain || chain.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        DATA UNAVAILABLE or no options found for this expiration.
      </div>
    );
  }

  // Separate calls and puts, group by strike
  const strikes = Array.from(new Set(chain.map(opt => opt.strike))).sort((a, b) => a - b);
  
  const callMap = new Map<number, OptionContract>();
  const putMap = new Map<number, OptionContract>();
  
  chain.forEach(opt => {
    if (opt.type === 'call') callMap.set(opt.strike, opt);
    if (opt.type === 'put') putMap.set(opt.strike, opt);
  });

  const tableHeader = (
    <thead>
      <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
        {/* CALLS */}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Vega">Vega</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Theta">Theta</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Gamma">Gamma</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Delta">Delta</EducationalTooltip></th>}
        <th style={{ padding: '8px' }}><EducationalTooltip term="Implied Volatility">IV</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Open Interest">OI</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Volume">Vol</EducationalTooltip></th>
        <th style={{ padding: '8px' }}>Last</th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Ask">Ask</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Bid">Bid</EducationalTooltip></th>
        
        {/* STRIKE */}
        <th style={{ padding: '12px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
          <EducationalTooltip term="Strike Price">STRIKE</EducationalTooltip>
        </th>
        
        {/* PUTS */}
        <th style={{ padding: '8px' }}><EducationalTooltip term="Bid">Bid</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Ask">Ask</EducationalTooltip></th>
        <th style={{ padding: '8px' }}>Last</th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Volume">Vol</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Open Interest">OI</EducationalTooltip></th>
        <th style={{ padding: '8px' }}><EducationalTooltip term="Implied Volatility">IV</EducationalTooltip></th>
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Delta">Delta</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Gamma">Gamma</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Theta">Theta</EducationalTooltip></th>}
        {!isBeginnerMode && <th style={{ padding: '8px' }}><EducationalTooltip term="Vega">Vega</EducationalTooltip></th>}
      </tr>
    </thead>
  );

  return (
    <div style={{ overflowX: 'auto', fontSize: '0.9rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {tableHeader}
        <tbody>
          {strikes.map(strike => {
            const call = callMap.get(strike);
            const put = putMap.get(strike);
            
            const isCallITM = strike < underlyingPrice;
            const isPutITM = strike > underlyingPrice;
            
            const callBg = isCallITM ? 'rgba(46, 204, 113, 0.1)' : 'transparent';
            const putBg = isPutITM ? 'rgba(46, 204, 113, 0.1)' : 'transparent';
            
            const renderCell = (val: string | number | null | undefined, onClickOpt?: OptionContract) => (
              <td 
                onClick={() => onClickOpt && onSelectOption(onClickOpt)}
                style={{ 
                  padding: '8px', 
                  cursor: onClickOpt ? 'pointer' : 'default' 
                }}
                className={onClickOpt ? 'hover-highlight' : ''}
              >
                {val !== undefined && val !== null ? val : '-'}
              </td>
            );

            return (
              <tr key={strike} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {/* CALLS */}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.greeks?.vega?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.greeks?.theta?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.greeks?.gamma?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.greeks?.delta?.toFixed(4) ?? '-'}</td>}
                <td style={{ padding: '8px', backgroundColor: callBg }}>{call && call.impliedVolatility !== null ? (call.impliedVolatility * 100).toFixed(2) + '%' : '-'}</td>
                <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.openInterest ?? '-'}</td>
                <td style={{ padding: '8px', backgroundColor: callBg }}>{call?.volume ?? '-'}</td>
                {renderCell(call?.last, call)}
                {renderCell(call?.ask, call)}
                {renderCell(call?.bid, call)}
                
                {/* STRIKE */}
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  backgroundColor: 'var(--bg-secondary)',
                  borderLeft: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  position: 'relative'
                }}>
                  {strike.toFixed(2)}
                  {Math.abs(strike - underlyingPrice) < (strike * 0.01) && (
                    <span style={{ 
                      position: 'absolute', 
                      left: '4px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      fontSize: '0.7rem', 
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      padding: '2px 4px',
                      borderRadius: '4px'
                    }}>
                      ATM
                    </span>
                  )}
                </td>
                
                {/* PUTS */}
                {renderCell(put?.bid, put)}
                {renderCell(put?.ask, put)}
                {renderCell(put?.last, put)}
                <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.volume ?? '-'}</td>
                <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.openInterest ?? '-'}</td>
                <td style={{ padding: '8px', backgroundColor: putBg }}>{put && put.impliedVolatility !== null ? (put.impliedVolatility * 100).toFixed(2) + '%' : '-'}</td>
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.greeks?.delta?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.greeks?.gamma?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.greeks?.theta?.toFixed(4) ?? '-'}</td>}
                {!isBeginnerMode && <td style={{ padding: '8px', backgroundColor: putBg }}>{put?.greeks?.vega?.toFixed(4) ?? '-'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(46, 204, 113, 0.1)', border: '1px solid var(--success)' }}></div>
          <span>In-The-Money (ITM)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}></div>
          <span>Out-Of-The-Money (OTM)</span>
        </div>
      </div>
      
      <style>{`
        .hover-highlight:hover {
          background-color: var(--accent-primary);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
