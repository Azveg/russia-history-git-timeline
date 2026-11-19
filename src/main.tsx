import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700.css';
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

function buildCanonicalPageUrl(): string {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const canonicalParam =
    params.get('card') ? `card=${encodeURIComponent(params.get('card')!)}`
    : params.get('ruler') ? `ruler=${encodeURIComponent(params.get('ruler')!)}`
    : params.get('person') ? `person=${encodeURIComponent(params.get('person')!)}`
    : '';
  return canonicalParam ? `${baseUrl}?${canonicalParam}` : baseUrl;
}

function syncSeoPageUrls() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const canonicalUrl = buildCanonicalPageUrl();

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
