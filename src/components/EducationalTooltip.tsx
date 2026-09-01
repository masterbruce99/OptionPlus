'use client';
import { useState } from 'react';
import { educationalDictionary, TermKey } from '@/lib/educationalEngine';

export default function EducationalTooltip({
  term,
  children,
  positionQuantity,
  positionValue,
}: {
  term: TermKey;
  children: React.ReactNode;
  positionQuantity?: number;
  positionValue?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const data = educationalDictionary[term];

  return (
    <div className="tooltip-container" style={{ position: 'relative', display: 'inline-block' }}>
      <span 
        onMouseEnter={() => setIsOpen(true)} 
        onMouseLeave={() => setIsOpen(false)}
        style={{ cursor: 'help', borderBottom: '1px dotted var(--accent-secondary)' }}
      >
        {children}
      </span>
      {isOpen && (
        <div 
          className="tooltip-popup card animate-fade-in"
          style={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            marginBottom: '8px',
            width: '300px',
            zIndex: 10,
            fontSize: '0.875rem'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '8px' }}>{term}</strong>
          <p style={{ marginBottom: '8px' }}><strong>Technical:</strong> {data.technical}</p>
          <p style={{ marginBottom: '8px', color: 'var(--success)' }}><strong>Simple:</strong> {data.simple}</p>
          <p style={{ marginBottom: '8px', color: 'var(--accent-secondary)' }}><strong>Why it matters:</strong> {data.whyItMatters}</p>
          {positionQuantity !== undefined && data.positionSpecific && (
            <p style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
              <strong>Your Position:</strong> {data.positionSpecific(positionQuantity, positionValue)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
