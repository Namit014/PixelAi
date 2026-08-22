/**
 * Global Error Filter
 * Suppresses harmless console errors from browser extensions, third-party services, and expected errors
 */

const FILTERED_ERROR_PATTERNS = [
  // Browser extension blockers
  /ERR_BLOCKED_BY_CLIENT/i,
  /net::ERR_BLOCKED_BY_CLIENT/i,
  
  // Third-party analytics/tracking (blocked by ad blockers)
  /ingesteer\.services-prod\.nsvcs\.net/i,
  
  // React Router future flag warnings (non-critical)
  /React Router Future Flag Warning/i,
  /v7_startTransition/i,
  /v7_relativeSplatPath/i,
  
  // Browser feature policy warnings (non-critical)
  /Unrecognized feature:/i,
  
  // Iframe sandbox warnings (expected for Lovable preview)
  /iframe.*sandbox.*allow-scripts.*allow-same-origin/i,
];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

/**
 * Check if an error should be filtered out
 */
function shouldFilterError(...args: any[]): boolean {
  const errorString = args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.message;
    if (typeof arg === 'object') return JSON.stringify(arg);
    return String(arg);
  }).join(' ');

  return FILTERED_ERROR_PATTERNS.some(pattern => pattern.test(errorString));
}

/**
 * Initialize error filtering
 * Only filters in production or when explicitly enabled
 */
export function initializeErrorFilter(options: { enabled?: boolean; logFiltered?: boolean } = {}) {
  const { 
    enabled = import.meta.env.PROD,
    logFiltered = false
  } = options;

  if (!enabled) {
    return;
  }

  console.error = (...args: any[]) => {
    if (shouldFilterError(...args)) {
      if (logFiltered) {
        originalConsoleError('🔇 [Filtered Error]:', ...args);
      }
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args: any[]) => {
    if (shouldFilterError(...args)) {
      if (logFiltered) {
        originalConsoleWarn('🔇 [Filtered Warning]:', ...args);
      }
      return;
    }
    originalConsoleWarn(...args);
  };
}

/**
 * Restore original console methods
 */
export function disableErrorFilter() {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}
