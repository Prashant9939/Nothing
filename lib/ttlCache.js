// Tiny in-process TTL cache with single-flight, for expensive-but-slowly-
// changing reads (multi-query admin dashboards). Per serverless instance —
// same trade-off as the admin dashboard cache: staleness is bounded by the
// TTL, and concurrent requests share ONE computation instead of stampeding
// the pool.
function makeTtlCache(ttlMs, maxKeys = 32) {
  const entries = new Map();
  return (key, compute) => {
    const hit = entries.get(key);
    if (hit) {
      if (hit.inflight) return hit.inflight;
      if (Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
    }
    const entry = { at: 0, value: undefined, inflight: null };
    entry.inflight = Promise.resolve()
      .then(compute)
      .then((value) => {
        entry.value = value;
        entry.at = Date.now();
        entry.inflight = null;
        return value;
      })
      .catch((err) => {
        entries.delete(key);
        throw err;
      });
    entries.set(key, entry);
    // Bound memory: evict the oldest settled entry (never the in-flight one).
    if (entries.size > maxKeys) {
      for (const [k, v] of entries) {
        if (k !== key && !v.inflight) {
          entries.delete(k);
          break;
        }
      }
    }
    return entry.inflight;
  };
}

module.exports = { makeTtlCache };
