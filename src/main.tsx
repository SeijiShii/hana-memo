import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppAuthProvider } from './app/AppAuthProvider';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

// AppAuthProvider は VITE_CLERK_PUBLISHABLE_KEY があれば ClerkProvider を、無ければ keyless モードで
// children を素通しする (キーレス dev / テストでツリー全体がクラッシュしないようにする)。
createRoot(rootEl).render(
  <StrictMode>
    <AppAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppAuthProvider>
  </StrictMode>,
);
