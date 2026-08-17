import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import './index.css'
import './styles/product-detail.css'
import './styles/wishlist.css'
import './App.css'

const root = document.getElementById('root');

// Silence annoying Telegram Web K/Z console spam (postMessage & WebSocket timeouts)
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const msg = args.join(' ');
    if (
      msg.includes("Failed to execute 'postMessage' on 'DOMWindow'") ||
      msg.includes("WebSocket connection to") ||
      msg.includes("WebSocket is closed before the connection") ||
      msg.includes("[WebSocket connection failed")
    ) {
      return; // Swallow known Telegram Web spam
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('postMessage') || e.message.includes('WebSocket'))) {
      e.preventDefault();
    }
  });
}

const AppComponent = (
  <AppProvider>
    {import.meta.env.DEV ? (
      <React.StrictMode>
        <App />
      </React.StrictMode>
    ) : (
      <App />
    )}
  </AppProvider>
);

ReactDOM.createRoot(root).render(AppComponent);
