 /**
 * PUBLIC_INTERFACE
 * Runtime availability flags for API resources with session-level caching.
 * - Stores a small map in sessionStorage to avoid repeated failing probes.
 * - Allows re-enabling automatically if a subsequent API call succeeds.
 */
const SESSION_KEY = "runtime.api.availability";

let mem = null;

function load() {
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    mem = raw ? JSON.parse(raw) : {};
    if (typeof mem !== "object" || Array.isArray(mem)) mem = {};
  } catch {
    mem = {};
  }
  return mem;
}

function save() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(mem || {}));
  } catch {
    // ignore private mode/quota
  }
}

/**
 * PUBLIC_INTERFACE
 * Returns 'available' | 'unavailable' | 'unknown' for a resource key.
 */
export function getResourceAvailability(resourceKey) {
  const m = load();
  const v = m?.[resourceKey];
  if (v === "available" || v === "unavailable") return v;
  return "unknown";
}

/**
 * PUBLIC_INTERFACE
 * Mark a given resourceKey as unavailable for the remainder of the session.
 */
export function markResourceUnavailable(resourceKey) {
  const m = load();
  m[resourceKey] = "unavailable";
  save();
}

/**
 * PUBLIC_INTERFACE
 * Mark a given resourceKey as available (clears previous 'unavailable').
 */
export function markResourceAvailable(resourceKey) {
  const m = load();
  m[resourceKey] = "available";
  save();
}

/**
 * PUBLIC_INTERFACE
 * Whether API calls are globally disabled via feature flag.
 * REACT_APP_FEATURE_ENABLE_API=false -> fallback should be used.
 */
export function isApiGloballyDisabled() {
  return String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") !== "true";
}

/**
 * PUBLIC_INTERFACE
 * Returns true if the caller should use fallback (demo store) for this resource.
 * Conditions:
 * - Global API disabled
 * - Resource explicitly marked unavailable in this session
 */
export function shouldUseFallback(resourceKey) {
  if (isApiGloballyDisabled()) return true;
  const avail = getResourceAvailability(resourceKey);
  return avail === "unavailable";
}
