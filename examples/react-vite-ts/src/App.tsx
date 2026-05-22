import { useEffect, useState } from 'react';

interface Status {
  status: string;
  runtime: string;
  viteVersion: string;
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [count, setCount]   = useState(0);

  useEffect(() => {
    // Example: fetch a backend status endpoint if you wire one up
    setStatus({
      status:      'running',
      runtime:     import.meta.env.VITE_RUNTIME ?? 'docker',
      viteVersion: '5.x',
    });
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '80px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🌊 Shiplet — React + Vite + SWC</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Running inside Docker via Shiplet. HMR is active — edit this file and save.
      </p>

      <div style={{ background: '#f4f4f8', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Stack</h2>
        <ul style={{ margin: 0, padding: '0 0 0 20px', lineHeight: 2 }}>
          <li>React 18 + TypeScript</li>
          <li>Vite 5 with SWC (faster than Babel)</li>
          <li>pnpm package manager</li>
          <li>Redis (available at <code>redis:6379</code>)</li>
          <li>HMR configured for Docker (<code>usePolling: true</code>)</li>
        </ul>
      </div>

      {status && (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Runtime status</h2>
          <p>Container runtime: <strong>{status.runtime}</strong></p>
          <p>Status: <strong style={{ color: '#2e7d32' }}>{status.status}</strong></p>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Counter demo</h2>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '8px 20px', fontSize: 14, cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc' }}
        >
          Count: {count}
        </button>
        <p style={{ marginTop: 12, fontSize: 13, color: '#888' }}>
          Edit <code>src/App.tsx</code> and save — Vite HMR will update instantly.
        </p>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#fffde7', borderRadius: 8, fontSize: 13 }}>
        <strong>Useful commands:</strong>
        <pre style={{ margin: '8px 0 0', color: '#555' }}>{[
          'shiplet up -d              # Start containers',
          'shiplet pnpm install       # Install deps inside container',
          'shiplet pnpm run dev       # Start Vite dev server (or it auto-starts)',
          'shiplet logs -f app        # Follow logs',
          'shiplet db redis           # Open redis-cli',
          'shiplet dashboard          # Web UI → http://localhost:6171',
        ].join('\n')}</pre>
      </div>
    </div>
  );
}
