import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

declare global {
  interface Window {
    __DOT_APP_MOUNTED__?: boolean;
    __DOT_CLEAR_BOOT_TIMER__?: () => void;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  window.__DOT_APP_MOUNTED__ = true;
  window.__DOT_CLEAR_BOOT_TIMER__?.();
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

