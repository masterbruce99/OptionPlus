import React from 'react';

export const EducationalWorkflow: React.FC = () => {
  return (
    <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(38, 166, 154, 0.05)', border: '1px solid rgba(38, 166, 154, 0.3)' }}>
      <h3 style={{ borderBottom: '1px solid rgba(38, 166, 154, 0.3)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>🎓</span> How to Read the Chain
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div>
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>1. Check Liquidity First</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            Before analyzing direction or volatility, ensure the chain has liquidity. 
            Look at the <strong>Chain Quality</strong> panel. If the median spread is wide (e.g., &gt;10%), 
            entering and exiting positions will be costly.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>2. Understand the Pricing</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            Use the <strong>Volatility Analysis</strong> to see how expensive options are. 
            A steep IV Skew means the market is pricing in severe downside risk (expensive puts). 
            Term Structure shows if near-term or long-term options are relatively cheaper.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>3. Evaluate the Greeks</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            The <strong>Greek Curves</strong> show the risk profile across strikes. 
            Notice how Gamma peaks At-The-Money (ATM), meaning ATM options are the most sensitive to 
            small price changes in the underlying. Far Out-Of-The-Money (OTM) options have low Delta and Gamma.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>4. Simulate the Impact</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            Click on any contract in the <strong>Strike Map</strong> to load it into the Scorecard. 
            Use the <strong>Hypothetical Simulator</strong> to see how adding this contract changes 
            your portfolio&apos;s Greek exposure and capital requirements.
          </p>
        </div>
      </div>
    </div>
  );
};
