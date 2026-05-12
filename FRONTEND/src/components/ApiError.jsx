/**
 * Component: ErrorBoundary + ApiError
 * Shows a clean error state when an API call fails.
 */
import { AlertTriangle } from 'lucide-react';

const ApiError = ({ message, onRetry }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '1rem', padding: '3rem',
    border: '1px solid rgba(255,51,102,0.2)', borderRadius: '16px',
    background: 'rgba(255,51,102,0.05)'
  }}>
    <AlertTriangle size={40} color="var(--status-waiting)" />
    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--status-waiting)' }}>Connection Failed</h3>
    <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px', fontSize: '0.9rem' }}>
      {message || 'Could not reach the server. Ensure the backend service is running.'}
    </p>
    {onRetry && (
      <button className="elite-btn elite-btn-secondary" onClick={onRetry}>Retry Request</button>
    )}
  </div>
);

export default ApiError;
