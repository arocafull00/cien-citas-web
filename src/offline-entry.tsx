import { createRoot } from 'react-dom/client';
import { OfflineScreen } from './components/offline-screen';
import { PwaControls } from './components/pwa-controls';
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
createRoot(document.getElementById('offline-root')!).render(<div className="app-shell"><OfflineScreen /><PwaControls /></div>);
