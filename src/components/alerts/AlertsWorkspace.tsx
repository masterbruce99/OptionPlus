import React, { useState, useEffect } from 'react';
import { Alert, AlertHistoryEvent, AlertType } from '../../lib/alerts/types';
import { getAlerts, saveAlert, deleteAlert, getAlertHistory } from '../../lib/alerts/alertStore';
import { NotificationEngine } from '../../lib/alerts/notificationEngine';

export function AlertsWorkspace() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<AlertHistoryEvent[]>([]);
  const [view, setView] = useState<'ACTIVE' | 'TRIGGERED' | 'HISTORY' | 'CREATE'>('ACTIVE');
  
  const [newSymbol, setNewSymbol] = useState('');
  const [newType, setNewType] = useState<AlertType>('PRICE');
  const [newField, setNewField] = useState('underlying');
  const [newOp, setNewOp] = useState('ABOVE');
  const [newThresh, setNewThresh] = useState('0');
  
  useEffect(() => {
    setAlerts(getAlerts());
    setHistory(getAlertHistory());
  }, [view]);

  const handleCreate = () => {
    const a: Alert = {
      id: Date.now().toString(),
      type: newType,
      symbol: newSymbol.toUpperCase(),
      conditions: [{ field: newField, operator: newOp as any, threshold: parseFloat(newThresh) }],
      timestamp: Date.now(),
      source: 'User Configuration',
      status: 'ACTIVE',
      priority: 'INFO',
      cooldownMinutes: 60
    };
    saveAlert(a);
    setAlerts(getAlerts());
    setView('ACTIVE');
  };

  const handleAcknowledge = (id: string) => {
    const a = alerts.find(x => x.id === id);
    if (a) {
      a.status = 'ACKNOWLEDGED';
      saveAlert(a);
      setAlerts(getAlerts());
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const triggeredAlerts = alerts.filter(a => a.status === 'TRIGGERED');

  return (
    <div className="card animate-fade-in">
      <h2>Real-Time Options Monitoring & Alert Intelligence</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => setView('ACTIVE')} style={{ padding: '8px 16px', fontWeight: view === 'ACTIVE' ? 'bold' : 'normal', background: view === 'ACTIVE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: view === 'ACTIVE' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Active ({activeAlerts.length})</button>
        <button onClick={() => setView('TRIGGERED')} style={{ padding: '8px 16px', fontWeight: view === 'TRIGGERED' ? 'bold' : 'normal', background: view === 'TRIGGERED' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: view === 'TRIGGERED' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Triggered ({triggeredAlerts.length})</button>
        <button onClick={() => setView('HISTORY')} style={{ padding: '8px 16px', fontWeight: view === 'HISTORY' ? 'bold' : 'normal', background: view === 'HISTORY' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: view === 'HISTORY' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>History / Audit</button>
        <button onClick={() => setView('CREATE')} style={{ padding: '8px 16px', fontWeight: view === 'CREATE' ? 'bold' : 'normal', background: view === 'CREATE' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: view === 'CREATE' ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Create Alert</button>
        <button onClick={() => NotificationEngine.requestPermission()} style={{ padding: '8px 16px', marginLeft: 'auto', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Enable Browser Notifications</button>
      </div>

      {view === 'ACTIVE' && (
        <div>
          <h3>Active Alerts</h3>
          {activeAlerts.length === 0 && <p className="text-muted">No active alerts.</p>}
          {activeAlerts.map(a => (
            <div key={a.id} style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{a.symbol}</strong> - {a.type} | {a.conditions.map(c => `${c.field} ${c.operator} ${c.threshold}`).join(' AND ')}
                <br/>
                <small className="text-muted">Cooldown: {a.cooldownMinutes}m | Status: {a.status}</small>
              </div>
              <button onClick={() => { deleteAlert(a.id); setAlerts(getAlerts()); }} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-danger)', border: '1px solid var(--text-danger)', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {view === 'TRIGGERED' && (
        <div>
          <h3>Triggered Alerts</h3>
          {triggeredAlerts.length === 0 && <p className="text-muted">No triggered alerts.</p>}
          {triggeredAlerts.map(a => (
            <div key={a.id} style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', marginBottom: '10px', background: 'rgba(255, 100, 100, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{a.symbol}</strong>
                <button onClick={() => handleAcknowledge(a.id)} style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Acknowledge</button>
              </div>
              <div style={{ marginTop: '5px' }}>
                {a.type} triggered at {new Date(a.lastTriggeredAt || a.timestamp).toLocaleTimeString()}
                <br/>
                Current Value: {a.lastObservedValue}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'HISTORY' && (
        <div>
          <h3>Alert History & Audit Trail</h3>
          {history.length === 0 && <p className="text-muted">No history.</p>}
          {history.map(h => (
            <div key={h.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '10px 0' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>{new Date(h.timestamp).toLocaleString()}</span><br/>
              <strong>{h.status}</strong>: {h.explanation}
              <br/><small className="text-muted">Condition: {h.conditionDescription} | Source: {h.source} | Freshness: {h.freshness}</small>
            </div>
          ))}
        </div>
      )}

      {view === 'CREATE' && (
        <div>
          <h3>Create New Alert</h3>
          <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
            <input type="text" placeholder="Symbol (e.g. AAPL)" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
            <select value={newType} onChange={e => setNewType(e.target.value as AlertType)} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <option value="PRICE">Price</option>
              <option value="SPREAD">Spread</option>
              <option value="IV">IV</option>
              <option value="GREEK">Greek</option>
              <option value="VOLUME">Volume</option>
            </select>
            <input type="text" placeholder="Field (e.g. underlying, bid, delta)" value={newField} onChange={e => setNewField(e.target.value)} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
            <select value={newOp} onChange={e => setNewOp(e.target.value)} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <option value="ABOVE">Above</option>
              <option value="BELOW">Below</option>
              <option value="CROSSED_ABOVE">Crossed Above</option>
              <option value="CROSSED_BELOW">Crossed Below</option>
            </select>
            <input type="number" placeholder="Threshold" value={newThresh} onChange={e => setNewThresh(e.target.value)} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
            <button onClick={handleCreate} style={{ padding: '10px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Alert</button>
          </div>
          <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }}/>
          <h4>Alert Templates</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => { setNewType('IV'); setNewField('iv'); setNewOp('ABOVE'); setNewThresh('50'); }} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>IV Spike (&gt;50%)</button>
            <button onClick={() => { setNewType('SPREAD'); setNewField('spread %'); setNewOp('ABOVE'); setNewThresh('5'); }} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Spread Widened (&gt;5%)</button>
            <button onClick={() => { setNewType('VOLUME'); setNewField('volume'); setNewOp('ABOVE'); setNewThresh('10000'); }} style={{ padding: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>Volume Threshold (&gt;10,000)</button>
          </div>
        </div>
      )}
    </div>
  );
}
