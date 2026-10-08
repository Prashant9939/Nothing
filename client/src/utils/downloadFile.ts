// Authenticated blob download used by the partner/admin document screens.
// Mirrors the student DocumentsList download: fetch with the bearer token,
// fail on timeout instead of spinning forever, revoke the object URL later
// so the browser can finish reading it.
export async function downloadFile(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    const a = document.createElement('a');
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    const httpErr = err instanceof Error && /^HTTP \d+$/.test(err.message);
    throw new Error(
      timedOut
        ? `Downloading ${filename} timed out. Please try again.`
        : httpErr
          ? `${filename} is not available yet.`
          : `Could not download ${filename}. Please try again.`
    );
  }
}
