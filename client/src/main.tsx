import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { installVitePreloadRecovery } from './utils/chunkRecovery'

// Lazy route chunks are content-hashed per build: after a redeploy the old
// file names are gone, so a tab still running the previous index.html fails to
// import them. Vite surfaces css/modulepreload failures as `vite:preloadError`;
// swallow it and refresh once to pick up the new build.
installVitePreloadRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Root boundary: a failed lazy chunk above the page-level boundaries
        (layouts, providers) must recover the same way instead of blanking the
        whole app. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
