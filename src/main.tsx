import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';
import {attemptModuleRecoveryReload} from './utils/lazyWithRetry.ts';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (attemptModuleRecoveryReload()) {
      event.preventDefault();
    }
  });
}

function syncSeoPageUrls() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const canonicalUrl = window.location.origin + window.location.pathname;

  let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrlMeta) {
    ogUrlMeta = document.createElement('meta');
    ogUrlMeta.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrlMeta);
  }
  ogUrlMeta.content = canonicalUrl;
}

syncSeoPageUrls();
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary variant="page">
    <App />
  </ErrorBoundary>,
);
