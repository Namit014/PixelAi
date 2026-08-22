const rateLimitStore = new Map<string, number[]>();

interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requests: 10,
  window: 60000, // 1 minute
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): boolean {
  const now = Date.now();
  const requests = (rateLimitStore.get(identifier) || [])
    .filter(t => now - t < config.window);
  
  if (requests.length >= config.requests) {
    return false;
  }
  
  requests.push(now);
  rateLimitStore.set(identifier, requests);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    cleanupRateLimitStore(now, config.window);
  }
  
  return true;
}

function cleanupRateLimitStore(now: number, window: number) {
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < window);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
}

export function getRateLimitIdentifier(req: Request): string {
  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
}
