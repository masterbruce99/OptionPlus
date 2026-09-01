import Dashboard from '@/components/Dashboard';
import ProviderStatus from '@/components/ProviderStatus';

export default function Home() {
  return (
    <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
      <ProviderStatus />
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Welcome to the Options Trading Command Center</h2>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>
          Search for a symbol to view real options data with plain English explanations of complex terminology.
        </p>
      </div>
      
      <Dashboard />
    </div>
  );
}
