// PBKDF2-based password hashing with salt for security
// OWASP recommended iterations: 600,000 for SHA-256

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 16;

/**
 * Hash a password using PBKDF2 with a random salt
 * Returns both the hash and salt as hex strings
 */
export async function hashPasswordSecure(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  
  // Generate or use existing salt
  let saltBytes: Uint8Array;
  if (existingSalt) {
    saltBytes = new Uint8Array(existingSalt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2 - use ArrayBuffer explicitly for compatibility
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Convert to hex strings
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { hash, salt: saltHex };
}

/**
 * Verify a password against a stored hash and salt
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPasswordSecure(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPasswordSecure(password, storedSalt);
  return constantTimeEqual(hash, storedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Legacy hash function - DO NOT USE for new passwords
 * Only kept for backward compatibility during migration
 */
export async function hashPasswordLegacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
