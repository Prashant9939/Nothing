// Recovery for stale-chunk load failures — the "error loading dynamically
// imported module" screen that appears after a deploy.
//
// Why it happens: every Vite build renames the hashed files under /assets
// (e.g. Documents-BsDsPzbN.js -> Documents--9fK2xyz.js) and the old files are
// deleted. A tab that is still running the PREVIOUS index.html keeps asking
// for the OLD chunk names, which no longer exist, so every lazy route (and the
// layout itself) fails until the page is refreshed.
//
// The fix is always the same: reload ONCE so the browser picks up the current
// index.html and its new chunk names. A sessionStorage guard makes sure a
// genuinely broken deployment can never trap the tab in a reload loop — the
// second failure within the cooldown surfaces a manual "Reload" button
// instead.

const RELOAD_MARKER_KEY = 'iqintern:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 20000;

// Matches how the failure shows up across engines/build tools:
//   Chrome/Edge: "Failed to fetch dynamically imported module: <url>"
//   Firefox:     "error loading dynamically imported module <url>"
//   Safari:      "Importing a module script failed."
//   Vite:        css/modulepreload failures dispatched as vite:preloadError
//   React lazy:  "A component suspended..." wrappers still carry the above
//   text in the message chain.
const CHUNK_ERROR_RE =
  /dynamically imported module|importing a module script failed|failed to load module script|module script failed|failed to load chunk|loading chunk|loading css chunk|networkerror when attempting to fetch resource|error loading dynamically imported/i;

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
      : String(error ?? '');
  return CHUNK_ERROR_RE.test(message);
}

// Reloads the page once per cooldown window. Returns true when a reload was
// started (or is already in flight — e.g. two boundaries catching the same
// failure), false when a reload already happened moments ago (the caller
// should show a manual reload action instead of looping).
let reloadInFlight = false;

export function reloadOnceForChunkError(): boolean {
  if (reloadInFlight) return true;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARKER_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_MARKER_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode / disabled cookies): fall through and
    // reload anyway — one refresh is still better than a dead screen, and the
    // navigation itself is bounded by the browser session.
  }
  reloadInFlight = true;
  window.location.reload();
  return true;
}

// User-initiated reload from the error UI: clears the cooldown so the click
// always refreshes even if an automatic reload was just attempted.
export function forceReload(): void {
  try {
    sessionStorage.removeItem(RELOAD_MARKER_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

// Vite dispatches a cancelable `vite:preloadError` event when a css or
// modulepreload dependency of a dynamic import fails (e.g. the file was
// removed by a redeploy). Swallow it and recover the same way.
export function installVitePreloadRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForChunkError();
  });
}
